import { getPolicy } from '@/lib/store';
import { certificatePdf } from '@/lib/certificate';
export const dynamic = 'force-dynamic';
export async function GET(req, { params }) {
  const p = await getPolicy(params.id);
  if (!p) return new Response('Not found', { status: 404 });
  const bytes = await certificatePdf(p);
  const dl = new URL(req.url).searchParams.get('dl') === '1';
  return new Response(bytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="Certificate_${p.policyNumber}.pdf"`, 'Cache-Control': 'no-store' } });
}
