import { useState } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { api, notifyError } from '../lib/api';
import { Avatar, Empty, Field, LoadError, Modal, PageHeader, PageSkeleton, Panel, Spinner, Stamp, Stars } from '../components/ui';

export const AREAS = [['clarity', 'Explains clearly'], ['engagement', 'Keeps the class engaged'], ['support', 'Helps when you are stuck'], ['punctuality', 'Starts and ends on time']];

export default function Evaluate() {
  const { data, loading, error, reload } = useFetch('/evaluations/pending');
  const [row, setRow] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;

  const open = (r) => { setRow(r); setRatings({}); setComment(''); };
  const send = async () => {
    setBusy(true);
    try { await api.post('/evaluations', { course: row.course._id, ratings, comment }); toast.success('Thank you. Your rating is anonymous.'); setRow(null); reload(); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Rate your teachers" subtitle="Honest feedback helps teachers improve. Ratings are anonymous: teachers see averages and comments, never names." />
      {data.items.length === 0 ? <Panel><Empty icon={Star} title="No courses to rate" /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((r) => (
              <li key={r.course._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: r.course.color }} />
                <Avatar name={r.teacher?.name} size={38} />
                <div className="min-w-[180px] flex-1"><p className="font-semibold">{r.teacher?.name}</p><p className="text-sm text-mute">{r.course.title}</p></div>
                {r.done ? <Stamp tone="ok" animate={false}>Rated</Stamp> : <button className="btn btn-primary" onClick={() => open(r)}>Rate teacher</button>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Modal open={!!row} onClose={() => setRow(null)} title={row ? `Rate ${row.teacher?.name}` : ''}
        footer={<><button className="btn btn-ghost" onClick={() => setRow(null)}>Cancel</button><button className="btn btn-primary" onClick={send} disabled={busy || AREAS.some(([k]) => !ratings[k])}>{busy && <Spinner />}Send rating</button></>}>
        <p className="mb-4 text-sm text-mute">{row?.course.title}. Rate each area from 1 to 5 stars.</p>
        <div className="space-y-3">{AREAS.map(([k, label]) => <div key={k} className="flex items-center justify-between gap-3"><span className="font-medium">{label}</span><Stars value={ratings[k] || 0} onChange={(n) => setRatings({ ...ratings, [k]: n })} size={24} /></div>)}</div>
        <Field label="Comment (optional)" className="mt-5"><textarea className="input min-h-[80px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What works well? What could be better?" /></Field>
      </Modal>
    </>
  );
}
