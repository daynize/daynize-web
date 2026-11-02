import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';

const EXAMPLES: {en: string; kr: string; word: string; ing: boolean}[] = [
  {en: 'a sleeping baby', kr: '자고 있는 아기', word: 'sleeping', ing: true},
  {en: 'a broken window', kr: '부서진 창문', word: 'broken', ing: false},
];

const Tile: React.FC<{x: number; y: number; w: number; label: string; sub: string; color: string; bg: string; s: number; glow?: number}> = ({
  x,
  y,
  w,
  label,
  sub,
  color,
  bg,
  s,
  glow = 0,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y,
      width: w,
      height: 150,
      borderRadius: 40,
      background: bg,
      border: `4px solid ${color}`,
      boxShadow: `0 0 ${30 + 50 * glow}px ${color}aa`,
      fontFamily: FONT,
      color,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: Math.min(1, s * 2),
      transform: `translateY(${(1 - s) * 80}px) scale(${(0.6 + 0.4 * s) * (1 + 0.04 * glow)})`,
    }}
  >
    <div style={{fontSize: 60, fontWeight: 900}}>{label}</div>
    <div style={{fontSize: 30, fontWeight: 600, color: COLORS.cream}}>{sub}</div>
  </div>
);

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o1 = cueById('o1').start - scene.from;
  const o4 = cueById('o4').start - scene.from;
  const at = (needle: string) => wordFrameOf('o2', needle) - scene.from;
  const o3 = cueById('o3').start - scene.from;
  const unitAt = at('내뿜는');
  const exampleAt = [at('-ing,'), at('-ed라는')];

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const bridgeGlow = ramp(frame, unitAt, unitAt + 20) * (0.7 + 0.3 * Math.sin(frame / 7));
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});

  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Sequence from={unitAt} durationInFrames={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <Tile x={WIDTH / 2} y={40} w={700} label="현재분사 -ing" sub="능동 · 진행 · 스스로 한다" color={COLORS.tealBright} bg="rgba(46,196,182,0.22)" s={pop(o1 + 6)} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 22, top: 190, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, o1 + 20, o1 + 32)}}>+</div>
        <Tile x={WIDTH / 2} y={270} w={700} label="과거분사 -ed" sub="수동 · 완료 · 당한다" color={COLORS.orange} bg="rgba(255,154,31,0.22)" s={pop(o1 + 22)} glow={bridgeGlow} />
        <div style={{position: 'absolute', left: WIDTH / 2 - 22, top: 420, fontFamily: FONT, fontSize: 64, fontWeight: 900, color: COLORS.cream, opacity: ramp(frame, o1 + 36, o1 + 48)}}>+</div>
        <Tile x={WIDTH / 2} y={500} w={700} label="명사 꾸미기" sub="분사 = 동사의 변신" color={COLORS.cream} bg="rgba(255,246,229,0.14)" s={pop(o1 + 38)} />
      </div>

      <div style={{opacity: examplesOut}}>
        {EXAMPLES.map((ex, i) => {
          const s = pop(exampleAt[i]);
          const cy = 800 + i * 110;
          return (
            <div
              key={ex.en}
              style={{
                position: 'absolute',
                left: WIDTH / 2 - 520,
                top: cy - 42,
                width: 1040,
                height: 84,
                borderRadius: 32,
                background: 'rgba(255,246,229,0.1)',
                border: '2px solid rgba(255,246,229,0.3)',
                fontFamily: FONT,
                fontSize: 36,
                fontWeight: 800,
                color: COLORS.cream,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                opacity: Math.min(1, s * 2),
                transform: `translateY(${(1 - s) * 50}px) scale(${0.8 + 0.2 * s})`,
                whiteSpace: 'nowrap',
              }}
            >
              <span>
                {ex.en.split(ex.word)[0]}
                <span style={{color: COLORS.ink, background: ex.ing ? `linear-gradient(135deg, ${COLORS.tealBright}, ${COLORS.teal})` : `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, borderRadius: 16, padding: '0 14px', textShadow: 'none'}}>{ex.word}</span>
                {ex.en.split(ex.word)[1]}
              </span>
              <span style={{fontSize: 24, fontWeight: 600, color: COLORS.sand}}>{ex.kr}</span>
            </div>
          );
        })}
      </div>

      {frame >= o3 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 1050, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, o3, o3 + 14) * examplesOut, transform: `scale(${1 + 0.04 * Math.sin(frame / 6)})`, textShadow: `0 0 26px ${COLORS.orange}`}}>
          🗣️ 소리 내어 스스로 설명해 보세요!
        </div>
      ) : null}

      {frame >= o4 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 480, textAlign: 'center', fontFamily: FONT, color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>감사합니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};
