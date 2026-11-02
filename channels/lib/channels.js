// Channel and partner configuration. Values map exactly to the Product model's lists.
export const PLANS = ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Weekly (Mobile)', 'Flexi Top-Up (Mobile)'];
export const METHODS = ['Bank Debit Order', 'Card', 'Mobile Money', 'Payroll Check-off', 'Bank Transfer'];
export const REGIONS = ['Nairobi', 'Mombasa & Coast', 'Central', 'Rift Valley', 'Western & Nyanza', 'Eastern', 'North Eastern', 'Outside Kenya (Non-resident)'];
export const INCOME_TYPES = ['Salaried', 'Self-employed (Regular)', 'Variable / Gig Income', 'Informal Sector'];
export const OCCUPATIONS = ['Class 1 - Office / Professional', 'Class 2 - Light Manual / Retail', 'Class 3 - Skilled Manual / Transport', 'Class 4 - Hazardous (Mining / Security)'];
export const COVER_LEVELS = ['Essential', 'Standard', 'Plus', 'Premier'];
export const HC_DAILY = [1000, 2000, 3000, 5000];

const A = { applicantAge: 28, incomeType: 'Salaried', monthlyIncome: 85000, region: 'Nairobi', occupation: OCCUPATIONS[0], tobacco: 'No',
  spouseCovered: 'No', spouseAge: 30, childAges: [], numParents: 0, eldestParentAge: 60, coverLevel: 'Standard', baseSumAssured: 1000000,
  paSelected: 'Yes', paSumAssured: 1000000, hcSelected: 'No', hcDaily: 2000 };
const B = { applicantAge: 43, incomeType: 'Salaried', monthlyIncome: 180000, region: 'Central', occupation: OCCUPATIONS[0], tobacco: 'No',
  spouseCovered: 'Yes', spouseAge: 40, childAges: [12, 9, 6], numParents: 2, eldestParentAge: 68, coverLevel: 'Premier', baseSumAssured: 3000000,
  paSelected: 'Yes', paSumAssured: 3000000, hcSelected: 'Yes', hcDaily: 3000 };
const C = { applicantAge: 35, incomeType: 'Variable / Gig Income', monthlyIncome: 35000, region: 'Western & Nyanza', occupation: OCCUPATIONS[2], tobacco: 'No',
  spouseCovered: 'Yes', spouseAge: 33, childAges: [7, 4], numParents: 0, eldestParentAge: 60, coverLevel: 'Essential', baseSumAssured: 300000,
  paSelected: 'Yes', paSumAssured: 300000, hcSelected: 'Yes', hcDaily: 1000 };

export const JOURNEYS = {
  direct: {
    key: 'direct', label: 'ICEA LION direct', short: 'Direct', kind: 'web', brand: 'icea',
    channel: 'Direct Digital', partner: 'None (Direct)', profile: 'A - Digital Salaried',
    defaults: { ...A, name: 'Wanjiru Kamau', plan: 'Monthly', method: 'Card' },
    headline: 'Cover the people who depend on you', blurb: 'Jamii Protect pays out if the worst happens, with optional accident and hospital cash cover. Priced live as you choose.'
  },
  bank: {
    key: 'bank', label: 'Pamoja Bank', short: 'Bank', kind: 'web', brand: 'pamoja',
    channel: 'Bancassurance', partner: 'Partner Bank - Tier 1', profile: 'B - Family via Partner',
    defaults: { ...B, name: 'Otieno family', plan: 'Quarterly', method: 'Bank Debit Order' },
    headline: 'Family protection for your client', blurb: 'Relationship manager view. Eligibility and price come from ICEA LION in real time.'
  },
  wallet: {
    key: 'wallet', label: 'Tuma Wallet', short: 'Wallet', kind: 'phone', brand: 'tuma',
    channel: 'Mobile Embedded', partner: 'Mobile Wallet Partner', profile: 'C - Irregular Income',
    defaults: { ...C, name: 'Brian Ouma', plan: 'Flexi Top-Up (Mobile)', method: 'Mobile Money' },
    headline: 'Protect your family', blurb: 'Pay a little each week from your wallet. Pause when work is quiet.'
  },
  lender: {
    key: 'lender', label: 'Haraka Loans', short: 'Lender', kind: 'phone', brand: 'haraka',
    channel: 'Mobile Embedded', partner: 'Digital Lender Partner', profile: 'C - Irregular Income',
    defaults: { ...C, name: 'Brian Ouma', plan: 'Flexi Top-Up (Mobile)', method: 'Mobile Money' },
    headline: 'Add family cover to your loan', blurb: 'Simple cover that protects your family while you repay.'
  }
};
