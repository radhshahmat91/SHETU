const TZ = process.env.TZ_NAME || 'Asia/Dhaka';
export const todayStr = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
export const weekday = (d = new Date()) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
export const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
export const addDays = (str, n) => {
  const d = new Date(`${str}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
export const dayOf = (str) => new Date(`${str}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
