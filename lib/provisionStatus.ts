import { toMillisSafe } from './datetime';

export type ProvisionStatus = 'active' | 'canceled';
export type ProvisionDisplayStatus = ProvisionStatus | 'canceling';

export type ProvisionLike = {
  expiresAt?: number | string | null;
  accessExpiresAt?: number | string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAtPeriodEndAt?: number | string | null;
  status?: string | null;
};

const toMillis = (val: any): number | null => {
  const ms = toMillisSafe(val);
  return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
};

export const getProvisionAccessUntil = (acct: ProvisionLike): number | null => {
  const exp = toMillis(acct.expiresAt ?? acct.accessExpiresAt);
  const cancelEnd = toMillis(acct.cancelAtPeriodEndAt);
  if (typeof exp === 'number' && typeof cancelEnd === 'number') return Math.max(exp, cancelEnd);
  if (typeof exp === 'number') return exp;
  if (typeof cancelEnd === 'number') return cancelEnd;
  return null;
};

export const getProvisionStatus = (acct: ProvisionLike, now: number = Date.now()) => {
  const accessUntil = getProvisionAccessUntil(acct);
  const statusRaw = String(acct.status || '').toLowerCase();
  const statusTerminal = ['canceled', 'cancelled', 'cancel', 'expired', 'incomplete_expired', 'unpaid', 'uncollectible'].includes(statusRaw);
  const statusActive = statusRaw === 'active' || statusRaw === 'trialing' || statusRaw === 'trial';
  const hasAccess = statusTerminal
    ? false
    : typeof accessUntil === 'number'
    ? accessUntil > now
    : statusActive;
  const isCanceling = acct.cancelAtPeriodEnd === true && hasAccess;
  const status: ProvisionStatus = hasAccess ? 'active' : 'canceled';
  const displayStatus: ProvisionDisplayStatus = isCanceling ? 'canceling' : status;
  return { status, displayStatus, hasAccess, isCanceling, accessUntil };
};

export const getProvisionStatusLabel = (value?: ProvisionDisplayStatus | ProvisionStatus | null): string => {
  if (!value) return '—';
  switch (value) {
    case 'active':
      return 'Active';
    case 'canceling':
      return 'Canceling';
    case 'canceled':
      return 'Canceled';
    default:
      return String(value);
  }
};

export const getProvisionStatusBadgeClass = (value?: ProvisionDisplayStatus | ProvisionStatus | null): string => {
  switch (value) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100';
    case 'canceling':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100';
    case 'canceled':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-100';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
};
