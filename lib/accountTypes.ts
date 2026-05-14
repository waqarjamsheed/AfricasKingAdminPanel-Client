export type AccountType = 'normal' | 'kids';

export const ACCOUNT_TYPE_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'kids', label: 'Kids' },
] as const;

export function normalizeAccountType(value?: unknown): AccountType {
  const v = String(value || '').trim().toLowerCase();
  return v === 'kids' ? 'kids' : 'normal';
}

export function getAccountTypeLabel(value?: unknown): string {
  const id = normalizeAccountType(value);
  const match = ACCOUNT_TYPE_OPTIONS.find((opt) => opt.id === id);
  return match ? match.label : 'Normal';
}
