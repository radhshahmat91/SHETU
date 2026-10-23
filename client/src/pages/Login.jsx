import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import Logo from '../components/Logo';
import { Field, Spinner } from '../components/ui';

const DEMO = [
  { label: 'Student', id: 'GFC-25-001', pw: 'Student@123' },
  { label: 'Teacher', id: 'teacher@greenfield.edu.bd', pw: 'Teacher@123' },
  { label: 'Guardian', id: 'guardian@greenfield.edu.bd', pw: 'Guardian@123' },
  { label: 'Admin', id: 'admin@greenfield.edu.bd', pw: 'Admin@123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ n: 0, text: '' });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(id, pw);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError((s) => ({ n: s.n + 1, text: errorMessage(err) }));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="lattice relative hidden flex-col justify-between overflow-hidden bg-river p-10 text-white lg:flex">
        <Link to="/"><Logo /></Link>
        <div>
          <motion.p className="font-display text-4xl font-semibold leading-tight tracking-tight" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            Welcome back. Your classroom, your child's progress and your notices are waiting.
          </motion.p>
          <p className="mt-4 font-display text-marigold-300">সেতু: শিক্ষা ও পরিবারের সংযোগ</p>
        </div>
        <svg viewBox="0 0 400 90" className="w-full max-w-sm" fill="none" aria-hidden="true">
          <motion.path d="M10 80Q200 -30 390 80" stroke="#f2a900" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3 }} />
          <path d="M0 84h400" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </aside>

      <main className="grid place-items-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block text-ink lg:hidden"><Logo light={false} /></Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-mute">Use your student ID or the email you registered with.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Student ID or email"><input className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" required autoFocus /></Field>
            <Field label="Password">
              <div className="relative">
                <input className="input !pr-10" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-mute hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </Field>
            {error.text && <p key={error.n} className="animate-shake rounded-lg bg-stamp/10 px-3 py-2 text-sm text-stamp" role="alert">{error.text}</p>}
            <button className="btn btn-primary w-full !py-2.5" disabled={busy}>{busy && <Spinner />}Sign in</button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-line p-4">
            <p className="text-sm font-semibold">Trying it out? Fill in a demo account</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map((d) => <button key={d.label} type="button" onClick={() => { setId(d.id); setPw(d.pw); }} className="btn btn-soft !px-3 !py-1.5">{d.label}</button>)}
            </div>
            <p className="mt-2 text-xs text-mute">These exist after you run <code className="rounded bg-sunken px-1">npm run seed</code>.</p>
          </div>
          <p className="mt-6 text-sm text-mute">New to Setu? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></p>
        </div>
      </main>
    </div>
  );
}
