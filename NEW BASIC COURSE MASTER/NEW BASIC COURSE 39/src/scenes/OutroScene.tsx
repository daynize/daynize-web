import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, easeInOutCubic, FONT, hash, ramp, STAGE_H, WIDTH} from '../theme';
import {SceneSpan} from '../timeline';
import {span, useFade, WORD, wf} from './shared';
import {Demo} from './lesson';
import {LessonChips} from './LessonChips';

const Journey: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '1강 → 20강 · 긴 여행의 끝', at: 0, color: COLORS.yellow}}
    rows={[
      {
        y: 330,
        size: 70,
        items: [
          {text: '1강', kind: 'cond', at: wf('o1', 'o1', '1강')},
          {text: '→', kind: 'sym', at: wf('o1', 'o1', '기초')},
          {text: '20강', kind: 'finale', at: wf('o1', 'o1', '20강'), glowAt: wf('o1', 'o1', '마침표를')},
        ],
      },
    ]}
    emojis={[{emoji: '🏁', x: 540, y: 640, size: 170, at: wf('o1', 'o1', '마침표를'), motion: 'pulse'}]}
    footer={{text: '함께 걸어오신 여러분, 고생 많으셨습니다', at: wf('o1', 'o1', '고생'), y: 790, size: 38}}
  />
);

const Heart: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '마음의 결을 담은 영어', at: 0, color: COLORS.yellow}}
    rows={[
      {y: 300, size: 48, items: [{text: '암기 · 공식 ✕', kind: 'warn', at: wf('o2', 'o2', '암기')}]},
      {y: 450, size: 52, items: [{text: '마음의 결 ✓', kind: 'finale', at: wf('o2', 'o2', '마음의'), glowAt: wf('o2', 'o2', '담고,')}]},
    ]}
    emojis={[{emoji: '🗣️', x: 540, y: 690, size: 150, at: wf('o2', 'o2', '중얼거리며'), motion: 'pulse'}]}
  />
);

const PianoEcho: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '아름답고 단단한 울림', at: 0, color: COLORS.yellow}}
    emojis={[
      {emoji: '📚', x: 250, y: 560, size: 150, at: wf('o3', 'o3', '서재에서'), motion: 'float'},
      {emoji: '🎹', x: 540, y: 520, size: 220, at: wf('o3', 'o3', '피아노'), motion: 'pulse'},
      {emoji: '🎶', x: 830, y: 540, size: 160, at: wf('o3', 'o3', '입에서'), motion: 'float'},
    ]}
    footer={{text: '내 입에서 나오는 영어 = 세상에서 가장 아름다운 울림', at: wf('o3', 'o3', '울림이'), y: 760, size: 36}}
  />
);

const Signpost: React.FC<{d: number}> = ({d}) => {
  const fade = useFade(d);
  const start = wf('o4', 'o4', '배운');
  const end = wf('o4', 'o4', '이정표가');
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Demo
        duration={d}
        title={{text: '반짝이는 이정표 🧭', at: 0, color: COLORS.yellow}}
        footer={{text: '앞으로 마주할 영어 문장 속에서', at: wf('o4', 'o4', '마주할'), y: 730, size: 40}}
      />
      <LessonChips y={190} popAt={(i) => Math.round(start + ((end - start) * i) / 6)} size={38} glow={1} />
    </div>
  );
};

const Support: React.FC<{d: number}> = ({d}) => (
  <Demo
    duration={d}
    title={{text: '진심으로 감사드립니다', at: 0, color: COLORS.yellow}}
    emojis={[{emoji: '🙏', x: 540, y: 470, size: 240, at: wf('o5', 'o5', '감사드리며,'), motion: 'pulse'}]}
    footer={{text: '새로운 시작을 언제나 응원합니다 📣', at: wf('o5', 'o5', '응원하겠습니다'), y: 700, size: 42}}
  />
);

const CurtainPanel: React.FC<{side: 'left' | 'right'; open: number}> = ({side, open}) => {
  const w = WIDTH / 2 + 30;
  const shift = open * (w - 70);
  return (
    <div
      style={{
        position: 'absolute',
        top: -20,
        height: STAGE_H + 40,
        width: w,
        [side]: -30 - (side === 'left' ? shift : shift),
        background:
          'repeating-linear-gradient(90deg, #5A0F2B 0px, #8E1B45 34px, #B02A5C 52px, #8E1B45 70px, #5A0F2B 104px)',
        boxShadow: side === 'left' ? '16px 0 40px rgba(10,0,10,0.55)' : '-16px 0 40px rgba(10,0,10,0.55)',
      } as React.CSSProperties}
    >
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 35%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35))'}} />
    </div>
  );
};

/** Curtain call: the curtains part, the 7 lesson chips take a bow and "Thank You" is written out in calligraphy. */
const CurtainCall: React.FC<{d: number}> = ({d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const thanksAt = wf('o6', 'o6', '수고');
  const open = easeInOutCubic((frame - 8) / 52);
  const write = ramp(frame, thanksAt - 4, thanksAt + 55);
  const sub = spring({frame: frame - thanksAt - 40, fps, config: {damping: 12, stiffness: 100}});
  const sparkle = ramp(frame, 40, 70);
  const fade = ramp(frame, 0, 6) * (1 - ramp(frame, d - 14, d));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT, overflow: 'hidden'}}>
      <Sequence from={4} durationInFrames={70}>
        <Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={thanksAt} durationInFrames={60}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.7} />
      </Sequence>

      {/* spotlight on the stage */}
      <div style={{position: 'absolute', left: WIDTH / 2 - 520, top: 40, width: 1040, height: 980, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,226,160,0.42), rgba(255,226,160,0))', opacity: open}} />

      {/* confetti / sparkles */}
      {Array.from({length: 34}).map((_, i) => {
        const x = hash(i + 3) * WIDTH;
        const speed = 0.8 + hash(i + 40) * 1.6;
        const y = ((frame * speed + hash(i + 80) * 1100) % 1100) - 60;
        const colors = ['#FFE066', '#FF8FD0', '#6AF0E2', '#FFB347', '#C3A6FF'];
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: 12 + hash(i) * 12, height: 12 + hash(i) * 12, borderRadius: i % 3 === 0 ? '50%' : 3, background: colors[i % 5], opacity: sparkle * 0.9, transform: `rotate(${frame * (2 + hash(i + 9) * 4)}deg)`}} />;
      })}

      {/* lesson chips bowing */}
      <div style={{opacity: open}}>
        <LessonChips y={560} popAt={(i) => 60 + i * 5} size={32} glow={1} />
      </div>

      {/* calligraphy "Thank You" written left to right */}
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 150, textAlign: 'center'}}>
        <div
          style={{
            display: 'inline-block',
            fontFamily: '"Snell Roundhand", "Apple Chancery", "Zapfino", "Brush Script MT", cursive',
            fontSize: 190,
            fontStyle: 'italic',
            fontWeight: 700,
            color: COLORS.cream,
            lineHeight: 1.1,
            padding: '0 40px 30px',
            textShadow: `0 0 ${40 * write}px rgba(255,214,120,0.85), 0 4px 18px rgba(10,0,10,0.6)`,
            clipPath: `inset(-10% ${(1 - write) * 100}% -10% 0)`,
          }}
        >
          Thank You
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, width: WIDTH, top: 400, textAlign: 'center', color: COLORS.sand, fontSize: 56, fontWeight: 800, opacity: Math.min(1, sub * 2), transform: `translateY(${(1 - sub) * 24}px)`}}>
        수고 많으셨습니다 ❤️
      </div>

      <CurtainPanel side="left" open={open} />
      <CurtainPanel side="right" open={open} />
      {/* valance */}
      <div style={{position: 'absolute', left: 0, top: 0, width: WIDTH, height: 70, background: 'linear-gradient(180deg, #3D0A1E, #7A1639)', boxShadow: '0 8px 24px rgba(10,0,10,0.5)'}} />
      <div style={{position: 'absolute', left: 0, top: 70, width: WIDTH, height: 18, background: `repeating-linear-gradient(90deg, ${WORD.subj.edge} 0 26px, transparent 26px 52px)`, opacity: 0.85}} />
    </div>
  );
};

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: (d: number) => React.ReactNode}[] = [
    {ids: ['o1'], node: (d) => <Journey d={d} />},
    {ids: ['o2'], node: (d) => <Heart d={d} />},
    {ids: ['o3'], node: (d) => <PianoEcho d={d} />},
    {ids: ['o4'], node: (d) => <Signpost d={d} />},
    {ids: ['o5'], node: (d) => <Support d={d} />},
    {ids: ['o6'], node: (d) => <CurtainCall d={d} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`outro-${p.ids[0]}`}>
            {p.node(s.duration)}
          </Sequence>
        );
      })}
    </>
  );
};
