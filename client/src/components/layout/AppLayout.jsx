import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, LogOut, Menu, Moon, Search, Sun, WifiOff, User, LifeBuoy, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useChild } from '../../context/ChildContext';
import { api, notifyError, queuedCount } from '../../lib/api';
import { NAV } from '../../lib/nav';
import { roleLabel, timeAgo } from '../../lib/format';
import Logo from '../Logo';
import { Avatar, Field, Modal, Spinner, cx } from '../ui';

export const COLLEGE = import.meta.env.VITE_COLLEGE_NAME || 'Greenfield College';

function SideNav({ prefix, onNavigate }) {
  const { user, logout } = useAuth();
  const { activeChild } = useChild();
  const sub = user.role === 'student' ? `${user.className}, ${user.group}, Section ${user.section}` : user.role === 'guardian' ? (activeChild ? `Parent of ${activeChild.name}` : 'Guardian') : user.subject || roleLabel[user.role];
  return (
    <div className="flex h-full flex-col bg-river text-white">
      <div className="lattice px-5 pb-5 pt-6">
        <Link to="/app" onClick={onNavigate}><Logo /></Link>
        <p className="mt-2 text-xs text-white/55">{COLLEGE}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV[user.role].map((g, gi) => (
          <div key={gi} className="mb-1">
            {g.title && <p className="px-3 pb-1 pt-4 text-xs font-semibold text-white/45">{g.title}</p>}
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate}
                className={({ isActive }) => cx('relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-white' : 'text-white/65 hover:bg-white/5 hover:text-white')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId={`${prefix}-pill`} className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    {isActive && <motion.span layoutId={`${prefix}-bar`} className="absolute -left-3 bottom-2 top-2 w-1 rounded-r bg-marigold-500" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <it.icon size={18} className="relative shrink-0" />
                    <span className="relative truncate">{it.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 p-3">
        <Avatar name={user.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-white/55">{sub}</p>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
      </div>
    </div>
  );
}

function useOutside(ref, onOut, active) {
  useEffect(() => {
    if (!active) return undefined;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut, active]);
}

// Polls for new notifications; a new one rings the bell and pops a toast (FR-3 "pop-up notification")
function Bell_() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const seen = useRef(null);
  const box = useRef(null);
  const navigate = useNavigate();
  useOutside(box, () => setOpen(false), open);

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/notifications', { params: { limit: 12 } });
      if (seen.current !== null && d.unread > seen.current && d.items[0]) {
        toast(d.items[0].title, { duration: 5000 });
        setRing(true);
        setTimeout(() => setRing(false), 1000);
      }
      seen.current = d.unread;
      setData(d);
    } catch { /* offline: keep showing the last list */ }
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 25000); return () => clearInterval(id); }, [load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) { api.put(`/notifications/${n._id}/read`).catch(() => {}); setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x._id === n._id ? { ...x, read: true } : x)) })); seen.current = Math.max(0, (seen.current || 1) - 1); }
    if (n.link) navigate(n.link);
  };
  const readAll = async () => { await api.put('/notifications/read-all').catch(() => {}); setData((d) => ({ unread: 0, items: d.items.map((x) => ({ ...x, read: true })) })); seen.current = 0; };

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost relative !p-2" aria-label={`Notifications, ${data.unread} unread`}>
        <Bell size={19} className={ring ? 'animate-ring' : ''} />
        {data.unread > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-[17px] place-items-center rounded-full bg-stamp px-1 text-[10px] font-bold leading-[17px] text-white">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display font-semibold">Notifications</p>
              {data.unread > 0 && <button onClick={readAll} className="text-xs font-semibold text-brand-700 hover:underline">Mark all as read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data.items.length === 0 && <p className="px-4 py-10 text-center text-sm text-mute">Nothing new. Updates from your college will show up here.</p>}
              {data.items.map((n) => (
                <button key={n._id} onClick={() => openItem(n)} className={cx('flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-sunken', !n.read && 'bg-brand-50/60')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-600')} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{n.title}</span>
                    {n.message && <span className="line-clamp-2 text-xs text-mute">{n.message}</span>}
                    <span className="mt-0.5 block text-xs text-mute/80">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportModal({ open, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api.post('/system/report', { message: text }); toast.success('Thanks, the system admin has been told'); setText(''); onClose(); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Report a problem"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={send} disabled={busy || text.trim().length < 5}>{busy && <Spinner />}Send report</button></>}>
      <p className="mb-3 text-sm text-mute">Seeing wrong marks, a missing notice or something broken? Tell us what happened and the system admin will look into it.</p>
      <Field label="What went wrong?"><textarea className="input min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: my Physics Mid Term mark shows 31 but my paper says 41." /></Field>
    </Modal>
  );
}

function UserMenu({ onReport }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useOutside(box, () => setOpen(false), open);
  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="ml-1 rounded-full ring-offset-2 ring-offset-canvas transition hover:ring-2 hover:ring-brand-400" aria-label="Account menu"><Avatar name={user.name} size={34} /></button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
            <div className="border-b border-line px-4 py-3"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-xs text-mute">{user.email}</p></div>
            <Link to="/app/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-sunken"><User size={16} />Your profile</Link>
            <button onClick={() => { setOpen(false); onReport(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-sunken"><LifeBuoy size={16} />Report a problem</button>
            <button onClick={logout} className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-stamp hover:bg-sunken"><LogOut size={16} />Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queued, setQueued] = useState(queuedCount());
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false); const q = () => setQueued(queuedCount());
    window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener('setu:queue', q);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('setu:queue', q); };
  }, []);
  if (online && !queued) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-marigold-500 px-4 py-2 text-center text-sm font-medium text-river">
      <WifiOff size={16} />
      {online ? `Sending ${queued} saved request${queued > 1 ? 's' : ''}...` : `You are offline. Anything you save is kept${queued ? ` (${queued} waiting)` : ''} and sent when you reconnect.`}
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [report, setReport] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => setDrawer(false), [location.pathname]);

  const admin = user.role === 'admin';
  const search = (e) => { e.preventDefault(); navigate(`${admin ? '/app/users' : '/app/materials'}?q=${encodeURIComponent(q)}`); };

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"><SideNav prefix="d" /></aside>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-river/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}>
              <button className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white/70 hover:bg-white/10" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
              <SideNav prefix="m" onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
        <form onSubmit={search} className="relative hidden max-w-md flex-1 sm:block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="input !bg-sunken !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={admin ? 'Search people by name, email or ID' : 'Search class materials'} aria-label="Search" />
        </form>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggle} className="btn btn-ghost !p-2" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <Bell_ />
          <UserMenu onReport={() => setReport(true)} />
        </div>
      </header>
      <OfflineBanner />
      <motion.main key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </motion.main>
      <ReportModal open={report} onClose={() => setReport(false)} />
    </div>
  );
}
