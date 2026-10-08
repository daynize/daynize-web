const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const blend = (start, end, amount) => start.map((value, index) => Math.round(value + (end[index] - value) * amount));
const color = (values, opacity) => `rgba(${values.join(',')},${opacity})`;

export class OrbMotion {
    constructor() {
        this.input = 0;
        this.output = 0;
        this.warmth = 0;
        this.phase = 0;
        this.time = 0;
    }

    step({ input = 0, output = 0, speaking = false, thinking = false, reduced = false, delta = 1 / 60 } = {}) {
        const duration = Math.max(0, Math.min(0.05, Number.isFinite(delta) ? delta : 0));
        const damping = 1 - Math.exp(-duration / 0.65);
        this.input += (clamp(input) - this.input) * damping;
        this.output += (clamp(output) - this.output) * damping;
        this.warmth += ((speaking || thinking ? 1 : 0) - this.warmth) * damping;
        const activity = Math.max(this.input, this.output);
        if (!reduced) {
            this.time += duration;
            this.phase += duration * (0.45 + 0.35 * activity + 0.08 * this.warmth);
        }
        return {
            phase: this.phase,
            breath: reduced ? 0 : Math.sin(this.time * Math.PI * 2 * 0.24) * 0.55,
            ripple: reduced ? 0 : Math.min(2.4, this.input * 1.5 + this.output * 0.9),
            warmth: this.warmth,
            mist: reduced ? 0 : this.input * 0.035,
            glow: 0.15 + this.warmth * 0.045 + activity * 0.15
        };
    }
}

export class AmbientOrb {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.surface = document.createElement('canvas');
        this.paint = this.surface.getContext('2d');
        this.motion = new OrbMotion();
        this.resize();
    }

    resize() {
        const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(64 * ratio);
        this.canvas.height = Math.round(64 * ratio);
        this.surface.width = this.canvas.width;
        this.surface.height = this.canvas.height;
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.paint.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.lastTimestamp = undefined;
    }

    render({ timestamp, input = 0, output = 0, state = 'idle', reduced = false }) {
        const delta = this.lastTimestamp === undefined ? 0 : (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        const motion = this.motion.step({ input, output, speaking: state === 'speaking', thinking: state === 'waiting', reduced, delta });
        const context = this.paint;
        const radius = 23 + motion.breath;
        const emerald = blend([78, 218, 161], [128, 204, 152], motion.warmth);
        const gold = blend([238, 204, 123], [245, 187, 116], motion.warmth);
        context.clearRect(0, 0, 64, 64);
        context.save();
        context.globalAlpha = 0.8;
        const halo = context.createRadialGradient(32, 32, 14, 32, 32, 31);
        halo.addColorStop(0, color(emerald, motion.glow));
        halo.addColorStop(0.65, color(emerald, motion.glow * 0.5));
        halo.addColorStop(1, color(gold, 0));
        context.fillStyle = halo;
        context.fillRect(0, 0, 64, 64);
        if (motion.mist > 0.001) {
            context.filter = 'blur(5px)';
            const mist = context.createRadialGradient(30, 17, 0, 30, 17, 16);
            mist.addColorStop(0, color(emerald, motion.mist));
            mist.addColorStop(1, color(emerald, 0));
            context.fillStyle = mist;
            context.fillRect(6, 2, 52, 44);
        }
        context.filter = 'none';
        context.beginPath();
        for (let index = 0; index <= 96; index++) {
            const angle = index / 96 * Math.PI * 2;
            const ripple = Math.sin(angle * 3 + motion.phase) * motion.ripple * 0.45 + Math.sin(angle * 5 - motion.phase * 0.7) * motion.ripple * 0.25;
            const distance = radius + ripple;
            const horizontal = 32 + Math.cos(angle) * distance;
            const vertical = 32 + Math.sin(angle) * distance;
            if (index === 0) context.moveTo(horizontal, vertical); else context.lineTo(horizontal, vertical);
        }
        context.closePath();
        context.save();
        context.clip();
        const glass = context.createRadialGradient(25, 21, 1, 32, 32, 25);
        glass.addColorStop(0, 'rgba(255,255,255,0.42)');
        glass.addColorStop(0.7, 'rgba(227,239,232,0.22)');
        glass.addColorStop(1, 'rgba(231,240,235,0.03)');
        context.fillStyle = glass;
        context.fillRect(6, 6, 52, 52);
        context.filter = 'blur(6px)';
        for (let layer = 0; layer < 3; layer++) {
            const angle = motion.phase + layer * 2.1;
            const horizontal = 32 + Math.cos(angle) * 12;
            const vertical = 32 + Math.sin(angle) * 10;
            const tint = layer === 1 ? gold : emerald;
            const cloud = context.createRadialGradient(horizontal, vertical, 0, horizontal, vertical, 23);
            cloud.addColorStop(0, color(tint, 0.4 + motion.glow * 0.45));
            cloud.addColorStop(0.55, color(tint, 0.18));
            cloud.addColorStop(1, color(tint, 0));
            context.fillStyle = cloud;
            context.fillRect(0, 0, 64, 64);
        }
        context.save();
        context.translate(32, 32);
        context.rotate(motion.phase);
        context.filter = 'blur(1px)';
        context.globalCompositeOperation = 'screen';
        for (let ribbon = 0; ribbon < 4; ribbon++) {
            context.beginPath();
            context.ellipse(0, 0, 18 - ribbon * 1.3, 7 + ribbon * 2, ribbon * 0.5, 0.3, Math.PI * 1.7);
            context.strokeStyle = color(ribbon % 2 ? gold : emerald, 0.38 + motion.glow * 0.5);
            context.lineWidth = 1.7;
            context.stroke();
        }
        context.restore();
        context.filter = 'blur(2px)';
        const reflection = context.createRadialGradient(24, 17, 0, 24, 17, 10);
        reflection.addColorStop(0, 'rgba(255,255,255,0.25)');
        reflection.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = reflection;
        context.fillRect(10, 5, 30, 30);
        context.restore();
        context.filter = 'blur(0.9px)';
        context.strokeStyle = 'rgba(134,164,148,0.12)';
        context.lineWidth = 0.7;
        context.stroke();
        context.restore();
        this.context.clearRect(0, 0, 64, 64);
        this.context.save();
        this.context.globalAlpha = 0.7;
        this.context.drawImage(this.surface, 0, 0, 64, 64);
        this.context.restore();
        return motion;
    }
}