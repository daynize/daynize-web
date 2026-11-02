import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {Part} from '../timeline';

export interface WrongStage {
  /** Frame (local to the enclosing Sequence) where the red ✕ stamps onto the wrong sentence. */
  xAt: number;
  /** Frame where the "no room" squeeze tension starts. */
  squeezeAt: number;
  label?: string;
}

export interface BridgeSentenceProps {
  left: Part[];
  prep: string;
  right: Part[];
  /** Pill colour: orange/yellow for bridge words (default), teal when the popped word is the key noun. */
  tone?: 'orange' | 'teal';
  /** Words that replace `right` once the pill has popped (e.g. waters -> water). */
  rightFix?: Part[];
  /** The pill REPLACES the right-hand phrase (wrong word -> right word) instead of being inserted before it. */
  replaces?: boolean;
  /** Vertical centre of the sentence inside the 1920×1080 canvas. */
  y?: number;
  fontSize?: number;
  /** Frame (local to the enclosing Sequence) when the words start entering. */
  appearAt?: number;
  /** Frame when the preposition pops up and pushes the right-hand phrase. */
  popAt: number;
  /** Frame when the orange/yellow glow kicks in. */
  glowAt?: number;
  wrong?: WrongStage;
  gloss?: string;
  /** Frame when the Korean gloss fades in (defaults to just after the glow). */
  glossAt?: number;
  sfx?: boolean;
}

const sfxSrc = (name: string) => staticFile(`sfx/${name}.wav`);

const WordText: React.FC<{part: Part; index: number; frame: number; appearAt: number; fontSize: number; tint: boolean}> = ({
  part,
  index,
  frame,
  appearAt,
  fontSize,
  tint,
}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - appearAt - index * 5, fps, config: {damping: 14, stiffness: 120}});
  const isTeal = part.kind === 'verb' || part.kind === 'noun' || part.kind === 'ing';
  const isUnit = part.kind === 'unit' || part.kind === 'ed';
  if (part.text === '') return null; // a word that was replaced by the popped pill
  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: fontSize * 0.28,
        opacity: Math.min(1, s * 1.6),
        transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + 0.15 * s})`,
        color: isTeal ? COLORS.tealBright : isUnit ? COLORS.orange : tint ? '#FFB3B3' : COLORS.cream,
        fontWeight: isTeal || isUnit ? 800 : 700,
        whiteSpace: 'normal',
        textAlign: 'center',
      }}
    >
      {part.text}
    </span>
  );
};

const Burst: React.FC<{t: number; color: string; count?: number; radius: number}> = ({t, color, count = 10, radius}) => (
  <>
    {Array.from({length: count}, (_, i) => {
      const a = (i / count) * Math.PI * 2 + 0.3;
      const d = radius * (1 - Math.pow(1 - t, 3));
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: '50%',
            background: i % 2 ? COLORS.yellow : color,
            opacity: 1 - t,
            transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(${1 - t * 0.6})`,
          }}
        />
      );
    })}
  </>
);

const Stamp: React.FC<{kind: 'x' | 'check'; frame: number; at: number; until?: number; size: number}> = ({
  kind,
  frame,
  at,
  until,
  size,
}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 190, mass: 0.6}});
  const out = until === undefined ? 1 : 1 - ramp(frame, until, until + 8);
  if (frame < at || out <= 0) return null;
  const shake = kind === 'x' ? Math.sin((frame - at) * 1.9) * 7 * Math.max(0, 1 - (frame - at) / 18) : 0;
  const color = kind === 'x' ? '#FF4D5A' : COLORS.orange;
  return (
    <div
      style={{
        position: 'absolute',
        right: -size * 0.1,
        top: -size * 0.95,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 40px ${color}aa`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateX(${shake}px) rotate(${(1 - s) * -40}deg) scale(${s * out})`,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 40 40">
        {kind === 'x' ? (
          <path d="M8 8 L32 32 M32 8 L8 32" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
        ) : (
          <path d="M7 21 L17 31 L34 10" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </svg>
    </div>
  );
};

export const BridgeSentence: React.FC<BridgeSentenceProps> = ({
  left,
  prep,
  right,
  tone = 'orange',
  rightFix,
  replaces = false,
  y = 330,
  fontSize: maxFontSize = 96,
  appearAt = 0,
  popAt,
  glowAt,
  wrong,
  gloss,
  glossAt,
  sfx = true,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Fit the whole sentence (including the pill that will pop in) to the canvas width;
  // sentences too long even at the minimum size wrap onto a second line.
  const units =
    [...left, ...right].reduce((n, p) => n + p.text.length * 0.52 + 0.28, 0) + prep.length * 0.62 + 0.9 + 0.28;
  const fontSize = Math.max(52, Math.min(maxFontSize, Math.floor((WIDTH - 90) / units)));

  const gap = fontSize * 0.28;
  const pillW = fontSize * 0.62 * prep.length + fontSize * 0.7;
  const slotFull = pillW + gap;

  const local = Math.max(0, frame - popAt);
  // The bouncy spring drives the pill; the smooth one drives the reserved layout
  // space. Their difference is the extra translateX overshoot that makes the right
  // phrase slide aside and settle.
  const bounce = spring({frame: local, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const smooth = spring({frame: local, fps, config: {damping: 200, stiffness: 110}});
  const popped = frame >= popAt;
  // Insert mode reserves room for the pill and pushes the right phrase aside; replace mode swaps the wrong word for the pill.
  const slotW = replaces ? (popped ? pillW : 0) : slotFull * smooth;
  const overshoot = replaces ? 0 : (bounce - smooth) * slotFull;

  const rise = (1 - bounce) * fontSize * 3.4;
  const pillScale = 0.45 + 0.55 * bounce;

  const squeezing = wrong ? frame >= wrong.squeezeAt && !popped : false;
  const squeezeIn = wrong ? ramp(frame, wrong.squeezeAt, wrong.squeezeAt + 10) : 0;
  const jitter = squeezing ? Math.sin(frame * 1.9) * 2.6 * squeezeIn : 0;
  const compress = squeezing ? 1 - 0.012 * squeezeIn : 1;
  const tint = wrong ? frame >= wrong.xAt && !popped : false;

  const g = glowAt === undefined ? 0 : ramp(frame, glowAt, glowAt + 22) * (0.86 + 0.14 * Math.sin(frame / 6));
  const glowShadow =
    g > 0
      ? `0 0 ${12 + 26 * g}px rgba(255,160,40,${g}), 0 0 ${80 * g}px rgba(255,214,70,${0.85 * g}), 0 0 ${150 * g}px rgba(255,170,40,${0.55 * g})`
      : '0 4px 14px rgba(10,8,30,0.5)';

  const ripple = ramp(frame, popAt, popAt + 20);
  const burst = ramp(frame, popAt, popAt + 24);
  const glowBurst = glowAt === undefined ? 0 : ramp(frame, glowAt, glowAt + 30);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: y,
        width: WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'translateY(-50%)',
        fontFamily: FONT,
      }}
    >
      {sfx && wrong ? (
        <Sequence from={wrong.xAt} durationInFrames={30}>
          <Audio src={sfxSrc('error')} volume={0.7} />
        </Sequence>
      ) : null}
      {sfx ? (
        <Sequence from={popAt} durationInFrames={30}>
          <Audio src={sfxSrc('pop')} volume={0.9} />
        </Sequence>
      ) : null}
      {sfx && glowAt !== undefined ? (
        <Sequence from={glowAt} durationInFrames={45}>
          <Audio src={sfxSrc('glow')} volume={0.6} />
        </Sequence>
      ) : null}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: fontSize * 0.1,
          maxWidth: WIDTH - 60,
          justifyContent: 'center',
          alignItems: 'center',
          fontSize,
          lineHeight: 1.25,
          textShadow: glowShadow,
          transform: `scale(${1 + 0.025 * g})`,
        }}
      >
        {wrong ? <Stamp kind="x" frame={frame} at={wrong.xAt} until={popAt} size={fontSize * 1.15} /> : null}
        {glowAt !== undefined ? <Stamp kind="check" frame={frame} at={glowAt + 6} size={fontSize * 1.15} /> : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            transform: `translateX(${-jitter}px) scaleX(${compress})`,
            transformOrigin: 'right center',
          }}
        >
          {left.map((p, i) => (
            <WordText key={i} part={p} index={i} frame={frame} appearAt={appearAt} fontSize={fontSize} tint={false} />
          ))}
        </div>

        <div style={{position: 'relative', width: slotW, height: fontSize, flexShrink: 0}}>
          {wrong && squeezing ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: -gap * 0.5,
                  top: '8%',
                  width: 6,
                  height: '84%',
                  marginLeft: -3,
                  borderRadius: 3,
                  background: '#FF4D5A',
                  boxShadow: '0 0 24px #FF4D5A',
                  opacity: squeezeIn * (0.75 + 0.25 * Math.sin(frame / 3)),
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: -gap * 0.5,
                  top: -fontSize * 0.5,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: fontSize * 0.34,
                  fontWeight: 800,
                  color: '#FF8A8F',
                  textShadow: 'none',
                  opacity: squeezeIn,
                }}
              >
                <span style={{display: 'inline-block', transform: `translateX(${Math.sin(frame / 3) * 7}px)`}}>▶</span>{' '}
                {wrong.label ?? '자리가 없어요!'}{' '}
                <span style={{display: 'inline-block', transform: `translateX(${-Math.sin(frame / 3) * 7}px)`}}>◀</span>
              </div>
            </>
          ) : null}

          {popped ? (
            <div style={{position: 'absolute', left: slotW / 2 - gap / 2, top: '50%', width: 0, height: 0}}>
              <div
                style={{
                  position: 'absolute',
                  width: pillW,
                  height: fontSize * 1.05,
                  left: -pillW / 2,
                  top: -fontSize * 0.52,
                  borderRadius: fontSize * 0.34,
                  background: tone === 'teal' ? `linear-gradient(135deg, ${COLORS.tealBright}, ${COLORS.teal})` : `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`,
                  color: COLORS.ink,
                  fontWeight: 900,
                  textShadow: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: tone === 'teal' ? `0 10px 30px rgba(20,160,150,0.55), 0 0 ${30 + 60 * g}px rgba(106,240,226,${0.5 + 0.4 * g})` : `0 10px 30px rgba(255,140,20,0.55), 0 0 ${30 + 60 * g}px rgba(255,190,50,${0.55 + 0.4 * g})`,
                  opacity: Math.min(1, local / 3),
                  transform: `translateY(${rise}px) scale(${pillScale}, ${pillScale * (1 + (1 - bounce) * 0.25)})`,
                }}
              >
                {prep}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: -70,
                  top: -70,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  border: `6px solid ${COLORS.yellow}`,
                  opacity: 1 - ripple,
                  transform: `scale(${0.3 + ripple * 2.6})`,
                }}
              />
              <Burst t={burst} color={COLORS.orange} radius={fontSize * 1.2} />
              {glowAt !== undefined && frame >= glowAt ? (
                <Burst t={glowBurst} color={COLORS.yellow} count={14} radius={fontSize * 2.4} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            transform: `translateX(${overshoot + jitter}px) scaleX(${compress})`,
            transformOrigin: 'left center',
          }}
        >
          {(replaces && popped ? [] : right).map((p, i) => (
            <WordText
              key={i}
              part={popped && rightFix?.[i] ? rightFix[i] : p}
              index={left.length + i}
              frame={frame}
              appearAt={appearAt}
              fontSize={fontSize}
              tint={tint}
            />
          ))}
        </div>
      </div>

      {gloss ? (
        <div
          style={{
            marginTop: fontSize * 0.4,
            fontSize: fontSize * 0.4,
            fontWeight: 600,
            color: COLORS.sand,
            opacity: glossAt !== undefined ? ramp(frame, glossAt, glossAt + 14) : glowAt === undefined ? 1 : ramp(frame, glowAt + 10, glowAt + 30),
            textShadow: '0 2px 8px rgba(10,8,30,0.6)',
          }}
        >
          {gloss}
        </div>
      ) : null}
    </div>
  );
};
