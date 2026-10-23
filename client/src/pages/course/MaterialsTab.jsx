import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, ExternalLink, FileText, Link2, Plus, Trash2, Video } from 'lucide-react';
import { useChild } from '../../context/ChildContext';
import { useFetch } from '../../hooks/useFetch';
import { api, downloadFile, notifyError, toForm } from '../../lib/api';
import { Empty, Field, FileInput, LoadError, Modal, Panel, Skeleton, Spinner } from '../../components/ui';
import { fmtDate, sizeLabel } from '../../lib/format';

const ICON = { link: Link2, video: Video };

export default function MaterialsTab({ course, canManage, onChange }) {
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/materials`, { params: { child } });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', description: '', kind: 'document', url: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await api.post(`/courses/${course._id}/materials`, toForm({ ...f, file }));
      toast.success('Material shared with the class');
      setOpen(false); setF({ title: '', description: '', kind: 'document', url: '' }); setFile(null);
      reload(); onChange?.();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Remove "${m.title}"?`)) return;
    try { await api.delete(`/materials/${m._id}`); reload(); onChange?.(); } catch (e) { notifyError(e); }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;
  return (
    <>
      {canManage && <div className="mb-4 flex justify-end"><button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add material</button></div>}
      {loading ? <Skeleton className="h-40 w-full" /> : data.items.length === 0 ? (
        <Panel><Empty icon={FileText} title="No materials yet" text={canManage ? 'Share notes, slides or links and your students are notified.' : 'Your teacher has not shared anything yet. You will be notified when they do.'} /></Panel>
      ) : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((m) => {
              const Icon = ICON[m.kind] || FileText;
              return (
                <li key={m._id} className="flex items-center gap-4 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.title}</p>
                    <p className="truncate text-sm text-mute">{m.description || (m.file ? m.file.originalName : m.url)}</p>
                    <p className="text-xs text-mute">{m.uploadedBy?.name}, {fmtDate(m.createdAt)}{m.file ? `, ${sizeLabel(m.file.size)}` : ''}</p>
                  </div>
                  {m.file ? <button className="btn btn-soft" onClick={() => downloadFile(m.file)}><Download size={16} />Download</button>
                    : <a className="btn btn-soft" href={m.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Open</a>}
                  {canManage && <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(m)} aria-label={`Remove ${m.title}`}><Trash2 size={16} /></button>}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add class material"
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={add} disabled={busy || !f.title.trim() || (!file && !f.url.trim())}>{busy && <Spinner />}Share with class</button></>}>
        <div className="space-y-4">
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Chapter 3 slides" /></Field>
          <Field label="Short description (optional)"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="document">Document</option><option value="slide">Slides</option><option value="note">Notes</option><option value="video">Video</option><option value="link">Link</option></select></Field>
          <Field label="File"><FileInput file={file} onChange={setFile} /></Field>
          <Field label="Or paste a link"><input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
        </div>
      </Modal>
    </>
  );
}
