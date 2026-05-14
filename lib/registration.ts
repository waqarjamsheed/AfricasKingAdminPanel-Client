export const REGISTRATION_WAITLIST_MESSAGE = 'We are full , there are no current slots. Please email at info@africasking.net to be put on the waiting list';

export function normalizeRegistrationAccessCode(input: string | null | undefined): string {
  return String(input || '').trim().toLowerCase();
}

export type RegistrationAccessSource = 'public' | 'custom' | 'reseller' | 'dynamic' | 'none';

export type RegistrationAccessResult = {
  allowed: boolean;
  source: RegistrationAccessSource;
  code: string | null;
};
