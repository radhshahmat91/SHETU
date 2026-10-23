import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarX2, ClipboardList, HelpCircle, Mail, MessageSquare, Phone, Coffee, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChild } from '../../context/ChildContext';
import { useFetch } from '../../hooks/useFetch';
import { Avatar, Empty, LoadError, PageSkeleton, Panel, Ring, Segmented } from '../../components/ui';
import { Band, ClassRow, Ledger, NoticeRow } from '../../components/dash';
import { COLORS, GRID, Tip, axis } from '../../components/charts';
import { COLLEGE } from '../../components/layout/AppLayout';
import { fmtShort, greeting } from '../../lib/format';

const first = (n = '') => n.split(' ')[0];
const dueText = (d) => {
  if (!d) return 'Open';
  const days = Math.ceil((new Date(d) - Date.now()) / 864e5);
  return days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
};

export default function StudentDash() {
  const { user } = useAuth();
  const { child, kids, setChild } = useChild();
  const guardian = user.role === 'guardian';
  const { data: d, loading, error, reload } = useFetch('/dashboard', { params: { child }, enabled: !guardian || !!child });

  if (guardian && !kids.length) return <Empty icon={Users} title="No child is linked yet" text="The college office links your account to your child's student ID after approval. Contact the office if this takes long." />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !d) return <PageSkeleton />;

  const s = d.student;
  const att = d.attendance;
  const attTone = att.percent === null ? 'brand' : att.percent >= 85 ? 'brand' : att.percent >= 75 ? 'gold' : 'bad';
  const imp = d.importantNotice;

  return (
    <>
      <Band>
        <div>
          <p className="text-sm text-white/65">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{greeting()}, {first(guardian ? user.name : s.name)}</h1>
          <p className="mt-1 text-white/75">{guardian ? `Here is how ${first(s.name)} is doing at ${COLLEGE}.` : `${s.className}, ${s.group}, Section ${s.section}. Roll ${s.roll}.`}</p>
          {guardian && kids.length > 1 && <div className="mt-3"><Segmented id="kid" value={child} onChange={setChild} options={kids.map((k) => ({ value: k._id, label: first(k.name) }))} /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {guardian ? (
            <>
              <Link to="/app/messages" className="btn btn-gold"><MessageSquare size={16} />Message a teacher</Link>
              <Link to="/app/results" className="btn text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">See results</Link>
            </>
          ) : (
            <>
              <Link to="/app/leaves" className="btn btn-gold"><CalendarX2 size={16} />Apply for leave</Link>
              <Link to="/app/routine" className="btn text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">Class routine</Link>
            </>
          )}
        </div>
      </Band>

      {imp && (
        <Link to="/app/notices" className={`mb-5 flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 ${imp.priority === 'urgent' ? 'border-stamp bg-stamp/5' : 'border-marigold-500 bg-marigold-500/10'}`}>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${imp.priority === 'urgent' ? 'text-stamp' : 'text-marigold-600'}`}>{imp.priority === 'urgent' ? 'Urgent notice' : 'Important notice'}</p>
            <p className="font-semibold">{imp.title}</p>
            <p className="line-clamp-1 text-sm text-mute">{imp.body}</p>
          </div>
        </Link>
      )}

      <Ledger items={[
        { label: 'Attendance', value: att.percent, suffix: '%', hint: att.total ? `${att.present + att.late} of ${att.total} classes` : 'No classes recorded yet' },
        { label: 'GPA', value: d.stats.gpa, decimals: 2, hint: 'On the 5.00 scale' },
        { label: 'Assignments to do', value: d.stats.pendingAssignments, hint: d.stats.pendingLeaves ? `${d.stats.pendingLeaves} leave request pending` : 'Nothing overdue' },
        { label: 'Fees due', value: d.stats.feesDue, money: true, hint: d.stats.feesCount ? `${d.stats.feesCount} item${d.stats.feesCount > 1 ? 's' : ''} waiting` : 'All paid' },
      ]} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Today's classes" action={<Link to="/app/routine" className="text-sm font-semibold text-brand-700 hover:underline">Full routine</Link>}>
            {d.today.length ? <div className="-my-1.5 divide-y divide-line/70">{d.today.map((c, i) => <ClassRow key={i} item={c} to={`/app/courses/${c.course._id}`} />)}</div>
              : <Empty icon={Coffee} title="No classes today" text="Enjoy the break. Your next classes are on the routine page." />}
          </Panel>

          <Panel title="Performance by subject">
            {d.performance.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={d.performance} margin={{ top: 18, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="code" {...axis} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...axis} />
                  <Tooltip cursor={{ fill: 'rgba(127,154,143,0.12)' }} content={<Tip render={(p) => <><p className="font-semibold">{p.title}</p><p className="text-mute">{p.percent}% ({p.letter})</p></>} />} />
                  <Bar dataKey="percent" radius={[9, 9, 0, 0]} maxBarSize={40} animationDuration={900}>
                    {d.performance.map((p) => <Cell key={p.code} fill={p.percent >= 70 ? COLORS.brand : p.percent >= 50 ? COLORS.gold : COLORS.red} />)}
                    <LabelList dataKey="percent" position="top" fill={COLORS.mute} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty title="No results yet" text="Marks appear here as soon as teachers publish them." />}
          </Panel>

          <Panel title="Coming up">
            {d.upcoming.length ? (
              <div className="-my-2 divide-y divide-line/70">
                {d.upcoming.map((u) => (
                  <Link key={u.type + u.id} to={u.type === 'quiz' ? `/app/quizzes/${u.id}` : '/app/assignments'} className="flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-sunken">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">{u.type === 'quiz' ? <HelpCircle size={17} /> : <ClipboardList size={17} />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{u.title}</span><span className="text-sm text-mute">{u.course?.title}</span></span>
                    <span className="shrink-0 text-sm font-medium text-mute">{dueText(u.due)}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty title="You are all caught up" text="New assignments and quizzes will show up here." />}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Attendance" action={<Link to="/app/attendance" className="text-sm font-semibold text-brand-700 hover:underline">Register</Link>}>
            <div className="flex items-center gap-5">
              <Ring value={att.percent ?? 0} size={104} stroke={10} tone={attTone}><span className="font-display text-2xl font-semibold tnum">{att.percent ?? '-'}{att.percent !== null && '%'}</span></Ring>
              <dl className="flex-1 space-y-1 text-sm">
                {[['Present', att.present], ['Late', att.late], ['Absent', att.absent], ['On leave', att.leave]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-mute">{k}</dt><dd className="font-semibold tnum">{v}</dd></div>)}
              </dl>
            </div>
          </Panel>

          {d.classTeacher && (
            <Panel title="Class teacher">
              <div className="flex items-center gap-3">
                <Avatar name={d.classTeacher.name} size={48} />
                <div className="min-w-0"><p className="truncate font-semibold">{d.classTeacher.name}</p><p className="truncate text-sm text-mute">{d.classTeacher.designation}, {d.classTeacher.subject}</p></div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <a className="flex items-center gap-2 text-mute hover:text-brand-700" href={`mailto:${d.classTeacher.email}`}><Mail size={15} />{d.classTeacher.email}</a>
                {d.classTeacher.phone && <p className="flex items-center gap-2 text-mute"><Phone size={15} />{d.classTeacher.phone}</p>}
              </div>
            </Panel>
          )}

          <Panel title="Notice board" action={<Link to="/app/notices" className="text-sm font-semibold text-brand-700 hover:underline">All notices</Link>}>
            {d.notices.length ? <div className="-my-1.5 divide-y divide-line/70">{d.notices.slice(0, 4).map((n) => <NoticeRow key={n._id} n={n} />)}</div> : <p className="text-sm text-mute">No notices yet.</p>}
          </Panel>

          {d.feedback.length > 0 && (
            <Panel title="Teacher feedback">
              <div className="space-y-4">
                {d.feedback.slice(0, 3).map((f, i) => (
                  <figure key={i}>
                    <blockquote className="border-l-2 border-marigold-500 pl-3 text-[15px] leading-snug">{f.text}</blockquote>
                    <figcaption className="mt-1 pl-3 text-xs text-mute">{f.course.title}, {f.exam}, {f.percent}%, {fmtShort(f.date)}</figcaption>
                  </figure>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
