import { Composition } from 'remotion';
import timeline from './timeline.json';
import { WordOrderShift } from './WordOrderShift';

export const RemotionRoot = () => (
    <Composition
        id="WordOrderShift-Main"
        component={WordOrderShift}
        durationInFrames={timeline.totalVideoDurationFrames}
        fps={timeline.fps}
        width={timeline.width}
        height={timeline.height}
        defaultProps={{ items: timeline.items }}
    />
);