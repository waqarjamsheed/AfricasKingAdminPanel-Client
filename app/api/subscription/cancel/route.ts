import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '../../_proxy';
import { useMock } from '../../_mock';

export async function POST(req: NextRequest) {
  if (useMock) {
    return NextResponse.json({ success: true });
  }
  return proxyRequest(req, '/api/subscription/cancel');
}
