import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Empty, LoadError, PageHeader, PageSkeleton, Panel, Stamp, Tabs } from '../components/ui';
import SubmitModal from '../components/SubmitModal';
import { assignmentStatus } from './course/AssignmentsTab';
import { fmtDateTime } from '../lib/format';

export default function Assignments() {
  const { user } = useAuth();
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch('/assignments', { params: { child } });
  const [tab, setTab] = useState('todo');
  const [submitting, setSubmitting] = useState(null);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;

  const groups = {
    todo: data.items.filter((a) => !a.submission),
    submitted: data.items.filter((a) => a.submission && a.submission.status !== 'graded'),
    graded: data.items.filter((a) => a.submission?.status === 'graded'),
  };
  const rows = groups[tab];
  return (
    <>
      <PageHeader title="Assignments" subtitle={user.role === 'guardian' ? 'What your child has been given, and how it is going.' : 'Hand work in before the due date. Graded work shows your teacher\'s feedback.'} />
      <Tabs id="asg" value={tab} onChange={setTab} tabs={[{ value: 'todo', label: 'To do', count: groups.todo.length }, { value: 'submitted', label: 'Submitted', count: groups.submitted.length }, { value: 'graded', label: 'Graded', count: groups.graded.length }]} />
      <div className="mt-5">
        {rows.length === 0 ? <Panel><Empty icon={ClipboardList} title={tab === 'todo' ? 'Nothing to do right now' : 'Nothing here yet'} text="New assignments from your teachers will be listed here." /></Panel> : (
          <Panel pad={false}>
            <ul className="divide-y divide-line">
              {rows.map((a) => {
                const st = assignmentStatus(a);
                return (
                  <li key={a._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                    <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: a.course?.color }} />
                    <div className="min-w-[220px] flex-1">
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-mute">{a.course?.title}, due {fmtDateTime(a.dueDate)}, {a.maxMarks} marks</p>
                      {a.submission?.feedback && <p className="mt-1 border-l-2 border-marigold-500 pl-2 text-sm">{a.submission.feedback}</p>}
                    </div>
                    <Stamp tone={st.tone}>{st.text}</Stamp>
                    {user.role === 'student' && a.submission?.status !== 'graded' && <button className="btn btn-primary" onClick={() => setSubmitting(a)}>{a.submission ? 'Resubmit' : 'Submit'}</button>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
      <SubmitModal assignment={submitting} onClose={() => setSubmitting(null)} onDone={reload} />
    </>
  );
}
