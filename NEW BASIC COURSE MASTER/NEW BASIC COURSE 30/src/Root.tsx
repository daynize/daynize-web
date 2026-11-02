import React from 'react';
import {Composition, Sequence} from 'remotion';
import {COURSE_COVER_FRAMES, CourseCover, CourseCoverProps} from './CourseCover';
import {LectureVideo} from './LectureVideo';
import {FPS, HEIGHT, WIDTH} from './theme';
import {TOTAL_FRAMES} from './timeline';

const LESSON10_COVER = {episodeNumber: 12, title: 'another · other · the other'} satisfies CourseCoverProps;

// Lesson 12 = 3 s cover (frames 0-89) followed by the lecture body (from frame 90).
export const Lesson10: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={COURSE_COVER_FRAMES} name="cover">
      <CourseCover {...LESSON10_COVER} />
    </Sequence>
    <Sequence from={COURSE_COVER_FRAMES} durationInFrames={TOTAL_FRAMES} name="body">
      <LectureVideo />
    </Sequence>
  </>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Lesson10-AnotherOther"
      component={Lesson10}
      durationInFrames={COURSE_COVER_FRAMES + TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="AnotherOtherBody"
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
      defaultProps={LESSON10_COVER}
    />
  </>
);
