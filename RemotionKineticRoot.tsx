import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { KineticTypography } from './KineticTypography';
import timelineData from './timeline.json';

/**
 * Remotion 전용 프레임 기반 씬 래퍼 컴포넌트
 * - useCurrentFrame() 과 fps를 계산하여 밀리초 단위 프레임 정확도 보장
 * - 씬별 성우 음성을 타임라인 시작 시간에 맞추어 정확하게 동기화
 */
export const RemotionKineticScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      <KineticTypography currentTime={currentTime} />
      {timelineData.scenes.map((scene) => {
        if (!scene.audioFile) return null;
        const relativeAudioPath = scene.audioFile.replace(/^\/?public\//, '');
        const fromFrame = Math.round(scene.start * fps);
        const durationFrames = Math.max(1, Math.round(scene.duration * fps));

        return (
          <Sequence
            key={scene.id}
            from={fromFrame}
            durationInFrames={durationFrames}
          >
            <Audio src={staticFile(relativeAudioPath)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Remotion Root 설정
 * - 해상도: 1920x1080 Full HD (가로형) 또는 1080x1920 (쇼츠/릴스용 세로형)
 * - FPS: 30fps
 * - 총 길이: 152초 (4560 프레임)
 */
export const RemotionRoot: React.FC = () => {
  const fps = 30;
  const durationInFrames = Math.ceil(timelineData.totalDuration * fps);

  return (
    <>
      {/* 16:9 가로형 강의 영상 버전 */}
      <Composition
        id="KineticVerbs-16x9"
        component={RemotionKineticScene}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1920}
        height={1080}
      />

      {/* 9:16 쇼츠 / 릴스 세로형 버전 */}
      <Composition
        id="KineticVerbs-9x16"
        component={RemotionKineticScene}
        durationInFrames={durationInFrames}
        fps={fps}
        width={1080}
        height={1920}
      />
    </>
  );
};

registerRoot(RemotionRoot);

export default RemotionRoot;
