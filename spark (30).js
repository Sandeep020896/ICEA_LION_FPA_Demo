// Builds the ILG FPA - Quotation request from a journey and form. No secrets here.
import { today } from './format';
const yn = (v) => (v === 'Yes' || v === true ? 'Yes' : 'No');

export function buildInputs(journey, f, x = {}) {
  const d = today();
  const kids = (f.childAges || []).map((a) => Number(a) || 0);
  const parents = Number(f.numParents) || 0;
  const spouse = yn(f.spouseCovered);
  const inputs = {
    Req_Profile: journey.profile, Req_QuoteDate: d, Req_Channel: journey.channel, Req_Partner: journey.partner,
    Req_Region: f.region, Req_Locale: 'en_KE', Req_ApplicantAge: Number(f.applicantAge), Req_IncomeType: f.incomeType,
    Req_MonthlyIncome: Number(f.monthlyIncome), Req_OccupationClass: f.occupation, Req_TobaccoUser: yn(f.tobacco),
    Req_HospitalisedLast12M: 'No', Req_KYCVerified: 'Yes', Req_SpouseCovered: spouse, Req_SpouseAge: spouse === 'Yes' ? Number(f.spouseAge) : 0,
    Req_NumChildren: kids.length, Req_NumParents: parents, Req_EldestParentAge: parents > 0 ? Number(f.eldestParentAge) : 0,
    Req_CoverLevel: f.coverLevel, Req_BaseSumAssured: Number(f.baseSumAssured), Req_PA_Selected: yn(f.paSelected),
    Req_PA_SumAssured: Number(f.paSumAssured), Req_HC_Selected: yn(f.hcSelected), Req_HC_DailyBenefit: Number(f.hcDaily),
    QuoteDate: d, AcceptanceDate: d,
    CustomerRef: x.customerRef, CustomerName: x.customerRef, // no personal data to Spark: the reference stands in for the name
    QuoteID: x.quoteId || null, PriorRevision: x.priorRevision || 0, QuotedProductVersion: x.quotedProductVersion || null,
    IllustrationYears: 10, RequestedPlan: f.plan, PaymentMethod: f.method, TargetInstalment: 0,
    ChildAges: kids.map((a) => ({ Child_Age: a }))
  };
  if (x.documents) {
    inputs.QUOTE = { FileName: `Quote_${x.customerRef}.pdf` };
    inputs.BENEFITILLUSTRATION = { FileName: `Illustration_${x.customerRef}.pdf` };
  }
  return inputs;
}

export function buildRequest(journey, f, x) {
  return {
    request_data: { inputs: buildInputs(journey, f, x) },
    request_meta: { call_purpose: `ICEA POC - ${journey.label}`, source_system: 'ICEA-Channels', correlation_id: x.correlationId, transaction_date: null }
  };
}
