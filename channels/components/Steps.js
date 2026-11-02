'use client';
// Step visualisation (pattern from the motor demo): pending -> running -> done | stopped | failed | skipped.
export function Spinner({ light }) {
  return <span className="spin" aria-hidden style={{ borderColor: light ? 'rgba(255,255,255,.35)' : 'var(--line)', borderTopColor: light ? '#fff' : 'var(--brand)' }} />;
}
function Icon({ state }) {
  if (state === 'running') return <span className="sicon"><Spinner /></span>;
  if (state === 'done') return <span className="sicon done">✓</span>;
  if (state === 'failed') return <span className="sicon failed">✕</span>;
  if (state === 'stopped') return <span className="sicon stopped">!</span>;
  if (state === 'skipped') return <span className="sicon skipped">–</span>;
  return <span className="sicon pending" aria-hidden />;
}
export function StepList({ steps, dark }) {
  return (
    <ol className={'steps' + (dark ? ' dark' : '')}>
      {steps.map((s, i) => (
        <li key={s.key} data-state={s.state}>
          <div className="srail"><Icon state={s.state} />{i < steps.length - 1 && <span className="sline" data-done={s.state === 'done' || s.state === 'stopped'} />}</div>
          <div className="sbody">
            <div className="slabel">{s.label}</div>
            {s.detail && <div className="sdetail">{s.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
export const progressOf = (steps) => {
  const fin = steps.filter((s) => ['done', 'skipped', 'stopped'].includes(s.state)).length;
  return { pct: Math.round((fin / steps.length) * 100), current: steps.find((s) => s.state === 'running') };
};
export const freshSteps = (defs) => defs.map((d) => ({ ...d, state: 'pending', detail: null }));
