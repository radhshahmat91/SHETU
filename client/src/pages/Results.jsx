import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Bar, CountUp, Empty, LoadError, PageHeader, PageSkeleton, Panel } from '../components/ui';
import { fmtShort } from '../lib/format';

const tone = (p) => (p >= 70 ? 'bg-brand-600' : p >= 50 ? 'bg-marigold-500' : 'bg-stamp');

// A report card: one ruled line per subject, the GPA sealed in a stamp.
export default function Results() {
  const { user } = useAuth();
  const { child, activeChild } = useChild();
  const { data, loading, error, reload } = useFetch('/results', { params: { child } });
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const who = user.role === 'guardian' ? activeChild : user;
  const graded = data.courses.filter((c) => c.percent !== null);

  return (
    <>
      <PageHeader title="Results" subtitle={user.role === 'guardian' ? `Marks and teacher feedback for ${who?.name}.` : 'Marks, grades and feedback from every subject.'} />
      <Panel className="mb-5">
        <div className="flex flex-wrap items-center gap-6">
          <motion.div initial={{ scale: 1.6, opacity: 0, rotate: -16 }} animate={{ scale: 1, opacity: 1, rotate: -5 }} transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.15 }}
            className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[3px] border-double border-brand-700 text-center text-brand-700">
            <div><p className="font-display text-3xl font-bold leading-none tnum"><CountUp value={data.gpa} decimals={2} /></p><p className="mt-1 text-[11px] font-bold uppercase tracking-wider">GPA</p></div>
          </motion.div>
          <div className="min-w-[220px] flex-1">
            <p className="font-display text-2xl font-semibold">{who?.name}</p>
            <p className="text-mute">{who?.className}, {who?.group}, Section {who?.section}, Roll {who?.roll}</p>
            <p className="mt-2 text-sm text-mute">{graded.length} of {data.courses.length} subjects have published marks. GPA is the average of subject grade points on the 5.00 scale.</p>
          </div>
        </div>
      </Panel>

      {graded.length === 0 ? <Panel><Empty icon={GraduationCap} title="No marks published yet" text="Results appear here the moment a teacher publishes them." /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.courses.map((c) => (
              <li key={c.course._id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: c.course.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold leading-tight">{c.course.title}</p>
                    {c.percent !== null ? <div className="mt-1.5 max-w-md"><Bar value={c.percent} tone={tone(c.percent)} /></div> : <p className="text-sm text-mute">No marks yet</p>}
                  </div>
                  {c.percent !== null && <div className="text-right"><p className="font-display text-2xl font-semibold tnum">{c.letter}</p><p className="text-sm text-mute tnum">{c.percent}%</p></div>}
                </div>
                {c.exams.length > 0 && (
                  <div className="ml-[22px] mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">{c.exams.map((e) => <span key={e._id} className="chip tnum">{e.exam}: <b className="text-ink">{e.marks}/{e.total}</b></span>)}</div>
                    {c.exams.filter((e) => e.feedback).slice(-2).map((e) => <p key={e._id} className="border-l-2 border-marigold-500 pl-3 text-sm">{e.feedback} <span className="text-mute">({e.exam}, {fmtShort(e.date)})</span></p>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="mt-4 text-xs text-mute">Grading scale: A+ 80 to 100 (5.00), A 70 to 79 (4.00), A- 60 to 69 (3.50), B 50 to 59 (3.00), C 40 to 49 (2.00), D 33 to 39 (1.00), F below 33.</p>
    </>
  );
}
