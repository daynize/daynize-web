const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { WebSocket, WebSocketServer } = require('ws');
const { createPaymentApi } = require('./payment-api');
const { createLatencyTrace } = require('./latency-trace');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const GEMINI_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-latest';
const MAX_BUFFER = 1024 * 1024;
const FILES = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/audio.mjs', ['audio.mjs', 'text/javascript; charset=utf-8']],
    ['/pcm-worklet.mjs', ['pcm-worklet.mjs', 'text/javascript; charset=utf-8']],
    ...['live-service.mjs', 'audio-engine.mjs', 'ambient-orb.mjs', 'session-safety.mjs', 'tutor-widget.mjs', 'daynize-tutor.mjs', 'voice-studio-live.mjs', 'lesson-context.mjs'].map(file => [`/${file}`, [file, 'text/javascript; charset=utf-8']]),
    ['/spotlight-bar.css', ['spotlight-bar.css', 'text/css; charset=utf-8']],
    ['/daynize-logo.png', ['../DAYNIZE LOGO ONLY.png', 'image/png']],
    ...['mic', 'mic-off', 'phone-off', 'x', 'volume-2', 'rotate-ccw', 'volume-x', 'message-square', 'settings-2'].map(icon => [`/icons/${icon}.svg`, [`icons/${icon}.svg`, 'image/svg+xml']])
]);

function createRelayServer(options = {}) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    const rawModel = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    if (typeof rawModel !== 'string' || !/^(models\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rawModel)) {
        throw new TypeError('GEMINI_MODEL must be a model ID with at most one models/ prefix.');
    }
    const model = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`;
    const rawTranscriptionModel = options.transcriptionModel ?? process.env.GEMINI_TRANSCRIPTION_MODEL ?? 'gemini-3.8-flash';
    if (typeof rawTranscriptionModel !== 'string' || !/^(models\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(rawTranscriptionModel)) {
        throw new TypeError('GEMINI_TRANSCRIPTION_MODEL must be a model ID with at most one models/ prefix.');
    }
    const transcriptionModel = rawTranscriptionModel.startsWith('models/') ? rawTranscriptionModel.slice(7) : rawTranscriptionModel;
    const upstreamUrl = options.upstreamUrl ?? GEMINI_ENDPOINT;
    const wsUrl = options.wsUrl ?? process.env.NEXT_PUBLIC_WS_URL ?? process.env.WS_URL;
    if (wsUrl) {
        const configured = new URL(wsUrl);
        if (!['ws:', 'wss:'].includes(configured.protocol) || configured.username || configured.password || configured.hash) throw new Error('Invalid public WebSocket URL.');
    }
    const voice = options.voice ?? process.env.GEMINI_VOICE ?? 'Kore';
    if (!['Kore', 'Puck'].includes(voice)) throw new Error('GEMINI_VOICE must be Kore or Puck.');
    const trustedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    for (const origin of trustedOrigins) {
        if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('ALLOWED_ORIGINS must contain exact HTTPS origins.');
    }
    const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN;
    const vadSilenceMs = Math.min(1000, Number(options.vadSilenceMs ?? process.env.VAD_SILENCE_MS) || 450);
    const transcriptionSilenceMs = options.transcriptionSilenceMs ?? (Number(process.env.TRANSCRIPTION_VAD_SILENCE_MS) || 500);
    const authorizeRequest = options.authorizeRequest;
    const maxConnections = options.maxConnections ?? 8;
    const maxSessionMs = options.maxSessionMs ?? 10 * 60 * 1000;
    const initTimeoutMs = options.initTimeoutMs ?? 5000;
    const maxTranscriptionBytes = options.maxTranscriptionBytes ?? 8 * 1024 * 1024;
    const maxTranscriptionsPerMinute = options.maxTranscriptionsPerMinute ?? 20;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const paymentApi = createPaymentApi({
        storeId: options.portoneStoreId,
        channelKey: options.portoneChannelKey,
        billingChannelKey: options.portoneBillingChannelKey,
        apiSecret: options.portoneApiSecret,
        mode: options.portoneMode,
        pgProvider: options.portonePgProvider,
        amount: options.portoneAmount,
        allowedOrigins: trustedOrigins,
        fetchImpl: options.paymentFetchImpl ?? fetchImpl,
        now: options.paymentNow
    });
    if (!Number.isInteger(maxTranscriptionBytes) || maxTranscriptionBytes < 44 || !Number.isInteger(maxTranscriptionsPerMinute) || maxTranscriptionsPerMinute < 1) {
        throw new Error('Invalid transcription limits.');
    }
    if (!Number.isInteger(transcriptionSilenceMs) || transcriptionSilenceMs < 100 || transcriptionSilenceMs > 1500) {
        throw new Error('TRANSCRIPTION_VAD_SILENCE_MS must be an integer between 100 and 1500.');
    }
    // Latency tracing (`[latency]` JSON lines in `fly logs`): on in production, LATENCY_LOG=0/1 or options.latencyLog overrides.
    const latencyLog = options.latencyLog ?? (process.env.LATENCY_LOG ? !['0', 'false', 'off'].includes(process.env.LATENCY_LOG.toLowerCase()) : process.env.NODE_ENV === 'production');
    const latencyLogger = options.latencyLogger ?? (line => console.log(line));
    const heartbeatInterval = options.heartbeatInterval ?? 20000;
    if (!Number.isFinite(heartbeatInterval) || heartbeatInterval <= 0) throw new Error('Invalid heartbeat interval.');
    if (!Number.isInteger(maxConnections) || maxConnections < 1 || !Number.isFinite(maxSessionMs) || maxSessionMs < 1000) {
        throw new Error('Invalid connection or session limits.');
    }
    if (!Number.isFinite(initTimeoutMs) || initTimeoutMs <= 0) throw new Error('Invalid session init timeout.');
    if (authorizeRequest && typeof authorizeRequest !== 'function') throw new TypeError('authorizeRequest must be a synchronous function.');
    if (publicOrigin && new URL(publicOrigin).protocol !== 'https:') {
        throw new Error('Public access requires an HTTPS PUBLIC_ORIGIN.');
    }
    const authorized = request => {
        if (authorizeRequest) {
            try { return authorizeRequest(request) === true; } catch { return false; }
        }
        return true;
    };
    const transcriptionRequests = new Map();
    const server = http.createServer(async (request, response) => {
        if (!authorized(request)) {
            response.writeHead(401, { 'Cache-Control': 'no-store' }).end('Authentication required');
            return;
        }
        let pathname;
        try {
            pathname = new URL(request.url, 'http://localhost').pathname;
        } catch {
            response.writeHead(400, { 'Cache-Control': 'no-store' }).end('Bad request');
            return;
        }
        try {
            if (await paymentApi.handle(request, response, pathname)) return;
        } catch (error) {
            console.error('[payment] handler failure', error);
            if (!response.headersSent) response.writeHead(500, { 'Cache-Control': 'no-store' });
            response.end();
            return;
        }
        if (pathname === '/transcribe') {
            const origin = request.headers.origin;
            const host = request.headers.host || '';
            const localOrigin = /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host) ? `http://${host}` : undefined;
            const allowedOrigin = typeof origin === 'string' && (trustedOrigins.includes(origin) || origin === publicOrigin || origin === localOrigin);
            const corsHeaders = allowedOrigin ? {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '600',
                'Vary': 'Origin'
            } : {};
            if (request.method === 'OPTIONS') {
                response.writeHead(allowedOrigin ? 204 : 403, { ...corsHeaders, 'Cache-Control': 'no-store' }).end();
                return;
            }
            if (request.method !== 'POST') {
                response.writeHead(405, { ...corsHeaders, 'Cache-Control': 'no-store', 'Allow': 'POST, OPTIONS' }).end();
                return;
            }
            if (!allowedOrigin) {
                response.writeHead(403, { 'Cache-Control': 'no-store' }).end('Origin not allowed');
                return;
            }
            if (!apiKey?.trim()) {
                response.writeHead(503, { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: '음성 인식 서비스를 사용할 수 없습니다.' }));
                request.resume();
                return;
            }
            if (!/^audio\/wav(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
                response.writeHead(415, { ...corsHeaders, 'Cache-Control': 'no-store' }).end('Expected audio/wav');
                request.resume();
                return;
            }
            const declaredLength = Number(request.headers['content-length']);
            if (Number.isFinite(declaredLength) && declaredLength > maxTranscriptionBytes) {
                response.writeHead(413, { ...corsHeaders, 'Cache-Control': 'no-store' }).end('Audio is too large');
                request.resume();
                return;
            }
            const now = Date.now();
            const clientAddress = request.socket.remoteAddress || 'unknown';
            const recentRequests = (transcriptionRequests.get(clientAddress) || []).filter(timestamp => now - timestamp < 60_000);
            if (recentRequests.length >= maxTranscriptionsPerMinute) {
                response.writeHead(429, { ...corsHeaders, 'Cache-Control': 'no-store' }).end('Too many transcription requests');
                request.resume();
                return;
            }
            recentRequests.push(now);
            transcriptionRequests.set(clientAddress, recentRequests);
            try {
                const chunks = [];
                let totalBytes = 0;
                for await (const chunk of request) {
                    totalBytes += chunk.length;
                    if (totalBytes > maxTranscriptionBytes) {
                        response.writeHead(413, { ...corsHeaders, 'Cache-Control': 'no-store' }).end('Audio is too large');
                        return;
                    }
                    chunks.push(chunk);
                }
                const audio = Buffer.concat(chunks);
                if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
                    response.writeHead(400, { ...corsHeaders, 'Cache-Control': 'no-store' }).end('Invalid WAV audio');
                    return;
                }
                const upstream = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${transcriptionModel}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: 'Transcribe the spoken English exactly. Return only the words you hear, without translation, explanation, or added punctuation. If there is no intelligible speech, return an empty string.' },
                                { inlineData: { mimeType: 'audio/wav', data: audio.toString('base64') } }
                            ]
                        }],
                        generationConfig: { temperature: 0 }
                    }),
                    signal: AbortSignal.timeout(30_000)
                });
                if (!upstream.ok) {
                    response.writeHead(502, { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
                    response.end(JSON.stringify({ error: '음성을 글자로 변환하지 못했습니다. 잠시 후 다시 시도해 주세요.' }));
                    return;
                }
                const result = await upstream.json();
                const transcript = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
                if (typeof transcript !== 'string') {
                    response.writeHead(502, { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
                    response.end(JSON.stringify({ error: '음성 인식 결과를 받지 못했습니다.' }));
                    return;
                }
                response.writeHead(200, { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
                response.end(JSON.stringify({ transcript: transcript.slice(0, 10_000) }));
            } catch {
                if (!response.headersSent) {
                    response.writeHead(502, { ...corsHeaders, 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
                    response.end(JSON.stringify({ error: '음성 인식 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.' }));
                }
            }
            return;
        }
        if (!['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(405).end();
            return;
        }
        if (pathname === '/runtime-config.json') {
            response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
            response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ wsUrl: wsUrl || null }));
            return;
        }
        if (pathname === '/timeline.json') {
            try {
                const timelineContent = await fs.readFile(path.join(__dirname, 'timeline.json')).catch(() => fs.readFile(path.join(__dirname, '..', 'timeline.json')));
                response.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                    'X-Content-Type-Options': 'nosniff'
                });
                response.end(request.method === 'HEAD' ? undefined : timelineContent);
                return;
            } catch {
                response.writeHead(404).end('Not found');
                return;
            }
        }
        if (pathname.startsWith('/public/audio/') || pathname.startsWith('/audio/')) {
            const rawFileName = path.basename(pathname);
            if (/^[\w-]+\.mp3$/.test(rawFileName)) {
                try {
                    const audioBuffer = await fs.readFile(path.join(__dirname, 'public', 'audio', rawFileName)).catch(() => fs.readFile(path.join(__dirname, '..', 'public', 'audio', rawFileName)));
                    response.writeHead(200, {
                        'Content-Type': 'audio/mpeg',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=86400',
                        'Content-Length': audioBuffer.length,
                        'Accept-Ranges': 'bytes'
                    });
                    response.end(request.method === 'HEAD' ? undefined : audioBuffer);
                    return;
                } catch {
                    response.writeHead(404).end('Not found');
                    return;
                }
            }
        }
        const asset = FILES.get(pathname);
        if (!asset) {
            response.writeHead(404).end('Not found');
            return;
        }
        try {
            const content = await fs.readFile(path.join(__dirname, asset[0]));
            response.writeHead(200, {
                'Content-Type': asset[1],
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff'
            });
            response.end(request.method === 'HEAD' ? undefined : content);
        } catch {
            response.writeHead(500).end('Unable to read asset');
        }
    });
    const clients = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
    const resumableSessions = new Map();
    server.on('upgrade', (request, socket, head) => {
        const requestUrl = new URL(request.url, 'http://localhost');
        const requestedVoice = requestUrl.searchParams.get('voice') || voice;
        const sessionId = requestUrl.searchParams.get('session');
        const expectsInit = requestUrl.pathname === '/ws' || requestUrl.searchParams.get('handshake') === 'init';
        if (sessionId && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(sessionId)) {
            socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
            return;
        }
        if (!['Kore', 'Puck'].includes(requestedVoice)) {
            socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
            return;
        }
        const port = server.address()?.port;
        const localHosts = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`];
        const allowedOrigins = localHosts.map(host => `http://${host}`);
        if (publicOrigin) {
            localHosts.push(new URL(publicOrigin).host);
            allowedOrigins.push(publicOrigin);
        }
        allowedOrigins.push(...trustedOrigins);
        if (!authorized(request)) {
            socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
            return;
        }
        if (!['/', '/ws', '/ws/gemini-live', '/ws/transcribe'].includes(requestUrl.pathname) || !localHosts.includes(request.headers.host) ||
            (request.headers.origin && !allowedOrigins.includes(request.headers.origin))) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        if (clients.clients.size >= maxConnections) {
            socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
            return;
        }
        clients.handleUpgrade(request, socket, head, client => clients.emit('connection', client, requestedVoice, sessionId, requestUrl.pathname === '/ws/transcribe', expectsInit));
    });

    clients.on('connection', (client, requestedVoice, sessionId, transcriptionOnly = false, expectsInit = false) => {
        for (const [key, session] of resumableSessions) if (session.expiresAt <= Date.now()) resumableSessions.delete(key);
        const resumeKey = sessionId ? `${sessionId}:${requestedVoice}` : undefined;
        const resumeHandle = resumableSessions.get(resumeKey)?.handle;
        let upstream;
        let ready = false;
        let ended = false;
        let setupTimer;
        let alive = true;
        let upstreamAlive = true;
        // INIT_SESSION handshake: setup waits for the client's lesson context (or the init timeout).
        const awaitingInit = expectsInit && !transcriptionOnly;
        let sessionInit = awaitingInit ? undefined : null;
        let upstreamOpened = false;
        let setupSent = false;
        let teachingMode = false;
        let teachingKickoff;
        let hasGreeted = Boolean(resumeHandle);
        let initTimer;
        const noTrace = { event() { }, clientAudio() { }, modelMessage() { }, close() { } };
        const trace = latencyLog ? createLatencyTrace({ log: latencyLogger }) : noTrace;
        trace.event('session_open', { mode: transcriptionOnly ? 'transcribe' : 'live' });
        let clientPingAt;
        let upstreamPingAt;
        const sessionTimer = setTimeout(() => fail('Your conversation time limit was reached. Start a new session.'), maxSessionMs);
        const heartbeat = setInterval(() => {
            if (!alive) return client.terminate();
            alive = false;
            if (client.readyState === WebSocket.OPEN) { clientPingAt = performance.now(); client.ping(); }
            if (upstream?.readyState === WebSocket.OPEN) {
                if (!upstreamAlive) return fail('Gemini heartbeat timed out. Reconnecting.', true);
                upstreamAlive = false;
                upstreamPingAt = performance.now();
                upstream.ping();
            }
        }, heartbeatInterval);
        sessionTimer.unref();
        heartbeat.unref();
        client.on('pong', () => {
            alive = true;
            if (clientPingAt !== undefined) trace.event('client_rtt', { ms: Math.round(performance.now() - clientPingAt) });
            clientPingAt = undefined;
        });
        const send = message => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
        };
        const redact = value => apiKey ? String(value).split(apiKey).join('[redacted]') : String(value);
        const stopUpstream = () => {
            clearTimeout(setupTimer);
            clearTimeout(initTimer);
            if (!upstream) return;
            if (upstream.readyState === WebSocket.CONNECTING) upstream.terminate();
            else if (upstream.readyState === WebSocket.OPEN) upstream.close();
        };
        const fail = (message, retryable = false) => {
            if (ended) return;
            ended = true;
            send({ error: { message: redact(message), retryable } });
            client.close(1011, 'Gemini session ended');
            stopUpstream();
        };
        client.on('error', stopUpstream);
        client.on('close', (code, reason) => {
            clearTimeout(sessionTimer);
            clearInterval(heartbeat);
            if (code === 1000 && reason.toString() === 'User ended call') resumableSessions.delete(resumeKey);
            ended = true;
            trace.close(`client closed (${code})`);
            stopUpstream();
        });
        if (!apiKey?.trim()) {
            fail('GEMINI_API_KEY is missing. Set it in gemini-live-test/.env and restart the server.');
            return;
        }

        const url = new URL(upstreamUrl);
        url.searchParams.set('key', apiKey);
        upstream = new WebSocket(url, { handshakeTimeout: 10000, maxPayload: 4 * MAX_BUFFER });
        upstream.on('pong', () => {
            upstreamAlive = true;
            if (upstreamPingAt !== undefined) trace.event('gemini_rtt', { ms: Math.round(performance.now() - upstreamPingAt) });
            upstreamPingAt = undefined;
        });
        setupTimer = setTimeout(() => fail('Gemini setup timed out. Check your key and model availability.', true), 15000);
        const sendSetup = async () => {
            if (setupSent || !upstreamOpened || sessionInit === undefined) return;
            setupSent = true;
            clearTimeout(initTimer);
            try {
                const { createSetup, createTranscriptionSetup } = await import('./live-service.mjs');
                const teaching = sessionInit && await import('./teaching-prompt.mjs');
                if (ended) return stopUpstream();
                teachingMode = Boolean(teaching) && teaching.normalizeSessionMode(sessionInit.mode) === teaching.SESSION_MODES.TEACHING;
                if (teachingMode) teachingKickoff = teaching.createTeachingKickoff(sessionInit.context);
                const setupOptions = { silenceDurationMs: vadSilenceMs };
                if (teachingMode) setupOptions.systemInstruction = teaching.buildTeachingInstruction(sessionInit.context);
                const setup = transcriptionOnly
                    ? createTranscriptionSetup(options.transcriptionLiveModel ?? process.env.GEMINI_TRANSCRIPTION_LIVE_MODEL ?? DEFAULT_MODEL, { silenceDurationMs: transcriptionSilenceMs })
                    : createSetup(model, requestedVoice, setupOptions);
                if (resumeHandle) setup.setup.sessionResumption.handle = resumeHandle;
                upstream.send(JSON.stringify(setup));
                trace.event('setup_sent');
            } catch {
                fail('Unable to initialize the voice tutor session.');
            }
        };
        if (awaitingInit) initTimer = setTimeout(() => {
            if (sessionInit !== undefined) return;
            send({ type: 'session-warning', message: '학습 정보를 받지 못해 기본 인사 표현으로 복습을 시작합니다.' });
            sessionInit = { mode: 'TEACHING', context: null };
            sendSetup();
        }, initTimeoutMs);
        upstream.on('open', () => {
            trace.event('upstream_open');
            upstreamOpened = true;
            sendSetup();
        });
        upstream.on('message', data => {
            if (ended) return;
            const receivedAt = performance.now();
            let message;
            try { message = JSON.parse(data.toString()); }
            catch { return fail('Gemini returned an invalid JSON message.'); }
            if (message.error) {
                if (resumeHandle && !ready) {
                    resumableSessions.delete(resumeKey);
                    return fail('Previous session could not be resumed. Starting a fresh session.', true);
                }
                return fail(message.error.message || 'Gemini API error', [429, 500, 502, 503, 504].includes(Number(message.error.code)));
            }
            const resumption = message.sessionResumptionUpdate;
            if (resumeKey && resumption) {
                if (resumption.resumable && typeof resumption.newHandle === 'string' && resumption.newHandle.length <= 8192) {
                    resumableSessions.delete(resumeKey);
                    resumableSessions.set(resumeKey, { handle: resumption.newHandle, expiresAt: Date.now() + 120000 });
                    while (resumableSessions.size > 100) resumableSessions.delete(resumableSessions.keys().next().value);
                } else resumableSessions.delete(resumeKey);
            }
            if (message.setupComplete) {
                const firstSetup = !ready;
                ready = true;
                trace.event('setup_complete');
                clearTimeout(setupTimer);
                // Teaching mode: Dayna greets first. A resumed session already has its greeting in history.
                if (firstSetup && teachingMode && !hasGreeted && upstream.readyState === WebSocket.OPEN) {
                    hasGreeted = true;
                    try { upstream.send(JSON.stringify(teachingKickoff)); trace.event('kickoff_sent'); }
                    catch { return fail('Unable to start the teaching conversation.'); }
                }
            }
            if (transcriptionOnly && message.serverContent?.modelTurn) {
                const { modelTurn, ...content } = message.serverContent;
                message = { ...message, serverContent: content };
                if (!content.inputTranscription && !content.outputTranscription && !content.turnComplete && !content.interrupted) return;
            }
            if (client.bufferedAmount > MAX_BUFFER) return fail('Audio playback connection is too slow. Reconnect.', true);
            send(message);
            trace.modelMessage(message, performance.now() - receivedAt, client.bufferedAmount);
        });
        upstream.on('error', () => fail('Gemini connection failed. Check the API key, network, and model availability.', true));
        upstream.on('close', (code, reason) => {
            if (ended) return;
            if (resumeHandle && !ready) {
                resumableSessions.delete(resumeKey);
                return fail('Previous session could not be resumed. Starting a fresh session.', true);
            }
            if (code !== 1000) return fail(`Gemini closed the session (${code}): ${redact(reason.toString()) || 'Check model availability and API permissions.'}`, [1001, 1006, 1011, 1012, 1013].includes(code));
            ended = true;
            clearTimeout(setupTimer);
            client.close(1000, 'Gemini session completed');
        });
        client.on('message', (data, isBinary) => {
            const receivedAt = performance.now();
            let message;
            try { message = isBinary ? null : JSON.parse(data.toString()); }
            catch { message = null; }
            if (message?.type === 'ping' && Number.isSafeInteger(message.id) && message.id > 0) {
                alive = true;
                send({ type: 'pong', id: message.id });
                return;
            }
            if (message?.type === 'INIT_SESSION') {
                // Only the first handshake on an opted-in connection counts; later copies are ignored.
                if (awaitingInit && sessionInit === undefined) {
                    sessionInit = { mode: message.mode, context: message.context };
                    trace.event('init_received');
                    sendSetup();
                }
                return;
            }
            if (!ready || upstream.readyState !== WebSocket.OPEN) {
                send({ error: { message: 'Wait for setupComplete before sending audio.' } });
                return;
            }
            const content = message?.clientContent;
            const text = content?.turns?.[0]?.parts?.[0]?.text;
            if (content?.turnComplete === true && content.turns?.length === 1 && content.turns[0].role === 'user' &&
                content.turns[0].parts?.length === 1 && typeof text === 'string' && text.length > 0 && text.length <= 500) {
                if (upstream.bufferedAmount > MAX_BUFFER) return fail('Gemini connection is too slow. Reconnect.', true);
                upstream.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }));
                return;
            }
            const input = message?.realtimeInput ?? message?.realtime_input;
            const chunk = (input?.mediaChunks ?? input?.media_chunks)?.[0];
            const audio = input?.audio ?? (chunk && { data: chunk.data, mimeType: chunk.mimeType ?? chunk.mime_type });
            const validAudio = audio && audio.mimeType === 'audio/pcm;rate=16000' &&
                typeof audio.data === 'string' && audio.data.length > 0 &&
                audio.data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(audio.data) &&
                Buffer.from(audio.data, 'base64').length % 2 === 0;
            if (!validAudio && input?.audioStreamEnd !== true) {
                send({ error: { message: 'Expected 16 kHz PCM Base64 audio or audioStreamEnd.' } });
                return;
            }
            if (upstream.bufferedAmount > MAX_BUFFER) return fail('Gemini connection is too slow. Reconnect.', true);
            upstream.send(JSON.stringify({
                realtimeInput: validAudio
                    ? { audio: { mimeType: audio.mimeType, data: audio.data } }
                    : { audioStreamEnd: true }
            }));
            if (validAudio) trace.clientAudio(performance.now() - receivedAt, upstream.bufferedAmount);
            else trace.event('audio_stream_end');
        });
    });

    return {
        server, clients, close: async () => {
            resumableSessions.clear();
            for (const client of clients.clients) client.terminate();
            await new Promise(resolve => clients.close(resolve));
            if (server.listening) await new Promise(resolve => server.close(resolve));
        }
    };
}

if (require.main === module) {
    const relay = createRelayServer();
    const port = Number(process.env.PORT) || 8080;
    const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    relay.server.on('error', error => {
        console.error(error.code === 'EADDRINUSE'
            ? `Port ${port} is in use. Stop that process before running this server.`
            : `Server failed: ${error.code || 'unknown error'}`);
        process.exitCode = 1;
    });
    relay.server.listen(port, host, () => {
        console.log(`Gemini Live relay listening on ${host}:${port}`);
        if (!process.env.GEMINI_API_KEY?.trim()) console.warn('Set GEMINI_API_KEY in gemini-live-test/.env before starting a conversation.');
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => relay.close());
}

module.exports = { createRelayServer };