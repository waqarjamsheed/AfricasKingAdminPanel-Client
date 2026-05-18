export const REGISTRATION_WAITLIST_MESSAGE = 'We are sorry we are currently full. Please email us and we will put you on the waiting list for a slot, thank you';

export function normalizeRegistrationAccessCode(input: string | null | undefined): string {
  return String(input || '').trim().toLowerCase();
}

export type RegistrationAccessSource = 'public' | 'custom' | 'reseller' | 'dynamic' | 'none';

export type RegistrationAccessResult = {
  allowed: boolean;
  source: RegistrationAccessSource;
  code: string | null;
};
