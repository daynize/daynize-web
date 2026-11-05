'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_CHECKOUT_PATH, fetchAccess } from '../../lib/paywall-access';

export interface PaywallGuardProps {
    children: ReactNode;
    apiBase?: string;
    returnTo?: string;
}

export default function PaywallGuard({ children, apiBase = 'https://api.daynize.co.kr', returnTo }: PaywallGuardProps) {
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        let active = true;
        fetchAccess(apiBase).then(access => {
            if (!active) return;
            if (access.isAdmin || access.hasActiveSubscription) {
                setAllowed(true);
                return;
            }
            const target = new URL(DEFAULT_CHECKOUT_PATH, window.location.origin);
            target.searchParams.set('return_to', returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`);
            window.location.replace(target.href);
        }).catch(() => {
            if (!active) return;
            const target = new URL(DEFAULT_CHECKOUT_PATH, window.location.origin);
            target.searchParams.set('return_to', returnTo ?? window.location.pathname);
            window.location.replace(target.href);
        });
        return () => { active = false; };
    }, [apiBase, returnTo]);

    if (allowed !== true) return null;
    return children;
}
