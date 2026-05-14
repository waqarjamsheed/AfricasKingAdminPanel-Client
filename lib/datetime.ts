export function formatDateTime(
  value: string | number | Date | null | undefined,
  mounted?: boolean,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value === null || value === undefined) return '—';
  const date = typeof value === 'number'
    ? new Date(value)
    : typeof value === 'string'
      ? new Date(value)
      : value instanceof Date
        ? value
        : null as any;
  if (!date || isNaN(date.getTime())) return '—';
  // Avoid SSR/CSR locale mismatch: use ISO before mount when caller passes mounted flag
  if (mounted === false) return date.toISOString();
  try {
    const fmt = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: true,
      ...(options || {})
    });
    return fmt.format(date);
  } catch {
    return date.toISOString();
  }
}

export function toMillisSafe(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === 'function') {
    try {
      const ms = value.toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  if (value && typeof value.seconds === 'number') {
    const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    return Number.isFinite(ms) ? ms : null;
  }
  if (value && typeof value._seconds === 'number') {
    const ms = value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = Number(match[6] || '0');
      if ([year, month, day, hour, minute, second].every((n) => Number.isFinite(n))) {
        return Date.UTC(year, month - 1, day, hour, minute, second);
      }
    }
  }
  return null;
}
