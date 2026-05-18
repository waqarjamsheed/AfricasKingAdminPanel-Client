import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '../../_proxy';
import { useMock } from '../../_mock';

export async function GET(req: NextRequest) {
  if (useMock) {
    return NextResponse.json({ allowed: true, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  }
  return proxyRequest(req, '/api/subscription/eligibility');
}
