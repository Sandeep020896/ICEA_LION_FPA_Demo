export const isNum = (v) => !(v === null || v === undefined || v === '' || isNaN(Number(v)));
export const kes = (v, d = 0) => isNum(v) ? 'KES ' + Number(v).toLocaleString('en-KE', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-';
export const perLabel = (plan) => ({ 'Annual': 'a year', 'Semi-Annual': 'every 6 months', 'Quarterly': 'a quarter', 'Monthly': 'a month', 'Weekly (Mobile)': 'a week', 'Flexi Top-Up (Mobile)': 'a week' }[plan] || '');
export const when = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
export const time = (iso) => iso ? new Date(iso).toLocaleTimeString('en-GB') : '-';
export const productName = (code) => (code === 'ILG-FPL' ? 'Jamii Lite' : 'Jamii Protect');
export const BRANDS = {
  direct: { name: 'ICEA LION', color: '#003C7A', soft: '#E6EEF8', helpline: 'ICEA LION customer service', tagline: 'Through every life changing moment, we are better together' },
  bank: { name: 'Pamoja Bank', color: '#0E5446', soft: '#E4F0EC', helpline: 'your Pamoja relationship manager', tagline: 'Banking and protection, together' },
  wallet: { name: 'Tuma Wallet', color: '#0E9F55', soft: '#E3F5EB', helpline: '*544#', tagline: 'Send, save and protect' },
  lender: { name: 'Haraka Loans', color: '#4B2FC9', soft: '#ECE8FB', helpline: 'the Haraka app chat', tagline: 'Fast loans, protected families' }
};
export const channelOf = (p) => BRANDS[p.journey]?.name || p.partnerLabel || p.channel;
