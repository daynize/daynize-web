'use client';

import { useEffect } from 'react';
import { startSocialLogin } from '../../lib/auth';

export type ConversionModalVariant = 'warning' | 'expired';

export interface ConversionModalProps {
    open: boolean;
    onClose: () => void;
    variant?: ConversionModalVariant;
    dismissible?: boolean;
    apiBase?: string;
    returnTo?: string;
}

const COPY: Record<ConversionModalVariant, { headline: string; sub: string }> = {
    warning: {
        headline: '잠깐! 방금 공부하신 내용이 곧 사라져요 😢',
        sub: '카카오/구글 3초 회원가입만 하면 AI 음성대화 및 학습 기록을 무료로 보존할 수 있습니다.'
    },
    expired: {
        headline: '10분 무료 체험이 완료되었습니다!',
        sub: '3초 소셜 로그인하고 방금 공부한 기록을 이어가세요.'
    }
};

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

function KakaoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.31 4.66 6.73l-1.1 4.07a.4.4 0 0 0 .61.43l4.75-3.16c.35.03.7.05 1.08.05 5.52 0 10-3.58 10-8S17.52 3 12 3Z" />
        </svg>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.96H12v3.7h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.74 2.98-4.31 2.98-7.26Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H3.07v2.58A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.5H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.5l3.34-2.58Z" />
            <path fill="#EA4335" d="M12 5.97c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.34 2.58C7.2 7.72 9.4 5.97 12 5.97Z" />
        </svg>
    );
}

export default function ConversionModal({ open, onClose, variant = 'warning', dismissible = true, apiBase, returnTo }: ConversionModalProps) {
    const copy = COPY[variant];
    const close = () => { if (dismissible) onClose(); };

    useEffect(() => {
        if (!open || !dismissible) return;
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, dismissible, onClose]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-pass-modal-title"
            aria-hidden={!open}
            onClick={close}
            className={`fixed inset-0 z-[1000] flex items-end justify-center bg-[#053A41]/50 p-4 backdrop-blur-sm transition-opacity duration-300 sm:items-center ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
        >
            <div
                onClick={event => event.stopPropagation()}
                className={`w-full max-w-[400px] rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 sm:p-7 ${
                    open ? 'translate-y-0' : 'translate-y-6'
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F67608]/10 px-3 py-1 text-xs font-bold text-[#F67608]">
                        <span aria-hidden="true">⏱️</span>
                        {variant === 'expired' ? '무료 체험 종료' : '무료 체험 중'}
                    </div>
                    {dismissible && (
                        <button type="button" onClick={onClose} aria-label="닫기" className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100">
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <h3 id="free-pass-modal-title" className="mt-4 break-keep text-[21px] font-extrabold leading-snug text-[#053A41]">
                    {copy.headline}
                </h3>
                <p className="mt-2 break-keep text-sm leading-relaxed text-slate-600">{copy.sub}</p>

                <ul className="mt-4 space-y-1.5 text-[13px] text-slate-700">
                    {['지금까지 본 강의·노트 기록 보존', 'AI 데이나 음성대화 계속 이용'].map(item => (
                        <li key={item} className="flex items-center gap-2">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F67608]" aria-hidden="true" />
                            {item}
                        </li>
                    ))}
                </ul>

                <button
                    type="button"
                    onClick={() => startSocialLogin('kakao', { apiBase, returnTo })}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-[15px] font-bold text-[#191919] transition-transform hover:scale-[1.02] active:scale-[0.99]"
                >
                    <KakaoIcon className="h-5 w-5" />
                    카카오로 3초 만에 시작하기
                </button>
                <button
                    type="button"
                    onClick={() => startSocialLogin('google', { apiBase, returnTo })}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 text-[15px] font-bold text-slate-700 transition-transform hover:scale-[1.02] active:scale-[0.99]"
                >
                    <GoogleIcon className="h-5 w-5" />
                    구글로 계속하기
                </button>

                {dismissible && (
                    <button type="button" onClick={onClose} className="mt-3 w-full py-1 text-xs text-slate-400 underline-offset-2 hover:underline">
                        나중에 할게요
                    </button>
                )}
            </div>
        </div>
    );
}
