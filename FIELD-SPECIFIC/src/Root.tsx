import React from "react";
import { Composition } from "remotion";
import { FieldVideo, FieldProps } from "./FieldVideo";
import sample from "./timelines/field-01.json";

export const FPS = 30;

export const RemotionRoot: React.FC = () => (
    <Composition
        id="FieldVideo"
        component={FieldVideo}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 30}
        defaultProps={sample as FieldProps}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.round(props.totalSec * FPS) })}
    />
);
