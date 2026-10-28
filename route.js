import { NextResponse } from 'next/server';
import { startLogJob, sparkConfigured } from '@/lib/spark';
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const { correlationId } = await req.json();
  if (!sparkConfigured()) return NextResponse.json({ error: 'Spark is not configured for LitePAS (SPARK_BASE_URL, SPARK_API_KEY)' }, { status: 400 });
  try { return NextResponse.json(await startLogJob(correlationId)); }
  catch (e) { return NextResponse.json({ error: 'Could not reach Spark: ' + e.message }, { status: 502 }); }
}
