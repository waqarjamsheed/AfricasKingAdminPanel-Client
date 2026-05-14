import crypto from 'crypto';
import { KNOWN_PLANS, STATIC_PROMO_CODES } from './promoCodes';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no 0/O/1/I

function isoWeekInfo(date = new Date()): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { isoYear: d.getUTCFullYear(), isoWeek: weekNo };
}

function genCode(label: string, secret: string, date = new Date()): string {
  const { isoYear, isoWeek } = isoWeekInfo(date);
  const input = `${label}:${isoYear}-${String(isoWeek).padStart(2, '0')}:${secret}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  let out = '';
  for (let i = 0; i < 6; i++) {
    const idx = hash[i] % ALPHABET.length;
    out += ALPHABET[idx];
  }
  return out.toLowerCase();
}

function getSecret(): string {
  return process.env.PROMO_SECRET || process.env.STRIPE_SECRET_KEY || process.env.FIREBASE_CLIENT_EMAIL || 'default-secret';
}

export { KNOWN_PLANS, STATIC_PROMO_CODES };

export function normalizePlan(plan?: string | null): string {
  return String(plan || '').trim().toLowerCase();
}

export function currentDynamicCodes() {
  const secret = getSecret();
  const code16 = genCode('dynamicpromo1.6', secret);
  const code3 = genCode('dynamicpromo3', secret);
  return { code16, code3 };
}

export function matchDynamic(code: string): '16' | '3' | null {
  const c = String(code || '').trim().toLowerCase();
  const { code16, code3 } = currentDynamicCodes();
  if (c === code16) return '16';
  if (c === code3) return '3';
  return null;
}

export function isDynamicPromo(code: string): boolean {
  const c = normalizePlan(code);
  if (!c) return false;
  if (KNOWN_PLANS.has(c) || STATIC_PROMO_CODES.has(c)) return false;
  if (!/^[a-z0-9]{6}$/i.test(c)) return false;
  // Matches current rolling codes or any other 6-char ad-hoc promo
  if (matchDynamic(c)) return true;
  return true;
}

export function isStaticPromo(code: string): boolean {
  const c = normalizePlan(code);
  return !!c && STATIC_PROMO_CODES.has(c);
}

export function isAllowedPlanCode(plan: string): boolean {
  const c = normalizePlan(plan);
  if (!c) return false;
  if (KNOWN_PLANS.has(c)) return true;
  if (isStaticPromo(c)) return true;
  if (isDynamicPromo(c)) return true;
  return false;
}
