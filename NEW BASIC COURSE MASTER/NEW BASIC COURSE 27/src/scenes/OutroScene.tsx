import React from 'react';
import {Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, ramp, WIDTH} from '../theme';
import {cueById, SceneSpan, wordFrameOf} from '../timeline';
import {REL, RelName} from './shared';

const ITEMS: {rel: RelName; kr: string; emoji: string}[] = [
  {rel: 'who', kr: '사람', emoji: '🧑'},
  {rel: 'which', kr: '사물·동물', emoji: '📦'},
  {rel: 'that', kr: '다재다능', emoji: '🧴'},
  {rel: 'what', kr: '~하는 것', emoji: '🎁'},
];

export const OutroScene: React.FC<{scene: SceneSpan}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o1 = cueById('o1').start - scene.from;
  const o3 = cueById('o3').start - scene.from;
  const o4 = cueById('o4').start - scene.from;
  const at = (needle: string) => wordFrameOf('o2', needle) - scene.from;
  const eqAt = Math.min(o1 + 10, o1 + 30);

  const pop = (start: number) => spring({frame: frame - start, fps, config: {damping: 10, stiffness: 130}});
  const examplesOut = 1 - ramp(frame, o4 - 6, o4 + 8);
  const thanks = spring({frame: frame - o4 - 6, fps, config: {damping: 8, stiffness: 120}});
  const eq = pop(eqAt);

  return (
    <div style={{position: 'absolute', inset: 0}}>
      {ITEMS.map((it) => (
        <Sequence key={it.rel} from={at(it.rel)} durationInFrames={30}>
          <Audio src={staticFile('sfx/ding.wav')} volume={0.45} />
        </Sequence>
      ))}
      <Sequence from={o4 + 6} durationInFrames={45}>
        <Audio src={staticFile('sfx/glow.wav')} volume={0.6} />
      </Sequence>

      <div style={{opacity: examplesOut}}>
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 40, textAlign: 'center', opacity: Math.min(1, eq * 2), transform: `scale(${0.7 + 0.3 * eq})`}}>
          <span style={{display: 'inline-block', padding: '12px 36px', borderRadius: 34, background: 'rgba(255,246,229,0.12)', border: `3px solid ${COLORS.sand}`, fontFamily: FONT, fontWeight: 800, fontSize: 44, color: COLORS.cream}}>🔗 접속사 + 🧑 대명사 = 관계대명사</span>
        </div>
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 160, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: COLORS.coral, opacity: ramp(frame, o1 + 40, o1 + 54)}}>and / or / but + which ✕ 중복 금지</div>
        {ITEMS.map((it, i) => {
          const st = REL[it.rel];
          const a = at(it.rel);
          const s = pop(a - 4);
          const active = frame >= a && frame < a + 40;
          const col = i % 2;
          const row = Math.floor(i / 2);
          return (
            <div key={it.rel} style={{position: 'absolute', left: WIDTH / 2 + (col - 0.5) * 505 - 242, top: 260 + row * 210, width: 484, height: 170, boxSizing: 'border-box', borderRadius: 36, background: `rgba(${st.rgb},${active ? 0.34 : 0.16})`, border: `3px solid ${active ? st.main : st.edge}`, boxShadow: active ? `0 0 44px ${st.edge}aa` : 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', fontFamily: FONT, opacity: frame >= a - 4 ? Math.min(1, s * 2) : 0, transform: `scale(${(0.5 + 0.5 * s) * (active ? 1.05 : 1)})`}}>
              <div style={{fontSize: 72, lineHeight: 1}}>{it.emoji}</div>
              <div>
                <div style={{fontSize: 54, fontWeight: 900, color: st.main, lineHeight: 1.05}}>{it.rel}</div>
                <div style={{fontSize: 30, fontWeight: 600, color: COLORS.sand}}>{it.kr}</div>
              </div>
            </div>
          );
        })}
      </div>

      {frame >= o3 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 800, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 800, color: COLORS.yellow, opacity: ramp(frame, o3, o3 + 14) * examplesOut, transform: `scale(${1 + 0.04 * Math.sin(frame / 6)})`, textShadow: `0 0 26px ${COLORS.orange}`}}>
          🗣️ 소리 내어 스스로 설명해 보세요!
        </div>
      ) : null}

      {frame >= o4 ? (
        <div style={{position: 'absolute', left: 0, width: WIDTH, top: 480, textAlign: 'center', fontFamily: FONT, color: COLORS.cream, opacity: Math.min(1, thanks * 2), transform: `scale(${0.6 + 0.4 * thanks})`, textShadow: `0 0 ${40 * thanks}px ${COLORS.orange}`}}>
          <div style={{fontSize: 130, fontWeight: 900}}>Thank you</div>
          <div style={{fontSize: 64, fontWeight: 700, color: COLORS.sand, marginTop: 6}}>감사합니다 ❤️</div>
        </div>
      ) : null}
    </div>
  );
};
