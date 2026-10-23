import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, ExternalLink, Plus, Trash2, ClipboardList } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api, downloadFile, notifyError, toForm } from '../../lib/api';
import { Avatar, Empty, Field, FileInput, LoadError, Modal, Panel, Skeleton, Spinner, Stamp } from '../../components/ui';
import SubmitModal from '../../components/SubmitModal';
import { fmtDateTime, isoPlus } from '../../lib/format';

export const assignmentStatus = (a) => {
  const s = a.submission;
  if (s?.status === 'graded') return { tone: 'ok', text: `Graded ${s.marks}/${a.maxMarks}` };
  if (s) return s.late ? { tone: 'warn', text: 'Late' } : { tone: 'info', text: 'Submitted' };
  return new Date(a.dueDate) < new Date() ? { tone: 'bad', text: 'Overdue' } : { tone: 'mute', text: 'To do' };
};

function Submissions({ assignment, onClose }) {
  const { data, loading, reload } = useFetch(`/assignments/${assignment._id}/submissions`);
  const [grades, setGrades] = useState({});
  const val = (id, k, fallback = '') => grades[id]?.[k] ?? fallback;
  const save = async (row) => {
    const g = grades[row.submission._id] || {};
    try {
      await api.put(`/submissions/${row.submission._id}/grade`, { marks: g.marks ?? row.submission.marks, feedback: g.feedback ?? row.submission.feedback });
      toast.success(`Graded ${row.student.name}`); reload();
    } catch (e) { notifyError(e); }
  };
  return (
    <Modal open onClose={onClose} title={`Submissions: ${assignment.title}`} wide>
      {loading ? <Skeleton className="h-40" /> : (
        <ul className="divide-y divide-line">
          {data.items.map((row) => {
            const s = row.submission;
            return (
              <li key={row.student._id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={row.student.name} size={34} />
                <div className="min-w-[150px] flex-1"><p className="font-semibold">{row.student.name}</p><p className="text-xs text-mute">Roll {row.student.roll}{s ? `, ${fmtDateTime(s.updatedAt)}` : ''}</p></div>
                {!s ? <Stamp tone="mute" animate={false}>Not submitted</Stamp> : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      {s.file && <button className="btn btn-soft !py-1" onClick={() => downloadFile(s.file)}><Download size={14} />File</button>}
                      {s.link && <a className="btn btn-soft !py-1" href={s.link} target="_blank" rel="noreferrer"><ExternalLink size={14} />Link</a>}
                      {s.late && <Stamp tone="warn" animate={false}>Late</Stamp>}
                    </div>
                    <input className="input !w-20" type="number" min="0" max={assignment.maxMarks} placeholder={`/${assignment.maxMarks}`} value={val(s._id, 'marks', s.marks ?? '')} onChange={(e) => setGrades({ ...grades, [s._id]: { ...grades[s._id], marks: e.target.value } })} aria-label={`Marks for ${row.student.name}`} />
                    <input className="input !w-52" placeholder="Feedback" value={val(s._id, 'feedback', s.feedback || '')} onChange={(e) => setGrades({ ...grades, [s._id]: { ...grades[s._id], feedback: e.target.value } })} aria-label="Feedback" />
                    <button className="btn btn-primary !py-1.5" onClick={() => save(row)}>{s.status === 'graded' ? 'Update' : 'Grade'}</button>
                    {s.text && <p className="w-full rounded-lg bg-sunken px-3 py-2 text-sm text-mute">{s.text}</p>}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export default function AssignmentsTab({ course, canManage, child, onChange }) {
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/assignments`, { params: { child } });
  const [create, setCreate] = useState(false);
  const [f, setF] = useState({ title: '', description: '', dueDate: `${isoPlus(7)}T23:59`, maxMarks: 10 });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const add = async () => {
    setBusy(true);
    try {
      await api.post(`/courses/${course._id}/assignments`, toForm({ ...f, file }));
      toast.success('Assignment posted and students notified');
      setCreate(false); setFile(null); reload(); onChange?.();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}" and all its submissions?`)) return;
    try { await api.delete(`/assignments/${a._id}`); reload(); onChange?.(); } catch (e) { notifyError(e); }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;
  const guardian = !canManage && !!child;
  return (
    <>
      {canManage && <div className="mb-4 flex justify-end"><button className="btn btn-primary" onClick={() => setCreate(true)}><Plus size={16} />New assignment</button></div>}
      {loading ? <Skeleton className="h-40" /> : data.items.length === 0 ? <Panel><Empty icon={ClipboardList} title="No assignments yet" text="Posted assignments show up here with their due dates." /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((a) => {
              const st = assignmentStatus(a);
              return (
                <li key={a._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-mute">Due {fmtDateTime(a.dueDate)}, {a.maxMarks} marks</p>
                    {a.description && <p className="mt-0.5 line-clamp-2 text-sm text-mute">{a.description}</p>}
                    {a.submission?.feedback && <p className="mt-1 border-l-2 border-marigold-500 pl-2 text-sm">{a.submission.feedback}</p>}
                  </div>
                  {a.attachment && <button className="btn btn-soft !py-1" onClick={() => downloadFile(a.attachment)}><Download size={14} />Brief</button>}
                  {canManage ? (
                    <>
                      <span className="chip tnum">{a.submissionCount} submitted, {a.gradedCount} graded</span>
                      <button className="btn btn-soft" onClick={() => setViewing(a)}>Submissions</button>
                      <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(a)} aria-label={`Delete ${a.title}`}><Trash2 size={16} /></button>
                    </>
                  ) : (
                    <>
                      <Stamp tone={st.tone}>{st.text}</Stamp>
                      {!guardian && a.submission?.status !== 'graded' && <button className="btn btn-primary" onClick={() => setSubmitting(a)}>{a.submission ? 'Resubmit' : 'Submit'}</button>}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <SubmitModal assignment={submitting} onClose={() => setSubmitting(null)} onDone={reload} />
      {viewing && <Submissions assignment={viewing} onClose={() => { setViewing(null); reload(); }} />}
      <Modal open={create} onClose={() => setCreate(false)} title="New assignment"
        footer={<><button className="btn btn-ghost" onClick={() => setCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={add} disabled={busy || !f.title.trim() || !f.dueDate}>{busy && <Spinner />}Post assignment</button></>}>
        <div className="space-y-4">
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Instructions"><textarea className="input min-h-[90px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due"><input className="input" type="datetime-local" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
            <Field label="Total marks"><input className="input" type="number" min="1" value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></Field>
          </div>
          <Field label="Attachment (optional)"><FileInput file={file} onChange={setFile} /></Field>
        </div>
      </Modal>
    </>
  );
}
