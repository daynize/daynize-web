import { PcmResampler } from './audio.mjs';

class MicrophoneProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.resampler = new PcmResampler(sampleRate);
        this.speechFrames = 0;
        this.port.onmessage = () => {
            this.resampler = new PcmResampler(sampleRate);
            this.speechFrames = 0;
        };
    }

    process(inputs) {
        const samples = inputs[0]?.[0];
        if (samples) {
            let energy = 0;
            for (const sample of samples) energy += sample * sample;
            const rms = Math.sqrt(energy / samples.length);
            this.speechFrames = rms > 0.025 ? this.speechFrames + samples.length : 0;
            if (this.speechFrames >= sampleRate * 0.06) {
                this.port.postMessage({ type: 'speech' });
                this.speechFrames = 0;
            }
            this.resampler.push(samples, chunk => this.port.postMessage(chunk, [chunk.buffer]));
        }
        return true;
    }
}

registerProcessor('microphone-pcm', MicrophoneProcessor);