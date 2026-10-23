import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, GraduationCap, UserCheck, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import Logo from '../components/Logo';
import { Field, Spinner, cx } from '../components/ui';

const ROLES = [
  { key: 'student', label: 'Student', icon: GraduationCap },
  { key: 'guardian', label: 'Guardian', icon: UserCheck },
  { key: 'teacher', label: 'Teacher', icon: Users },
];

export default function Register() {
  const [role, setRole] = useState('student');
  const [f, setF] = useState({ className: '1st Year', group: 'Science', section: 'A', relation: 'Mother' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/register', { ...f, role });
      setDone(data.message);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <motion.span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}><Check size={30} strokeWidth={3} /></motion.span>
          <h1 className="mt-5 font-display text-3xl font-semibold">You are on the list</h1>
          <p className="mt-2 text-mute">{done}</p>
          <Link to="/login" className="btn btn-primary mt-6">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="inline-block text-ink"><Logo light={false} /></Link>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-mute">The college office reviews every registration. You can sign in once it is approved.</p>

        <form onSubmit={submit} className="panel mt-6 space-y-5 p-6">
          <div role="radiogroup" aria-label="I am a" className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button type="button" key={r.key} role="radio" aria-checked={role === r.key} onClick={() => setRole(r.key)}
                className={cx('relative flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors', role === r.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line text-mute hover:border-brand-300')}>
                <r.icon size={20} />{r.label}
                {role === r.key && <motion.span layoutId="role-ring" className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-brand-600" />}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2"><input className="input" required onChange={set('name')} /></Field>
            <Field label="Email"><input className="input" type="email" required onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Phone (optional)"><input className="input" onChange={set('phone')} inputMode="tel" /></Field>

            {role === 'student' && (
              <>
                <Field label="Student ID" hint="The ID printed on your college card"><input className="input" required placeholder="GFC-25-016" onChange={set('userId')} /></Field>
                <Field label="Roll (optional)"><input className="input" type="number" min="1" onChange={set('roll')} /></Field>
                <Field label="Class"><select className="input" value={f.className} onChange={set('className')}><option>1st Year</option><option>2nd Year</option></select></Field>
                <Field label="Group"><select className="input" value={f.group} onChange={set('group')}><option>Science</option><option>Commerce</option><option>Humanities</option></select></Field>
                <Field label="Section"><select className="input" value={f.section} onChange={set('section')}>{['A', 'B', 'C', 'D'].map((s) => <option key={s}>{s}</option>)}</select></Field>
              </>
            )}
            {role === 'teacher' && (
              <>
                <Field label="Teacher ID (optional)"><input className="input" placeholder="T-1008" onChange={set('userId')} /></Field>
                <Field label="Subject"><input className="input" required placeholder="Physics" onChange={set('subject')} /></Field>
                <Field label="Designation"><input className="input" placeholder="Lecturer" onChange={set('designation')} /></Field>
              </>
            )}
            {role === 'guardian' && (
              <>
                <Field label="Relation"><select className="input" value={f.relation} onChange={set('relation')}>{['Mother', 'Father', 'Guardian'].map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Your child's student ID" hint="The college office links your account to this student"><input className="input" required placeholder="GFC-25-001" onChange={set('childStudentId')} /></Field>
              </>
            )}
            <Field label="Password" hint="At least 6 characters" className="sm:col-span-2"><input className="input" type="password" required minLength={6} onChange={set('password')} autoComplete="new-password" /></Field>
          </div>

          {error && <p className="rounded-lg bg-stamp/10 px-3 py-2 text-sm text-stamp" role="alert">{error}</p>}
          <button className="btn btn-primary w-full !py-2.5" disabled={busy}>{busy && <Spinner />}Send registration</button>
        </form>
        <p className="mt-5 text-center text-sm text-mute">Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
