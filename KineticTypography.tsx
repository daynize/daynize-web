import React, { useMemo } from 'react';
import rawTimeline from './timeline.json';

export interface VerbHighlighting {
  verbs?: string[];
  type?: string;
  visualEffect?: string | null;
  hanja?: string;
  triggerTime?: number;
  preposition?: string;
  koreanMeaning?: string;
  incorrectUsage?: string;
  correctUsage?: string;
  targetSentence?: string;
  isCorrect?: boolean;
}

export interface Scene {
  id: number;
  start: number;
  end: number;
  duration: number;
  text: string;
  verbHighlighting: VerbHighlighting;
}

export interface TimelineData {
  title: string;
  totalDuration: number;
  sceneCount: number;
  scenes: Scene[];
}

export interface KineticTypographyProps {
  /** 현재 재생 시간 (초 단위). 일반 React 웹 플레이어에서 전달 */
  currentTime?: number;
  /** 타임라인 데이터 (기본값: timeline.json) */
  timeline?: TimelineData;
  /** 커스텀 컨테이너 스타일 */
  style?: React.CSSProperties;
}

const HIGHLIGHT_COLOR = '#FF6648'; // 요청 지정 색상
const TEXT_BASE_COLOR = '#191A20'; // Pure White 배경 위 세련된 다크 차콜
const HANJA_BADGE_BG = '#FFF0ED';
const FONT_FAMILY =
  '"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** 0 ~ 1 사이의 진행률(t)을 부드러운 Back-Out Easing(핀치 줌인 오버슛)으로 변환 */
function easeOutBack(t: number, overshoot = 1.35): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  const clamped = Math.max(0, Math.min(1, t));
  return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
}

/** 부드러운 Cubic Out Easing */
function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/** 대본 내 지문(/: ... :/) 및 마크다운 태그를 분리하고 하이라이트 동사를 파싱 */
function parseSceneContent(text: string, highlighting: VerbHighlighting) {
  // 지문 분리
  const scriptRegex = /\/:\s*([\s\S]*?)\s*:\//g;
  let cleanText = text.replace(scriptRegex, '').trim();

  // 문장 부호 및 불필요한 단독 기호 정리
  if (cleanText === '-') cleanText = '';

  const verbs = (highlighting.verbs || []).map((v) => v.toUpperCase());

  // 마크다운 **bold** 및 영문 단어 토큰화
  const tokenRegex = /(\*\*[^*]+\*\*|[A-Za-z]+(?:\s+[A-Za-z]+)?)/g;
  const parts: Array<{ text: string; isVerb: boolean; isBold: boolean }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(cleanText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: cleanText.substring(lastIndex, match.index),
        isVerb: false,
        isBold: false,
      });
    }

    const token = match[0];
    const stripped = token.replace(/\*\*/g, '').trim();
    const upperStripped = stripped.toUpperCase();
    const isVerb = verbs.some((v) => upperStripped === v || upperStripped.includes(v));
    const isBold = token.startsWith('**') && token.endsWith('**');

    parts.push({
      text: stripped,
      isVerb,
      isBold: isBold || isVerb,
    });

    lastIndex = match.index + token.length;
  }

  if (lastIndex < cleanText.length) {
    parts.push({
      text: cleanText.substring(lastIndex),
      isVerb: false,
      isBold: false,
    });
  }

  return { cleanText, parts };
}

/**
 * KineticTypography Component
 * - Pure White (#FFFFFF) 배경
 * - 부드러운 Drop Shadow 효과
 * - 화면 정중앙 1씬 단독 노출
 * - 빠른 핀치 확대(Pinch Zoom-in) 모션
 * - 영어 동사 #FF6648 색상 하이라이트
 */
export const KineticTypography: React.FC<KineticTypographyProps> = ({
  currentTime = 0,
  timeline = rawTimeline as TimelineData,
  style,
}) => {
  const { scenes } = timeline;

  // 현재 시간에 일치하는 단일 씬 검색
  const currentScene = useMemo(() => {
    return (
      scenes.find((s) => currentTime >= s.start && currentTime < s.end) ||
      (currentTime >= timeline.totalDuration ? scenes[scenes.length - 1] : null)
    );
  }, [scenes, currentTime, timeline.totalDuration]);

  if (!currentScene) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          ...style,
        }}
      />
    );
  }

  const { start, end, duration, text, verbHighlighting } = currentScene;
  const elapsed = Math.max(0, currentTime - start);
  const remaining = Math.max(0, end - currentTime);

  // 1. 메인 등장 핀치 줌인 (0 ~ 0.35초 동안 스케일 0.78 -> 1.0으로 탄성 있게 확대)
  const entranceDuration = Math.min(0.35, duration * 0.4);
  const entranceProgress = Math.min(1, elapsed / entranceDuration);
  const entranceScale = 0.78 + 0.22 * easeOutBack(entranceProgress, 1.45);
  const entranceOpacity = Math.min(1, elapsed / (entranceDuration * 0.7));

  // 2. 퇴장 페이드 아웃 (종료 직전 0.18초)
  const exitDuration = 0.18;
  const exitOpacity = remaining < exitDuration ? remaining / exitDuration : 1;

  // 3. 씬 전용 2차 핀치 확대 (Scene 8, 12의 발화 타이밍 맞춤 확대 효과)
  let specialZoom = 1;
  const isPinchScene = verbHighlighting?.visualEffect === 'pinch-zoom';
  if (isPinchScene && verbHighlighting.triggerTime) {
    const pinchElapsed = currentTime - verbHighlighting.triggerTime;
    if (pinchElapsed > 0) {
      const pinchProgress = Math.min(1, pinchElapsed / 0.4);
      specialZoom = 1 + 0.22 * easeOutCubic(pinchProgress); // 1.0 -> 1.22배 확대
    }
  }

  const finalScale = entranceScale * specialZoom;
  const finalOpacity = entranceOpacity * exitOpacity;

  const { parts } = parseSceneContent(text, verbHighlighting);
  const isHanjaBadgeVisible = Boolean(verbHighlighting?.hanja);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#FFFFFF', // [요구사항 1] Pure White 배경
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
        padding: '5vw',
        boxSizing: 'border-box',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 씬 중앙 메인 컨테이너 (한 번에 한 씬만 정중앙 노출) */}
      <div
        key={currentScene.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1080px',
          textAlign: 'center',
          // [요구사항 3] 빠른 핀치 줌인(Pinch Zoom-in) 애니메이션 적용
          transform: `scale(${finalScale.toFixed(4)})`,
          opacity: finalOpacity,
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
          // [요구사항 1] 텍스트 및 박스 하단 부드러운 Drop Shadow 효과
          filter:
            'drop-shadow(0 16px 36px rgba(0, 0, 0, 0.08)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.04))',
        }}
      >
        {/* 한문 표기 핀치 뱃지 (Scene 8 他動詞 / Scene 12 自動詞 연출 지문 대응) */}
        {isHanjaBadgeVisible && (
          <div
            style={{
              marginBottom: '24px',
              padding: '8px 24px',
              borderRadius: '999px',
              backgroundColor: HANJA_BADGE_BG,
              color: HIGHLIGHT_COLOR,
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '0.12em',
              boxShadow: '0 4px 16px rgba(255, 102, 72, 0.18)',
              border: `1.5px solid ${HIGHLIGHT_COLOR}`,
              animation: 'pulse 1.8s infinite ease-in-out',
            }}
          >
            {verbHighlighting.hanja}
          </div>
        )}

        {/* 메인 텍스트 렌더링 */}
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.8rem, 4.2vw, 3.4rem)',
            fontWeight: 700,
            lineHeight: 1.45,
            letterSpacing: '-0.025em',
            color: TEXT_BASE_COLOR,
            wordBreak: 'keep-all',
            // [요구사항 1] 글자 하단 부드러운 Drop Shadow 효과
            textShadow:
              '0 8px 24px rgba(0, 0, 0, 0.07), 0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          {parts.map((part, index) => {
            // [요구사항 4] verbHighlighting에 맞춰 영어 동사는 반드시 #FF6648 색상 지정
            if (part.isVerb) {
              return (
                <span
                  key={index}
                  style={{
                    color: HIGHLIGHT_COLOR,
                    fontWeight: 900,
                    margin: '0 0.15em',
                    display: 'inline-block',
                    transform: 'scale(1.05)',
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(255, 102, 72, 0.4)',
                    textUnderlineOffset: '6px',
                    textDecorationThickness: '3px',
                    textShadow: '0 4px 16px rgba(255, 102, 72, 0.28)',
                  }}
                >
                  {part.text}
                </span>
              );
            }

            if (part.isBold) {
              return (
                <strong
                  key={index}
                  style={{
                    fontWeight: 800,
                    color: '#0F1014',
                  }}
                >
                  {part.text}
                </strong>
              );
            }

            return <span key={index}>{part.text}</span>;
          })}
        </h1>

        {/* 부가 가이드 정보 카드 (예문 씬 및 예시 10선) */}
        {verbHighlighting.koreanMeaning && (
          <div
            style={{
              marginTop: '28px',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#555A68',
              backgroundColor: '#F5F6F9',
              padding: '10px 24px',
              borderRadius: '16px',
              border: '1px solid #EAEBED',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
            }}
          >
            의미: <span style={{ color: '#1A1A1E' }}>{verbHighlighting.koreanMeaning}</span>
          </div>
        )}
      </div>

      {/* 하단 미니 타임라인 진행 바 (웹 플레이어 UX용) */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '10%',
          right: '10%',
          height: 4,
          backgroundColor: '#EEF0F4',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (currentTime / timeline.totalDuration) * 100)}%`,
            backgroundColor: HIGHLIGHT_COLOR,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
};

export default KineticTypography;
