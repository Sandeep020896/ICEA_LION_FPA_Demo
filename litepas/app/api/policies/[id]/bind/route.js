import { NextResponse } from 'next/server';
import { approveAndBind } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function POST(_req, { params }) {
  const r = await approveAndBind(params.id, 'Underwriter (LitePAS)');
  return NextResponse.json(r, { status: r.status || 200 });
}
