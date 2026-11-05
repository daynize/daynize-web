'use client';

import { useSyncExternalStore } from 'react';
import { hasAdminAccess, subscribeAdminAccess } from '../lib/admin-access';
import {
    useFreePassTimer,
    type FreePassTimer,
    type FreePassVoiceQuota,
    type UseFreePassTimerOptions
} from './useFreePassTimer';

// 비회원 10분(600초) 맛보기. 관리자 토큰이 있으면 타이머와 제한 모달을 시작하지 않는다.
// 토큰은 localStorage('daynize_admin_token') 또는 Cookie('daynize_admin_auth') 이다.

export interface TenMinuteTimer extends FreePassTimer {
    bypass: boolean;
    isAdmin: boolean;
}

const OPEN_VOICE: FreePassVoiceQuota = {
    sessionsUsed: 0,
    maxSessions: Number.POSITIVE_INFINITY,
    maxSessionMs: Number.POSITIVE_INFINITY
};

const ADMIN_TIMER: TenMinuteTimer = {
    status: 'member',
    remainingMs: 0,
    formatted: '00:00',
    isActive: false,
    isExpired: false,
    isMember: true,
    isAdmin: true,
    bypass: true,
    voice: OPEN_VOICE,
    canStartVoice: true,
    sync: async () => {}
};

export function use10MinTimer(options: UseFreePassTimerOptions = {}): TenMinuteTimer {
    const isAdmin = useSyncExternalStore(subscribeAdminAccess, hasAdminAccess, () => false);
    const timer = useFreePassTimer({ ...options, suspended: isAdmin });
    if (isAdmin) return ADMIN_TIMER;
    return { ...timer, bypass: false, isAdmin: false };
}
