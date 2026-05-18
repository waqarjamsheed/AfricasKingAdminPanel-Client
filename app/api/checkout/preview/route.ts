import { NextRequest, NextResponse } from 'next/server';
import { proxyRequest } from '../../_proxy';
import { useMock } from '../../_mock';

export async function POST(req: NextRequest) {
  if (useMock) {
    return NextResponse.json({ plan: 'monthly', label: 'AfricasKing Monthly', amount: 9.99, currency: 'usd' });
  }
  return proxyRequest(req, '/api/checkout/preview');
}
