import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {charFrameOf, cueById, SMURF_WORDS} from '../timeline';
import {Label, useFade, WORD, wf, wfe} from './shared';

const CX = WIDTH / 2;
const CELL = 200;
const C = WORD.smurf;

/** Syllable of the chant that triggers each pop; the voice says "어라? 이봐, 스, 머, 프!" (cue k4). */
const TRIGGER = ['어', '이', '스', '머', '프'] as const;

const EXAMPLES = [
  {pre: 'a lot', post: 'older', y: 520},
  {pre: 'even', post: 'more beautiful', y: 650},
  {pre: 'far', post: 'better', y: 780},
] as const;

/**
 * "어라? 이봐, 스머프!" mnemonic. Phase = cues k4 (chant) + k5 (recap) + k6 (examples).
 * Each word pops up on the exact syllable it is chanted with (scripts/sync_timing.py measures per-syllable times):
 * 어라? -> a lot, 이봐 -> even, 스 -> still, 머 -> much, 프! -> far.
 */
export const SmurfBoard: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade(duration);
  const base = cueById('k4').start;

  const popAt = TRIGGER.map((syl) => charFrameOf('k4', syl) - base);
  const recapAt = ['어라는', '이봐는', '스는', '머는', '프는'].map((n) => wf('k4', 'k5', n));
  const recapEnd = wfe('k4', 'k5', 'far', 0, 'e');
  const exampleAt = [wfe('k4', 'k6', 'a'), wfe('k4', 'k6', 'even'), wfe('k4', 'k6', 'far')];

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, fontFamily: FONT}}>
      <Label x={CX} y={34} text="“어라? 이봐, 스머프!” 비교급 강조 5대장" size={38} color={C.main} opacity={ramp(frame, 0, 14)} />

      {TRIGGER.map((_, i) => {
        const x = CX + (i - 2) * CELL;
        const at = popAt[i];
        const popped = frame >= at;
        const bounce = spring({frame: frame - at, fps, config: {damping: 7, stiffness: 150, mass: 0.75}});
        const f = Math.max(0, frame - at);
        const recapNext = i < 4 ? recapAt[i + 1] : recapEnd;
        const recap = frame >= recapAt[i] && frame < recapNext ? 0.75 + 0.25 * Math.sin(frame / 5) : 0;
        const ring = ramp(frame, at, at + 22);
        const word = SMURF_WORDS[i];
        return (
          <React.Fragment key={word.word}>
            <Sequence from={at} durationInFrames={30}>
              <Audio src={staticFile('sfx/pop.wav')} volume={0.6} />
            </Sequence>
            {/* the syllable that is being chanted */}
            <div
              style={{
                position: 'absolute',
                left: x - CELL / 2,
                width: CELL,
                top: 100,
                textAlign: 'center',
                fontSize: 86,
                fontWeight: 900,
                color: popped ? C.main : 'rgba(255,246,229,0.18)',
                transform: `scale(${popped ? 1 + 0.35 * Math.max(0, 1 - f / 10) : 1})`,
                textShadow: popped ? `0 0 ${30 + 30 * recap}px ${C.edge}` : 'none',
              }}
            >
              {word.syllable}
            </div>
            {/* empty slot until its syllable is spoken */}
            <div style={{position: 'absolute', left: x - 92, top: 250, width: 184, height: 84, borderRadius: 42, border: '3px dashed rgba(255,246,229,0.25)', opacity: popped ? 0 : 1}} />
            {/* the word popping up */}
            <div
              style={{
                position: 'absolute',
                left: x - 98,
                top: 250,
                width: 196,
                height: 84,
                borderRadius: 42,
                background: `linear-gradient(135deg, ${C.main}, ${C.edge})`,
                color: COLORS.ink,
                fontSize: 46,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                opacity: popped ? Math.min(1, bounce * 2) : 0,
                transform: `translateY(${(1 - bounce) * 190}px) scale(${(0.45 + 0.55 * bounce) * (1 + 0.07 * recap)})`,
                boxShadow: `0 0 ${24 + 40 * recap + 30 * (1 - ring)}px rgba(${C.rgb},${0.55 + 0.4 * recap})`,
              }}
            >
              {word.word}
            </div>
          </React.Fragment>
        );
      })}

      {EXAMPLES.map((ex, i) => {
        const at = exampleAt[i];
        const s = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 150}});
        return (
          <div key={ex.pre} style={{position: 'absolute', left: 0, width: WIDTH, top: ex.y - 52, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: frame >= at ? Math.min(1, s * 2) : 0, transform: `translateY(${(1 - s) * 40}px) scale(${0.7 + 0.3 * s})`}}>
            <div style={{padding: '8px 30px', borderRadius: 40, background: `linear-gradient(135deg, ${C.main}, ${C.edge})`, color: COLORS.ink, fontSize: 52, fontWeight: 900, whiteSpace: 'nowrap'}}>{ex.pre}</div>
            <div style={{padding: '8px 30px', borderRadius: 40, background: 'rgba(255,246,229,0.14)', border: '3px solid rgba(255,246,229,0.45)', color: COLORS.cream, fontSize: 52, fontWeight: 800, whiteSpace: 'nowrap'}}>{ex.post}</div>
          </div>
        );
      })}
    </div>
  );
};
