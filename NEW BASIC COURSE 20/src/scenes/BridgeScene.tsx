import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {cueById, Part, SceneSpan, wordFrame} from '../timeline';

const span = (scene: SceneSpan, ids: string[]) => {
  const first = cueById(ids[0]);
  const last = cueById(ids[ids.length - 1]);
  return {from: first.start - scene.from, duration: last.start + last.duration - first.start};
};
const rel = (from: string, to: string) => cueById(to).start - cueById(from).start;
// Spoken frame of a word, relative to the start of cue `base`.
const wf = (base: string, id: string, idx: number) => wordFrame(id, idx) - cueById(base).start;

const useFade = (duration: number) => {
  const frame = useCurrentFrame();
  return ramp(frame, 0, 10) * (1 - ramp(frame, duration - 10, duration));
};

const S = (text: string): Part => ({text, kind: 'subject'});
const V = (text: string): Part => ({text, kind: 'verb'});
const O = (text: string): Part => ({text, kind: 'object'});

const Caption: React.FC<{y: number; text: string; color?: string; size?: number; opacity?: number}> = ({
  y,
  text,
  color = COLORS.sand,
  size = 44,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      width: WIDTH,
      top: y,
      textAlign: 'center',
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color,
      opacity,
      textShadow: '0 2px 10px rgba(10,8,30,0.65)',
    }}
  >
    {text}
  </div>
);

// "She lied him" → "She lied to him": the first example of the bridge preposition.
const LieDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // b1b: She(0) lied(1) him이라고(2) 쓰면(3) “그녀는(4) 그를(5) 거짓말했다”라는(6) 아주(7) 어색한(8)
  const xAt = wf('b1b', 'b1b', 7);
  const squeezeAt = wf('b1b', 'b1b', 8);
  // b1c: She(0) lied(1) to(2) him처럼(3) ...
  const popAt = wf('b1b', 'b1c', 2);

  const cardLift = ramp(frame, tB - 4, tB + 16);
  const cardY = 300 - 190 * cardLift;
  const cardScale = 1 - 0.38 * cardLift;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: WIDTH / 2 - 470,
          width: 940,
          top: cardY - 60,
          height: 120,
          borderRadius: 36,
          background: 'rgba(235,217,180,0.15)',
          border: '2px solid rgba(235,217,180,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 50,
          color: COLORS.sand,
          transform: `scale(${cardScale})`,
          opacity: ramp(frame, 4, 18),
          whiteSpace: 'nowrap',
        }}
      >
        <span>🤥</span>
        <span>그녀는 그에게 거짓말을 했다</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('She'), V('lied')]}
          prep="to"
          right={[O('him.')]}
          y={430}
          fontSize={110}
          appearAt={0}
          wrong={{xAt, squeezeAt}}
          popAt={popAt}
          glowAt={popAt + 30}
        />
        <Caption
          y={560}
          text="“그녀는 그를 거짓말했다” ✕ 어색!"
          color="#FF9CA0"
          size={40}
          opacity={ramp(frame - tB, squeezeAt, squeezeAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
      </Sequence>
    </div>
  );
};

const Island: React.FC<{x: number; w: number; frame: number; glow?: number}> = ({x, w, frame, glow = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: 640,
      width: w,
      height: 160,
      borderRadius: '50% 50% 36px 36px / 40% 40% 36px 36px',
      background: 'linear-gradient(180deg, #8A6A4B 0%, #4A3A38 100%)',
      borderTop: `14px solid ${glow ? COLORS.yellow : '#C9B27C'}`,
      transform: `translateY(${Math.sin(frame / 25 + x) * 4}px)`,
    }}
  />
);

// Verb island ↔ object island. Direct contact bounces off; the preposition builds the bridge.
const BridgeConcept: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b']);
  const fade = useFade(sp.duration);
  const tB = rel('b2a', 'b2b');

  const L = 200;
  const R = 880;
  const IW = 300; // island width
  const planks = 9;
  // b2b: 따라서(0) 자동사(1) 뒤에(2) 대상이나(3) 장소를(4) 붙이려면(5) 반드시(6) 전치사가(7) 다리(8)
  const bridgeStart = wf('b2a', 'b2b', 6);
  const lastPlank = bridgeStart + planks * 4;
  // b2a: ... 직접(8) 오지(9) 못합니다(10)
  const xAt = wf('b2a', 'b2a', 9);
  const pillS = spring({frame: frame - lastPlank - 4, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const walkP = easeInOutCubic((frame - lastPlank - 24) / 70);

  // Failed direct attempt: an arrow lunges at the object and recoils.
  const attempt = frame < tB + 4 ? Math.abs(Math.sin(frame / 10)) : 0;
  const lunge = 70 * attempt;

  const arch = (t: number) => 610 - 70 * Math.sin(Math.PI * t);

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={WIDTH} height={800} style={{position: 'absolute', left: 0, top: 0}}>
        <path
          d={`M ${L + 90} 680 ${Array.from({length: 30}, (_, i) => `L ${L + 90 + ((R - L - 180) * (i + 1)) / 30} ${690 + Math.sin(frame / 8 + i) * 8}`).join(' ')} L ${R - 90} 800 L ${L + 90} 800 Z`}
          fill="rgba(80,150,200,0.55)"
        />
      </svg>
      <Island x={L} w={IW} frame={frame} />
      <Island x={R} w={IW} frame={frame} glow={frame > lastPlank ? 1 : 0} />

      <Caption y={96} text="자동사 + 목적어 (직접)" color="#FF9CA0" size={40} opacity={ramp(frame, 6, 20) * (1 - ramp(frame, tB - 4, tB + 8))} />
      <Caption y={96} text="자동사 + 전치사(다리) + 대상 · 장소" color={COLORS.orange} size={42} opacity={ramp(frame, tB + 4, tB + 20)} />

      <div style={{position: 'absolute', left: L - 130, top: 500, width: 260, height: 110, borderRadius: 30, background: 'rgba(46,196,182,0.26)', border: `3px solid ${COLORS.teal}`, boxShadow: `0 0 36px ${COLORS.teal}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 54, color: COLORS.tealBright, transform: `translateX(${lunge}px)`, zIndex: 2}}>
        arrived
      </div>
      <div style={{position: 'absolute', left: R - 170, top: 500, width: 340, height: 110, borderRadius: 30, background: 'rgba(255,246,229,0.14)', border: '3px solid rgba(255,246,229,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 50, color: COLORS.cream}}>
        the airport
      </div>

      {frame < tB + 4 ? (
        <div style={{position: 'absolute', left: WIDTH / 2 - 100 + lunge * 0.3, top: 530, width: 200, textAlign: 'center', fontFamily: FONT, fontSize: 90, fontWeight: 900, color: '#FF4D5A', opacity: ramp(frame, xAt, xAt + 8), textShadow: '0 0 24px #FF4D5A'}}>
          ✕
        </div>
      ) : null}

      {Array.from({length: planks}, (_, i) => {
        const t = (i + 0.5) / planks;
        const x = L + IW / 2 + (R - L - IW) * t;
        const dy = (R - L - IW) / planks;
        const slope = Math.atan2(arch((i + 1) / planks) - arch(i / planks), dy) * (180 / Math.PI);
        const s = spring({frame: frame - bridgeStart - i * 4, fps, config: {damping: 9, stiffness: 160}});
        if (frame < bridgeStart + i * 4) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 20,
              top: arch(t) - 10 - (1 - s) * 90,
              width: 40,
              height: 22,
              borderRadius: 6,
              background: `linear-gradient(180deg, ${COLORS.yellow}, ${COLORS.orange})`,
              boxShadow: `0 0 18px ${COLORS.orange}`,
              opacity: Math.min(1, s * 2),
              transform: `rotate(${slope}deg) scale(${s})`,
            }}
          />
        );
      })}

      {frame >= lastPlank + 2 ? (
        <>
          <Sequence from={lastPlank + 2} durationInFrames={30}>
            <Audio src={staticFile('sfx/pop.wav')} volume={0.9} />
          </Sequence>
          <div style={{position: 'absolute', left: (L + R) / 2 - 80, top: 410 - (1 - pillS) * 120, width: 160, height: 100, borderRadius: 34, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 70, boxShadow: `0 0 50px ${COLORS.orange}`, transform: `scale(${0.4 + 0.6 * pillS})`}}>
            at
          </div>
        </>
      ) : null}

      {walkP > 0 && walkP < 1 ? (
        <div style={{position: 'absolute', left: L + IW / 2 + (R - L - IW) * walkP, top: arch(walkP) - 70 - Math.abs(Math.sin(frame / 4)) * 10, fontSize: 70, transform: 'translateX(-50%)'}}>🚶</div>
      ) : null}
    </div>
  );
};

// Hero: "She sat the chair." → "She sat on the chair." with the physical push.
const SatHero: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b3a', 'b3b', 'b3c']);
  const fade = useFade(sp.duration);
  // b3a: She(0) sat(1) the(2) chair라고(3) 쓰면(4) 어색하지만(5)  |  b3b: She(0) sat(1) on(2) the(3) chair라고(4)
  const xAt = wf('b3a', 'b3a', 5);
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 2);
  const glowAt = popAt + 30;
  const glossAt = wf('b3a', 'b3c', 0);

  const sheMove = easeInOutCubic((frame - glowAt - 20) / 70);
  const sheX = 230 + 330 * sheMove;
  const chairPulse = 1 + 0.12 * Math.max(0, Math.sin(Math.PI * ramp(frame, glowAt, glowAt + 24)));

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Actor who="she" x={sheX} walking={sheMove > 0 && sheMove < 1} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 820, top: 610, fontSize: 190, lineHeight: 1, transform: `translate(-50%,-50%) scale(${chairPulse})`, filter: 'drop-shadow(0 10px 16px rgba(10,8,30,0.45))', opacity: ramp(frame, 8, 24)}}>🪑</div>

      <BridgeSentence
        left={[S('She'), V('sat')]}
        prep="on"
        right={[O('the chair.')]}
        y={300}
        fontSize={118}
        appearAt={wf('b3a', 'b3a', 0)}
        wrong={{xAt, squeezeAt}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="그녀는 그 의자에 앉았다"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <LieDemo scene={scene} />},
    {ids: ['b2a', 'b2b'], node: <BridgeConcept scene={scene} />},
    {ids: ['b3a', 'b3b', 'b3c'], node: <SatHero scene={scene} />},
  ];
  return (
    <>
      {phases.map((p) => {
        const s = span(scene, p.ids);
        return (
          <Sequence key={p.ids[0]} from={s.from} durationInFrames={s.duration} name={`bridge-${p.ids[0]}`}>
            {p.node}
          </Sequence>
        );
      })}
    </>
  );
};
