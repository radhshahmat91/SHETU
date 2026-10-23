import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Pencil, Plus, Search, Trash2, Users as UsersIcon, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebounced } from '../../hooks/useDebounced';
import { api, notifyError } from '../../lib/api';
import { Avatar, Badge, Empty, Field, LoadError, Modal, PageHeader, Panel, Segmented, Skeleton, Spinner, Stamp, Tabs } from '../../components/ui';
import { fmtDate, roleLabel } from '../../lib/format';

const STATUS = { pending: ['warn', 'Pending'], active: ['ok', 'Active'], rejected: ['bad', 'Declined'], suspended: ['mute', 'Suspended'] };
const ROLE_TONE = { student: 'info', teacher: 'ok', guardian: 'warn', admin: 'mute' };

function UserForm({ user, onClose, onSaved }) {
  const editing = !!user?._id;
  const [f, setF] = useState(() => ({
    role: 'student', name: '', email: '', password: '', userId: '', phone: '', className: '1st Year', group: 'Science', section: 'A', roll: '', subject: '', designation: '', relation: 'Mother',
    ctClass: user?.classTeacherOf?.className || '', ctGroup: user?.classTeacherOf?.group || '', ctSection: user?.classTeacherOf?.section || '',
    childIds: (user?.children || []).map((c) => c.userId).filter(Boolean).join(', '),
    ...user,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name, email: f.email, phone: f.phone, userId: f.userId, role: f.role };
      if (f.password) body.password = f.password;
      if (f.role === 'student') Object.assign(body, { className: f.className, group: f.group, section: f.section, roll: f.roll });
      if (f.role === 'teacher') Object.assign(body, { subject: f.subject, designation: f.designation, classTeacherOf: f.ctSection ? { className: f.ctClass, group: f.ctGroup, section: f.ctSection } : {} });
      if (f.role === 'guardian') Object.assign(body, { relation: f.relation, childStudentIds: f.childIds.split(',').map((s) => s.trim()).filter(Boolean) });
      if (editing) await api.put(`/admin/users/${user._id}`, body); else await api.post('/admin/users', body);
      toast.success(editing ? 'User updated' : 'Account created');
      onSaved();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${user.name}` : 'Add a user'} wide
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !f.name || !f.email || (!editing && !f.password)}>{busy && <Spinner />}{editing ? 'Save changes' : 'Create account'}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!editing && <Field label="Role" className="sm:col-span-2"><Segmented id="urole" value={f.role} onChange={(v) => setF({ ...f, role: v })} options={['student', 'teacher', 'guardian', 'admin'].map((r) => ({ value: r, label: roleLabel[r] }))} /></Field>}
        <Field label="Full name"><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label={editing ? 'New password (leave blank to keep)' : 'Password'}><input className="input" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        {(f.role === 'student' || f.role === 'teacher') && <Field label={f.role === 'student' ? 'Student ID' : 'Teacher ID'}><input className="input" value={f.userId || ''} onChange={set('userId')} /></Field>}
        {f.role === 'student' && (
          <>
            <Field label="Roll"><input className="input" type="number" value={f.roll || ''} onChange={set('roll')} /></Field>
            <Field label="Class"><select className="input" value={f.className} onChange={set('className')}><option>1st Year</option><option>2nd Year</option></select></Field>
            <Field label="Group"><select className="input" value={f.group} onChange={set('group')}><option>Science</option><option>Commerce</option><option>Humanities</option></select></Field>
            <Field label="Section"><input className="input" value={f.section} onChange={set('section')} /></Field>
          </>
        )}
        {f.role === 'teacher' && (
          <>
            <Field label="Subject"><input className="input" value={f.subject || ''} onChange={set('subject')} /></Field>
            <Field label="Designation"><input className="input" value={f.designation || ''} onChange={set('designation')} /></Field>
            <div className="sm:col-span-2"><span className="label">Class teacher of (optional)</span>
              <div className="grid grid-cols-3 gap-2">
                <select className="input" value={f.ctClass} onChange={set('ctClass')}><option value="">Class</option><option>1st Year</option><option>2nd Year</option></select>
                <select className="input" value={f.ctGroup} onChange={set('ctGroup')}><option value="">Group</option><option>Science</option><option>Commerce</option><option>Humanities</option></select>
                <input className="input" placeholder="Section" value={f.ctSection} onChange={set('ctSection')} />
              </div><p className="mt-1 text-xs text-mute">Class teachers receive and decide leave requests for their section.</p></div>
          </>
        )}
        {f.role === 'guardian' && (
          <>
            <Field label="Relation"><select className="input" value={f.relation || 'Mother'} onChange={set('relation')}><option>Mother</option><option>Father</option><option>Guardian</option></select></Field>
            <Field label="Children's student IDs" hint="Separate several with commas"><input className="input" value={f.childIds} onChange={set('childIds')} placeholder="GFC-25-001" /></Field>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function Users() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const dq = useDebounced(q);
  const [tab, setTab] = useState('pending');
  const [role, setRole] = useState('');
  const { data, loading, error, reload } = useFetch('/admin/users', { params: { status: tab === 'pending' ? 'pending' : undefined, role: role || undefined, q: dq || undefined } });
  const pendingCount = useFetch('/admin/users', { params: { status: 'pending' } }).data?.items.length;
  const [edit, setEdit] = useState(null);

  const setStatus = async (u, status) => {
    try {
      const { data: r } = await api.put(`/admin/users/${u._id}/status`, { status });
      toast.success(status === 'active' ? `${u.name} is active${r.linked ? ` and linked to ${r.linked}` : ''}` : `${u.name} is now ${status}`);
      reload();
    } catch (e) { notifyError(e); }
  };
  const remove = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${u._id}`); toast.success('User deleted'); reload(); } catch (e) { notifyError(e); }
  };
  const detail = (u) => u.role === 'student' ? `${u.className}, ${u.group}, Section ${u.section}, Roll ${u.roll ?? '-'}` : u.role === 'teacher' ? `${u.subject || 'Teacher'}${u.classTeacherOf?.section ? `, class teacher of ${u.classTeacherOf.className} ${u.classTeacherOf.section}` : ''}`
    : u.role === 'guardian' ? (u.children?.length ? `Parent of ${u.children.map((c) => c.name).join(', ')}` : u.childStudentId ? `Asked to be linked to ${u.childStudentId}` : 'No child linked') : 'Administrator';

  return (
    <>
      <PageHeader title="Users and approvals" subtitle="Approve registrations, link guardians to their children, and manage every account.">
        <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={16} />Add user</button>
      </PageHeader>
      <Tabs id="users" value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'Waiting for approval', count: pendingCount }, { value: 'all', label: 'Everyone' }]} />
      <div className="my-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" /><input className="input !pl-9" placeholder="Search name, email or ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmented id="urolef" value={role} onChange={setRole} options={[{ value: '', label: 'All' }, { value: 'student', label: 'Students' }, { value: 'teacher', label: 'Teachers' }, { value: 'guardian', label: 'Guardians' }]} />
      </div>
      {error ? <LoadError error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-60" /> : data.items.length === 0 ? (
        <Panel><Empty icon={UsersIcon} title={tab === 'pending' ? 'No registrations waiting' : 'No users match'} text="Try clearing the search or the role filter." /></Panel>
      ) : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((u) => (
              <li key={u._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <Avatar name={u.name} size={40} />
                <div className="min-w-[220px] flex-1">
                  <p className="font-semibold">{u.name} <Badge tone={ROLE_TONE[u.role]} className="ml-1 align-middle">{roleLabel[u.role]}</Badge></p>
                  <p className="text-sm text-mute">{u.email}{u.userId ? `, ${u.userId}` : ''}</p>
                  <p className="text-sm text-mute">{detail(u)}, joined {fmtDate(u.createdAt)}</p>
                </div>
                <Stamp tone={STATUS[u.status][0]} animate={false}>{STATUS[u.status][1]}</Stamp>
                <div className="flex items-center gap-1.5">
                  {u.status === 'pending' && (<><button className="btn btn-primary !py-1.5" onClick={() => setStatus(u, 'active')}><Check size={15} />Approve</button><button className="btn btn-danger !py-1.5" onClick={() => setStatus(u, 'rejected')}><X size={15} />Decline</button></>)}
                  {u.status === 'active' && u.role !== 'admin' && <button className="btn btn-ghost !py-1.5" onClick={() => setStatus(u, 'suspended')}>Suspend</button>}
                  {['rejected', 'suspended'].includes(u.status) && <button className="btn btn-soft !py-1.5" onClick={() => setStatus(u, 'active')}>Reactivate</button>}
                  <button className="btn btn-ghost !p-2" onClick={() => setEdit(u)} aria-label={`Edit ${u.name}`}><Pencil size={16} /></button>
                  <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {edit && <UserForm user={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}
