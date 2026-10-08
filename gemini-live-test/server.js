const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { WebSocket, WebSocketServer } = require('ws');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const GEMINI_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
const DEFAULT_MODEL = 'gemini-2.0-flash-exp';
const MAX_BUFFER = 1024 * 1024;
const FILES = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/audio.mjs', ['audio.mjs', 'text/javascript; charset=utf-8']],
    ['/pcm-worklet.mjs', ['pcm-worklet.mjs', 'text/javascript; charset=utf-8']],
    ...['live-service.mjs', 'audio-engine.mjs', 'tutor-widget.mjs', 'daynize-tutor.mjs'].map(file => [`/${file}`, [file, 'text/javascript; charset=utf-8']]),
    ['/tutor.css', ['tutor.css', 'text/css; charset=utf-8']],
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
    const upstreamUrl = options.upstreamUrl ?? GEMINI_ENDPOINT;
    const voice = options.voice ?? process.env.GEMINI_VOICE ?? 'Kore';
    if (!['Kore', 'Puck'].includes(voice)) throw new Error('GEMINI_VOICE must be Kore or Puck.');
    const trustedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    for (const origin of trustedOrigins) {
        if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('ALLOWED_ORIGINS must contain exact HTTPS origins.');
    }
    const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN;
    const authorizeRequest = options.authorizeRequest;
    const maxConnections = options.maxConnections ?? 8;
    const maxSessionMs = options.maxSessionMs ?? 15 * 60 * 1000;
    if (!Number.isInteger(maxConnections) || maxConnections < 1 || !Number.isFinite(maxSessionMs) || maxSessionMs < 1000) {
        throw new Error('Invalid connection or session limits.');
    }
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
    const server = http.createServer(async (request, response) => {
        if (!authorized(request)) {
            response.writeHead(401, { 'Cache-Control': 'no-store' }).end('Authentication required');
            return;
        }
        if (!['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(405).end();
            return;
        }
        const asset = FILES.get(request.url.split('?')[0]);
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
    server.on('upgrade', (request, socket, head) => {
        const requestUrl = new URL(request.url, 'http://localhost');
        const requestedVoice = requestUrl.searchParams.get('voice') || voice;
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
        if (!['/', '/ws/gemini-live'].includes(requestUrl.pathname) || !localHosts.includes(request.headers.host) ||
            (request.headers.origin && !allowedOrigins.includes(request.headers.origin))) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        if (clients.clients.size >= maxConnections) {
            socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
            return;
        }
        clients.handleUpgrade(request, socket, head, client => clients.emit('connection', client, requestedVoice));
    });

    clients.on('connection', (client, requestedVoice) => {
        let upstream;
        let ready = false;
        let ended = false;
        let setupTimer;
        let alive = true;
        const sessionTimer = setTimeout(() => fail('Your conversation time limit was reached. Start a new session.'), maxSessionMs);
        const heartbeat = setInterval(() => {
            if (!alive) return client.terminate();
            alive = false;
            if (client.readyState === WebSocket.OPEN) client.ping();
        }, 30000);
        sessionTimer.unref();
        heartbeat.unref();
        client.on('pong', () => { alive = true; });
        const send = message => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
        };
        const redact = value => apiKey ? String(value).split(apiKey).join('[redacted]') : String(value);
        const stopUpstream = () => {
            clearTimeout(setupTimer);
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
        client.on('close', () => {
            clearTimeout(sessionTimer);
            clearInterval(heartbeat);
            ended = true;
            stopUpstream();
        });
        if (!apiKey?.trim()) {
            fail('GEMINI_API_KEY is missing. Set it in gemini-live-test/.env and restart the server.');
            return;
        }

        const url = new URL(upstreamUrl);
        url.searchParams.set('key', apiKey);
        upstream = new WebSocket(url, { handshakeTimeout: 10000, maxPayload: 4 * MAX_BUFFER });
        setupTimer = setTimeout(() => fail('Gemini setup timed out. Check your key and model availability.', true), 15000);
        upstream.on('open', async () => {
            try {
                const { createSetup } = await import('./live-service.mjs');
                if (ended) return stopUpstream();
                upstream.send(JSON.stringify(createSetup(model, requestedVoice)));
            } catch {
                fail('Unable to initialize the voice tutor session.');
            }
        });
        upstream.on('message', data => {
            if (ended) return;
            let message;
            try { message = JSON.parse(data.toString()); }
            catch { return fail('Gemini returned an invalid JSON message.'); }
            if (message.error) return fail(message.error.message || 'Gemini API error');
            if (message.setupComplete) {
                ready = true;
                clearTimeout(setupTimer);
            }
            if (client.bufferedAmount > MAX_BUFFER) return fail('Audio playback connection is too slow. Reconnect.');
            send(message);
        });
        upstream.on('error', () => fail('Gemini connection failed. Check the API key, network, and model availability.', true));
        upstream.on('close', (code, reason) => {
            if (ended) return;
            if (code !== 1000) return fail(`Gemini closed the session (${code}): ${redact(reason.toString()) || 'Check model availability and API permissions.'}`, [1001, 1006, 1011, 1012, 1013].includes(code));
            ended = true;
            clearTimeout(setupTimer);
            client.close(1000, 'Gemini session completed');
        });
        client.on('message', (data, isBinary) => {
            if (!ready || upstream.readyState !== WebSocket.OPEN) {
                send({ error: { message: 'Wait for setupComplete before sending audio.' } });
                return;
            }
            let message;
            try { message = isBinary ? null : JSON.parse(data.toString()); }
            catch { message = null; }
            const content = message?.clientContent;
            const text = content?.turns?.[0]?.parts?.[0]?.text;
            if (content?.turnComplete === true && content.turns?.length === 1 && content.turns[0].role === 'user' &&
                content.turns[0].parts?.length === 1 && typeof text === 'string' && text.length > 0 && text.length <= 500) {
                if (upstream.bufferedAmount > MAX_BUFFER) return fail('Gemini connection is too slow. Reconnect.');
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
            if (upstream.bufferedAmount > MAX_BUFFER) return fail('Gemini connection is too slow. Reconnect.');
            upstream.send(JSON.stringify({
                realtimeInput: validAudio
                    ? { audio: { mimeType: audio.mimeType, data: audio.data } }
                    : { audioStreamEnd: true }
            }));
        });
    });

    return {
        server, clients, close: async () => {
            for (const client of clients.clients) client.terminate();
            await new Promise(resolve => clients.close(resolve));
            if (server.listening) await new Promise(resolve => server.close(resolve));
        }
    };
}

if (require.main === module) {
    const relay = createRelayServer();
    relay.server.on('error', error => {
        console.error(error.code === 'EADDRINUSE'
            ? 'Port 8080 is in use. Stop that process before running this test server.'
            : `Server failed: ${error.code || 'unknown error'}`);
        process.exitCode = 1;
    });
    relay.server.listen(8080, '127.0.0.1', () => {
        console.log('Gemini Live test: http://localhost:8080 (WebSocket: ws://localhost:8080)');
        if (!process.env.GEMINI_API_KEY?.trim()) console.warn('Set GEMINI_API_KEY in gemini-live-test/.env before starting a conversation.');
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => relay.close());
}

module.exports = { createRelayServer };