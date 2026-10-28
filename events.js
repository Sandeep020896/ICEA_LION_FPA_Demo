import { kes, perLabel } from './format';
const sv = (e, s) => (e.serviceTrace || []).find((t) => String(t.Service).includes(s));
export function describe(e) {
  const r = e.response || {};
  switch (e.type) {
    case 'quote.requested': return { title: 'Quote requested', detail: `${e.from}: ${r.QuoteStatus || e.quoteStatus || ''}${r.Instalment ? `, ${kes(r.Instalment)} ${perLabel(r.AppliedPlan)}` : ''}` };
    case 'quote.revised': return { title: `Quote revised (rev ${e.revision || ''})`, detail: `${r.QuoteStatus || e.quoteStatus || ''}${r.Instalment ? `, ${kes(r.Instalment)} ${perLabel(r.AppliedPlan)}` : ''}` };
    case 'documents.requested': return { title: 'Quote documents produced', detail: 'Quote and benefit illustration PDFs from Spark' };
    case 'quote.accepted': return { title: 'Quote accepted', detail: `Received from ${e.from}` };
    case 'quote.rejected': return { title: 'Hand-off rejected', detail: r.error || 'LitePAS could not bind this quote' };
    case 'policy.bound': return { title: `Policy ${e.policyNumber} bound`, detail: `Product ${r.productVersion || '-'}, Rating ${r.ratingVersion || '-'}` };
    case 'crm.updated': return { title: 'Customer record updated', detail: `${e.response?.crmReference || ''}${e.request?.segment ? `, ${e.request.segment}` : ''}` };
    default: return { title: e.type, detail: '' };
  }
}
export const tone = (e) => {
  if ((e.httpStatus && e.httpStatus >= 400) || e.httpStatus === 0 || e.type === 'quote.rejected') return 'bad';
  if (String(e.quoteStatus || e.response?.QuoteStatus || '').startsWith('NOT')) return 'warn';
  return 'ok';
};
export { sv };
