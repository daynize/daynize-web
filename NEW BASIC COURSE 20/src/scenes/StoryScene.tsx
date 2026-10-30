import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {Actor} from '../components/Actor';
import {BridgeSentence} from '../components/BridgeSentence';
import {COLORS, easeInOutCubic, FONT, FPS, mx, ramp, X_SCALE} from '../theme';
import {PLACES, PropDef, ResolvedCue, SceneSpan, STORY_LINES, StoryLine, stripMarkup} from '../timeline';

const Emoji: React.FC<{prop: PropDef; duration: number; index: number}> = ({prop, duration, index}) => {
  const frame = useCurrentFrame();
  const travel = easeInOutCubic(frame / (duration * 0.85));
  let x = mx(prop.x);
  let y = prop.y;
  let scale = 1;
  let opacity = ramp(frame, 6 + index * 4, 22 + index * 4);

  if (prop.motion === 'float') {
    y += Math.sin(frame / 18 + index * 2) * 14;
    x += Math.cos(frame / 27 + index) * 6;
  } else if (prop.motion === 'pulse') {
    scale = 1 + 0.1 * Math.sin(frame / 7 + index);
  } else if (prop.motion === 'drive') {
    x += (prop.dx ?? 0) * X_SCALE * travel;
    y += Math.sin(frame / 4) * 2;
    if (prop.fadeOut) {
      scale = 1 - 0.55 * travel;
      opacity *= 1 - ramp(frame, duration * 0.45, duration * 0.95);
    }
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
        transform: `translate(-50%,-50%) scale(${scale}) scaleX(${prop.motion === 'drive' && (prop.dx ?? 0) > 0 ? -1 : 1})`,
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
  const leftWords = line.left.reduce((n, p) => n + p.text.split(' ').length, 0);
  const at = (idx: number) => Math.round(cue.words[idx].s * FPS);
  return {prep: at(krWords + leftWords), last: at(cue.words.length - 1)};
};

const StoryLineView: React.FC<{line: StoryLine; cue: ResolvedCue}> = ({line, cue}) => {
  const frame = useCurrentFrame();
  const d = cue.duration;
  const stageOpacity = ramp(frame, 0, 10) * (1 - ramp(frame, d - 8, d));


  const spoken = spokenFrames(line, cue);
  const popAt = spoken.prep;
  const glowAt = Math.max(popAt + 20, spoken.last);
  const move = easeInOutCubic(frame / (d * 0.7));

  return (
    <div style={{position: 'absolute', inset: 0, opacity: stageOpacity}}>
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 54,
          padding: '10px 26px',
          borderRadius: 999,
          background: 'rgba(235,217,180,0.16)',
          border: '2px solid rgba(235,217,180,0.4)',
          color: COLORS.sand,
          fontFamily: FONT,
          fontSize: 34,
          fontWeight: 700,
          transform: `translateX(${(1 - ramp(frame, 0, 14)) * -60}px)`,
        }}
      >
        {PLACES[line.place].label}
      </div>
      <div
          style={{
            position: 'absolute',
            right: 70,
            top: 58,
            color: COLORS.sand,
            fontFamily: FONT,
            fontSize: 30,
            letterSpacing: 6,
            opacity: 0.8,
          }}
        >
          STORY · 도시동화
        </div>

      {line.props.map((p, i) => (
        <Emoji key={i} prop={p} duration={d} index={i} />
      ))}
      {line.actors.map((a, i) => {
        const moving = a.x0 !== a.x1 && move < 1;
        return (
          <Actor
            key={i}
            who={a.who}
            x={mx(a.x0 + (a.x1 - a.x0) * move)}
            flip={a.flip}
            walking={moving}
            wave={a.wave && frame > 20}
            opacity={ramp(frame, 0, 12)}
            phase={i * 9}
          />
        );
      })}

      <BridgeSentence
        left={line.left}
        prep={line.prep}
        right={line.right}
        y={300}
        fontSize={104}
        appearAt={8}
        popAt={popAt}
        glowAt={glowAt}
      />
    </div>
  );
};

export const StoryScene: React.FC<{scene: SceneSpan}> = ({scene}) => (
  <>
    {scene.cues.map((cue, i) => {
      const line = STORY_LINES[i];
      return (
        <Sequence key={cue.id} from={cue.start - scene.from} durationInFrames={cue.duration} name={`story-${cue.id}`}>
          <StoryLineView line={line} cue={cue} />
        </Sequence>
      );
    })}
  </>
);
