import { toMillisSafe } from './datetime';
import { getProvisionStatus, type ProvisionLike } from './provisionStatus';

export const USER_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  INACTIVE: 'inactive',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type UserDisplayStatus = Extract<UserStatus, 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'>;

export type UserDisplayStatusInput = {
  status?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: number | string | null;
  accessExpiresAt?: number | string | null;
  provisions?: ProvisionLike[] | null;
  hasHistory?: boolean;
  now?: number;
};

const STATUS_ALIASES: Record<string, UserStatus> = {
  active: USER_STATUS.ACTIVE,
  paid: USER_STATUS.ACTIVE,
  trial: USER_STATUS.TRIALING,
  trialing: USER_STATUS.TRIALING,
  past_due: USER_STATUS.PAST_DUE,
  pastdue: USER_STATUS.PAST_DUE,
  unpaid: USER_STATUS.CANCELED,
  uncollectible: USER_STATUS.CANCELED,
  canceled: USER_STATUS.CANCELED,
  cancelled: USER_STATUS.CANCELED,
  cancel: USER_STATUS.CANCELED,
  expired: USER_STATUS.EXPIRED,
  incomplete_expired: USER_STATUS.CANCELED,
  inactive: USER_STATUS.INACTIVE,
  registered: USER_STATUS.INACTIVE,
};

export const normalizeUserStatus = (value?: string | null): UserStatus | null => {
  if (!value) return null;
  const key = String(value).toLowerCase().trim();
  return STATUS_ALIASES[key] || null;
};

const isTerminalStatus = (value?: string | null): boolean => {
  const key = String(value || '').toLowerCase().trim();
  return [
    'canceled',
    'cancelled',
    'cancel',
    'expired',
    'incomplete_expired',
    'unpaid',
    'uncollectible',
  ].includes(key);
};

export const deriveUserDisplayStatus = (input: UserDisplayStatusInput): UserDisplayStatus => {
  const now = input.now ?? Date.now();
  const rawStatus = input.status || null;
  const rawSubscriptionStatus = input.subscriptionStatus || null;
  const normalizedStatus = normalizeUserStatus(rawStatus);
  const normalizedSubscriptionStatus = normalizeUserStatus(rawSubscriptionStatus);
  const terminal = isTerminalStatus(rawStatus) || isTerminalStatus(rawSubscriptionStatus);
  const provisions = Array.isArray(input.provisions) ? input.provisions : [];
  const provisionStatuses = provisions.map((p) => getProvisionStatus(p, now));
  const hasActiveProvision = provisionStatuses.some((s) => s.hasAccess);
  const hasProvisionHistory = provisions.length > 0;
  const trialEndsAt = toMillisSafe(input.trialEndsAt);
  const accessExpiresAt = toMillisSafe(input.accessExpiresAt);
  const hasHistory = input.hasHistory === true || hasProvisionHistory || typeof accessExpiresAt === 'number';

  if (terminal) return USER_STATUS.CANCELED;
  if (
    normalizedStatus === USER_STATUS.TRIALING
    || normalizedSubscriptionStatus === USER_STATUS.TRIALING
    || (typeof trialEndsAt === 'number' && trialEndsAt > now)
  ) {
    return USER_STATUS.TRIALING;
  }
  if (hasProvisionHistory && provisionStatuses.every((s) => !s.hasAccess)) return USER_STATUS.CANCELED;
  if (typeof accessExpiresAt === 'number' && accessExpiresAt <= now) return USER_STATUS.CANCELED;
  if (normalizedStatus === USER_STATUS.PAST_DUE || normalizedSubscriptionStatus === USER_STATUS.PAST_DUE) {
    return USER_STATUS.PAST_DUE;
  }
  if (hasActiveProvision) return USER_STATUS.ACTIVE;
  if (normalizedStatus === USER_STATUS.ACTIVE || normalizedSubscriptionStatus === USER_STATUS.ACTIVE) {
    if (typeof accessExpiresAt === 'number') return accessExpiresAt > now ? USER_STATUS.ACTIVE : USER_STATUS.CANCELED;
    if (!hasProvisionHistory) return USER_STATUS.ACTIVE;
  }
  if (typeof accessExpiresAt === 'number') return accessExpiresAt > now ? USER_STATUS.ACTIVE : USER_STATUS.CANCELED;
  if (normalizedStatus === USER_STATUS.INACTIVE || normalizedSubscriptionStatus === USER_STATUS.INACTIVE) return USER_STATUS.INACTIVE;
  return hasHistory ? USER_STATUS.CANCELED : USER_STATUS.INACTIVE;
};

export const getUserStatusLabel = (value?: string | null): string => {
  const normalized = normalizeUserStatus(value);
  if (!normalized) return value ? String(value) : '—';
  switch (normalized) {
    case USER_STATUS.ACTIVE:
      return 'Active';
    case USER_STATUS.CANCELED:
      return 'Canceled';
    case USER_STATUS.EXPIRED:
      return 'Expired';
    case USER_STATUS.INACTIVE:
      return 'Inactive';
    case USER_STATUS.TRIALING:
      return 'Trial';
    case USER_STATUS.PAST_DUE:
      return 'Past due';
    default:
      return String(normalized);
  }
};

export const getUserStatusBadgeClass = (value?: string | null): string => {
  const normalized = normalizeUserStatus(value);
  if (!normalized) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  switch (normalized) {
    case USER_STATUS.ACTIVE:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100';
    case USER_STATUS.TRIALING:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100';
    case USER_STATUS.PAST_DUE:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100';
    case USER_STATUS.CANCELED:
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-100';
    case USER_STATUS.EXPIRED:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100';
    case USER_STATUS.INACTIVE:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};
