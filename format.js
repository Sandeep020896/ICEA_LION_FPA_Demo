export const isNum = (v) => !(v === null || v === undefined || v === '' || isNaN(Number(v)));
export const kes = (v, d = 0) => isNum(v) ? 'KES ' + Number(v).toLocaleString('en-KE', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-';
export const num = (v) => isNum(v) ? Number(v).toLocaleString('en-KE') : '-';
export const pct = (v, d = 1) => isNum(v) ? (Number(v) * 100).toFixed(d) + '%' : '-';
export const perLabel = (plan) => ({ 'Annual': 'a year', 'Semi-Annual': 'every 6 months', 'Quarterly': 'a quarter', 'Monthly': 'a month', 'Weekly (Mobile)': 'a week', 'Flexi Top-Up (Mobile)': 'a week' }[plan] || '');
export const shortPlan = (plan) => ({ 'Weekly (Mobile)': 'Weekly', 'Flexi Top-Up (Mobile)': 'Flexi' }[plan] || plan);
export const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Nairobi date
export const uid = (p) => p + '-' + Date.now().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
