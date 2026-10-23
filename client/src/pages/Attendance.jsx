import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Bar, Empty, LoadError, PageHeader, PageSkeleton, Panel, Ring, cx } from '../components/ui';
import { fmtDay } from '../lib/format';

const MARK = {
  present: ['P', 'text-brand-700'],
  late: ['L', 'text-marigold-600'],
  absent: ['A', 'font-bold text-stamp ring-2 ring-stamp/70 rounded-full'],
  leave: ['Lv', 'text-sky-600'],
};
const tone = (p) => (p === null ? 'brand' : p >= 85 ? 'brand' : p >= 75 ? 'gold' : 'bad');

// The class register: subjects down, class days across, marks written the way teachers write them.
export default function Attendance() {
  const { user } = useAuth();
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch('/attendance/summary', { params: { child } });
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const { summary: s, byCourse, register } = data;

  return (
    <>
      <PageHeader title="Attendance" subtitle={user.role === 'guardian' ? 'The class register for your child. Absences also reach you as alerts.' : 'Your class register. Approved leave is excused and not counted against you.'} />
      <div className="mb-5 grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel>
          <div className="flex items-center gap-5">
            <Ring value={s.percent ?? 0} size={112} stroke={11} tone={tone(s.percent)}><span className="font-display text-3xl font-semibold tnum">{s.percent ?? '-'}{s.percent !== null && '%'}</span></Ring>
            <dl className="flex-1 space-y-1.5 text-sm">
              {[['Present', s.present], ['Late', s.late], ['Absent', s.absent], ['Excused leave', s.leave]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-mute">{k}</dt><dd className="font-semibold tnum">{v}</dd></div>)}
            </dl>
          </div>
          {s.percent !== null && s.percent < 75 && <p className="mt-4 rounded-lg bg-stamp/10 px-3 py-2 text-sm text-stamp">Attendance is under 75%, which many colleges treat as the minimum. Check your college's rule.</p>}
        </Panel>
        <Panel title="By subject">
          <ul className="space-y-3">
            {byCourse.map((c) => (
              <li key={c.course._id} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm font-medium">{c.course.title}</span>
                <div className="flex-1"><Bar value={c.percent ?? 0} tone={c.percent === null || c.percent >= 85 ? 'bg-brand-600' : c.percent >= 75 ? 'bg-marigold-500' : 'bg-stamp'} className="h-2" /></div>
                <span className="w-12 text-right text-sm font-semibold tnum">{c.percent === null ? '-' : `${c.percent}%`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Register, recent class days" pad={false}>
        {register.dates.length === 0 ? <Empty title="No attendance recorded yet" text="Marks appear after teachers take attendance." /> : (
          <div className="overflow-x-auto">
            <table className="ruled w-full min-w-[640px] border-collapse text-center text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="sticky left-0 bg-surface p-3 text-left font-medium text-mute">Subject</th>
                  {register.dates.map((d) => <th key={d} className="p-2 text-xs font-medium text-mute tnum">{fmtDay(d).replace(',', '').split(' ').slice(0, 3).join(' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {register.rows.map((r) => (
                  <tr key={r.course._id} className="border-b border-line/70">
                    <td className="sticky left-0 whitespace-nowrap bg-surface p-3 text-left font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: r.course.color }} />{r.course.title}</td>
                    {register.dates.map((d) => {
                      const m = MARK[r.marks[d]];
                      return <td key={d} className="p-1.5">{m ? <span className={cx('inline-grid h-7 min-w-[28px] place-items-center font-display', m[1])}>{m[0]}</span> : <span className="text-line">.</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-5 py-3 text-xs text-mute">P present, L late, A absent (circled in red), Lv approved leave. A dot means the subject had no class that day.</p>
          </div>
        )}
      </Panel>
    </>
  );
}
