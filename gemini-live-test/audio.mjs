// Microphone packets sent to the model: 640 samples @ 16 kHz = 40 ms (1280 PCM bytes).
export const MIC_CHUNK_SAMPLES = 640;

export class PcmResampler {
    constructor(inputRate, outputRate = 16000, chunkSize = 1600) {
        this.ratio = inputRate / outputRate;
        this.remaining = this.ratio;
        this.sum = 0;
        this.chunk = new Float32Array(chunkSize);
        this.offset = 0;
    }

    push(samples, emit) {
        for (const sample of samples) {
            let available = 1;
            while (available > 1e-9) {
                const weight = Math.min(available, this.remaining);
                this.sum += sample * weight;
                this.remaining -= weight;
                available -= weight;
                if (this.remaining < 1e-9) {
                    this.chunk[this.offset++] = this.sum / this.ratio;
                    this.sum = 0;
                    this.remaining = this.ratio;
                    if (this.offset === this.chunk.length) {
                        const completed = this.chunk;
                        this.chunk = new Float32Array(this.chunk.length);
                        this.offset = 0;
                        emit(completed);
                    }
                }
            }
        }
    }
}

// Treats ambient/mobile-mic noise as digital silence so server-side VAD can
// detect end of speech quickly. The floor adapts to the environment; a short
// hangover keeps word endings and brief pauses intact.
export class NoiseGate {
    constructor(sampleRate, { minThreshold = 0.006, maxThreshold = 0.03, multiplier = 3, hangoverSeconds = 0.25, initialFloor = 0.003 } = {}) {
        this.minThreshold = minThreshold;
        this.maxThreshold = maxThreshold;
        this.multiplier = multiplier;
        this.hangoverSamples = Math.round(sampleRate * hangoverSeconds);
        this.floor = initialFloor;
        this.hangover = 0;
    }

    get threshold() {
        return Math.min(this.maxThreshold, Math.max(this.minThreshold, this.floor * this.multiplier));
    }

    // Returns true while the signal should be passed through.
    process(samples) {
        let energy = 0;
        for (const sample of samples) energy += sample * sample;
        const rms = Math.sqrt(energy / (samples.length || 1));
        if (rms >= this.threshold) {
            this.hangover = this.hangoverSamples;
            return true;
        }
        this.floor = this.floor * 0.995 + rms * 0.005;
        if (this.hangover > 0) {
            this.hangover -= samples.length;
            return true;
        }
        return false;
    }
}

export function encodePcm(samples) {
    const bytes = new Uint8Array(samples.length * 2);
    const view = new DataView(bytes.buffer);
    for (let index = 0; index < samples.length; index++) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        view.setInt16(index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
    }
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

export function decodePcm(base64) {
    const binary = atob(base64);
    if (binary.length % 2 !== 0) throw new Error('Invalid PCM byte length');
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const samples = new Float32Array(bytes.length / 2);
    for (let index = 0; index < samples.length; index++) samples[index] = view.getInt16(index * 2, true) / 32768;
    return samples;
}