import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api, notifyError } from '../lib/api';
import { Avatar, Field, PageHeader, Panel, Spinner } from '../components/ui';
import { fmtDate, roleLabel } from '../lib/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try { const { data } = await api.put('/auth/profile', f); setUser(data.user); toast.success('Profile updated'); } catch (err) { notifyError(err); } finally { setBusy(''); }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('pw');
    try { await api.put('/auth/password', pw); toast.success('Password changed'); setPw({ current: '', next: '' }); } catch (err) { notifyError(err); } finally { setBusy(''); }
  };

  const facts = [
    ['Role', roleLabel[user.role]], ['Email', user.email], user.userId && ['ID', user.userId],
    user.role === 'student' && ['Class', `${user.className}, ${user.group}, Section ${user.section}, Roll ${user.roll}`],
    user.role === 'teacher' && ['Subject', `${user.subject || '-'}${user.designation ? `, ${user.designation}` : ''}`],
    user.role === 'teacher' && user.classTeacherOf?.section && ['Class teacher of', `${user.classTeacherOf.className}, ${user.classTeacherOf.group}, Section ${user.classTeacherOf.section}`],
    user.role === 'guardian' && ['Linked children', user.children?.length ? user.children.map((c) => `${c.name} (${c.userId})`).join(', ') : 'None yet'],
    ['Member since', fmtDate(user.createdAt)],
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Your profile" />
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="mb-5 flex items-center gap-4"><Avatar name={user.name} size={64} /><div><p className="font-display text-2xl font-semibold leading-tight">{user.name}</p><p className="text-mute">{roleLabel[user.role]}</p></div></div>
          <dl className="space-y-2.5 text-sm">{facts.map(([k, v]) => <div key={k} className="flex gap-4"><dt className="w-32 shrink-0 text-mute">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
          <p className="mt-5 text-xs text-mute">Class, ID and linked children are managed by the college office. Ask them if something is wrong.</p>
        </Panel>
        <div className="space-y-5">
          <Panel title="Contact details">
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Full name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
              <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
              <button className="btn btn-primary" disabled={busy === 'profile'}>{busy === 'profile' && <Spinner />}Save changes</button>
            </form>
          </Panel>
          <Panel title="Change password">
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Current password"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></Field>
              <Field label="New password" hint="At least 6 characters"><input className="input" type="password" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required /></Field>
              <button className="btn btn-primary" disabled={busy === 'pw'}>{busy === 'pw' && <Spinner />}Update password</button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
