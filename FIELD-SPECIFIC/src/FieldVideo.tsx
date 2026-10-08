import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type SentenceTiming = {
    ko: string; en: string; T: number;
    blockStart: number; koStart: number; koEnd: number; enStart: number; enEnd: number; followEnd: number; restEnd: number;
};
export type FieldProps = {
    id: string; title: string; episode: number; totalSec: number; audioFile: string; sentences: SentenceTiming[];
};

const PALETTES = [
    { bg1: "#0f3d5e", bg2: "#1d7fb8", accent: "#ffd166" },
    { bg1: "#5b2a86", bg2: "#a05cd6", accent: "#ffe66d" },
    { bg1: "#8a1f3d", bg2: "#e0566f", accent: "#ffe9a8" },
    { bg1: "#0b5d4b", bg2: "#2cb58f", accent: "#fff3a3" },
    { bg1: "#9a4a00", bg2: "#f08a24", accent: "#fff1c9" },
    { bg1: "#1f3a93", bg2: "#5c7cfa", accent: "#ffd43b" },
    { bg1: "#a1346f", bg2: "#f06595", accent: "#fff0a6" },
    { bg1: "#14532d", bg2: "#51b36b", accent: "#ffe27a" },
    { bg1: "#3b3b98", bg2: "#8c7ae6", accent: "#feca57" },
    { bg1: "#7a1010", bg2: "#e03131", accent: "#ffe8a3" },
];
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const range = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });

const Chip: React.FC<{ children: React.ReactNode; bg: string; color: string }> = ({ children, bg, color }) => (
    <div style={{ display: "inline-block", background: bg, color, padding: "14px 34px", borderRadius: 999, fontSize: 38, fontWeight: 800, letterSpacing: 1 }}>{children}</div>
);

export const FieldVideo: React.FC<FieldProps> = ({ id, title, episode, totalSec, audioFile, sentences }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = frame / fps;
    const palette = PALETTES[(episode - 1) % PALETTES.length];

    const index = Math.max(0, sentences.findIndex((s, i) => t < (sentences[i + 1]?.blockStart ?? Infinity)));
    const s = sentences[index];
    const words = s.en.split(" ");
    const enIn = range(t, s.blockStart, s.blockStart + 0.6);
    const exit = index < sentences.length - 1 ? 1 - range(t, s.restEnd - 0.4, s.restEnd) : 1;
    const phase = t < s.koStart ? "intro" : t < s.enStart ? "ko" : t < s.enEnd ? "en" : t < s.followEnd ? "follow" : "rest";

    const kenBurns = interpolate(t, [0, totalSec], [1, 1.12], clamp);
    const drift = Math.sin(t * 0.6) * 40;

    const wordReveal = (i: number) => {
        const slot = (s.enEnd - s.enStart) / words.length;
        return range(t, s.enStart + i * slot - 0.05, s.enStart + i * slot + 0.3);
    };
    const followProgress = interpolate(t, [s.enEnd, s.followEnd], [0, 1], clamp);
    const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.025;
    const restLeft = Math.max(1, Math.ceil(s.restEnd - t));
    const isLast = index === sentences.length - 1;

    const badge = {
        intro: { text: "준비하세요", bg: "rgba(255,255,255,.2)", color: "#fff" },
        ko: { text: "🎧 안내 듣기", bg: "rgba(255,255,255,.2)", color: "#fff" },
        en: { text: "🎧 표현 듣기", bg: palette.accent, color: "#222" },
        follow: { text: "🗣 따라 하세요!", bg: "#fff", color: palette.bg1 },
        rest: { text: isLast ? "수고하셨어요!" : `☕ 잠깐 쉬어요 ${restLeft}`, bg: "rgba(255,255,255,.2)", color: "#fff" },
    }[phase];
    const badgeScale = phase === "follow" ? pulse : spring({ frame: frame - Math.round(s.blockStart * fps), fps, config: { damping: 14 } });

    return (
        <AbsoluteFill style={{ fontFamily: FONT, color: "#fff", background: `linear-gradient(160deg, ${palette.bg1}, ${palette.bg2})`, overflow: "hidden" }}>
            <Audio src={staticFile(audioFile)} />
            <AbsoluteFill style={{ transform: `scale(${kenBurns})` }}>
                <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: palette.accent, opacity: 0.16, top: -260 + drift, right: -300 }} />
                <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "#fff", opacity: 0.08, bottom: -200 - drift, left: -240 }} />
            </AbsoluteFill>

            <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: range(t, 0, 0.6), transform: `translateY(${(1 - range(t, 0, 0.6)) * -40}px)` }}>
                <Chip bg={palette.accent} color="#222">분야별 영어 · {String(episode).padStart(2, "0")}회차</Chip>
                <div style={{ marginTop: 34, fontSize: 70, fontWeight: 900, lineHeight: 1.25, padding: "0 70px", textShadow: "0 6px 24px rgba(0,0,0,.25)" }}>{title}</div>
            </div>

            <div style={{ position: "absolute", top: 520, left: 60, right: 60, opacity: enIn * exit, transform: `translateY(${(1 - enIn) * 80 + (1 - exit) * -40}px)` }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 36 }}>
                    {sentences.map((_, i) => (
                        <div key={i} style={{ width: i === index ? 120 : 44, height: 18, borderRadius: 9, background: i <= index ? palette.accent : "rgba(255,255,255,.3)", transition: "none" }} />
                    ))}
                </div>
                <div style={{ background: "rgba(255,255,255,.14)", border: "3px solid rgba(255,255,255,.28)", borderRadius: 48, padding: "56px 48px", boxShadow: "0 30px 80px rgba(0,0,0,.25)" }}>
                    <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.5, textAlign: "center", opacity: phase === "ko" ? 1 : 0.8, color: phase === "ko" ? palette.accent : "#fff" }}>
                        {s.ko}
                    </div>
                    <div style={{ height: 6, margin: "44px auto", width: 160, borderRadius: 3, background: palette.accent, opacity: 0.8 }} />
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 24px", minHeight: 260, alignContent: "center" }}>
                        {words.map((w, i) => {
                            const reveal = wordReveal(i);
                            const lit = phase === "follow" && followProgress * words.length > i;
                            return (
                                <span key={i} style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.2, opacity: 0.18 + 0.82 * reveal, transform: `translateY(${(1 - reveal) * 30}px)`, color: lit ? palette.accent : "#fff", textShadow: "0 6px 20px rgba(0,0,0,.25)" }}>{w}</span>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ position: "absolute", top: 1330, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
                <div style={{ transform: `scale(${badgeScale})` }}><Chip bg={badge.bg} color={badge.color}>{badge.text}</Chip></div>
                <div style={{ width: 760, height: 22, borderRadius: 11, background: "rgba(255,255,255,.22)", overflow: "hidden", opacity: phase === "follow" ? 1 : 0 }}>
                    <div style={{ width: `${(1 - followProgress) * 100}%`, height: "100%", background: palette.accent }} />
                </div>
            </div>

            <div style={{ position: "absolute", left: 80, right: 80, bottom: 120 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, fontWeight: 700, opacity: 0.85, marginBottom: 16 }}>
                    <span>DAYNIZE · 지난 주 영어</span>
                    <span>{index + 1} / {sentences.length}</span>
                </div>
                <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,.22)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (t / totalSec) * 100)}%`, height: "100%", background: "#fff" }} />
                </div>
            </div>
        </AbsoluteFill>
    );
};
