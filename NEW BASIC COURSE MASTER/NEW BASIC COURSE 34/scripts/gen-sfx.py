"""Generates the short sound effects used by the composition (stdlib only).

Usage: python3 scripts/gen-sfx.py   (run from the course folder)
Output: public/sfx/{pop,error,whoosh,ding,glow,click,reveal_sting,drop,drop_cave,drop_plip,drop_ploop}.wav  (drop = copy of drop_ploop, used by CourseCover)
"""
import math
import os
import random
import struct
import wave

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
random.seed(7)


def write(name, samples):
    os.makedirs(OUT, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s / peak * 0.8 * 32767)) for s in samples))


def pop():
    # Rising sine "뽁" with a fast decay and a tiny second bounce
    n = int(RATE * 0.22)
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        freq = 280 + 900 * (1 - math.exp(-t * 38))
        phase += 2 * math.pi * freq / RATE
        out.append(math.sin(phase) * math.exp(-t * 20))
    return out


def error():
    n = int(RATE * 0.38)
    out = []
    for i in range(n):
        t = i / RATE
        f = 196 if t < 0.17 else 147
        sq = 1 if math.sin(2 * math.pi * f * t) > 0 else -1
        env = math.exp(-((t % 0.19)) * 9) * (1 - t / 0.4)
        out.append(sq * 0.5 * env)
    return out


def whoosh():
    n = int(RATE * 0.5)
    out, lp = [], 0.0
    for i in range(n):
        t = i / RATE
        k = 0.04 + 0.5 * math.sin(math.pi * t / 0.5) ** 2
        lp += k * (random.uniform(-1, 1) - lp)
        out.append(lp * math.sin(math.pi * t / 0.5))
    return out


def bubble(f0, f1, tau, dur, rise=0.03):
    """Air-bubble ring of a drop hitting water: pitch glides UP from f0 to f1 while it decays."""
    out, phase = [], 0.0
    for i in range(int(RATE * dur)):
        t = i / RATE
        freq = f1 - (f1 - f0) * math.exp(-t / rise)
        phase += 2 * math.pi * freq / RATE
        out.append(math.sin(phase) * math.exp(-t / tau) * min(1.0, t / 0.002))
    return out


def tick(length=0.006, level=0.35):
    """Tiny low-passed noise click: the surface impact before the bubble rings."""
    out, lp = [], 0.0
    for i in range(int(RATE * length)):
        lp += 0.35 * (random.uniform(-1, 1) - lp)
        out.append(lp * level * (1 - i / (RATE * length)))
    return out


def room(x, decay, wet, tail):
    """Small Schroeder reverb (4 damped combs + 1 allpass) -> the "drip in a hall" tail."""
    n = len(x) + int(RATE * tail)
    x = x + [0.0] * (n - len(x))
    wetsig = [0.0] * n
    for ms in (29.7, 37.1, 41.1, 43.7):
        d = int(RATE * ms / 1000)
        g = 10 ** (-3 * (ms / 1000) / decay)
        buf, lp = [0.0] * d, 0.0
        for i in range(n):
            y = buf[i % d]
            lp += 0.45 * (y - lp)
            buf[i % d] = x[i] + g * lp
            wetsig[i] += y * 0.25
    d, g = int(RATE * 0.005), 0.7
    buf = [0.0] * d
    for i in range(n):
        y = buf[i % d]
        v = wetsig[i] + g * y
        buf[i % d] = v
        wetsig[i] = y - g * v
    return [x[i] * (1 - wet * 0.5) + wetsig[i] * wet for i in range(n)]


def drop_plip():
    # Bright, small, clean droplet.
    return room(mix([(0, tick()), (0.001, bubble(1100, 2700, 0.035, 0.25))], 0.25), 0.5, 0.45, 0.25)


def echoes(x, delay, repeats, fb, tone_k=0.55):
    """Distinct repeats of the drop, each softer and duller than the last."""
    d = int(RATE * delay)
    out = x + [0.0] * (d * repeats)
    lp = 0.0
    for r in range(1, repeats + 1):
        gain = fb ** r
        for i, v in enumerate(x):
            lp += tone_k * (v - lp)
            out[i + d * r] += lp * gain
    return out


def drop_ploop():
    # Bigger drop: low "ploop" with a smaller second bubble, then three audible repeats and a long hall tail.
    dry = mix([(0, tick(0.008, 0.4)), (0.001, bubble(330, 900, 0.08, 0.4, 0.05)), (0.085, bubble(700, 1500, 0.04, 0.2))], 0.4)
    return room(echoes(dry, 0.27, 3, 0.55), 2.2, 0.8, 1.0)


def drop_cave():
    # Medium droplet with a hall tail (the earlier "drop" version).
    return room(mix([(0, tick(level=0.3)), (0.001, bubble(700, 1700, 0.05, 0.3))], 0.3), 1.3, 0.8, 0.9)


def click_hit(pitch=1.0, level=1.0):
    """One mouse-button transient: broadband tick + damped plastic resonances + short low "thock"."""
    n = int(RATE * 0.06)
    out, prev = [], 0.0
    for i in range(n):
        t = i / RATE
        noise = random.uniform(-1, 1)
        hp = noise - prev  # crude high-pass keeps only the crisp edge
        prev = noise
        tick_part = hp * 0.55 * math.exp(-t / 0.0007)
        body = (
            0.6 * math.sin(2 * math.pi * 3100 * pitch * t) * math.exp(-t / 0.0045)
            + 0.35 * math.sin(2 * math.pi * 4700 * pitch * t) * math.exp(-t / 0.0030)
            + 0.30 * math.sin(2 * math.pi * 1750 * pitch * t) * math.exp(-t / 0.0060)
        )
        thock = 0.5 * math.sin(2 * math.pi * 190 * t) * math.exp(-t / 0.008)
        out.append((tick_part + body + thock) * level)
    return out


def click():
    # Press (full) followed by the softer, higher release 70 ms later.
    return mix([(0.0, click_hit(1.0, 1.0)), (0.07, click_hit(1.25, 0.45))], 0.16)


def _smooth(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def _add(dst, start, samples, gain=1.0):
    o = int(RATE * start)
    for i, v in enumerate(samples):
        if 0 <= o + i < len(dst):
            dst[o + i] += v * gain


def _partials(freq, parts, dur, attack=0.004, detune=0.0):
    out = []
    for i in range(int(RATE * dur)):
        t = i / RATE
        a = min(1.0, t / attack)
        v = 0.0
        for ratio, amp, decay in parts:
            f = freq * ratio
            v += amp * math.exp(-t / decay) * (
                math.sin(2 * math.pi * f * t) + (math.sin(2 * math.pi * (f + detune) * t) if detune else 0.0)
            )
        out.append(v * a)
    return out


def reveal_sting():
    """3 s fantasy reveal: gong + airy swell, rising sparkles, wing whoosh + feather flutter, singing bell, golden pad."""
    total = 3.0
    N = int(RATE * total)
    mixbus = [0.0] * N

    # 0.0 s - airy swell of golden light (low-passed noise that opens up) + soft pad
    lp = 0.0
    for i in range(N):
        t = i / RATE
        env = _smooth(t / 0.5) * math.exp(-max(0.0, t - 0.5) / 0.9)
        lp += (0.02 + 0.18 * _smooth(t / 0.6)) * (random.uniform(-1, 1) - lp)
        mixbus[i] += lp * env * 1.1

    # 0.0 s - low warm temple gong strike (inharmonic partials, long decay)
    gong = _partials(98, [(1, 1.0, 2.8), (2.0, 0.6, 2.2), (2.76, 0.5, 1.6), (3.0, 0.35, 1.8), (5.4, 0.25, 1.0), (8.9, 0.12, 0.6)], 3.0, 0.003, detune=0.9)
    _add(mixbus, 0.0, gong, 0.42)

    # 0.1 s - rising crescendo of sparkling rays: pings that get denser, louder and higher
    ping_total = 85
    for k in range(ping_total):
        u = k / (ping_total - 1)
        t0 = 0.1 + 0.9 * (u ** 0.6) + random.uniform(-0.01, 0.01)
        prog = (t0 - 0.1) / 0.9
        f = 2400 + 5600 * prog + random.uniform(-500, 500)
        amp = 0.12 + 0.55 * prog
        ping = [math.sin(2 * math.pi * f * (i / RATE)) * math.exp(-(i / RATE) / 0.07) * min(1.0, (i / RATE) / 0.0012) for i in range(int(RATE * 0.3))]
        _add(mixbus, t0, ping, amp * 0.45)
    # sparkle cascade tail (sparser, softer, still glittering)
    for k in range(46):
        t0 = 1.0 + 1.3 * ((k / 45) ** 0.8) + random.uniform(-0.02, 0.02)
        f = random.uniform(3200, 9200)
        amp = 0.5 * (1 - (t0 - 1.0) / 1.5)
        ping = [math.sin(2 * math.pi * f * (i / RATE)) * math.exp(-(i / RATE) / 0.09) * min(1.0, (i / RATE) / 0.0012) for i in range(int(RATE * 0.35))]
        _add(mixbus, t0, ping, max(0.05, amp) * 0.35)

    # 0.1 s - bright glassy shimmer sweeping upward
    phases = [0.0, 0.0, 0.0]
    for i in range(int(RATE * 1.9)):
        t = i / RATE + 0.1
        u = min(1.0, (t - 0.1) / 0.9)
        f = 1200 * (5200 / 1200) ** u
        env = _smooth(u) * math.exp(-max(0.0, t - 1.0) / 0.5)
        trem = 0.7 + 0.3 * math.sin(2 * math.pi * 18 * t)
        v = 0.0
        for j, ratio in enumerate((1.0, 1.004, 1.5)):
            phases[j] += 2 * math.pi * f * ratio / RATE
            v += math.sin(phases[j]) * (0.5 if j == 2 else 1.0)
        mixbus[int(RATE * 0.1) + i] += v * env * trem * 0.07

    # 0.3 s - wings unfurl: powerful whoosh of air (sweeping band) ...
    w1 = w2 = 0.0
    for i in range(int(RATE * 0.9)):
        u = i / (RATE * 0.9)
        k = 0.03 + 0.30 * math.sin(math.pi * u) ** 1.5
        n = random.uniform(-1, 1)
        w1 += k * (n - w1)
        w2 += k * (w1 - w2)
        rumble = w2 - 0.0 * w1
        mixbus[int(RATE * 0.3) + i] += rumble * math.sin(math.pi * u) ** 2 * 1.9
    # ... with a soft feather flutter (fast amplitude-modulated, high-passed noise)
    slow = 0.0
    for i in range(int(RATE * 0.9)):
        t = i / RATE
        n = random.uniform(-1, 1)
        slow += 0.15 * (n - slow)
        hp = n - slow
        mod = (0.5 + 0.5 * math.sin(2 * math.pi * 27 * t + 6 * math.sin(2 * math.pi * 3 * t))) ** 3
        mixbus[int(RATE * 0.4) + i] += hp * mod * math.exp(-t / 0.35) * 0.20

    # 0.3 s - golden sun disc ignites: resonant singing bell (slightly detuned pair = shimmer/beating)
    bell = _partials(784, [(1, 1.0, 2.3), (2.0, 0.55, 1.8), (2.4, 0.33, 1.4), (3.0, 0.28, 1.3), (4.2, 0.14, 0.9), (5.9, 0.08, 0.6)], 2.7, 0.004, detune=1.6)
    _add(mixbus, 0.3, bell, 0.34)

    # 0.5 s onwards (not specified): warm golden pad blooming and resolving
    for f in (392.0, 493.9, 587.3, 783.99):
        for i in range(int(RATE * 2.5)):
            t = i / RATE
            env = _smooth(t / 0.5) * (1 - _smooth((t - 1.6) / 0.9))
            mixbus[int(RATE * 0.5) + i] += math.sin(2 * math.pi * f * t) * env * (0.85 + 0.15 * math.sin(2 * math.pi * 5.2 * t)) * 0.06

    wet = room(mixbus, 1.8, 0.30, 0.0)[:N]
    for i in range(N):  # clean fade-out so it ends on silence
        t = i / RATE
        if t > total - 0.5:
            wet[i] *= 0.5 + 0.5 * math.cos(math.pi * (t - (total - 0.5)) / 0.5)
    return wet


def tone(freq, length, decay):
    n = int(RATE * length)
    return [
        (math.sin(2 * math.pi * freq * i / RATE) + 0.3 * math.sin(4 * math.pi * freq * i / RATE))
        * math.exp(-i / RATE * decay)
        for i in range(n)
    ]


def mix(parts, total):
    out = [0.0] * int(RATE * total)
    for start, samples in parts:
        o = int(RATE * start)
        for i, s in enumerate(samples):
            if o + i < len(out):
                out[o + i] += s
    return out


write("pop", pop())
write("error", error())
write("whoosh", whoosh())
write("ding", mix([(0, tone(880, 0.9, 5)), (0.0, tone(1320, 0.9, 6))], 0.9))
write(
    "glow",
    mix([(0.0, tone(659, 0.6, 7)), (0.09, tone(880, 0.6, 7)), (0.18, tone(1175, 0.9, 5)), (0.27, tone(1568, 1.1, 4))], 1.3),
)
write("drop", drop_ploop())
write("drop_cave", drop_cave())
write("drop_plip", drop_plip())
write("drop_ploop", drop_ploop())
write("click", click())  # last: keeps the random stream of the earlier files unchanged
write("reveal_sting", reveal_sting())  # after everything else: keeps earlier files' random stream unchanged
print("done")
