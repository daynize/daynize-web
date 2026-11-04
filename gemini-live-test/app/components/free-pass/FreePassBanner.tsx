'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFreePassTimer, type UseFreePassTimerOptions } from '../../hooks/useFreePassTimer';
import ConversionModal from './ConversionModal';

export interface FreePassBannerProps extends Omit<UseFreePassTimerOptions, 'onExpire'> {
    returnTo?: string;
    expiredRedirect?: string | null;
    warnAtMs?: number;
}

const DEFAULT_EXPIRED_REDIRECT = '/landing/?expired=1';

export default function FreePassBanner({
    returnTo,
    expiredRedirect = DEFAULT_EXPIRED_REDIRECT,
    warnAtMs = 60_000,
    apiBase,
    ...timerOptions
}: FreePassBannerProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [warned, setWarned] = useState(false);

    const onExpire = useCallback(() => {
        if (expiredRedirect) {
            window.location.replace(expiredRedirect);
            return;
        }
        setModalOpen(true);
    }, [expiredRedirect]);

    const timer = useFreePassTimer({ ...timerOptions, apiBase, onExpire });

    useEffect(() => {
        if (timer.isActive && !warned && timer.remainingMs <= warnAtMs) {
            setWarned(true);
            setModalOpen(true);
        }
    }, [timer.isActive, timer.remainingMs, warnAtMs, warned]);

    const closeModal = useCallback(() => setModalOpen(false), []);

    if (timer.status === 'loading' || timer.isMember) return null;

    const urgent = timer.isActive && timer.remainingMs <= warnAtMs;

    return (
        <>
            <div
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 top-3 z-[900] flex justify-center px-3"
            >
                <div
                    className={`pointer-events-auto flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] shadow-[0_10px_30px_-12px_rgba(5,58,65,0.45)] backdrop-blur-md transition-colors sm:gap-3 sm:px-4 sm:text-sm ${
                        urgent ? 'border-[#FF6648]/40 bg-[#FF6648] text-white' : 'border-white/30 bg-[#053A41] text-white'
                    }`}
                >
                    <span className="flex shrink-0 items-center gap-1.5 font-semibold">
                        <span aria-hidden="true">⏱️</span>
                        <span className="hidden sm:inline">10분 자유 체험 중</span>
                        <span className="sm:hidden">체험 중</span>
                        <span
                            className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                                urgent ? 'bg-white/25 text-white' : 'bg-[#F67608] text-white'
                            }`}
                        >
                            {timer.isExpired ? '00:00' : timer.formatted}
                        </span>
                    </span>
                    <span className="h-4 w-px shrink-0 bg-white/30" aria-hidden="true" />
                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="shrink-0 truncate rounded-full py-0.5 font-bold underline-offset-4 transition-colors hover:underline"
                    >
                        <span className="hidden sm:inline">3초 가입으로 학습 기록 저장하기</span>
                        <span className="sm:hidden">3초 가입하기</span>
                    </button>
                </div>
            </div>

            <ConversionModal
                open={modalOpen}
                onClose={closeModal}
                variant={timer.isExpired ? 'expired' : 'warning'}
                dismissible={!timer.isExpired}
                apiBase={apiBase}
                returnTo={returnTo}
            />
        </>
    );
}
