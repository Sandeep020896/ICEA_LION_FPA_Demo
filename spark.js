// Spark API Call History: start a CSV download job and poll it (Spark docs: API Call History APIs).
const env = (k) => process.env[k] || '';
const base = () => `${env('SPARK_BASE_URL')}/${env('SPARK_TENANT')}/api/v3/folders/${encodeURIComponent(env('SPARK_FOLDER'))}/services/${encodeURIComponent(env('SPARK_QUOTE_SERVICE'))}/log/downloadcsv`;
const headers = () => ({ 'Content-Type': 'application/json', 'x-tenant-name': env('SPARK_TENANT'), 'x-synthetic-key': env('SPARK_API_KEY') });
export const sparkConfigured = () => !!(env('SPARK_BASE_URL') && env('SPARK_API_KEY'));

export async function startLogJob(correlationId) {
  const body = { request_data: { call_ids: [correlationId], include_inputs: true, include_outputs: true, timezone_offset: 180 }, request_meta: {} };
  const r = await fetch(base(), { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' });
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { httpStatus: r.status, data, text: data ? null : text.slice(0, 300), jobId: findKey(data, /job_?id/i) };
}
export async function pollLogJob(jobId) {
  const r = await fetch(`${base()}/status/${encodeURIComponent(jobId)}`, { headers: headers(), cache: 'no-store' });
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { httpStatus: r.status, data, text: data ? null : text.slice(0, 300), status: findKey(data, /^status$/i) || findKey(data, /status/i), url: findUrl(data) };
}
function findKey(o, re, d = 0) {
  if (!o || typeof o !== 'object' || d > 5) return null;
  for (const [k, v] of Object.entries(o)) { if (re.test(k) && (typeof v === 'string' || typeof v === 'number')) return String(v); }
  for (const v of Object.values(o)) { const f = findKey(v, re, d + 1); if (f) return f; }
  return null;
}
function findUrl(o, d = 0) {
  if (!o || d > 6) return null;
  if (typeof o === 'string') return /^https?:\/\//.test(o) ? o : null;
  if (typeof o === 'object') for (const v of Object.values(o)) { const f = findUrl(v, d + 1); if (f) return f; }
  return null;
}
