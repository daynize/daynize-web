import React from 'react';
import {Composition, Sequence} from 'remotion';
import {COURSE_COVER_FRAMES, CourseCover, CourseCoverProps} from './CourseCover';
import {LectureVideo} from './LectureVideo';
import {FPS, HEIGHT, WIDTH} from './theme';
import {TOTAL_FRAMES} from './timeline';

const LESSON09B_COVER = {episodeNumber: 11, title: 'of, for, from, by, with which'} satisfies CourseCoverProps;

// Lesson 11 = 3 s cover (frames 0-89) followed by the lecture body (from frame 90).
export const Lesson09b: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={COURSE_COVER_FRAMES} name="cover">
      <CourseCover {...LESSON09B_COVER} />
    </Sequence>
    <Sequence from={COURSE_COVER_FRAMES} durationInFrames={TOTAL_FRAMES} name="body">
      <LectureVideo />
    </Sequence>
  </>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Lesson09b-PrepRelatives"
      component={Lesson09b}
      durationInFrames={COURSE_COVER_FRAMES + TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="PrepRelativesBody"
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
      defaultProps={LESSON09B_COVER}
    />
  </>
);
