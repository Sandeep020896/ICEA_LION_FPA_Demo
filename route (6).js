import { NextResponse } from 'next/server';
import { listPolicies } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json({ policies: await listPolicies() }); }
