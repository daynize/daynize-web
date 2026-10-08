import { Composition } from "remotion";
import { WordOrderShift } from "./WordOrderShift";
import timeline from "./timeline.json";

export const RemotionRoot = () => (
    <Composition
        id="WordOrderShift-Main"
        component={WordOrderShift}
        durationInFrames={timeline.totalVideoDurationFrames}
        fps={timeline.fps}
        width={timeline.width}
        height={timeline.height}
    />
);
