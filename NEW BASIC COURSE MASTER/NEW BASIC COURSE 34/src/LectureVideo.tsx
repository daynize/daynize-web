import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Background} from './Background';
import {Subtitle} from './Subtitle';
import {IntroScene} from './scenes/IntroScene';
import {BridgeScene} from './scenes/BridgeScene';
import {StoryScene} from './scenes/StoryScene';
import {OutroScene} from './scenes/OutroScene';
import {FONT, ramp, STAGE_DY, STAGE_H, WIDTH} from './theme';
import {SectionBreak} from './components/SectionBreak';
import {CUES, SCENES, SECTION_BREAK, TOTAL_FRAMES, VOICE_READY} from './timeline';

/**
 * Narration: public/voice/<cue-id>.mp3 (scripts/generate_voice.py). Cue lengths and word
 * timings in src/voiceTiming.json come from scripts/sync_timing.py. Until that has run the
 * timeline is a text-length estimate (scripts/estimate_timing.py) and no audio is mounted.
 */
const VOICE_ENABLED = VOICE_READY;

const SCENE_COMPONENTS = {
  intro: IntroScene,
  bridge: BridgeScene,
  story: StoryScene,
  outro: OutroScene,
} as const;

export const LectureVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const veil = Math.max(1 - ramp(frame, 0, 14), ramp(frame, TOTAL_FRAMES - 26, TOTAL_FRAMES));

  return (
    <AbsoluteFill style={{backgroundColor: '#0d0b25', fontFamily: FONT}}>
      <Background />

      {/* Motion stage: everything above the subtitle band. */}
      <div style={{position: 'absolute', left: 0, top: 0, width: WIDTH, height: STAGE_H, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${STAGE_DY}px)`}}>
          {SCENES.map((scene) => {
            const Scene = SCENE_COMPONENTS[scene.id];
            return (
              <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} name={scene.id}>
                <Scene scene={scene} />
              </Sequence>
            );
          })}
        </div>
        <Sequence from={SECTION_BREAK.from} durationInFrames={SECTION_BREAK.duration} name="section-break">
          <SectionBreak duration={SECTION_BREAK.duration} />
        </Sequence>
      </div>

      <Subtitle />

      {VOICE_ENABLED
        ? CUES.map((cue) => (
            <Sequence key={cue.id} from={cue.start} durationInFrames={cue.duration} name={`voice-${cue.id}`}>
              <Audio src={staticFile(`voice/${cue.id}.mp3`)} />
            </Sequence>
          ))
        : null}

      <AbsoluteFill style={{backgroundColor: '#0d0b25', opacity: veil, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
