import {interpolate} from 'remotion';

export const FPS = 30;
// Vertical short-form canvas (same as CourseCover).
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Layout partition: motion stage on top, subtitle band at the bottom.
export const STAGE_H = 1300;
export const SUBTITLE_TOP = 1300;
// Scenes are authored in "stage space" (ground at GROUND_Y) and shifted down by STAGE_DY, which
// leaves the top of the frame free for the platform UI.
export const STAGE_DY = 280;
export const GROUND_Y = 690;
// Horizontal positions were authored for 1920 px; this maps them onto the 1080 px canvas.
export const X_SCALE = 0.56;
export const mx = (x: number) => WIDTH / 2 + (x - 960) * X_SCALE;

export const COLORS = {
  teal: '#2EC4B6',
  tealBright: '#6AF0E2',
  tealDeep: '#0F6F7A',
  orange: '#FF9A1F',
  yellow: '#FFD54A',
  sand: '#EBD9B4',
  cream: '#FFF6E5',
  coral: '#FF6B6B',
  ink: '#1B1A3A',
  he: '#4F78B8',
  she: '#E0668C',
};

export const FONT =
  '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Arial, sans-serif';

export type Kind = 'e' | 'v' | 'p' | 'h' | 'k';

export const KIND_COLOR: Record<Kind, string> = {
  e: COLORS.cream,
  v: COLORS.tealBright,
  p: COLORS.orange,
  h: '#FF6648',
  k: '#F67608',
};

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// Pure back-out easing (GSAP `back.out` equivalent) so seeking stays deterministic.
export const easeOutBack = (t: number, overshoot = 1.70158) => {
  const x = clamp01(t);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
};

export const ramp = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export type MoodName =
  | 'dawn'
  | 'bridge'
  | 'airport'
  | 'cafe'
  | 'night'
  | 'taxi'
  | 'sunrise'
  | 'sunny'
  | 'morning'
  | 'park'
  | 'autumn'
  | 'deepgreen';

export interface Mood {
  top: string;
  mid: string;
  bottom: string;
  glow: string;
  building: string;
  windows: string;
}

// Warm, storybook-like city palettes.
export const MOODS: Record<MoodName, Mood> = {
  dawn: {top: '#2D2A5E', mid: '#7A4F8F', bottom: '#F2A36B', glow: '#FFD29A', building: '#231F4A', windows: '#FFD98A'},
  bridge: {top: '#1E2A5A', mid: '#3F4C94', bottom: '#E98F6B', glow: '#FFB870', building: '#1A2150', windows: '#FFE2A0'},
  airport: {top: '#3C6EA8', mid: '#8FB5D6', bottom: '#F7C79A', glow: '#FFF0C4', building: '#2F4F7C', windows: '#FFF2C2'},
  cafe: {top: '#4A2B3B', mid: '#8A4A47', bottom: '#E8A25D', glow: '#FFC773', building: '#3B2230', windows: '#FFD27D'},
  night: {top: '#171A44', mid: '#34336E', bottom: '#B8628B', glow: '#FF9FB8', building: '#12143A', windows: '#FFE08F'},
  taxi: {top: '#231C4F', mid: '#5B3A82', bottom: '#F08A5D', glow: '#FFC48A', building: '#1B1542', windows: '#FFD36E'},
  sunny: {top: '#4C86C8', mid: '#E2B27A', bottom: '#F9DDA6', glow: '#FFF3BF', building: '#4A3C63', windows: '#FFE6A0'},
  morning: {top: '#5C8FD8', mid: '#F0B8A0', bottom: '#FFD9A0', glow: '#FFF1C2', building: '#3E4A7A', windows: '#FFE6A0'},
  park: {top: '#58A6D6', mid: '#A9D8B8', bottom: '#E4F0B8', glow: '#FFF6C0', building: '#3D5A6E', windows: '#FFF0B0'},
  autumn: {top: '#6E8EC8', mid: '#E8A870', bottom: '#F4C08A', glow: '#FFE0A0', building: '#5A4458', windows: '#FFD98A'},
  deepgreen: {top: '#053A41', mid: '#053A41', bottom: '#053A41', glow: '#0B5560', building: '#042E34', windows: '#0B5560'},
  sunrise: {top: '#33337A', mid: '#B1587F', bottom: '#FFBE76', glow: '#FFE5A8', building: '#28225E', windows: '#FFE9A8'},
};

export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
