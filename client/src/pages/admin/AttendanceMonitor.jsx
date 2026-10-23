import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Mail } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api, notifyError } from '../../lib/api';
import { Bar as Meter, Empty, LoadError, PageHeader, PageSkeleton, Panel, Segmented, Spinner } from '../../components/ui';
import { COLORS, GRID, Tip, axis } from '../../components/charts';

export default function AttendanceMonitor() {
  const { data, loading, error, reload } = useFetch('/admin/attendance-overview');
  const [only, setOnly] = useState('low');
  const [busy, setBusy] = useState('');
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;

  const notify = async (s, kind) => {
    setBusy(`${s._id}${kind}`);
    try { const { data: r } = await api.post('/admin/notify-guardian', { student: s._id, kind }); toast.success(`Sent to ${r.sent} guardian${r.sent > 1 ? 's' : ''} by email and in-app`); } catch (e) { notifyError(e); } finally { setBusy(''); }
  };
  const rows = data.items.filter((i) => (only === 'low' ? i.percent !== null && i.percent < 75 : true));

  return (
    <>
      <PageHeader title="Attendance monitor" subtitle="See which classes and students are slipping, and tell guardians with one click." />
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Average attendance by section" className="lg:col-span-2">
          {data.classes.length ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.classes} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} unit="%" {...axis} />
                <Tooltip cursor={{ fill: 'rgba(127,154,143,0.12)' }} content={<Tip render={(p) => <><p className="font-semibold">{p.label}</p><p className="text-mute">{p.percent}% across {p.students} students</p></>} />} />
                <Bar dataKey="percent" radius={[9, 9, 0, 0]} maxBarSize={64} animationDuration={900}>{data.classes.map((c) => <Cell key={c.label} fill={c.percent >= 85 ? COLORS.brand : c.percent >= 75 ? COLORS.gold : COLORS.red} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty title="No attendance yet" />}
        </Panel>
        <Panel title="At a glance">
          <p className="font-display text-5xl font-semibold tnum">{data.items.filter((i) => i.percent !== null && i.percent < 75).length}</p>
          <p className="text-mute">students are below 75% attendance.</p>
          <p className="mt-4 text-sm text-mute">Approved leave is excused and is not counted as an absence.</p>
        </Panel>
      </div>
      <div className="mb-4"><Segmented id="attfilter" value={only} onChange={setOnly} options={[{ value: 'low', label: 'Below 75%' }, { value: 'all', label: 'All students' }]} /></div>
      {rows.length === 0 ? <Panel><Empty title="Nobody is below 75%" text="Every student with recorded attendance is at or above the line." /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.student._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                <div className="min-w-[200px] flex-1"><p className="font-semibold">{r.student.name}</p><p className="text-sm text-mute">{r.student.userId}, {r.student.className} {r.student.section}, Roll {r.student.roll}</p></div>
                <div className="w-40"><Meter value={r.percent ?? 0} tone={r.percent === null || r.percent >= 85 ? 'bg-brand-600' : r.percent >= 75 ? 'bg-marigold-500' : 'bg-stamp'} className="h-2" /></div>
                <span className="w-12 text-right font-display font-semibold tnum">{r.percent === null ? '-' : `${r.percent}%`}</span>
                <button className="btn btn-soft !py-1.5" disabled={!!busy} onClick={() => notify(r.student, 'attendance')}>{busy === `${r.student._id}attendance` ? <Spinner /> : <Mail size={15} />}Alert guardian</button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
