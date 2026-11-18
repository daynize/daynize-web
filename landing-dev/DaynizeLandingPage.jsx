import { useState } from 'react';

// 브랜드 토큰 (tailwind.config.js의 theme.extend.colors에 아래와 동일하게 등록해서 쓰세요)
//   daynize: {
//     orange: '#FF6648',
//     navy:   '#14213D',
//     deep:   '#053A41',
//   }
// 컬러 로고 파일: "DAYNIZE LOGO ONLY_2.png" → 빌드 public/ 폴더에 복사 후 경로를 맞춰주세요.
// (주의: 현재 저장소에는 "DAYNIZE LOGO ONLY.png"만 있고 "_2" 파일은 아직 없습니다. 교체본을
//  public/ 에 넣고 파일명을 맞추거나, 아래 LOGO_SRC를 실제 파일명으로 바꿔주세요.)
const LOGO_SRC = '/DAYNIZE LOGO ONLY_2.png';

const NAV_LINKS = [
    { label: '서비스 소개', href: '#value' },
    { label: '커리큘럼', href: '#curriculum' },
    { label: '후기', href: '#reviews' },
    { label: '로그인', href: '/login' },
];

const VALUE_CARDS = [
    {
        title: '실전 200 기본 데이터베이스',
        desc: '기초부터 원어민까지 체계화된 루트 버브 커리큘럼',
    },
    {
        title: 'AI 튜터 데이나(Dayna) 연동',
        desc: 'Gemini Live API 기반 실시간 음성 대화 및 1:1 맞춤 발음 교정',
    },
    {
        title: '압도적인 가성비와 투명성',
        desc: '월 19,000원(부가세 포함)으로 누리는 전용 콘텐츠 무제한 이용',
    },
];

const CURRICULUM_STEPS = [
    {
        step: 'Step 1',
        title: '기본 동사의 활용과 5형식 마스터',
        desc: '뼈대가 잡히는 어근 중심의 문장 구조 학습, 다양한 예문을 통한 영어문장 체화, 사용자의 계획에 따라 조정가능한 주도적인 강의시간.',
    },
    {
        step: 'Step 2',
        title: '데이나 AI 보이스 스튜디오',
        desc: '원어민급 고품질 음성 섀도우와 실시간 대화, 강의학습을 트레킹하여 학습의 완성을 주도적으로 구현, 유저의 필요에 적합한 질문 또는 환경 구현.',
    },
    {
        step: 'Step 3',
        title: 'NUMBERS & BUSINESS COURSE',
        desc: '순차적인 기수와 서수의 활용, 금융에 대한 전반적인 용어 이해.',
    },
];

const HOW_IT_WORKS = [
    { no: '01', title: '간편 회원가입', desc: '카카오/구글/네이버 소셜 로그인으로 30초 안에 가입 완료' },
    { no: '02', title: '정식 구독 신청', desc: '월 19,000원, 안전한 정기 결제로 전 코스 이용권 발급' },
    { no: '03', title: '데이나와 무제한 학습', desc: 'AI 튜터 데이나와 실시간 대화하며 매일 꾸준히 학습' },
];

const REVIEWS = [
    {
        name: '김정숙',
        meta: '60대 · 수강생',
        initial: '김',
        avatarBg: '#FFB199',
        avatar: '/avatars/kim.png',
        quote:
            '나이가 들어서 새로운 걸 배우는 게 두려웠어요. 그런데 \'데이나이즈\'는 어렵게 외우는 게 아니라, 소리와 느낌으로 자연스럽게 영어를 체득하게 해주네요. 젊어진 기분으로 매일 즐겁게 공부하고 있어요!',
    },
    {
        name: '박민수',
        meta: '40대 · 직장인',
        initial: '박',
        avatarBg: '#8FB8FF',
        avatar: '/avatars/park.png',
        quote:
            '예전엔 영어로 말할 때마다 머릿속에서 문장을 만드느라 바빴는데, 이젠 그런 게 싹 사라졌어요. \'데이나이즈\'의 음성 트레이너(Dayna)가 원어민처럼 바로바로 교정해주니 자신감이 생깁니다.',
    },
    {
        name: '이지훈',
        meta: '고등학생',
        initial: '이',
        avatarBg: '#9BE3B0',
        avatar: '/avatars/lee.png',
        quote:
            '데이나이즈 덕분에 영어 공부가 게임처럼 재미있어졌어요! 등하굣길에 앱을 켜고 Dayna와 대화하다 보면, 어느새 발음도 좋아지고 자연스러운 표현이 입에 붙어요.',
    },
];

// 실제 유저 사진이 준비되기 전까지 쓰는 이니셜 아바타.
// REVIEWS[i].avatar 에 실제 이미지 경로를 넣으면 그 이미지가 우선 사용됩니다.
function Avatar({ name, initial, bg, src }) {
    if (src) {
        return <img src={src} alt={name} className="h-12 w-12 rounded-full object-cover" />;
    }
    return (
        <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ background: bg }}
            aria-hidden="true"
        >
            {initial}
        </div>
    );
}

export default function DaynizeLandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollToCheckout = () => {
        document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });
    };

    // PortOne V2 정기결제 연동 뼈대.
    // 실제 프로젝트에서는:
    //   1) 서버에 결제 세션(orderId/금액/정기결제 여부)을 먼저 생성 요청한다.
    //   2) 받은 orderId/channelKey 등으로 PortOne.requestIssueBillingKey(정기결제) 또는
    //      PortOne.requestPayment(단건결제)를 호출한다.
    //   3) 결과(payment.code === undefined → 성공)를 서버로 다시 보내 구독/주문 상태를 확정한다.
    // 브라우저 SDK는 비동기로 로드되므로 window.PortOne 존재 여부를 먼저 확인해야 한다.
    const handlePayment = async () => {
        if (typeof window === 'undefined' || !window.PortOne) {
            console.error('[checkout] PortOne SDK가 로드되지 않았습니다. <script src="https://cdn.portone.io/v2/browser-sdk.js"> 포함 여부를 확인하세요.');
            return;
        }

        try {
            // TODO: 실제 서버 API에서 orderId / amount / channelKey 를 발급받아 사용하세요.
            const orderId = `daynize-${Date.now()}`;
            const amount = 19000;

            const payment = await window.PortOne.requestIssueBillingKey({
                storeId: 'STORE_ID', // PortOne 콘솔의 상점 ID로 교체
                channelKey: 'CHANNEL_KEY', // NHN KCP 정기결제 채널 키로 교체
                billingKeyMethod: 'CARD',
                orderId,
                orderName: 'DAYNIZE 전 코스 무제한 이용권 (월 구독)',
                customer: {
                    // TODO: 로그인된 사용자 정보로 교체
                },
                redirectUrl: `${window.location.origin}/checkout/complete`,
            });

            if (payment?.code) {
                console.error('[checkout] 빌링키 발급 실패', payment);
                return;
            }

            // TODO: 발급된 payment.billingKey를 서버로 전송해 정기결제 등록(월 19,000원) 및 첫 결제를 처리하세요.
            console.info('[checkout] 빌링키 발급 성공', { orderId, amount, billingKey: payment?.billingKey });
        } catch (error) {
            console.error('[checkout] 결제 처리 중 오류', error);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 antialiased">
            {/* ── 상단 내비게이션 ───────────────────────────── */}
            <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
                    <a href="/" className="flex items-center">
                        <img src={LOGO_SRC} alt="DAYNIZE" className="h-8 w-auto" />
                    </a>

                    <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
                        {NAV_LINKS.map((link) => (
                            <a key={link.label} href={link.href} className="transition hover:text-[#FF6648]">
                                {link.label}
                            </a>
                        ))}
                        <a href="tel:070-4010-1147" className="text-slate-400 transition hover:text-slate-600">
                            고객센터
                        </a>
                    </nav>

                    <button
                        type="button"
                        onClick={scrollToCheckout}
                        className="hidden rounded-full bg-[#FF6648] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:bg-[#e85639] md:inline-flex"
                    >
                        전 코스 무제한 수강하기
                    </button>

                    <button
                        type="button"
                        aria-label="메뉴 열기"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 md:hidden"
                    >
                        <span className="text-xl leading-none">{menuOpen ? '×' : '☰'}</span>
                    </button>
                </div>

                {menuOpen && (
                    <div className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
                        <nav className="flex flex-col gap-4 text-sm font-semibold text-slate-700">
                            {NAV_LINKS.map((link) => (
                                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
                                    {link.label}
                                </a>
                            ))}
                            <a href="tel:070-4010-1147" className="text-slate-400">고객센터</a>
                        </nav>
                    </div>
                )}
            </header>

            <main>
                {/* ── 1단: 히어로 (화이트) ───────────────────── */}
                <section className="bg-white px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                            <span className="block">영어로 말하는 법을 설명하는 법,</span>
                            <span className="mt-1 block sm:mt-2">
                                그게{' '}
                                <span className="text-[#FF6648] underline decoration-[#FF6648] decoration-2 underline-offset-4 font-extrabold">
                                    GRAMMAR
                                </span>
                                입니다.
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                            GRAMMAR가 필요한 것이 아니라, 그것이 기본입니다. 200개 핵심 기본과 어순 이동 법칙을{' '}
                            <span className="text-[#FF6648] font-bold">&ldquo;정말 쉽게 구현&rdquo;</span>하여, 원어민의 사고를
                            체화하는 프리미엄 영어 인공지능 플랫폼.
                        </p>

                        <button
                            type="button"
                            onClick={scrollToCheckout}
                            className="mt-10 inline-flex items-center justify-center rounded-full bg-[#FF6648] px-8 py-4 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e85639]"
                        >
                            전 코스 무제한 수강하기 (월 19,000원)
                        </button>

                        <p className="mt-4 text-sm text-slate-400">* 언제든 해지 가능 | 안전한 정기 결제 시스템</p>
                    </div>
                </section>

                {/* ── 2단: 3대 핵심 가치 (다크 네이비) ───────── */}
                <section id="value" className="bg-[#14213D] px-5 py-20 text-white sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
                            나만의 시간으로 더 체계적이고 빠르게
                        </h2>

                        <div className="mt-12 grid gap-6 sm:grid-cols-3">
                            {VALUE_CARDS.map((card) => (
                                <div
                                    key={card.title}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
                                >
                                    <h3 className="text-lg font-bold">{card.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-white/70">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 3단: 핵심 커리큘럼 (화이트) ─────────────── */}
                <section id="curriculum" className="bg-white px-5 py-20 sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-[#FF6648]">
                            Core Curriculum
                        </h2>

                        <div className="mt-10 grid gap-6 sm:grid-cols-3">
                            {CURRICULUM_STEPS.map((item) => (
                                <div key={item.step} className="rounded-2xl border border-slate-100 p-7 shadow-sm">
                                    <span className="text-xs font-bold text-[#FF6648]">{item.step}</span>
                                    <h3 className="mt-2 text-lg font-bold text-[#14213D]">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 4단: 이용 방법 (화이트) ─────────────────── */}
                <section className="bg-white px-5 py-20 sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-extrabold text-[#14213D] sm:text-3xl">이용 방법</h2>

                        <div className="mt-12 grid gap-6 sm:grid-cols-3">
                            {HOW_IT_WORKS.map((item) => (
                                <div key={item.no} className="rounded-2xl bg-slate-50 p-7 text-center">
                                    <span className="text-3xl font-extrabold text-[#FF6648]">{item.no}</span>
                                    <h3 className="mt-4 text-lg font-bold text-[#14213D]">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 5단: 수강생 후기 (다크 딥그린) ─────────── */}
                <section id="reviews" className="bg-[#053A41] px-5 py-20 text-white sm:px-8">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
                            수강생들이 증명하는 DAYNIZE의 효과
                        </h2>

                        <div className="mt-12 grid gap-6 sm:grid-cols-3">
                            {REVIEWS.map((review) => (
                                <div key={review.name} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={review.name} initial={review.initial} bg={review.avatarBg} src={review.avatar} />
                                        <div>
                                            <p className="text-sm font-bold">{review.name} 님</p>
                                            <p className="text-xs text-white/50">{review.meta}</p>
                                        </div>
                                    </div>
                                    <p className="mt-5 text-sm leading-relaxed text-white/80">&ldquo;{review.quote}&rdquo;</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6단: 최종 결제 유도 + 푸터 (다크 딥그린) ── */}
                <section id="checkout" className="bg-[#053A41] px-5 pb-16 pt-4 text-white sm:px-8">
                    <div className="mx-auto max-w-4xl text-center">
                        <h2 className="text-2xl font-extrabold sm:text-3xl">
                            지금 바로 데이나이즈의 프리미엄 커리큘럼을 시작하세요.
                        </h2>

                        <button
                            type="button"
                            onClick={handlePayment}
                            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#FF6648] px-8 py-4 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#e85639]"
                        >
                            전 코스 무제한 수강하기 (월 19,000원)
                        </button>

                        <p className="mt-4 text-sm text-white/50">* 언제든 해지 가능 | 안전한 정기 결제 시스템</p>
                    </div>
                </section>

                <footer className="border-t border-white/10 bg-[#053A41] px-5 py-12 text-white/60 sm:px-8">
                    <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5 text-xs leading-relaxed">
                            <p>사업자등록번호: 665-13-02896 | 대표: 강성준</p>
                            <p>주소: 경기 오산시 오산로 212번길 11-3, 301-N06호</p>
                            <p>고객센터: 070-4010-1147 | 이메일: contact@daynize.co.kr</p>
                            <p>통신판매업 신고 완료</p>
                        </div>

                        <img src={LOGO_SRC} alt="DAYNIZE" className="h-7 w-auto sm:self-end" />
                    </div>
                </footer>
            </main>
        </div>
    );
}
