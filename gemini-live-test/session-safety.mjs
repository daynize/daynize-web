export const SESSION_LIMIT_MS = 600000;
export const SILENCE_WARNING_MS = 45000;
export const SILENCE_LIMIT_MS = 60000;
export const SPEECH_RMS_THRESHOLD = 0.008;
// User quiet for this long after speaking = end of speech; the tutor is now expected to answer.
export const END_OF_SPEECH_MS = 500;
// A reply that never starts must not keep the call paused forever.
export const THINKING_MAX_MS = 60000;
// Output queue empty and no turn_complete/onended arrived: the stream stalled.
export const SPEAKING_STALL_MS = 8000;
// Timers frozen/throttled (mobile background, screen lock) longer than this is not user silence.
export const CLOCK_GAP_MS = 5000;

export const PHASES = Object.freeze({ IDLE: 'IDLE', LISTENING: 'LISTENING', THINKING: 'THINKING', SPEAKING: 'SPEAKING' });

// Inactivity (warning / auto-end) is only ever counted in LISTENING. In IDLE,
// THINKING and SPEAKING the countdown is held at zero; entering LISTENING
// always restarts it from zero. The 10 minute wall-clock limit always applies.
export class SessionSafety {
    constructor(now) {
        this.startedAt = now;
        this.lastSoundAt = now;
        this.phase = PHASES.IDLE;
        this.phaseSince = now;
        this.lastAudioAt = now;
        this.lastCheckAt = now;
        this.userSpoke = false;
    }

    setPhase(phase, now) {
        if (phase === this.phase) return;
        this.phase = phase;
        this.phaseSince = now;
        this.lastSoundAt = now;
        this.userSpoke = false;
        if (phase === PHASES.SPEAKING) this.lastAudioAt = now;
    }

    noteAudio(now) {
        this.lastAudioAt = now;
    }

    // Visibility return / clock jump: time spent away is never user silence.
    resetActivity(now) {
        this.lastSoundAt = now;
        this.phaseSince = now;
        this.lastCheckAt = now;
    }

    check(now, rms = 0, outputActive = false) {
        const speech = Number.isFinite(rms) && rms >= SPEECH_RMS_THRESHOLD;
        if (now - this.lastCheckAt > CLOCK_GAP_MS) this.resetActivity(now);
        this.lastCheckAt = now;
        // Any queued/playing output chunk means the tutor is speaking, no exceptions.
        if (outputActive && this.phase !== PHASES.SPEAKING) this.setPhase(PHASES.SPEAKING, now);
        if (this.phase === PHASES.LISTENING) {
            if (speech) {
                this.lastSoundAt = now;
                this.userSpoke = true;
            } else if (this.userSpoke && now - this.lastSoundAt >= END_OF_SPEECH_MS) {
                this.setPhase(PHASES.THINKING, now);
            }
        } else if (this.phase === PHASES.THINKING) {
            if (speech) {
                this.setPhase(PHASES.LISTENING, now);
                this.userSpoke = true;
            } else if (now - this.phaseSince >= THINKING_MAX_MS) this.setPhase(PHASES.LISTENING, now);
        } else if (this.phase === PHASES.SPEAKING) {
            if (outputActive) this.lastAudioAt = now;
            else if (now - Math.max(this.lastAudioAt, this.phaseSince) >= SPEAKING_STALL_MS) this.setPhase(PHASES.LISTENING, now);
        }
        if (this.phase !== PHASES.LISTENING) this.lastSoundAt = now;
        const elapsed = Math.max(0, now - this.startedAt);
        // Double check: the countdown can only exist in LISTENING with an empty output queue.
        const silent = this.phase === PHASES.LISTENING && !outputActive ? Math.max(0, now - this.lastSoundAt) : 0;
        return {
            phase: this.phase,
            elapsed,
            silent,
            warning: silent >= SILENCE_WARNING_MS,
            remaining: Math.max(0, Math.ceil((SILENCE_LIMIT_MS - silent) / 1000)),
            reason: elapsed >= SESSION_LIMIT_MS ? 'timeout' : silent >= SILENCE_LIMIT_MS ? 'silence' : undefined
        };
    }
}
