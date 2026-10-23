import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Empty, LoadError, PageHeader, PageSkeleton, Panel, Stamp } from '../components/ui';
import { fmtDate } from '../lib/format';

export default function Quizzes() {
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch('/quizzes', { params: { child } });
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Quizzes" subtitle="Multiple-choice quizzes are marked the moment you finish. You get one attempt." />
      {data.items.length === 0 ? <Panel><Empty icon={HelpCircle} title="No quizzes yet" text="When a teacher posts a quiz for your class, it appears here." /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((q) => {
              const closed = q.closesAt && new Date(q.closesAt) < new Date();
              return (
                <li key={q._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: q.course?.color }} />
                  <div className="min-w-[220px] flex-1"><p className="font-semibold">{q.title}</p><p className="text-sm text-mute">{q.course?.title}, {q.questionCount} questions, {q.durationMin} min{q.closesAt ? `, closes ${fmtDate(q.closesAt)}` : ''}</p></div>
                  {q.attempt ? <Stamp tone="ok">{q.attempt.score}/{q.attempt.total}</Stamp> : closed ? <Stamp tone="mute">Closed</Stamp> : null}
                  <Link className={q.attempt || closed ? 'btn btn-soft' : 'btn btn-primary'} to={`/app/quizzes/${q._id}`}>{q.attempt ? 'Review' : closed ? 'Open' : 'Start quiz'}</Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
