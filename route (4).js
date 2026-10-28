import { NextResponse } from 'next/server';
import { pollLogJob } from '@/lib/spark';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const jobId = new URL(req.url).searchParams.get('jobId');
  try { return NextResponse.json(await pollLogJob(jobId)); }
  catch (e) { return NextResponse.json({ error: 'Could not reach Spark: ' + e.message }, { status: 502 }); }
}
