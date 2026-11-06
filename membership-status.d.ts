export interface MembershipAuth {
    loggedIn?: boolean;
    email?: string;
    membershipStatus?: string;
    isAdmin?: boolean;
    hasActiveSubscription?: boolean;
    preapproved?: boolean;
    user?: { email?: string; membershipStatus?: string; preapproved?: boolean };
}

export declare const PREAPPROVED_EMAILS: Set<string>;
export declare function getStoredMembershipEmail(): string;
export declare function rememberMembershipEmail(email?: string): void;
export declare function forgetMembershipEmail(): void;
export declare function checkIsPaidUser(auth?: MembershipAuth): boolean;
