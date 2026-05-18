import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '../../_proxy';
import { useMock } from '../../_mock';

export async function POST(req: NextRequest) {
  if (useMock) {
    return NextResponse.json({ url: '/subscription?mock_portal=1' });
  }
  return proxyRequest(req, '/api/billing/portal');
}
