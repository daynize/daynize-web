import { Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { gsap } from 'gsap';
import timeline from './timeline.json';

type Lesson = (typeof timeline.items)[number];
type WordOrderShiftProps = { items: Lesson[] };

const ease = gsap.parseEase('power3.out');
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const audioPath = (src: string) => staticFile(src.replace(/^public\//, ''));

const fade = (
    frame: number,
    duration: number,
    transitionFrames: number,
    fadeInEnabled: boolean,
    fadeOutEnabled: boolean,
) => {
    const fadeIn = fadeInEnabled ? interpolate(frame, [0, transitionFrames], [0, 1], clamp) : 1;
    const fadeOut = fadeOutEnabled
        ? interpolate(frame, [duration - transitionFrames, duration], [1, 0], clamp)
        : 1;
    return Math.min(fadeIn, fadeOut);
};

const TimedAudio = ({ src, from, durationInFrames }: { src: string; from: number; durationInFrames: number }) => (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none">
        <Audio src={audioPath(src)} />
    </Sequence>
);

const LessonSession = ({ item, nextStartFrame, hasPrevious, hasNext }: {
    item: Lesson;
    nextStartFrame: number;
    hasPrevious: boolean;
    hasNext: boolean;
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const transitionFrames = Math.ceil(item.transition.durationInFrames / 2);
    const sessionDuration = nextStartFrame - item.startFrame;
    const originalRevealFrame = item.introAudioStartFrame - item.startFrame;
    const buildStart = item.buildStartFrame - item.startFrame;
    const sparkleStart = item.sparkle.startFrame - item.startFrame;
    const alignedStart = item.audio.aligned.startFrame - item.startFrame;
    const flipStart = item.flipStartFrame - item.startFrame;
    const englishStart = item.audio.english.startFrame - item.startFrame;
    const showOriginal = frame >= originalRevealFrame;
    const showAligned = frame >= alignedStart;
    const englishMode = frame >= flipStart;
    const transitionOpacity = fade(frame, sessionDuration, transitionFrames, hasPrevious, hasNext);
    const completedRows = Math.max(0, Math.min(item.buildUp.length, Math.floor((frame - buildStart) / item.buildIntervalFrames) + 1));
    const lessonLabel = `LESSON ${String(item.lessonNumber).padStart(2, '0')} / ${String(timeline.items.length).padStart(2, '0')}`;
    const voiceActive = (frame >= originalRevealFrame && frame < buildStart)
        || (frame >= alignedStart && frame < flipStart)
        || (frame >= englishStart && frame < item.endFrame - item.startFrame);
    const pendulumAngle = voiceActive ? Math.sin(frame * 0.115) * 8 : 0;
    let englishWordIndex = 0;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            color: '#17120D',
            opacity: transitionOpacity,
            backgroundColor: '#F3A51C',
            fontFamily: 'Avenir Next, Apple SD Gothic Neo, sans-serif',
        }}>
            <div style={{
                position: 'absolute',
                zIndex: 0,
                top: 0,
                right: 104,
                width: 3,
                height: 410,
                backgroundColor: '#17120D',
                transform: `rotate(${pendulumAngle}deg)`,
                transformOrigin: 'top center',
                opacity: 0.9,
            }}>
                <div style={{
                    position: 'absolute',
                    left: -23,
                    bottom: -23,
                    width: 49,
                    height: 49,
                    borderRadius: '50%',
                    backgroundColor: '#17120D',
                    transform: `scale(${voiceActive ? 1 + Math.abs(Math.sin(frame * 0.18)) * 0.08 : 1})`,
                }} />
            </div>
            <div style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                minHeight: '100%',
                padding: englishMode ? '88px 112px 120px' : '148px 112px 140px',
                boxSizing: 'border-box',
            }}>
                <header style={{ marginBottom: englishMode ? 92 : 72, textAlign: englishMode ? 'center' : 'left' }}>
                    <div style={{ color: '#17120D', fontSize: 28, fontWeight: 850, letterSpacing: 2 }}>
                        {lessonLabel}
                    </div>
                    <div style={{
                        marginTop: englishMode ? 22 : 26,
                        color: '#17120D',
                        fontSize: englishMode ? 46 : 45,
                        lineHeight: 1.35,
                        fontWeight: 700,
                        maxWidth: englishMode ? 820 : 900,
                        marginLeft: englishMode ? 'auto' : 0,
                        marginRight: englishMode ? 'auto' : 0,
                        opacity: showOriginal ? 1 : 0,
                        transform: `translateY(${showOriginal ? 0 : 18}px)`,
                    }}>
                        {item.audio.intro.wordTimings.map((word, index) => {
                            const wordStartFrame = item.audio.intro.startFrame - item.startFrame
                                + Math.floor((word.startMs / item.audio.intro.durationMs) * item.audio.intro.durationInFrames);
                            const wordEndFrame = item.audio.intro.startFrame - item.startFrame
                                + Math.ceil((word.endMs / item.audio.intro.durationMs) * item.audio.intro.durationInFrames);
                            const active = frame >= wordStartFrame && frame < wordEndFrame;
                            return (
                                <span key={`intro-${index}`} style={{
                                    display: 'inline-block',
                                    marginRight: 10,
                                    padding: active ? '0 5px' : 0,
                                    color: active ? '#F3A51C' : '#17120D',
                                    backgroundColor: active ? '#17120D' : 'transparent',
                                    transform: `translateY(${active ? -5 : 0}px) scale(${active ? 1.06 : 1})`,
                                    borderRadius: 5,
                                }}>
                                    {word.word}
                                </span>
                            );
                        })}
                    </div>
                </header>

                <main style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 10,
                    minHeight: englishMode ? 1120 : 1040,
                }}>
                    {item.buildUp.map((row, rowIndex) => {
                        const rowStart = buildStart + rowIndex * item.buildIntervalFrames;
                        const visible = rowIndex < completedRows;
                        const rowOpacity = interpolate(frame, [rowStart, rowStart + 8], [0, 1], clamp);
                        return (
                            <div key={`build-${rowIndex}`} style={{
                                position: englishMode ? 'absolute' : 'relative',
                                top: englishMode ? 150 + rowIndex * 72 : undefined,
                                left: 0,
                                minHeight: englishMode ? 60 : 74,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: englishMode ? 8 : 12,
                                opacity: visible ? rowOpacity * (englishMode ? 0.12 : 1) : 0,
                                transform: `translateX(${visible ? 0 : -22}px) scale(${visible ? 1 : 0.96})`,
                            }}>
                                {row.map((text, chunkIndex) => {
                                    const chunk = item.chunks[chunkIndex];
                                    return (
                                        <span key={`${rowIndex}-${chunkIndex}`} style={{
                                            padding: englishMode ? '8px 14px' : '12px 18px',
                                            borderRadius: 8,
                                            backgroundColor: chunkIndex === rowIndex ? '#17120D' : '#F9C96D',
                                            border: '2px solid #17120D',
                                            color: chunkIndex === rowIndex ? '#FFE6AF' : '#17120D',
                                            fontSize: englishMode ? 29 : 31,
                                            fontWeight: 750,
                                            lineHeight: 1.35,
                                            boxShadow: '4px 5px 0 #17120D22',
                                        }}>
                                            {text}
                                        </span>
                                    );
                                })}
                            </div>
                        );
                    })}

                    <div style={{
                        position: englishMode ? 'absolute' : 'relative',
                        top: englishMode ? 520 : undefined,
                        left: 0,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: englishMode ? 12 : 14,
                        marginTop: englishMode ? 0 : 24,
                        maxWidth: englishMode ? 920 : 760,
                        opacity: showAligned ? 1 : 0,
                        perspective: 1100,
                    }}>
                        {item.chunks.map((chunk, index) => {
                            const delayFrames = index * item.flipStaggerFrames;
                            const cardProgress = Math.min(1, Math.max(0, (frame - flipStart - delayFrames) / Math.max(1, item.flipDurationFrames - delayFrames)));
                            const rotation = cardProgress < 0.5
                                ? interpolate(cardProgress, [0, 0.5], [0, 90], { ...clamp, easing: ease })
                                : interpolate(cardProgress, [0.5, 1], [-90, 0], { ...clamp, easing: ease });
                            const englishSide = cardProgress >= 0.5;
                            const highlighted = frame >= chunk.alignedHighlightStartFrame - item.startFrame
                                && frame < chunk.alignedHighlightEndFrame - item.startFrame;
                            const flipped = frame >= flipStart + delayFrames;
                            const englishParts = chunk.en.match(/\S+/gu) ?? [];
                            const renderedEnglish = englishParts.map((part, partIndex) => {
                                const wordTiming = item.audio.english.wordTimings[englishWordIndex];
                                const currentWordIndex = englishWordIndex;
                                englishWordIndex += 1;
                                const active = Boolean(wordTiming)
                                    && frame >= wordTiming.startFrame - item.startFrame
                                    && frame < wordTiming.endFrame - item.startFrame;
                                return (
                                    <span key={`${part}-${currentWordIndex}`} style={{
                                        display: 'inline-block',
                                        marginRight: partIndex < englishParts.length - 1 ? 10 : 0,
                                        padding: active ? '0 5px' : 0,
                                        borderRadius: 8,
                                        color: active ? '#F3A51C' : '#17120D',
                                        backgroundColor: active ? '#17120D' : 'transparent',
                                        transform: `translateY(${active ? -7 : 0}px) scale(${active ? 1.1 : 1})`,
                                    }}>
                                        {part}
                                    </span>
                                );
                            });
                            return (
                                <div key={chunk.ko} style={{
                                    position: 'relative',
                                    width: 'fit-content',
                                    maxWidth: 900,
                                    minHeight: 92,
                                    transformStyle: 'preserve-3d',
                                    transform: `rotateX(${rotation}deg) scale(${highlighted && !flipped ? 1.15 : 1})`,
                                    transformOrigin: 'center center',
                                    borderRadius: 8,
                                    background: englishSide ? '#F9C96D' : '#F9C96D',
                                    border: `${highlighted ? 4 : 2}px solid #17120D`,
                                    boxShadow: highlighted ? '0 0 0 5px #17120D22' : '5px 6px 0 #17120D22',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '14px 22px',
                                    boxSizing: 'border-box',
                                    textAlign: 'left',
                                    backfaceVisibility: 'hidden',
                                    opacity: showAligned ? 1 : 0,
                                }}>
                                    <span style={{
                                        position: 'relative',
                                        display: 'block',
                                        width: 'max-content',
                                        maxWidth: 856,
                                        boxSizing: 'border-box',
                                        fontSize: englishSide ? 50 : 32,
                                        lineHeight: 1.3,
                                        fontWeight: 800,
                                        color: '#17120D',
                                    }}>
                                        {englishSide ? renderedEnglish : chunk.ko}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            <TimedAudio src={item.audio.intro.src} from={item.audio.intro.startFrame - item.startFrame} durationInFrames={item.audio.intro.durationInFrames} />
            <TimedAudio src={item.audio.aligned.src} from={item.audio.aligned.startFrame - item.startFrame} durationInFrames={item.audio.aligned.durationInFrames} />
            <TimedAudio src={item.audio.english.src} from={item.audio.english.startFrame - item.startFrame} durationInFrames={item.audio.english.durationInFrames} />
            <TimedAudio src={item.sparkle.src} from={sparkleStart} durationInFrames={item.sparkle.durationInFrames} />
            <TimedAudio src={item.flipSfx.src} from={flipStart} durationInFrames={item.flipDurationFrames} />
            {item.stackSfxEvents.flatMap((event, eventIndex) => event.sources.map((src, pulseIndex) => (
                <TimedAudio
                    key={`${eventIndex}-${pulseIndex}`}
                    src={src}
                    from={event.startFrame - item.startFrame + pulseIndex * item.stackPulseIntervalFrames}
                    durationInFrames={item.sparkle.durationInFrames}
                />
            )))}
        </div>
    );
};

export const WordOrderShift = ({ items }: WordOrderShiftProps) => (
    <>
        {items.map((item, index) => {
            const nextStartFrame = items[index + 1]?.startFrame ?? item.endFrame;
            return (
                <Sequence
                    key={item.id}
                    from={item.startFrame}
                    durationInFrames={nextStartFrame - item.startFrame}
                    name={`Lesson ${String(item.lessonNumber).padStart(2, '0')}`}
                    layout="none"
                >
                    <LessonSession
                        item={item}
                        nextStartFrame={nextStartFrame}
                        hasPrevious={index > 0}
                        hasNext={index < items.length - 1}
                    />
                </Sequence>
            );
        })}
    </>
);