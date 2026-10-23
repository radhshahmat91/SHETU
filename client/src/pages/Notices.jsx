import { useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Pencil, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useDebounced } from '../hooks/useDebounced';
import { api, notifyError } from '../lib/api';
import { Avatar, Empty, Field, LoadError, Modal, PageHeader, Panel, Skeleton, Spinner, Stamp, Tabs, cx } from '../components/ui';
import { fmtDate } from '../lib/format';

const CATS = ['General', 'Academic', 'Exam', 'Event', 'Fees', 'Holiday'];
const EDGE = { urgent: 'border-l-stamp', important: 'border-l-marigold-500', normal: 'border-l-brand-300' };

function Composer({ notice, onClose, onSaved }) {
  const { user } = useAuth();
  const { data: courses } = useFetch('/courses', { enabled: user.role === 'teacher' });
  const editing = !!notice?._id;
  const [f, setF] = useState({ title: '', body: '', category: 'General', priority: 'normal', pinned: false, audience: ['student', 'teacher', 'guardian'], course: '', emailAlert: false, ...notice });
  const [busy, setBusy] = useState(false);
  const toggle = (r) => setF((s) => ({ ...s, audience: s.audience.includes(r) ? s.audience.filter((x) => x !== r) : [...s.audience, r] }));
  const emailOn = f.emailAlert || f.priority !== 'normal';

  const save = async () => {
    setBusy(true);
    try {
      if (editing) { await api.put(`/notices/${notice._id}`, f); toast.success('Notice updated'); } else {
        const { data } = await api.post('/notices', { ...f, emailAlert: f.priority === 'normal' ? f.emailAlert : undefined });
        toast.success(`Notice sent to ${data.recipients} ${data.recipients === 1 ? 'person' : 'people'}`);
      }
      onSaved();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={editing ? 'Edit notice' : 'New notice'} wide
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !f.title.trim() || !f.body.trim() || (!editing && user.role === 'teacher' && !f.course)}>{busy && <Spinner />}{editing ? 'Save changes' : 'Publish notice'}</button></>}>
      <div className="space-y-4">
        <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Message"><textarea className="input min-h-[120px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></Field>
        </div>
        {!editing && user.role === 'admin' && (
          <div><span className="label">Send to</span><div className="flex flex-wrap gap-2">{[['student', 'Students'], ['teacher', 'Teachers'], ['guardian', 'Guardians']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => toggle(k)} aria-pressed={f.audience.includes(k)} className={cx('rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors', f.audience.includes(k) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-mute')}>{l}</button>))}</div></div>
        )}
        {!editing && user.role === 'teacher' && (
          <Field label="For which course?" hint="Students of that course and their guardians are notified."><select className="input" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })}><option value="">Choose a course</option>{(courses?.items || []).map((c) => <option key={c._id} value={c._id}>{c.code}, {c.title}</option>)}</select></Field>
        )}
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#006a4e]" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />Pin to the top</label>
          {!editing && <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#006a4e]" checked={emailOn} disabled={f.priority !== 'normal'} onChange={(e) => setF({ ...f, emailAlert: e.target.checked })} />Also email everyone{f.priority !== 'normal' ? ' (always on for important notices)' : ''}</label>}
        </div>
      </div>
    </Modal>
  );
}

export default function Notices() {
  const { user } = useAuth();
  const canPost = ['admin', 'teacher'].includes(user.role);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, reload } = useFetch('/notices', { params: { source: tab === 'all' ? undefined : tab, q: dq || undefined } });
  const [edit, setEdit] = useState(null);

  const remove = async (n) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    try { await api.delete(`/notices/${n._id}`); toast.success('Notice deleted'); reload(); } catch (e) { notifyError(e); }
  };
  const mine = (n) => user.role === 'admin' || n.postedBy?._id === user._id;

  return (
    <>
      <PageHeader title="Notice board" subtitle={canPost ? 'Publish a notice and the right people are told in the app and by email.' : 'Everything your college and teachers have pinned for you.'}>
        {canPost && <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={16} />New notice</button>}
      </PageHeader>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[260px] flex-1"><Tabs id="notice" value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All' }, { value: 'admin', label: 'College' }, { value: 'teacher', label: 'Teachers' }]} /></div>
        <div className="relative w-full sm:w-64"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" /><input className="input !pl-9" placeholder="Search notices" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notices" /></div>
      </div>
      {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-60" /> : data.items.length === 0 ? (
        <Panel><Empty icon={Megaphone} title="Nothing on the board" text={canPost ? 'Post the first notice to get things moving.' : 'New notices will be pinned here.'} /></Panel>
      ) : (
        <div className="space-y-3">
          {data.items.map((n) => (
            <article key={n._id} className={cx('panel border-l-4 p-5', EDGE[n.priority])}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.pinned && <Pin size={15} className="text-marigold-600" aria-label="Pinned" />}
                    <h2 className="font-display text-lg font-semibold leading-snug">{n.title}</h2>
                    {n.priority !== 'normal' && <Stamp tone={n.priority === 'urgent' ? 'bad' : 'warn'} animate={false}>{n.priority}</Stamp>}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-mute">
                    <Avatar name={n.postedBy?.name || 'College'} size={22} />
                    <span>{n.source === 'admin' ? 'College office' : n.postedBy?.name}</span>
                    {n.course && <span className="chip">{n.course.code}</span>}
                    <span className="chip">{n.category}</span>
                    <span>{fmtDate(n.createdAt)}</span>
                  </div>
                </div>
                {canPost && mine(n) && (
                  <div className="flex gap-1">
                    <button className="btn btn-ghost !p-2" onClick={() => setEdit(n)} aria-label="Edit notice"><Pencil size={16} /></button>
                    <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(n)} aria-label="Delete notice"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && <Composer notice={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}
