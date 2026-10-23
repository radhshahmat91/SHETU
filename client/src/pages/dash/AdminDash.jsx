import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { api, notifyError } from '../../lib/api';
import { Avatar, Badge, Empty, LoadError, PageSkeleton, Panel } from '../../components/ui';
import { Band, Ledger } from '../../components/dash';
import { COLORS, GRID, Tip, axis } from '../../components/charts';
import { COLLEGE } from '../../components/layout/AppLayout';
import { fmtShort, greeting, money, roleLabel, timeAgo } from '../../lib/format';

export default function AdminDash() {
  const { user } = useAuth();
  const { data: d, loading, error, reload, setData } = useFetch('/dashboard');
  const [gone, setGone] = useState([]);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !d) return <PageSkeleton />;
  const { stats: s, charts: c } = d;

  const decide = async (u, status) => {
    try {
      const { data } = await api.put(`/admin/users/${u._id}/status`, { status });
      setGone((g) => [...g, u._id]);
      setData((x) => ({ ...x, stats: { ...x.stats, pendingRegistrations: Math.max(0, x.stats.pendingRegistrations - 1) } }));
      toast.success(status === 'active' ? `${u.name} approved${data.linked ? ` and linked to ${data.linked}` : ''}` : `${u.name} declined`);
    } catch (e) { notifyError(e); }
  };
  const pending = d.pendingUsers.filter((u) => !gone.includes(u._id));
  const pie = [COLORS.brand, COLORS.gold, COLORS.sky];

  return (
    <>
      <Band>
        <div>
          <p className="text-sm text-white/65">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{greeting()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-white/75">{COLLEGE} has {s.students} students, {s.teachers} teachers and {s.guardians} guardians on Setu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/notices" className="btn btn-gold">Publish a notice</Link>
          <Link to="/app/users" className="btn text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">Users and approvals</Link>
        </div>
      </Band>

      <Ledger items={[
        { label: 'Students', value: s.students }, { label: 'Teachers', value: s.teachers },
        { label: 'Waiting for approval', value: s.pendingRegistrations, tone: s.pendingRegistrations ? 'text-marigold-600' : '' },
        { label: 'Leave requests', value: s.pendingLeaves, hint: 'Pending decision' },
        { label: 'Courses', value: s.courses }, { label: 'Fees outstanding', value: s.feesDue, money: true, hint: `${money(s.feesPaid)} collected` },
      ]} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Attendance, last two weeks" className="lg:col-span-2" action={<Link to="/app/attendance-monitor" className="text-sm font-semibold text-brand-700 hover:underline">Monitor</Link>}>
          {c.attendanceTrend.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={c.attendanceTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="att" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.35} /><stop offset="100%" stopColor={COLORS.brand} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="date" tickFormatter={fmtShort} {...axis} />
                <YAxis domain={[60, 100]} unit="%" {...axis} />
                <Tooltip content={<Tip render={(p) => <><p className="font-semibold">{fmtShort(p.date)}</p><p className="text-mute">{p.percent}% present</p></>} />} />
                <Area type="monotone" dataKey="percent" stroke={COLORS.brand} strokeWidth={2.5} fill="url(#att)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty title="No attendance yet" text="Teachers' attendance sheets feed this chart." />}
        </Panel>

        <Panel title="People on Setu">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={c.usersByRole} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={3} animationDuration={900} stroke="none">
                {c.usersByRole.map((_, i) => <Cell key={i} fill={pie[i]} />)}
              </Pie>
              <Tooltip content={<Tip render={(p) => <p><span className="font-semibold">{p.name}</span> <span className="text-mute">{p.value}</span></p>} />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1.5 text-sm">
            {c.usersByRole.map((u, i) => <li key={u.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: pie[i] }} /><span className="flex-1 text-mute">{u.name}</span><span className="font-semibold tnum">{u.value}</span></li>)}
          </ul>
        </Panel>

        <Panel title="Leave requests by status">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={c.leaves} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" {...axis} /><YAxis allowDecimals={false} {...axis} />
              <Tooltip cursor={{ fill: 'rgba(127,154,143,0.12)' }} content={<Tip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={900}>
                {c.leaves.map((l) => <Cell key={l.name} fill={l.name === 'Pending' ? COLORS.gold : l.name === 'Approved' ? COLORS.brand : COLORS.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Waiting for approval" action={<Badge tone={pending.length ? 'warn' : 'ok'}>{s.pendingRegistrations}</Badge>}>
          {pending.length === 0 ? <p className="text-sm text-mute">Every registration has been handled.</p> : (
            <ul className="-my-2 divide-y divide-line/70">
              <AnimatePresence initial={false}>
                {pending.map((u) => (
                  <motion.li key={u._id} layout exit={{ opacity: 0, height: 0, x: 40 }} transition={{ duration: 0.25 }} className="flex items-center gap-3 overflow-hidden py-3">
                    <Avatar name={u.name} size={34} />
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.name}</p><p className="truncate text-xs text-mute">{roleLabel[u.role]}{u.userId ? `, ${u.userId}` : ''}</p></div>
                    <button onClick={() => decide(u, 'active')} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-500" aria-label={`Approve ${u.name}`}><Check size={16} /></button>
                    <button onClick={() => decide(u, 'rejected')} className="grid h-8 w-8 place-items-center rounded-lg bg-stamp/10 text-stamp hover:bg-stamp/20" aria-label={`Decline ${u.name}`}><X size={16} /></button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity">
          {d.activity.length ? (
            <ul className="space-y-3">
              {d.activity.slice(0, 6).map((a) => (
                <li key={a._id} className="flex gap-3 text-sm"><Avatar name={a.user?.name || '?'} size={28} /><div className="min-w-0"><p className="leading-snug"><span className="font-semibold">{a.user?.name || 'System'}</span> {a.action.toLowerCase()}</p><p className="truncate text-xs text-mute">{a.detail}, {timeAgo(a.createdAt)}</p></div></li>
              ))}
            </ul>
          ) : <p className="text-sm text-mute">Actions taken in the portal are listed here.</p>}
        </Panel>
      </div>
    </>
  );
}
