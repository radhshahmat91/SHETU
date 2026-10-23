import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFetch } from '../../hooks/useFetch';
import { api, notifyError } from '../../lib/api';
import { Avatar, LoadError, Panel, Skeleton, Spinner, cx } from '../../components/ui';

export default function ResultsTab({ course }) {
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/results`);
  const [exam, setExam] = useState('');
  const [total, setTotal] = useState('');
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const found = data.items.filter((r) => r.exam === exam.trim());
    if (found.length) setTotal(String(found[0].total));
    setRows(Object.fromEntries(data.students.map((s) => {
      const r = found.find((x) => String(x.student) === String(s._id));
      return [s._id, { marks: r ? String(r.marks) : '', feedback: r?.feedback || '' }];
    })));
  }, [data, exam]);

  const save = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post(`/courses/${course._id}/results`, { exam, total, entries: data.students.map((s) => ({ student: s._id, ...rows[s._id] })) });
      toast.success(`Published ${res.count} results. Students and guardians were told.`);
      reload();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-60" />;

  const set = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  const filled = Object.values(rows).filter((r) => r.marks !== '');
  const avg = filled.length && total ? Math.round((filled.reduce((s, r) => s + Number(r.marks), 0) / filled.length / Number(total)) * 100) : null;

  return (
    <Panel pad={false}>
      <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
        <label className="min-w-[200px] flex-1"><span className="label">Exam</span><input className="input" value={exam} onChange={(e) => setExam(e.target.value)} placeholder="Mid Term, Class Test 3, Practical..." list="exam-names" /></label>
        <datalist id="exam-names">{data.exams.map((e) => <option key={e} value={e} />)}</datalist>
        <label className="w-32"><span className="label">Total marks</span><input className="input" type="number" min="1" value={total} onChange={(e) => setTotal(e.target.value)} /></label>
        <button className="btn btn-primary" onClick={save} disabled={busy || !exam.trim() || !total || !filled.length}>{busy && <Spinner />}Publish results</button>
      </div>
      {data.exams.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/50 px-5 py-2.5 text-sm">
          <span className="text-mute">Edit an earlier exam:</span>
          {data.exams.map((e) => <button key={e} onClick={() => setExam(e)} className={cx('chip transition-colors hover:text-ink', exam.trim() === e && '!bg-brand-600 !text-white')}>{e}</button>)}
          {avg !== null && <span className="ml-auto font-semibold tnum">Class average {avg}%</span>}
        </div>
      )}
      <ul className="divide-y divide-line">
        {data.students.map((s) => (
          <li key={s._id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
            <Avatar name={s.name} size={32} />
            <div className="min-w-[150px] flex-1"><p className="font-semibold">{s.name}</p><p className="text-xs text-mute">Roll {s.roll}</p></div>
            <input className="input !w-24 tnum" type="number" min="0" max={total || undefined} placeholder="Marks" value={rows[s._id]?.marks ?? ''} onChange={(e) => set(s._id, 'marks', e.target.value)} aria-label={`Marks for ${s.name}`} />
            <input className="input !w-full sm:!w-72" placeholder="Feedback for the student and guardian" value={rows[s._id]?.feedback ?? ''} onChange={(e) => set(s._id, 'feedback', e.target.value)} aria-label={`Feedback for ${s.name}`} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
