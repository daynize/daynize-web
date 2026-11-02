import React from 'react';
import {Composition, Sequence} from 'remotion';
import {COURSE_COVER_FRAMES, CourseCover, CourseCoverProps} from './CourseCover';
import {LectureVideo} from './LectureVideo';
import {FPS, HEIGHT, WIDTH} from './theme';
import {TOTAL_FRAMES} from './timeline';

const LESSON05_COVER = {episodeNumber: 5, title: '전치사 at, on, in'} satisfies CourseCoverProps;

// Lesson 5 = 3 s cover (frames 0-89) followed by the lecture body (from frame 90).
export const Lesson05: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={COURSE_COVER_FRAMES} name="cover">
      <CourseCover {...LESSON05_COVER} />
    </Sequence>
    <Sequence from={COURSE_COVER_FRAMES} durationInFrames={TOTAL_FRAMES} name="body">
      <LectureVideo />
    </Sequence>
  </>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Lesson05-TimePrepositions"
      component={Lesson05}
      durationInFrames={COURSE_COVER_FRAMES + TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="TimePrepositionsBody"
      component={LectureVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="CourseCover-Preview"
      component={CourseCover}
      durationInFrames={COURSE_COVER_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={LESSON05_COVER}
    />
  </>
);
