// Server-only helpers: Spark call, LitePAS hand-off. The API key never leaves the server.
import mock from './mock.json';

const env = (k, d = '') => process.env[k] || d;

export async function callQuote(body, journeyKey) {
  const started = Date.now();
  if (env('SPARK_MOCK') === '1') {
    const m = mock[journeyKey] || mock.bank;
    await new Promise((r) => setTimeout(r, 350));
    return { httpStatus: 200, durationMs: Date.now() - started, data: {
      status: 'Success', response_data: { outputs: m.outputs, errors: m.errors, warnings: null },
      response_meta: { call_id: 'mock-' + Math.random().toString(36).slice(2, 10), version: 'mock', process_time: 30, correlation_id: body.request_meta.correlation_id, request_timestamp: new Date().toISOString() } } };
  }
  const base = env('SPARK_BASE_URL'), tenant = env('SPARK_TENANT');
  const url = `${base}/${tenant}/api/v3/folders/${encodeURIComponent(env('SPARK_FOLDER'))}/services/${encodeURIComponent(env('SPARK_QUOTE_SERVICE'))}/execute`;
  let res, data = null, text = '';
  try {
    res = await fetch(url, { method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-tenant-name': tenant, 'x-synthetic-key': env('SPARK_API_KEY') },
      body: JSON.stringify(body) });
    text = await res.text();
    try { data = JSON.parse(text); } catch { data = null; }
  } catch (e) {
    return { httpStatus: 0, durationMs: Date.now() - started, data: null, error: 'Could not reach Spark: ' + e.message };
  }
  return { httpStatus: res.status, durationMs: Date.now() - started, data, error: res.ok ? null : `Spark returned HTTP ${res.status}${text ? ': ' + text.slice(0, 200) : ''}` };
}

// Fire-and-forget event to LitePAS's integration log (if configured). Never blocks the customer journey for long.
export async function sendEvent(evt) {
  const base = env('LITEPAS_URL');
  if (!base) return { skipped: true };
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch(`${base.replace(/\/$/, '')}/api/ingest/event`, { method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-ingest-secret': env('INGEST_SECRET') }, body: JSON.stringify(evt) });
    clearTimeout(t); return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function bindPolicy(payload) {
  const base = env('LITEPAS_URL');
  if (!base) return { skipped: true, reason: 'LITEPAS_URL is not set' };
  const started = Date.now();
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/ingest/policy`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-secret': env('INGEST_SECRET') }, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, durationMs: Date.now() - started, data, litepasUrl: base.replace(/\/$/, '') };
  } catch (e) { return { ok: false, status: 0, durationMs: Date.now() - started, error: 'Could not reach LitePAS: ' + e.message }; }
}
