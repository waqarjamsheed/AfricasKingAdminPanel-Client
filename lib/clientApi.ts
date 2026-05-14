const RAW_API_BASE = process.env.NEXT_PUBLIC_CLIENT_API_BASE_URL || '';

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const trimmedBase = RAW_API_BASE.replace(/\/$/, '');
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
}
