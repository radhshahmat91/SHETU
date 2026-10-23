import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Avatar, Bar, Empty, LoadError, PageHeader, PageSkeleton, Panel, Stars } from '../components/ui';
import { AREAS } from './Evaluate';

export default function Evaluations() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/evaluations/summary');
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title={user.role === 'admin' ? 'Teacher ratings' : 'Student ratings'} subtitle="Anonymous ratings students give at the end of a course. Only averages and comments are shown, never names." />
      {data.items.length === 0 ? <Panel><Empty icon={Star} title="No ratings yet" text="Students rate each course once. Results appear here." /></Panel> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.items.map((g) => (
            <Panel key={g.course?._id}>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: g.course?.color }} />
                <div className="min-w-0 flex-1"><p className="font-display text-lg font-semibold leading-tight">{g.course?.title}</p>{user.role === 'admin' && <p className="flex items-center gap-1.5 text-sm text-mute"><Avatar name={g.teacher?.name} size={20} />{g.teacher?.name}</p>}</div>
                <div className="text-right"><p className="font-display text-3xl font-semibold tnum">{g.overall}</p><Stars value={g.overall} size={14} /><p className="text-xs text-mute">{g.count} responses</p></div>
              </div>
              <div className="mt-4 space-y-2.5">
                {AREAS.map(([k, label]) => <div key={k} className="flex items-center gap-3 text-sm"><span className="w-44 shrink-0 text-mute">{label}</span><div className="flex-1"><Bar value={(g.averages[k] / 5) * 100} className="h-2" /></div><span className="w-8 text-right font-semibold tnum">{g.averages[k]}</span></div>)}
              </div>
              {g.comments.length > 0 && <div className="mt-4 space-y-2 border-t border-line pt-4">{g.comments.map((c, i) => <p key={i} className="border-l-2 border-marigold-500 pl-3 text-sm">{c}</p>)}</div>}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
