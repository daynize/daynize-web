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