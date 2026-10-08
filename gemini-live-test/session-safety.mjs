export const SESSION_LIMIT_MS = 600000;
export const SILENCE_WARNING_MS = 20000;
export const SILENCE_LIMIT_MS = 30000;
export const SPEECH_RMS_THRESHOLD = 0.012;

export class SessionSafety {
    constructor(now) {
        this.startedAt = now;
        this.lastSoundAt = now;
    }

    check(now, rms = 0) {
        if (Number.isFinite(rms) && rms >= SPEECH_RMS_THRESHOLD) this.lastSoundAt = now;
        const elapsed = Math.max(0, now - this.startedAt);
        const silent = Math.max(0, now - this.lastSoundAt);
        return {
            elapsed,
            silent,
            warning: silent >= SILENCE_WARNING_MS,
            remaining: Math.max(0, Math.ceil((SILENCE_LIMIT_MS - silent) / 1000)),
            reason: elapsed >= SESSION_LIMIT_MS ? 'timeout' : silent >= SILENCE_LIMIT_MS ? 'silence' : undefined
        };
    }
}