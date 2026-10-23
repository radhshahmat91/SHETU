const f = (opts) => new Intl.DateTimeFormat('en-GB', opts);
export const fmtDate = (d) => (d ? f({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '');
export const fmtShort = (d) => (d ? f({ day: 'numeric', month: 'short' }).format(new Date(d)) : '');
export const fmtDay = (s) => f({ weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`));
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}` : '');
export const fmtTime = (hhmm = '00:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
export const timeAgo = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return fmtShort(d);
};
export const money = (n) => `৳${Number(n || 0).toLocaleString('en-IN')}`;
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const isoPlus = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
export const sizeLabel = (b = 0) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const roleLabel = { student: 'Student', teacher: 'Teacher', guardian: 'Guardian', admin: 'Administrator' };
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
export const todayDay = () => new Date().toLocaleDateString('en-US', { weekday: 'short' });
