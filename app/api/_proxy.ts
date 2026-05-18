import { NextRequest, NextResponse } from 'next/server';

const TARGET = (process.env.CLIENT_API_PROXY_TARGET || 'https://africasking.net').replace(/\/$/, '');

export async function proxyRequest(req: NextRequest, path: string): Promise<NextResponse> {
  const url = `${TARGET}${path}`;
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;
  try {
    const res = await fetch(url, { method: req.method, headers, body });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 502 });
  }
}
