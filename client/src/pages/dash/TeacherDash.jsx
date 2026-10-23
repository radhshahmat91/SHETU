import { Link } from 'react-router-dom';
import { CalendarX2, Coffee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { Avatar, Empty, LoadError, PageSkeleton, Panel, Stars, Stamp } from '../../components/ui';
import { Band, ClassRow, Ledger, NoticeRow } from '../../components/dash';
import { greeting, fmtShort, timeAgo } from '../../lib/format';

export default function TeacherDash() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch('/dashboard');
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !d) return <PageSkeleton />;
  const c = d.classTeacherOf;

  return (
    <>
      <Band>
        <div>
          <p className="text-sm text-white/65">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{greeting()}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-white/75">
            {d.today.length ? `You teach ${d.today.length} class${d.today.length > 1 ? 'es' : ''} today.` : 'No classes on your routine today.'}
            {d.isClassTeacher && ` You are the class teacher of ${c.className}, ${c.group}, Section ${c.section}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/courses" className="btn btn-gold">Open my courses</Link>
          <Link to="/app/notices" className="btn text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">Post a notice</Link>
        </div>
      </Band>

      <Ledger items={[
        { label: 'Classes today', value: d.today.length, hint: `${d.stats.courses} courses in total` },
        { label: 'Students taught', value: d.stats.students, hint: 'Across your sections' },
        { label: 'Waiting to be graded', value: d.stats.toGrade, hint: 'Assignment submissions' },
        { label: 'Student rating', value: d.stats.rating, decimals: 1, suffix: ' / 5', hint: d.stats.ratingCount ? `From ${d.stats.ratingCount} responses` : 'No ratings yet' },
      ]} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Today's classes">
            {d.today.length ? <div className="-my-1.5 divide-y divide-line/70">{d.today.map((x, i) => <ClassRow key={i} item={x} to={`/app/courses/${x.course._id}?tab=attendance`} />)}</div>
              : <Empty icon={Coffee} title="No classes today" text="Use the time to review submissions or prepare materials." />}
          </Panel>
          <Panel title="Waiting to be graded" action={<Link to="/app/courses" className="text-sm font-semibold text-brand-700 hover:underline">Open courses</Link>}>
            {d.recent.length ? (
              <div className="-my-2 divide-y divide-line/70">
                {d.recent.map((r) => (
                  <Link key={r._id} to={`/app/courses/${r.course}?tab=assignments`} className="flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-sunken">
                    <Avatar name={r.student || '?'} size={34} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.student}</span><span className="text-sm text-mute">{r.assignment}</span></span>
                    {r.late && <Stamp tone="warn" animate={false}>Late</Stamp>}
                    <span className="shrink-0 text-xs text-mute">{timeAgo(r.at)}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty title="Nothing waiting" text="New submissions will appear here." />}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Leave requests" action={d.isClassTeacher && <Link to="/app/leaves" className="text-sm font-semibold text-brand-700 hover:underline">Review</Link>}>
            {!d.isClassTeacher ? <p className="text-sm text-mute">Leave requests go to each section's class teacher. You are not assigned as one.</p>
              : d.pendingLeaves.length ? (
                <div className="-my-1.5 divide-y divide-line/70">
                  {d.pendingLeaves.map((l) => (
                    <Link key={l._id} to="/app/leaves" className="flex items-center gap-3 py-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marigold-500/15 text-marigold-600"><CalendarX2 size={17} /></span>
                      <span className="min-w-0"><span className="block truncate font-semibold">{l.student?.name}</span><span className="text-sm text-mute">{l.days} day{l.days > 1 ? 's' : ''} from {fmtShort(l.startDate)}</span></span>
                    </Link>
                  ))}
                </div>
              ) : <p className="text-sm text-mute">No requests waiting. You are up to date.</p>}
          </Panel>
          <Panel title="Student rating">
            {d.stats.rating ? <div className="flex items-center gap-3"><span className="font-display text-4xl font-semibold tnum">{d.stats.rating}</span><div><Stars value={d.stats.rating} size={18} /><p className="mt-0.5 text-xs text-mute">Anonymous, from {d.stats.ratingCount} responses</p></div></div>
              : <p className="text-sm text-mute">Students rate teachers once per course. Results appear here.</p>}
            <Link to="/app/evaluations" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">See the breakdown</Link>
          </Panel>
          <Panel title="Notices" action={<Link to="/app/notices" className="text-sm font-semibold text-brand-700 hover:underline">All</Link>}>
            {d.notices.length ? <div className="-my-1.5 divide-y divide-line/70">{d.notices.map((n) => <NoticeRow key={n._id} n={n} />)}</div> : <p className="text-sm text-mute">No notices yet.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
