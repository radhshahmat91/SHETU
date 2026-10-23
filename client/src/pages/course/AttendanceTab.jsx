import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFetch } from '../../hooks/useFetch';
import { api, notifyError } from '../../lib/api';
import { Avatar, LoadError, Panel, Skeleton, Spinner, cx } from '../../components/ui';
import { isoPlus } from '../../lib/format';

const ST = [
  ['present', 'Present', 'bg-brand-600 text-white'],
  ['late', 'Late', 'bg-marigold-500 text-river'],
  ['absent', 'Absent', 'bg-stamp text-white'],
  ['leave', 'Leave', 'bg-sky-600 text-white'],
];

export default function AttendanceTab({ course }) {
  const [date, setDate] = useState(isoPlus(0));
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/attendance`, { params: { date } });
  const [marks, setMarks] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setMarks(Object.fromEntries(data.items.map((i) => [i.student._id, i.status]))); }, [data]);

  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/courses/${course._id}/attendance`, { date, records: Object.entries(marks).map(([student, status]) => ({ student, status })) });
      toast.success('Attendance saved. Guardians of absent students were told.');
      reload();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const count = (s) => Object.values(marks).filter((m) => m === s).length;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <Panel pad={false}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
        <input className="input !w-44" type="date" max={isoPlus(0)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Class date" />
        <div className="flex flex-wrap gap-1.5">{ST.map(([k, label]) => <span key={k} className="chip tnum">{label} {count(k)}</span>)}</div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost" onClick={() => setMarks(Object.fromEntries(Object.keys(marks).map((k) => [k, 'present'])))}>Mark all present</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || loading}>{busy && <Spinner />}Save attendance</button>
        </div>
      </div>
      {loading || !data ? <div className="p-5"><Skeleton className="h-40" /></div> : (
        <>
          {!data.items.some((i) => i.saved) && <p className="border-b border-line bg-marigold-500/10 px-5 py-2 text-sm">Not saved yet for this date. Everyone starts as present; approved leave is filled in for you.</p>}
          <ul className="divide-y divide-line">
            {data.items.map((i) => (
              <li key={i.student._id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <Avatar name={i.student.name} size={32} />
                <div className="min-w-[150px] flex-1"><p className="font-semibold">{i.student.name}</p><p className="text-xs text-mute">Roll {i.student.roll}{i.onLeave ? ', approved leave today' : ''}</p></div>
                <div className="flex gap-1" role="group" aria-label={`Attendance for ${i.student.name}`}>
                  {ST.map(([k, label, on]) => (
                    <button key={k} onClick={() => setMarks((m) => ({ ...m, [i.student._id]: k }))} aria-pressed={marks[i.student._id] === k}
                      className={cx('rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-150', marks[i.student._id] === k ? `${on} scale-105` : 'bg-sunken text-mute hover:text-ink')}>{label}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
