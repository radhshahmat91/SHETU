import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, notifyError, toForm } from '../lib/api';
import { Field, FileInput, Modal, Spinner } from './ui';

// Student hands in an assignment: a file, a link, a written answer, or any mix (FR: submit assignment)
export default function SubmitModal({ assignment, onClose, onDone }) {
  const [f, setF] = useState({ text: '', link: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/assignments/${assignment._id}/submit`, toForm({ ...f, file }));
      toast.success('Submitted. Your teacher has been told.');
      onDone?.();
      onClose();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!assignment} onClose={onClose} title={assignment ? `Submit: ${assignment.title}` : ''}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy || (!file && !f.text.trim() && !f.link.trim())}>{busy && <Spinner />}Hand in</button></>}>
      {assignment?.description && <p className="mb-4 rounded-lg bg-sunken p-3 text-sm text-mute">{assignment.description}</p>}
      <div className="space-y-4">
        <Field label="File (photo, PDF or document)"><FileInput file={file} onChange={setFile} /></Field>
        <Field label="Link (optional)"><input className="input" placeholder="https://drive.google.com/..." value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field>
        <Field label="Written answer (optional)"><textarea className="input min-h-[96px]" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>
      </div>
      {assignment?.submission && <p className="mt-3 text-xs text-mute">You already handed this in. Submitting again replaces your earlier work until it is graded.</p>}
    </Modal>
  );
}
