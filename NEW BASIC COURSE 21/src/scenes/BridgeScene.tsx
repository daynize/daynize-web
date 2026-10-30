import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, easeInOutCubic, FONT, ramp, WIDTH} from '../theme';
import {Part, SceneSpan} from '../timeline';
import {Caption, rel, span, useFade, wf} from './shared';

const S = (text: string): Part => ({text, kind: 'subject'});
const N = (text: string): Part => ({text, kind: 'noun'});

// "I want two waters" -> "I want two glasses of water": the container word is the bridge.
const WaterDemo: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b1a', 'b1b', 'b1c']);
  const fade = useFade(sp.duration);
  const tB = rel('b1a', 'b1b');
  // Frames below are relative to the start of b1b (the inner Sequence).
  const xAt = wf('b1b', 'b1b', '아주');
  const squeezeAt = wf('b1b', 'b1b', '어색하고');
  const popAt = wf('b1b', 'b1c', 'glasses');
  const glowAt = Math.max(popAt + 22, wf('b1b', 'b1c', 'water처럼'));

  const cardLift = ramp(frame, tB - 4, tB + 16);
  const cardY = 300 - 190 * cardLift;
  const cardScale = 1 - 0.3 * cardLift;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          left: WIDTH / 2 - 400,
          width: 800,
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
          fontSize: 54,
          color: COLORS.sand,
          transform: `scale(${cardScale})`,
          opacity: ramp(frame, 4, 18),
          whiteSpace: 'nowrap',
        }}
      >
        <span>🥤</span>
        <span>“나 물 두 개만 줘”</span>
      </div>

      <Sequence from={tB} durationInFrames={sp.duration - tB} layout="none">
        <BridgeSentence
          left={[S('I'), S('want'), S('two')]}
          prep="glasses of"
          right={[N('waters.')]}
          rightFix={[N('water.')]}
          y={430}
          fontSize={110}
          appearAt={0}
          wrong={{xAt, squeezeAt, label: '숫자와 직접 못 붙어요!'}}
          popAt={popAt}
          glowAt={glowAt}
        />
        <Caption
          y={575}
          text="water는 셀 수 없어서 waters ✕"
          color="#FF9CA0"
          size={38}
          opacity={ramp(frame - tB, squeezeAt, squeezeAt + 12) * (1 - ramp(frame - tB, popAt - 4, popAt + 8))}
        />
      </Sequence>
    </div>
  );
};

const Box: React.FC<{x: number; y: number; w: number; text: string; color: string; bg: string; border: string; scale?: number; glow?: number; dx?: number}> = ({
  x,
  y,
  w,
  text,
  color,
  bg,
  border,
  scale = 1,
  glow = 0,
  dx = 0,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - 60,
      width: w,
      height: 120,
      boxSizing: 'border-box',
      borderRadius: 30,
      background: bg,
      border,
      color,
      boxShadow: glow ? `0 0 ${40 * glow}px ${color}` : '0 8px 24px rgba(10,8,30,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      fontWeight: 900,
      fontSize: 52,
      transform: `translateX(${dx}px) scale(${scale})`,
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

// Number / a / -s cannot touch an uncountable noun; a unit or container has to bridge them.
const BridgeConcept: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = span(scene, ['b2a', 'b2b']);
  const fade = useFade(sp.duration);

  const oneAt = wf('b2a', 'b2a', 'one');
  const aAt = wf('b2a', 'b2a', '(a,');
  const sAt = wf('b2a', 'b2a', 's도');
  const startB = wf('b2a', 'b2b', '반드시');
  const unitAt = wf('b2a', 'b2b', '단위나');
  const vesselAt = wf('b2a', 'b2b', '용기가');
  const bridgeAt = wf('b2a', 'b2b', '다리');

  const attempt = frame >= oneAt && frame < startB ? Math.abs(Math.sin(frame / 9)) : 0;
  const lunge = 70 * attempt;
  const leftText = frame < aAt ? 'one · two' : frame < sAt ? 'a · an' : '-s';
  const showLeft = frame >= oneAt;
  const leftPop = spring({frame: frame - (frame < aAt ? oneAt : frame < sAt ? aAt : sAt), fps, config: {damping: 9, stiffness: 160}});

  const pill = spring({frame: frame - bridgeAt, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
  const bridged = frame >= bridgeAt;
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Caption y={96} text="숫자 · a · -s  ✕  불가산명사" color="#FF9CA0" size={40} opacity={ramp(frame, 6, 20) * (1 - ramp(frame, startB - 4, startB + 8))} />
      <Caption y={96} text="숫자 + 단위·용기(다리) + 불가산명사" color={COLORS.orange} size={40} opacity={ramp(frame, startB + 4, startB + 20)} />

      {showLeft ? (
        <Box x={190} y={430} w={300} text={bridged ? 'two' : leftText} color={COLORS.cream} bg="rgba(255,246,229,0.14)" border="3px solid rgba(255,246,229,0.5)" scale={bridged ? 1 : 0.7 + 0.3 * leftPop} dx={lunge} />
      ) : null}
      <Box x={890} y={430} w={300} text="water" color={COLORS.tealBright} bg="rgba(46,196,182,0.26)" border={`3px solid ${COLORS.teal}`} glow={bridged ? 0.6 : 0.3} />

      {frame >= oneAt && !bridged ? (
        <div style={{position: 'absolute', left: WIDTH / 2 - 100, top: 372, width: 200, textAlign: 'center', fontFamily: FONT, fontSize: 96, fontWeight: 900, color: '#FF4D5A', textShadow: '0 0 24px #FF4D5A', opacity: ramp(frame, oneAt, oneAt + 8) * (0.7 + 0.3 * Math.sin(frame / 4))}}>
          ✕
        </div>
      ) : null}

      {bridged ? (
        <>
          <Sequence from={bridgeAt} durationInFrames={30}>
            <Audio src={staticFile('sfx/pop.wav')} volume={0.9} />
          </Sequence>
          <div style={{position: 'absolute', left: WIDTH / 2 - 125, top: 372 - (1 - pill) * 120, width: 250, height: 116, boxSizing: 'border-box', borderRadius: 34, background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.orange})`, color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 48, boxShadow: `0 0 50px ${COLORS.orange}`, transform: `scale(${0.4 + 0.6 * pill})`, whiteSpace: 'nowrap'}}>
            glass of
          </div>
        </>
      ) : null}

      {frame >= unitAt ? (
        <Box x={290} y={640} w={440} text="🥛 glass of" color={COLORS.orange} bg="rgba(255,154,31,0.2)" border={`3px solid ${COLORS.orange}`} scale={pop(unitAt)} />
      ) : null}
      {frame >= vesselAt ? (
        <Box x={790} y={640} w={440} text="🍞 loaf of" color={COLORS.orange} bg="rgba(255,154,31,0.2)" border={`3px solid ${COLORS.orange}`} scale={pop(vesselAt)} />
      ) : null}
    </div>
  );
};

// "I bought a bread" -> "I bought a loaf of bread" (the hero motion).
const BreadHero: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const sp = span(scene, ['b3a', 'b3b', 'b3c']);
  const fade = useFade(sp.duration);
  const xAt = wf('b3a', 'b3a', '어색하지만');
  const squeezeAt = xAt + 14;
  const popAt = wf('b3a', 'b3b', 'loaf');
  const glowAt = popAt + 30;
  const glossAt = wf('b3a', 'b3c', '나는');

  const heMove = easeInOutCubic((frame - glowAt - 20) / 70);
  const heX = 230 + 330 * heMove;
  const breadPulse = 1 + 0.12 * Math.max(0, Math.sin(Math.PI * ramp(frame, glowAt, glowAt + 24)));

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <Actor who="he" x={heX} walking={heMove > 0 && heMove < 1} opacity={ramp(frame, 0, 14)} />
      <div style={{position: 'absolute', left: 820, top: 610, fontSize: 190, lineHeight: 1, transform: `translate(-50%,-50%) scale(${breadPulse})`, filter: 'drop-shadow(0 10px 16px rgba(10,8,30,0.45))', opacity: ramp(frame, 8, 24)}}>🍞</div>

      <BridgeSentence
        left={[S('I'), S('bought'), S('a')]}
        prep="loaf of"
        right={[N('bread.')]}
        y={300}
        fontSize={118}
        appearAt={4}
        wrong={{xAt, squeezeAt, label: 'a 바로 뒤는 안 돼요!'}}
        popAt={popAt}
        glowAt={glowAt}
        gloss="나는 빵 한 덩어리를 샀다"
        glossAt={glossAt}
      />
    </div>
  );
};

export const BridgeScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const phases: {ids: string[]; node: React.ReactNode}[] = [
    {ids: ['b1a', 'b1b', 'b1c'], node: <WaterDemo scene={scene} />},
    {ids: ['b2a', 'b2b'], node: <BridgeConcept scene={scene} />},
    {ids: ['b3a', 'b3b', 'b3c'], node: <BreadHero scene={scene} />},
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
