import React from 'react';
import {Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Actor} from '../components/Actor';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, easeInOutCubic, FONT, FPS, mx, ramp, X_SCALE} from '../theme';
import {PART_INTROS, PLACES, PropDef, ResolvedCue, SceneSpan, STORY_LINES, StoryLine, stripMarkup} from '../timeline';
import {WORD} from './shared';

const Emoji: React.FC<{prop: PropDef; duration: number; index: number}> = ({prop, duration, index}) => {
  const frame = useCurrentFrame();
  const travel = easeInOutCubic(frame / (duration * 0.85));
  let x = mx(prop.x);
  let y = prop.y;
  let scale = 1;
  const opacity = ramp(frame, 6 + index * 4, 22 + index * 4);

  if (prop.motion === 'float') {
    y += Math.sin(frame / 18 + index * 2) * 14;
    x += Math.cos(frame / 27 + index) * 6;
  } else if (prop.motion === 'pulse') {
    scale = 1 + 0.1 * Math.sin(frame / 7 + index);
  } else if (prop.motion === 'drive') {
    x += (prop.dx ?? 0) * X_SCALE * travel;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: prop.size,
        lineHeight: 1,
        opacity,
        transform: `translate(-50%,-50%) scale(${scale})`,
        filter: 'drop-shadow(0 8px 14px rgba(10,8,30,0.4))',
      }}
    >
      {prop.emoji}
    </div>
  );
};

/** Spoken frames (local to the cue) of the preposition and of the last word of the English sentence. */
const spokenFrames = (line: StoryLine, cue: ResolvedCue) => {
  const krWords = stripMarkup(line.kr).split(/\s+/).filter(Boolean).length;
  const wordIndex = krWords + line.left.length;
  const at = (idx: number) => Math.round(cue.words[idx].s * FPS);
  return {word: at(wordIndex), last: at(cue.words.length - 1)};
};

const StoryLineView: React.FC<{line: StoryLine; cue: ResolvedCue}> = ({line, cue}) => {
  const frame = useCurrentFrame();
  const d = cue.duration;
  const stageOpacity = ramp(frame, 0, 10) * (1 - ramp(frame, d - 8, d));

  const spoken = spokenFrames(line, cue);
  const popAt = spoken.word;
  const glowAt = Math.max(popAt + 20, spoken.last);
  const chip = ramp(frame, popAt, popAt + 12);
  const st = WORD[line.kind];
  const long = line.left.length + line.word.split(' ').length + line.right.length > 14;
  const move = easeInOutCubic(frame / (d * 0.7));

  return (
    <div style={{position: 'absolute', inset: 0, opacity: stageOpacity}}>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 54,
          padding: '10px 26px',
          borderRadius: 999,
          background: 'rgba(235,217,180,0.16)',
          border: '2px solid rgba(235,217,180,0.4)',
          color: COLORS.sand,
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 700,
          transform: `translateX(${(1 - ramp(frame, 0, 14)) * -60}px)`,
        }}
      >
        {PLACES[line.place].label}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 36,
          padding: '8px 26px',
          borderRadius: 28,
          background: `rgba(${st.rgb},0.2)`,
          border: `2px solid ${st.edge}`,
          color: st.main,
          fontFamily: FONT,
          textAlign: 'center',
          opacity: chip,
          transform: `scale(${0.8 + 0.2 * chip})`,
        }}
      >
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 2}}>{line.tag}</div>
        <div style={{fontSize: 24, fontWeight: 600, color: COLORS.cream}}>{line.rule}</div>
      </div>

      {line.props.map((p, i) => (
        <Emoji key={i} prop={p} duration={d} index={i} />
      ))}
      {line.actors.map((a, i) => (
        <Actor
          key={i}
          who={a.who}
          x={mx(a.x0 + (a.x1 - a.x0) * move)}
          flip={a.flip}
          walking={a.x0 !== a.x1 && move < 1}
          wave={a.wave && frame > 20}
          opacity={ramp(frame, 0, 12)}
          phase={i * 9}
        />
      ))}

      <BridgeSentence
        left={line.left}
        prep={line.word}
        right={line.right}
        tone={st.tone}
        maxLines={long ? 3 : 2}
        y={long ? 290 : 330}
        fontSize={long ? 82 : line.left.length + line.right.length > 8 ? 92 : 104}
        appearAt={8}
        popAt={popAt}
        glowAt={glowAt}
      />
    </div>
  );
};

/** Short card that introduces each group of six examples (cues p1 / p2). */
const PartIntro: React.FC<{id: string; cue: ResolvedCue}> = ({id, cue}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const info = PART_INTROS[id];
  const d = cue.duration;
  const s = spring({frame: frame - 4, fps, config: {damping: 10, stiffness: 120}});
  const fade = ramp(frame, 0, 8) * (1 - ramp(frame, d - 8, d));
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT, textAlign: 'center'}}>
      <div style={{position: 'absolute', left: 0, width: 1080, top: 250, transform: `scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, s * 2)}}>
        <div style={{display: 'inline-block', padding: '18px 56px', borderRadius: 44, background: `linear-gradient(135deg, ${id === 'p1' ? WORD.past.main : WORD.hadpp.main}, ${id === 'p1' ? WORD.past.edge : WORD.hadpp.edge})`, color: COLORS.ink, fontSize: 60, fontWeight: 900, boxShadow: '0 0 40px rgba(255,214,120,0.45)'}}>{info.title}</div>
        <div style={{fontSize: 40, fontWeight: 700, color: COLORS.sand, marginTop: 34, padding: '0 60px', lineHeight: 1.35}}>{info.sub}</div>
      </div>
    </div>
  );
};

export const StoryScene: React.FC<{scene: SceneSpan}> = ({scene}) => (
  <>
    {scene.cues.map((cue) => {
      const line = STORY_LINES.find((l) => l.id === cue.id);
      return (
        <Sequence key={cue.id} from={cue.start - scene.from} durationInFrames={cue.duration} name={`story-${cue.id}`}>
          {line ? <StoryLineView line={line} cue={cue} /> : <PartIntro id={cue.id} cue={cue} />}
        </Sequence>
      );
    })}
  </>
);
