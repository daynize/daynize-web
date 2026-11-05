'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 비회원 10분 무료 체험 타이머.
// 서버(api.daynize.co.kr)가 IP/fingerprint 기준으로 남은 시간을 판정하고, 이 훅은
// 그 값을 기준으로 카운트다운한다. 서버가 죽어 있으면 로컬 타임스탬프로 폴백한다.
// 클라이언트 시계를 돌려도 서버 재동기화(30초 주기 + 탭 복귀 시)로 보정된다.

export type FreePassStatus = 'loading' | 'member' | 'active' | 'expired';

export interface FreePassVoiceQuota {
    sessionsUsed: number;
    maxSessions: number;
    maxSessionMs: number;
}

export interface FreePassServerStatus {
    status: 'member' | 'active' | 'expired';
    remainingMs?: number;
    voice?: FreePassVoiceQuota;
}

export interface UseFreePassTimerOptions {
    apiBase?: string;
    durationMs?: number;
    storageKey?: string;
    syncIntervalMs?: number;
    onExpire?: () => void;
    fetchImpl?: typeof fetch;
    /** 관리자 토큰이 있으면 카운트다운과 /api/free-pass/start 호출을 하지 않는다. */
    suspended?: boolean;
}

export interface FreePassTimer {
    status: FreePassStatus;
    remainingMs: number;
    formatted: string;
    isActive: boolean;
    isExpired: boolean;
    isMember: boolean;
    voice: FreePassVoiceQuota;
    canStartVoice: boolean;
    sync: () => Promise<void>;
}

export const FREE_PASS_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_API_BASE = 'https://api.daynize.co.kr';
export const DEFAULT_STORAGE_KEY = 'daynize_first_visit';
export const DEFAULT_VOICE_QUOTA: FreePassVoiceQuota = { sessionsUsed: 0, maxSessions: 3, maxSessionMs: 5 * 60 * 1000 };

export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readFirstVisit(storageKey: string): number | null {
    const fromStorage = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(fromStorage) && fromStorage > 0) return fromStorage;
    const cookie = document.cookie.split('; ').find(row => row.startsWith(`${storageKey}=`));
    const fromCookie = Number(cookie?.slice(storageKey.length + 1));
    return Number.isFinite(fromCookie) && fromCookie > 0 ? fromCookie : null;
}

function writeFirstVisit(storageKey: string, timestamp: number): void {
    localStorage.setItem(storageKey, String(timestamp));
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${storageKey}=${timestamp}; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
}

async function buildFingerprint(): Promise<string> {
    const raw = [
        navigator.userAgent,
        navigator.language,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.hardwareConcurrency ?? ''
    ].join('|');
    if (globalThis.crypto?.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }
    let hash = 0;
    for (const char of raw) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return (hash >>> 0).toString(16);
}

export function useFreePassTimer({
    apiBase = DEFAULT_API_BASE,
    durationMs = FREE_PASS_DURATION_MS,
    storageKey = DEFAULT_STORAGE_KEY,
    syncIntervalMs = 30_000,
    onExpire,
    fetchImpl,
    suspended = false
}: UseFreePassTimerOptions = {}): FreePassTimer {
    const [status, setStatus] = useState<FreePassStatus>('loading');
    const [remainingMs, setRemainingMs] = useState(durationMs);
    const [voice, setVoice] = useState<FreePassVoiceQuota>(DEFAULT_VOICE_QUOTA);
    const deadlineRef = useRef<number | null>(null);
    const expiredRef = useRef(false);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    const applyStatus = useCallback((next: FreePassServerStatus) => {
        if (next.voice) setVoice(next.voice);
        if (next.status === 'member') {
            deadlineRef.current = null;
            setStatus('member');
            return;
        }
        const remaining = next.status === 'expired' ? 0 : Math.max(0, next.remainingMs ?? 0);
        deadlineRef.current = Date.now() + remaining;
        setRemainingMs(remaining);
        setStatus(remaining > 0 ? 'active' : 'expired');
    }, []);

    const sync = useCallback(async () => {
        const doFetch = fetchImpl ?? globalThis.fetch;
        const firstVisit = readFirstVisit(storageKey) ?? Date.now();
        writeFirstVisit(storageKey, firstVisit);
        const localStatus: FreePassServerStatus = {
            status: Date.now() - firstVisit >= durationMs ? 'expired' : 'active',
            remainingMs: Math.max(0, durationMs - (Date.now() - firstVisit))
        };
        try {
            const me = await doFetch(`${apiBase}/api/auth/me`, { credentials: 'include' });
            if (me.ok && (await me.json())?.loggedIn) {
                applyStatus({ status: 'member' });
                return;
            }
            const response = await doFetch(`${apiBase}/api/free-pass/start`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstVisit, fingerprint: await buildFingerprint() })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            applyStatus((await response.json()) as FreePassServerStatus);
        } catch (error) {
            console.warn('[free-pass] server unavailable; using local timestamp', error);
            applyStatus(localStatus);
        }
    }, [apiBase, applyStatus, durationMs, fetchImpl, storageKey]);

    useEffect(() => {
        if (suspended) {
            deadlineRef.current = null;
            setStatus('member');
            return;
        }
        void sync();
        const interval = setInterval(() => void sync(), syncIntervalMs);
        const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [suspended, sync, syncIntervalMs]);

    useEffect(() => {
        if (status !== 'active') return;
        const tick = () => {
            if (deadlineRef.current === null) return;
            const left = Math.max(0, deadlineRef.current - Date.now());
            setRemainingMs(left);
            if (left === 0) setStatus('expired');
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        if (status !== 'expired' || expiredRef.current) return;
        expiredRef.current = true;
        onExpireRef.current?.();
    }, [status]);

    const formatted = useMemo(() => formatRemaining(remainingMs), [remainingMs]);

    return {
        status,
        remainingMs,
        formatted,
        isActive: status === 'active',
        isExpired: status === 'expired',
        isMember: status === 'member',
        voice,
        canStartVoice: status === 'member' || (status === 'active' && voice.sessionsUsed < voice.maxSessions),
        sync
    };
}
