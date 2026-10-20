const { randomBytes } = require('node:crypto');

const MODEL_AUDIO = /^audio\/pcm/;

function isModelAudio(message) {
    return Boolean(message?.serverContent?.modelTurn?.parts?.some(part => MODEL_AUDIO.test(part?.inlineData?.mimeType ?? '')));
}

// Per-session latency tracing for the relay. Emits one JSON line per milestone and one
// aggregated line every `summaryMs` (no per-chunk logging, no audio or transcript content).
// Read the lines with `fly logs` and look for the `[latency]` prefix.
function createLatencyTrace({ log = () => { }, now = () => performance.now(), summaryMs = 10000, id = randomBytes(3).toString('hex') } = {}) {
    const startedAt = now();
    const stamp = () => Math.round(now() - startedAt);
    const fresh = () => ({
        clientChunks: 0, clientProcSumMs: 0, clientProcMaxMs: 0, clientGapMaxMs: 0, upstreamBufferedMax: 0,
        modelChunks: 0, modelFwdSumMs: 0, modelFwdMaxMs: 0, modelGapMaxMs: 0, clientBufferedMax: 0
    });
    let window = fresh();
    let windowStartedAt = startedAt;
    let lastClientAt;
    let lastModelAt;
    let kickoffAt;
    let inputAt;
    let awaitingAudio = true;
    const round = value => Math.round(value * 100) / 100;

    const emit = (event, extra = {}) => log(`[latency] ${JSON.stringify({ id, t: stamp(), event, ...extra })}`);
    const summarize = (force = false) => {
        const current = now();
        if (!force && current - windowStartedAt < summaryMs) return;
        if (window.clientChunks || window.modelChunks || force) {
            emit('summary', {
                windowMs: Math.round(current - windowStartedAt),
                clientToUpstream: {
                    chunks: window.clientChunks,
                    relayAvgMs: window.clientChunks ? round(window.clientProcSumMs / window.clientChunks) : 0,
                    relayMaxMs: round(window.clientProcMaxMs),
                    arrivalGapMaxMs: Math.round(window.clientGapMaxMs),
                    upstreamBufferedMaxBytes: window.upstreamBufferedMax
                },
                upstreamToClient: {
                    chunks: window.modelChunks,
                    relayAvgMs: window.modelChunks ? round(window.modelFwdSumMs / window.modelChunks) : 0,
                    relayMaxMs: round(window.modelFwdMaxMs),
                    arrivalGapMaxMs: Math.round(window.modelGapMaxMs),
                    clientBufferedMaxBytes: window.clientBufferedMax
                }
            });
        }
        window = fresh();
        windowStartedAt = current;
    };

    return {
        id,
        event(name, extra) {
            if (name === 'kickoff_sent') kickoffAt = now();
            emit(name, extra);
        },
        // Browser -> relay -> Gemini: relay processing time for one microphone chunk.
        clientAudio(processingMs, upstreamBufferedBytes = 0) {
            const current = now();
            if (lastClientAt !== undefined) window.clientGapMaxMs = Math.max(window.clientGapMaxMs, current - lastClientAt);
            lastClientAt = current;
            window.clientChunks++;
            window.clientProcSumMs += processingMs;
            window.clientProcMaxMs = Math.max(window.clientProcMaxMs, processingMs);
            window.upstreamBufferedMax = Math.max(window.upstreamBufferedMax, upstreamBufferedBytes);
            summarize();
        },
        // Gemini -> relay -> browser: arrival timing, relay forwarding time and turn milestones.
        modelMessage(message, forwardMs, clientBufferedBytes = 0) {
            const current = now();
            const content = message?.serverContent;
            if (content?.inputTranscription) inputAt = current;
            if (isModelAudio(message)) {
                if (lastModelAt !== undefined) window.modelGapMaxMs = Math.max(window.modelGapMaxMs, current - lastModelAt);
                lastModelAt = current;
                window.modelChunks++;
                window.modelFwdSumMs += forwardMs;
                window.modelFwdMaxMs = Math.max(window.modelFwdMaxMs, forwardMs);
                window.clientBufferedMax = Math.max(window.clientBufferedMax, clientBufferedBytes);
                if (awaitingAudio) {
                    awaitingAudio = false;
                    emit('first_audio', {
                        sinceKickoffMs: kickoffAt === undefined ? undefined : Math.round(current - kickoffAt),
                        sinceLastInputTranscriptionMs: inputAt === undefined ? undefined : Math.round(current - inputAt),
                        relayForwardMs: round(forwardMs)
                    });
                    kickoffAt = inputAt = undefined;
                }
            }
            if (content?.turnComplete || content?.interrupted) {
                awaitingAudio = true;
                lastModelAt = undefined;
                emit(content.interrupted ? 'interrupted' : 'turn_complete');
            }
            summarize();
        },
        close(reason) {
            summarize(true);
            emit('session_close', { reason });
        }
    };
}

module.exports = { createLatencyTrace, isModelAudio };
