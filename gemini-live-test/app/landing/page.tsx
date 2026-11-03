'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// 데이나이즈 비회원 랜딩 — 유튜브 숏폼 유입 전용.
// 의존성: Next.js(App Router) + Tailwind CSS 뿐. framer-motion/lucide 없이
// CSS 트랜지션과 인라인 SVG로 구성해 어떤 Next 프로젝트에도 바로 이식 가능.

const DEEP_GREEN = '#053A41';
const ACCENT = '#F67608';
const ACCENT_WARM = '#FF6648';
const SIGNUP_URL = 'https://www.daynize.co.kr/#register'; // TODO: 간편가입 딥링크로 교체

const FONT_STACK =
    "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif";

// ── 30초 체험 데이터 ─────────────────────────────────────────────
// take 하나로 "주어 → 뿌리동사 → 대상" 어순이 그대로 느껴지는 최소 예문.
const TAKE_CARD = {
    verb: 'take',
    gloss: '(손으로) 쥐어서 내 것으로 만듦',
};
const TAKE_SENTENCE = [
    { en: 'I', ko: '나는', role: '주어' },
    { en: 'take', ko: '쥔다', role: '뿌리동사' },
    { en: 'a deep breath', ko: '깊은 숨을', role: '대상' },
];
const REVEAL_INTERVAL_MS = 550;

type Phase = 'idle' | 'assembling' | 'done';

// ── 인라인 SVG 아이콘 (lucide 스타일, 의존성 제거용) ─────────────
type IconProps = { className?: string };
const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
} as const;

const SproutIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <path d="M7 20h10" />
        <path d="M12 20v-9" />
        <path d="M12 11C12 7 9 4 4 4c0 5 3 7 8 7Z" />
        <path d="M12 9c0-3 2.5-5 7-5 0 4-2.5 6-7 6" />
    </svg>
);
const MicIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 17v4" />
        <path d="M8 21h8" />
    </svg>
);
const ChatIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <path d="M21 11a8 8 0 0 1-8 8H5l-2 2V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);
const ReplayIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
    </svg>
);
const CloseIcon = ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} {...strokeProps} aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

// ── 섹션 1: 히어로 ───────────────────────────────────────────────
function HeroSection() {
    return (
        <header className="px-5 pt-14 pb-10 text-center sm:pt-20 sm:pb-14">
            <span
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#053A41]/15 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#053A41] shadow-sm backdrop-blur-md sm:text-sm"
                role="note"
            >
                ☕ “여기는 좀 달라” — 복잡한 영문법은 싹 거둬낸 어순 학습
            </span>
            <h1 className="mx-auto mt-7 max-w-[620px] break-keep text-[clamp(26px,7vw,44px)] font-extrabold leading-[1.3] text-[#053A41]">
                스피킹을 하다 보면,
                <br />
                결국 어법이 궁금해지는 게 당연합니다.
            </h1>
            <p className="mx-auto mt-5 max-w-[520px] break-keep text-[15px] leading-relaxed text-slate-600 sm:text-[17px]">
                평생 이해 안 되던 5형식, to부정사, 관계대명사는 싹 거둬냈습니다.
                <br className="hidden sm:block" /> 뿌리동사 하나로 시작하는 가장 간결한 어순 감각을
                경험해보세요.
            </p>
        </header>
    );
}

// ── 섹션 2: 30초 체험 (어순 조립 애니메이션) ─────────────────────
function QuickWinSection({ onSignup }: { onSignup: () => void }) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [revealed, setRevealed] = useState(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };
    useEffect(() => clearTimers, []);

    const start = useCallback(() => {
        clearTimers();
        setPhase('assembling');
        setRevealed(0);
        TAKE_SENTENCE.forEach((_, index) => {
            timers.current.push(
                setTimeout(() => setRevealed(index + 1), (index + 1) * REVEAL_INTERVAL_MS),
            );
        });
        timers.current.push(
            setTimeout(() => setPhase('done'), (TAKE_SENTENCE.length + 1) * REVEAL_INTERVAL_MS + 200),
        );
    }, []);

    return (
        <section aria-label="30초 뿌리동사 체험" className="px-5">
            <div className="mx-auto max-w-[560px] rounded-3xl border border-white/60 bg-white/60 p-6 shadow-[0_18px_50px_-20px_rgba(5,58,65,0.25)] backdrop-blur-xl sm:p-8">
                <p className="text-xs font-bold tracking-widest text-[#F67608]">30-SECOND QUICK WIN</p>
                <h2 className="mt-2 break-keep text-xl font-bold text-[#053A41] sm:text-2xl">
                    로그인 없이, 뿌리동사 하나만 눌러보세요
                </h2>

                {/* 뿌리동사 카드: 눌러서 체험 시작 */}
                <button
                    type="button"
                    onClick={start}
                    disabled={phase === 'assembling'}
                    aria-label={`뿌리동사 ${TAKE_CARD.verb} 체험 시작`}
                    className={`mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                        phase === 'idle'
                            ? 'border-[#053A41]/20 bg-white hover:-translate-y-0.5 hover:border-[#F67608] hover:shadow-lg'
                            : 'border-[#F67608] bg-[#FFF7F0]'
                    } ${phase === 'assembling' ? 'cursor-wait' : ''}`}
                >
                    <span>
                        <span className="text-2xl font-extrabold text-[#053A41]">{TAKE_CARD.verb}</span>
                        <span className="mt-1 block break-keep text-sm text-slate-600">
                            {TAKE_CARD.gloss}
                        </span>
                    </span>
                    <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-colors ${
                            phase === 'idle' ? 'bg-[#053A41]' : 'bg-[#F67608]'
                        }`}
                    >
                        {phase === 'idle' ? '눌러보기' : phase === 'assembling' ? '조립 중…' : '완성!'}
                    </span>
                </button>

                {/* 어순 조립: 청크가 순서대로 떠오르는 키네틱 타이포 */}
                <div
                    aria-live="polite"
                    className={`mt-6 grid gap-2 transition-[opacity] duration-500 sm:grid-cols-3 ${
                        phase === 'idle' ? 'opacity-40' : 'opacity-100'
                    }`}
                >
                    {TAKE_SENTENCE.map((chunk, index) => {
                        const shown = revealed > index;
                        return (
                            <div
                                key={chunk.en}
                                className={`rounded-xl border border-[#053A41]/10 bg-white px-4 py-3 text-center transition-all duration-500 ease-out ${
                                    shown
                                        ? 'translate-y-0 scale-100 opacity-100'
                                        : 'translate-y-4 scale-95 opacity-0'
                                }`}
                                style={{ transitionDelay: shown ? '0ms' : undefined }}
                            >
                                <p className="text-[11px] font-bold tracking-wide text-[#F67608]">
                                    {chunk.role}
                                </p>
                                <p className="mt-0.5 text-lg font-extrabold text-[#053A41]">{chunk.en}</p>
                                <p className="text-xs text-slate-500">{chunk.ko}</p>
                            </div>
                        );
                    })}
                </div>

                {/* 완성 피드백 + 미니 CTA */}
                <div
                    className={`overflow-hidden transition-all duration-500 ${
                        phase === 'done' ? 'mt-6 max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                    <p className="break-keep rounded-xl bg-[#053A41] px-4 py-3 text-center text-sm font-semibold text-white">
                        30초 만에 어순 감각이 느껴지셨나요? 데이나이즈에서 풀버전을 만나보세요.
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={start}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#053A41]/20 px-4 py-2 text-sm font-semibold text-[#053A41] transition-colors hover:bg-[#053A41]/5"
                        >
                            <ReplayIcon className="h-4 w-4" /> 다시 보기
                        </button>
                        <button
                            type="button"
                            onClick={onSignup}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#F67608] px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                        >
                            풀버전 시작 <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ── 섹션 3: 핵심 가치 3카드 ──────────────────────────────────────
const FEATURES = [
    {
        Icon: SproutIcon,
        title: '복잡함은 거둬낸 ‘뿌리동사 어순 학습’',
        body: '5형식 표나 무작정 단어 외우기가 아닌, 뿌리동사 하나로 확장되는 어순 체득.',
    },
    {
        Icon: MicIcon,
        title: '24시간 편안한 ‘AI 데이나 음성 대화’',
        body: '틀려도 부담 없는 나만의 AI 튜터 데이나와 매일 나누는 1분 실전 대화.',
    },
    {
        Icon: ChatIcon,
        title: '막힘없이 해결되는 ‘Q&A 커뮤니티’',
        body: '회원들과 AI가 함께 빠르게 궁금증을 해소하는 공간.',
    },
];

function FeaturesSection() {
    return (
        <section aria-label="데이나이즈 핵심 기능" className="mt-16 px-5 sm:mt-24">
            <h2 className="break-keep text-center text-2xl font-extrabold text-[#053A41] sm:text-3xl">
                거둬내니, 영어가 가벼워집니다
            </h2>
            <div className="mx-auto mt-8 grid max-w-[960px] gap-4 sm:grid-cols-3 sm:gap-5">
                {FEATURES.map(({ Icon, title, body }) => (
                    <article
                        key={title}
                        className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_12px_36px_-18px_rgba(5,58,65,0.3)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#053A41] text-white">
                            <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 break-keep text-[17px] font-bold leading-snug text-[#053A41]">
                            {title}
                        </h3>
                        <p className="mt-2 break-keep text-sm leading-relaxed text-slate-600">{body}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

// ── 섹션 4: 최종 CTA + 간편가입 모달 ─────────────────────────────
function FinalCtaSection({ onSignup }: { onSignup: () => void }) {
    return (
        <section aria-label="시작하기" className="mt-16 px-5 pb-20 sm:mt-24">
            <div
                className="mx-auto max-w-[760px] rounded-3xl px-6 py-10 text-center text-white shadow-xl sm:py-14"
                style={{ background: `linear-gradient(135deg, ${DEEP_GREEN} 0%, #0A5560 100%)` }}
            >
                <h2 className="break-keep text-xl font-extrabold leading-snug sm:text-2xl">
                    평생 미뤄온 영어, 오늘은 뿌리동사 하나면 충분합니다
                </h2>
                <button
                    type="button"
                    onClick={onSignup}
                    className="mt-7 inline-flex w-full max-w-[420px] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[16px] font-extrabold text-white shadow-lg transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] sm:text-lg"
                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_WARM} 100%)` }}
                >
                    👉 3초 간편가입하고 전체 뿌리동사 강좌 시작하기
                </button>
                <p className="mt-3 text-[13px] text-white/70">
                    신용카드 입력 없음 · 카카오/구글 3초 간편 시작
                </p>
            </div>
        </section>
    );
}

function SignupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const go = (provider: 'kakao' | 'google') => {
        // TODO: 소셜 로그인 연동 전까지의 리다이렉트 placeholder
        window.location.href = `${SIGNUP_URL}?via=landing&provider=${provider}`;
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="3초 간편가입"
            onClick={onClose}
            className={`fixed inset-0 z-50 flex items-end justify-center bg-[#053A41]/40 p-4 backdrop-blur-sm transition-opacity duration-300 sm:items-center ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className={`w-full max-w-[380px] rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
                    open ? 'translate-y-0' : 'translate-y-6'
                }`}
            >
                <div className="flex items-start justify-between">
                    <h3 className="break-keep text-lg font-extrabold text-[#053A41]">
                        3초 만에 시작해요
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
                <p className="mt-1 text-sm text-slate-600">신용카드 입력 없이 바로 수강이 열립니다.</p>
                <button
                    type="button"
                    onClick={() => go('kakao')}
                    className="mt-5 w-full rounded-xl bg-[#FEE500] py-3.5 text-[15px] font-bold text-[#191919] transition-transform hover:scale-[1.02]"
                >
                    카카오로 3초 시작
                </button>
                <button
                    type="button"
                    onClick={() => go('google')}
                    className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white py-3.5 text-[15px] font-bold text-slate-700 transition-transform hover:scale-[1.02]"
                >
                    Google로 3초 시작
                </button>
            </div>
        </div>
    );
}

// ── 페이지 루트 ──────────────────────────────────────────────────
export default function LandingPage() {
    const [signupOpen, setSignupOpen] = useState(false);
    const openSignup = useCallback(() => setSignupOpen(true), []);
    const closeSignup = useCallback(() => setSignupOpen(false), []);

    return (
        <main
            className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased"
            style={{ fontFamily: FONT_STACK }}
        >
            {/* Pretendard: 전역 layout.tsx에서 로드한다면 이 링크는 제거 */}
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
            />
            {/* 은은한 배경 포인트: 글래스 카드가 떠 보이도록 */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-x-0 top-0 h-[420px]"
                style={{
                    background:
                        'radial-gradient(60% 60% at 50% 0%, rgba(246,118,8,0.08) 0%, rgba(5,58,65,0.05) 45%, transparent 100%)',
                }}
            />
            <div className="relative mx-auto max-w-[1080px]">
                <HeroSection />
                <QuickWinSection onSignup={openSignup} />
                <FeaturesSection />
                <FinalCtaSection onSignup={openSignup} />
            </div>
            <SignupModal open={signupOpen} onClose={closeSignup} />
        </main>
    );
}
