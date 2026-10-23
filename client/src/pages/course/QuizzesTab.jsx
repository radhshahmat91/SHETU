import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api, notifyError } from '../../lib/api';
import { Empty, Field, LoadError, Modal, Panel, Skeleton, Spinner, Stamp, cx } from '../../components/ui';
import { fmtDate } from '../../lib/format';

const blank = () => ({ text: '', options: ['', '', '', ''], correctIndex: 0, marks: 1 });

function Attempts({ quiz, onClose }) {
  const { data, loading } = useFetch(`/quizzes/${quiz._id}/attempts`);
  return (
    <Modal open onClose={onClose} title={`Results: ${quiz.title}`}>
      {loading ? <Skeleton className="h-32" /> : (
        <ul className="divide-y divide-line">
          {data.items.map((r) => (
            <li key={r.student._id} className="flex items-center justify-between py-2.5"><span>{r.student.name} <span className="text-xs text-mute">Roll {r.student.roll}</span></span>
              {r.attempt ? <span className="font-display font-semibold tnum">{r.attempt.score}/{r.attempt.total}</span> : <span className="text-sm text-mute">Not attempted</span>}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Builder({ course, onClose, onSaved }) {
  const [f, setF] = useState({ title: '', description: '', durationMin: 10, closesAt: '', questions: [blank()] });
  const [busy, setBusy] = useState(false);
  const q = (i, patch) => setF((s) => ({ ...s, questions: s.questions.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const opt = (i, k, v) => q(i, { options: f.questions[i].options.map((o, j) => (j === k ? v : o)) });
  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/courses/${course._id}/quizzes`, { ...f, durationMin: Number(f.durationMin), closesAt: f.closesAt || undefined });
      toast.success('Quiz published and students notified');
      onSaved();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New quiz" wide
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !f.title.trim()}>{busy && <Spinner />}Publish quiz</button></>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Title" className="sm:col-span-3"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Minutes allowed"><input className="input" type="number" min="1" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></Field>
        <Field label="Closes on (optional)"><input className="input" type="date" value={f.closesAt} onChange={(e) => setF({ ...f, closesAt: e.target.value })} /></Field>
      </div>
      <div className="mt-5 space-y-4">
        {f.questions.map((x, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <div className="mb-2 flex items-center justify-between"><p className="font-display font-semibold">Question {i + 1}</p>
              {f.questions.length > 1 && <button className="btn btn-ghost !p-1.5" onClick={() => setF({ ...f, questions: f.questions.filter((_, j) => j !== i) })} aria-label={`Remove question ${i + 1}`}><Trash2 size={15} /></button>}</div>
            <input className="input" placeholder="Ask the question" value={x.text} onChange={(e) => q(i, { text: e.target.value })} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {x.options.map((o, k) => (
                <label key={k} className={cx('flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors', x.correctIndex === k ? 'border-brand-600 bg-brand-50' : 'border-line')}>
                  <input type="radio" name={`correct-${i}`} checked={x.correctIndex === k} onChange={() => q(i, { correctIndex: k })} className="accent-[#006a4e]" aria-label={`Option ${k + 1} is correct`} />
                  <input className="w-full bg-transparent text-sm outline-none" placeholder={`Option ${k + 1}`} value={o} onChange={(e) => opt(i, k, e.target.value)} />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-mute">Select the radio button beside the correct answer. Leave unused options blank.</p>
          </div>
        ))}
        <button className="btn btn-soft" onClick={() => setF({ ...f, questions: [...f.questions, blank()] })}><Plus size={16} />Add question</button>
      </div>
    </Modal>
  );
}

export default function QuizzesTab({ course, canManage, child, onChange }) {
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/quizzes`, { params: { child } });
  const [build, setBuild] = useState(false);
  const [viewing, setViewing] = useState(null);
  const remove = async (q) => {
    if (!window.confirm(`Delete "${q.title}" and its results?`)) return;
    try { await api.delete(`/quizzes/${q._id}`); reload(); onChange?.(); } catch (e) { notifyError(e); }
  };
  if (error) return <LoadError error={error} onRetry={reload} />;
  return (
    <>
      {canManage && <div className="mb-4 flex justify-end"><button className="btn btn-primary" onClick={() => setBuild(true)}><Plus size={16} />New quiz</button></div>}
      {loading ? <Skeleton className="h-32" /> : data.items.length === 0 ? <Panel><Empty icon={HelpCircle} title="No quizzes yet" text={canManage ? 'Multiple-choice quizzes are marked automatically.' : 'Quizzes posted for this course will be listed here.'} /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((q) => (
              <li key={q._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                <div className="min-w-[200px] flex-1"><p className="font-semibold">{q.title}</p><p className="text-sm text-mute">{q.questionCount} questions, {q.durationMin} min{q.closesAt ? `, closes ${fmtDate(q.closesAt)}` : ''}</p></div>
                {canManage ? (
                  <>
                    <span className="chip tnum">{q.attemptCount} attempts</span>
                    <button className="btn btn-soft" onClick={() => setViewing(q)}>Results</button>
                    <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(q)} aria-label={`Delete ${q.title}`}><Trash2 size={16} /></button>
                  </>
                ) : q.attempt ? <Stamp tone="ok">{q.attempt.score}/{q.attempt.total}</Stamp>
                  : <Link className="btn btn-primary" to={`/app/quizzes/${q._id}`}>{child ? 'View' : 'Start quiz'}</Link>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {build && <Builder course={course} onClose={() => setBuild(false)} onSaved={() => { setBuild(false); reload(); onChange?.(); }} />}
      {viewing && <Attempts quiz={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
