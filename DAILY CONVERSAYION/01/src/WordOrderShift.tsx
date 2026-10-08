import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "./timeline.json";

export type Item = (typeof timeline.items)[number];
const ItemContext = React.createContext<Item>(timeline.items[0]);
const useItem = () => React.useContext(ItemContext);

const FONT = '"Apple SD Gothic Neo", "Pretendard", "Helvetica Neue", sans-serif';
const ROW_COLORS = ["#FF6B6B", "#FF9F43", "#FECA57", "#1DD1A1", "#48DBFB", "#54A0FF", "#C56CF0"];
const BG = "linear-gradient(160deg,#1B1464 0%,#2D1B69 55%,#0F2027 100%)";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Chip: React.FC<{ color: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
    color,
    children,
    style,
}) => (
    <div
        style={{
            padding: "14px 26px",
            borderRadius: 24,
            background: color,
            color: "#16103a",
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 50,
            boxShadow: "0 10px 24px rgba(0,0,0,.35)",
            whiteSpace: "nowrap",
            ...style,
        }}
    >
        {children}
    </div>
);

const Header: React.FC = () => {
    const item = useItem();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const y = interpolate(frame, [0, 0.5 * fps], [-80, 0], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
    const opacity = interpolate(frame, [0, 0.4 * fps], [0, 1], clamp);
    return (
        <div
            style={{
                position: "absolute",
                top: 120,
                left: 60,
                right: 60,
                textAlign: "center",
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 56,
                lineHeight: 1.35,
                color: "#fff",
                transform: `translateY(${y}px)`,
                opacity,
                wordBreak: "keep-all",
            }}
        >
            {item.texts.koOriginal}
        </div>
    );
};

// Row k (1..7) shows the first k chunks; each row drops in at its step frame.
const Row: React.FC<{ index: number; localFrame: number; dim: number }> = ({ index, localFrame, dim }) => {
    const { scenes, chunks } = useItem();
    const appear = index * scenes.building.stepFrames;
    const t = localFrame - appear;
    const y = interpolate(t, [0, 12], [-60, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
    const opacity = interpolate(t, [0, 8], [0, 1], clamp) * dim;
    return (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", flexWrap: "wrap", transform: `translateY(${y}px)`, opacity }}>
            {chunks.slice(0, index + 1).map((c, i) => (
                <Chip key={i} color={ROW_COLORS[i]} style={{ fontSize: 40, padding: "10px 20px" }}>
                    {c.ko}
                </Chip>
            ))}
        </div>
    );
};

// Final row: Korean chunks flip (rotateX 0->90->0) into English, staggered 0.08s, then word highlight.
const FinalRow: React.FC<{ frame: number }> = ({ frame }) => {
    const { scenes, chunks, segments } = useItem();
    const segOutro = segments[2];
    const enWordCounts = chunks.map((c) => c.en.split(" ").length);
    const enWordOffsets = enWordCounts.map((_, i) => enWordCounts.slice(0, i).reduce((a, b) => a + b, 0));
    const { fps } = useVideoConfig();
    const flipDur = scenes.flip.endFrame - scenes.flip.startFrame - Math.ceil(0.08 * fps * (chunks.length - 1));
    const stagger = 0.08 * fps;
    const outroMs = ((frame - scenes.outro.startFrame) / fps) * 1000;
    const speaking = frame >= scenes.outro.startFrame;

    // Jian's 2nd reading (seg_2): highlight the chunk whose estimated word window contains the playhead.
    const segShifted = segments[1];
    const shiftedMs = ((frame - segShifted.startFrame) / fps) * 1000;
    const koWordCounts = chunks.map((c) => c.ko.split(" ").length);
    const koWordOffsets = koWordCounts.map((_, i) => koWordCounts.slice(0, i).reduce((a, b) => a + b, 0));
    const activeKoChunk =
        frame >= segShifted.startFrame && frame < segShifted.endFrame
            ? chunks.findIndex((_, i) => {
                const first = segShifted.words[koWordOffsets[i]];
                const last = segShifted.words[koWordOffsets[i] + koWordCounts[i] - 1];
                return shiftedMs >= first.startMs && shiftedMs < last.endMs;
            })
            : -1;

    return (
        <div style={{ display: "flex", gap: 14, justifyContent: "flex-start", flexWrap: "wrap", perspective: 1200 }}>
            {chunks.map((c, i) => {
                const t = frame - scenes.flip.startFrame - i * stagger;
                const progress = interpolate(t, [0, flipDur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
                const rotateX = progress < 0.5 ? progress * 2 * 90 : (1 - progress) * 2 * 90;
                const showEn = progress >= 0.5;
                const enWords = c.en.split(" ");
                const koActive = i === activeKoChunk;
                return (
                    <Chip
                        key={i}
                        color={ROW_COLORS[i]}
                        style={{
                            transform: `rotateX(${rotateX}deg) scale(${koActive ? 1.15 : 1})`,
                            ...(koActive && {
                                outline: "4px solid #fff",
                                boxShadow: `0 0 28px 8px ${ROW_COLORS[i]}, 0 0 60px 16px rgba(255,255,255,.55)`,
                            }),
                            fontSize: showEn ? 58 : 40,
                            display: "flex",
                            gap: 12,
                        }}
                    >
                        {showEn
                            ? enWords.map((w, wi) => {
                                const tw = segOutro.words[enWordOffsets[i] + wi];
                                const active = speaking && outroMs >= tw.startMs && outroMs < tw.endMs;
                                const spoken = speaking && outroMs >= tw.endMs;
                                const pop = active ? 1.18 : 1;
                                return (
                                    <span
                                        key={wi}
                                        style={{
                                            display: "inline-block",
                                            transform: `scale(${pop})`,
                                            padding: "0 8px",
                                            borderRadius: 12,
                                            background: active ? "#16103a" : "transparent",
                                            color: active ? "#FFF200" : "#16103a",
                                            opacity: speaking && !active && !spoken ? 0.6 : 1,
                                        }}
                                    >
                                        {w}
                                    </span>
                                );
                            })
                            : c.ko}
                    </Chip>
                );
            })}
        </div>
    );
};

const Stage: React.FC = () => {
    const { scenes, chunks } = useItem();
    const buildLocal = useCurrentFrame(); // Sequence-local, starts at building.startFrame
    const frame = buildLocal + scenes.building.startFrame;
    const fadeOthers = interpolate(frame, [scenes.flip.startFrame, scenes.flip.endFrame], [1, 0.12], clamp);
    const lastY = interpolate(frame, [scenes.flip.startFrame, scenes.flip.endFrame], [0, -120], {
        ...clamp,
        easing: Easing.inOut(Easing.cubic),
    });
    const rowOpacity = (i: number) => (i === chunks.length - 1 ? 1 : fadeOthers);
    const stepFrames = scenes.building.stepFrames;

    return (
        <div style={{ position: "absolute", top: 380, left: 40, right: 40, display: "flex", flexDirection: "column", gap: 18 }}>
            {chunks.slice(0, -1).map((_, i) => (
                <Row key={i} index={i} localFrame={buildLocal} dim={0.55 * rowOpacity(i)} />
            ))}
            <div
                style={{
                    transform: `translateY(${lastY}px)`,
                    opacity: interpolate(buildLocal - (chunks.length - 1) * stepFrames, [0, 8], [0, 1], clamp),
                }}
            >
                <FinalRow frame={frame} />
            </div>
        </div>
    );
};

const FADE_FRAMES = 12;

const ItemScene: React.FC<{ item: Item; index: number }> = ({ item, index }) => {
    const frame = useCurrentFrame();
    const { scenes, segments, sfx } = item;
    const [segIntro, segShifted, segOutro] = segments;
    const opacity =
        interpolate(frame, [0, FADE_FRAMES], [0, 1], clamp) *
        interpolate(frame, [item.totalFrames - FADE_FRAMES, item.totalFrames], [1, 0], clamp);
    const label = `LESSON ${String(index + 1).padStart(2, "0")} / ${String(timeline.items.length).padStart(2, "0")}`;
    return (
        <ItemContext.Provider value={item}>
            <AbsoluteFill style={{ opacity }}>
                <div
                    style={{
                        position: "absolute",
                        top: 60,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        fontFamily: FONT,
                        fontWeight: 800,
                        fontSize: 30,
                        letterSpacing: 6,
                        color: "#FECA57",
                    }}
                >
                    {label}
                </div>
                <Sequence from={item.startDelayFrames}>
                    <Header />
                </Sequence>
                <Sequence from={scenes.building.startFrame}>
                    <Stage />
                </Sequence>

                <Sequence from={segIntro.startFrame} durationInFrames={segIntro.durationInFrames}>
                    <Audio src={staticFile(segIntro.file)} />
                </Sequence>
                <Sequence from={segShifted.startFrame} durationInFrames={segShifted.durationInFrames}>
                    <Audio src={staticFile(segShifted.file)} />
                </Sequence>
                <Sequence from={segOutro.startFrame} durationInFrames={segOutro.durationInFrames}>
                    <Audio src={staticFile(segOutro.file)} />
                </Sequence>
                {sfx.stack.hits.map((hit, i) => (
                    <Sequence key={i} from={hit.startFrame} durationInFrames={sfx.stack.durationInFrames}>
                        <Audio src={staticFile(sfx.stack.file)} volume={0.8} playbackRate={hit.playbackRate} />
                    </Sequence>
                ))}
                <Sequence from={sfx.sparkle.startFrame} durationInFrames={sfx.sparkle.durationInFrames}>
                    <Audio src={staticFile(sfx.sparkle.file)} volume={0.7} />
                </Sequence>
                <Sequence from={sfx.flip.startFrame} durationInFrames={sfx.flip.durationInFrames}>
                    <Audio src={staticFile(sfx.flip.file)} volume={0.8} />
                </Sequence>
            </AbsoluteFill>
        </ItemContext.Provider>
    );
};

export const WordOrderShift: React.FC = () => (
    <AbsoluteFill style={{ background: BG }}>
        {timeline.items.map((item, i) => (
            <Sequence key={item.id} from={item.startFrame} durationInFrames={item.totalFrames}>
                <ItemScene item={item} index={i} />
            </Sequence>
        ))}
    </AbsoluteFill>
);
