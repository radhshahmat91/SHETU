import axios from 'axios';
import toast from 'react-hot-toast';

const baseURL = import.meta.env.VITE_API_URL || '/api';
export const TOKEN_KEY = 'setu.token';
const QUEUE_KEY = 'setu.queue';

export const api = axios.create({ baseURL, timeout: 25000 });
const raw = axios.create({ baseURL, timeout: 25000 }); // replays queued writes without the offline interceptor

const readQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
const writeQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
export const queuedCount = () => readQueue().length;

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const cfg = err.config || {};
    const method = (cfg.method || '').toLowerCase();
    const url = String(cfg.url || '');
    const offline = !err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error');
    if (err.response?.status === 401 && !url.startsWith('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('setu:logout'));
    }
    // NF-5: a write made while offline is kept and replayed automatically once the connection returns
    if (offline && ['post', 'put', 'patch', 'delete'].includes(method) && !url.startsWith('/auth/') && (cfg.data === undefined || typeof cfg.data === 'string')) {
      writeQueue([...readQueue(), { method, url, data: cfg.data, at: Date.now() }]);
      err.queued = true;
      err.friendly = 'You are offline. Your request is saved and will be sent automatically when you reconnect.';
      window.dispatchEvent(new Event('setu:queue'));
      return Promise.reject(err);
    }
    err.friendly = err.response?.data?.message || (offline ? 'Cannot reach the server. Check your connection and try again.' : err.message);
    return Promise.reject(err);
  }
);

export async function syncQueue() {
  const q = readQueue();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!q.length || !token || !navigator.onLine) return 0;
  const left = [];
  let sent = 0;
  let stop = false;
  for (const item of q) {
    if (stop) { left.push(item); continue; }
    try {
      await raw.request({ method: item.method, url: item.url, data: item.data, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      sent += 1;
    } catch (e) {
      if (!e.response) { stop = true; left.push(item); } // still offline: keep the rest, in order
    }
  }
  writeQueue(left);
  window.dispatchEvent(new Event('setu:queue'));
  if (sent) toast.success(`${sent} saved request${sent > 1 ? 's were' : ' was'} sent`);
  return sent;
}

export const errorMessage = (e) => e?.friendly || e?.message || 'Something went wrong';
export function notifyError(e) {
  if (e?.queued) toast(e.friendly, { duration: 6000 });
  else toast.error(errorMessage(e));
}

export async function downloadFile(file) {
  try {
    const res = await api.get(`/files/${file.filename}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName || file.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    notifyError(e);
  }
}

// builds FormData from a plain object, skipping empty values
export function toForm(obj) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
  return fd;
}
