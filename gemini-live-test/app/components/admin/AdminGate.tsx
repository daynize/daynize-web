'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { adminGateRequested, DEFAULT_API_BASE, hasAdminAccess, persistAdminToken } from '../../lib/admin-access';

export interface AdminGateProps {
    open: boolean;
    onClose?: () => void;
    apiBase?: string;
    dismissible?: boolean;
    onAuthenticated?: (token: string) => void;
}

function stripAdminMode(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('mode')) return;
    url.searchParams.delete('mode');
    history.replaceState(history.state, '', url);
}

export function AdminGateHost({ apiBase = DEFAULT_API_BASE }: { apiBase?: string }) {
    const [open, setOpen] = useState(false);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        const requested = adminGateRequested();
        setPinned(requested && (window.location.pathname.replace(/\/+$/, '') || '/').endsWith('/admin-gate'));
        setOpen(requested);
    }, []);

    if (!open) return null;
    return (
        <AdminGate
            open
            apiBase={apiBase}
            dismissible={!pinned}
            onClose={() => {
                stripAdminMode();
                setOpen(false);
            }}
        />
    );
}

export default function AdminGate({ open, onClose, apiBase = DEFAULT_API_BASE, dismissible = true, onAuthenticated }: AdminGateProps) {
    const titleId = useId();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [done, setDone] = useState(() => hasAdminAccess());

    useEffect(() => {
        if (!open || !dismissible) return;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, dismissible, onClose]);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setPending(true);
        try {
            const response = await fetch(`${apiBase}/api/admin-gate`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body?.token) {
                setError(typeof body?.error === 'string' ? body.error : '확인에 실패했습니다. 다시 시도해 주세요.');
                return;
            }
            persistAdminToken(body.token);
            setPassword('');
            setDone(true);
            onAuthenticated?.(body.token);
        } catch {
            setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setPending(false);
        }
    };

    const close = () => { if (dismissible) onClose?.(); };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={close}
            className={`fixed inset-0 z-[1100] flex items-end justify-center bg-[#053A41]/55 p-4 backdrop-blur-sm sm:items-center ${open ? '' : 'hidden'}`}
        >
            <div onClick={event => event.stopPropagation()} className="w-full max-w-[400px] rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-7">
                <div className="inline-flex items-center rounded-full bg-[#053A41]/10 px-3 py-1 text-xs font-bold text-[#053A41]">관리자</div>
                <h2 id={titleId} className="mt-4 break-keep text-[21px] font-extrabold leading-snug text-[#053A41]">
                    {done ? '관리자 모드가 켜졌습니다' : '관리자 확인'}
                </h2>
                <p className="mt-2 break-keep text-sm leading-relaxed text-slate-600">
                    {done
                        ? '10분 맛보기 제한 없이 모든 강의와 AI 데이나 대화를 사용할 수 있습니다.'
                        : '관리자 암호를 입력하면 맛보기 타이머를 끄고 콘텐츠를 제한 없이 엽니다.'}
                </p>
                {done ? (
                    <button type="button" onClick={() => { stripAdminMode(); window.location.href = '/'; }} className="mt-5 w-full rounded-xl bg-[#053A41] py-3.5 text-[15px] font-bold text-white">
                        학습 화면으로 가기
                    </button>
                ) : (
                    <form onSubmit={submit} className="mt-5">
                        <label htmlFor="admin-gate-password" className="text-xs font-bold text-slate-500">관리자 암호</label>
                        <input
                            id="admin-gate-password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            required
                            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-3 text-[15px] text-[#053A41] outline-none focus:border-[#053A41]"
                        />
                        {error && <p role="alert" className="mt-2 text-sm text-[#FF6648]">{error}</p>}
                        <button type="submit" disabled={pending} className="mt-4 w-full rounded-xl bg-[#F67608] py-3.5 text-[15px] font-bold text-white disabled:opacity-60">
                            {pending ? '확인 중…' : '확인'}
                        </button>
                    </form>
                )}
                {dismissible && (
                    <button type="button" onClick={close} className="mt-3 w-full py-1 text-xs text-slate-400">닫기</button>
                )}
            </div>
        </div>
    );
}
