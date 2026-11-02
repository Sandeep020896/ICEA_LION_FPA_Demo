'use client';
import { REGIONS, INCOME_TYPES, OCCUPATIONS, COVER_LEVELS, HC_DAILY } from '@/lib/channels';

function Field({ label, children, hint }) {
  return <div className="field"><label>{label}</label>{children}{hint && <div className="hint">{hint}</div>}</div>;
}
function YesNo({ value, onChange, label }) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {['Yes', 'No'].map((v) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{v}</button>)}
    </div>
  );
}

export default function QuoteForm({ form, set, compact, journey }) {
  const u = (k) => (e) => set({ ...form, [k]: e.target.value });
  const setKids = (kids) => set({ ...form, childAges: kids });
  return (
    <div className="form">
      <section className="fsec">
        <h3>{journey.kind === 'web' && journey.key === 'bank' ? 'Client' : 'About you'}</h3>
        <div className="fgrid">
          <Field label="Name" hint={compact ? null : "Kept by ICEA LION's policy system, not sent to the pricing engine"}><input value={form.name} onChange={u('name')} /></Field>
          <Field label="Age next birthday"><input type="number" min="18" max="75" value={form.applicantAge} onChange={u('applicantAge')} /></Field>
          <Field label="Income"><select value={form.incomeType} onChange={u('incomeType')}>{INCOME_TYPES.map((v) => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Monthly income (KES)"><input type="number" step="1000" value={form.monthlyIncome} onChange={u('monthlyIncome')} /></Field>
          <Field label="Work"><select value={form.occupation} onChange={u('occupation')}>{OCCUPATIONS.map((v) => <option key={v} value={v}>{v.replace(/^Class \d - /, '')}</option>)}</select></Field>
          <Field label="County region"><select value={form.region} onChange={u('region')}>{REGIONS.map((v) => <option key={v}>{v}</option>)}</select></Field>
          {!compact && <Field label="Uses tobacco"><YesNo label="Uses tobacco" value={form.tobacco} onChange={(v) => set({ ...form, tobacco: v })} /></Field>}
        </div>
      </section>

      <section className="fsec">
        <h3>Family</h3>
        <div className="fgrid">
          <Field label="Cover a spouse"><YesNo label="Cover a spouse" value={form.spouseCovered} onChange={(v) => set({ ...form, spouseCovered: v })} /></Field>
          {form.spouseCovered === 'Yes' && <Field label="Spouse age"><input type="number" min="18" max="75" value={form.spouseAge} onChange={u('spouseAge')} /></Field>}
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Children (ages)</label>
          <div className="kids">
            {form.childAges.map((a, i) => (
              <span className="kid" key={i}>
                <input aria-label={`Child ${i + 1} age`} type="number" min="0" max="24" value={a} onChange={(e) => setKids(form.childAges.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" aria-label={`Remove child ${i + 1}`} onClick={() => setKids(form.childAges.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
            {form.childAges.length < 8 && <button type="button" className="btn" onClick={() => setKids([...form.childAges, 5])}>Add a child</button>}
          </div>
        </div>
        {!compact && (
          <div className="fgrid" style={{ marginTop: 12 }}>
            <Field label="Parents or in-laws"><input type="number" min="0" max="4" value={form.numParents} onChange={u('numParents')} /></Field>
            {Number(form.numParents) > 0 && <Field label="Eldest parent's age"><input type="number" min="35" max="85" value={form.eldestParentAge} onChange={u('eldestParentAge')} /></Field>}
          </div>
        )}
      </section>

      <section className="fsec">
        <h3>Cover</h3>
        <div className="fgrid">
          {!compact && <Field label="Cover level"><select value={form.coverLevel} onChange={u('coverLevel')}>{COVER_LEVELS.map((v) => <option key={v}>{v}</option>)}</select></Field>}
          <Field label="Life cover (KES)"><input type="number" step="50000" value={form.baseSumAssured} onChange={u('baseSumAssured')} /></Field>
          <Field label="Accident cover"><YesNo label="Accident cover" value={form.paSelected} onChange={(v) => set({ ...form, paSelected: v })} /></Field>
          {form.paSelected === 'Yes' && <Field label="Accident cover amount (KES)"><input type="number" step="50000" value={form.paSumAssured} onChange={u('paSumAssured')} /></Field>}
          <Field label="Hospital cash"><YesNo label="Hospital cash" value={form.hcSelected} onChange={(v) => set({ ...form, hcSelected: v })} /></Field>
          {form.hcSelected === 'Yes' && <Field label="Per night in hospital (KES)"><select value={form.hcDaily} onChange={u('hcDaily')}>{HC_DAILY.map((v) => <option key={v} value={v}>{v.toLocaleString('en-KE')}</option>)}</select></Field>}
        </div>
      </section>
    </div>
  );
}
