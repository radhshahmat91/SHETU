import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { GraduationCap, Users, UserCheck, ShieldCheck, Check } from 'lucide-react';
import Logo from '../components/Logo';
import BridgeHero from '../components/landing/BridgeHero';
import { CountUp, cx } from '../components/ui';

const SURVEY = [
  { value: 95, suffix: '%', text: 'of students said class-material upload is the feature that would help them most.' },
  { value: 63.2, suffix: '%', decimals: 1, text: 'of guardians have no access to their child\'s college portal today.' },
  { value: 90, suffix: '%', text: 'of students want an online portal for their college.' },
  { value: 100, suffix: '%', text: 'of guardians said portal access would be helpful and save them time.' },
];

const ROLES = [
  { key: 'student', label: 'Students', icon: GraduationCap, lead: 'Everything for class, on any phone.',
    points: ['Download class materials and search across every subject', 'Submit assignments and take quizzes online', 'Apply for leave and see the decision the same day', 'Check results, attendance and fees whenever you like'],
    story: [['8:42 am', 'Marked present in Physics'], ['11:10 am', 'Mid Term result published, with feedback from your teacher'], ['2:05 pm', 'Your leave request was approved']] },
  { key: 'teacher', label: 'Teachers', icon: Users, lead: 'Less paperwork, more teaching.',
    points: ['Upload notes, slides and links for each class', 'Take attendance in one tap, with approved leave already filled in', 'Grade assignments and publish marks with feedback', 'Post notices and run quizzes that mark themselves'],
    story: [['9:00 am', 'Attendance saved for Physics, Section A'], ['12:40 pm', '9 new assignment submissions to review'], ['2:05 pm', 'One leave request waiting for your decision']] },
  { key: 'guardian', label: 'Guardians', icon: UserCheck, lead: 'Know how your child is doing without waiting for a meeting.',
    points: ['See results, teacher feedback and attendance', 'Get an email when your child applies for leave or is marked absent', 'Message your child\'s teachers directly', 'Check fee dates and pay from your phone'],
    story: [['8:42 am', 'Ayaan was marked present in Physics'], ['11:10 am', 'Mid Term: 41 out of 50, with a note from Ms Karim'], ['2:05 pm', 'Leave request approved. You were emailed too']] },
  { key: 'admin', label: 'College office', icon: ShieldCheck, lead: 'Run the college from one dashboard.',
    points: ['Approve registrations and link guardians to students', 'Publish notices to students, teachers and guardians at once', 'Monitor attendance and alert guardians when it drops', 'Create fees and keep an eye on system health'],
    story: [['8:30 am', '2 registrations waiting for approval'], ['10:15 am', 'Half-yearly routine sent to 36 people'], ['1:00 pm', 'Attendance dipped below 75% for one student']] },
];

const FLOW = [
  ['The student applies', 'Pick the dates, write the reason, send. No paper and no queue outside the office.'],
  ['The guardian is told', 'An email and an in-app alert go out straight away.'],
  ['The class teacher decides', 'Approve or decline, with a short note if needed.'],
  ['Everyone sees the answer', 'Student and guardian are emailed, and approved days are excused in attendance.'],
];

function Survey() {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section className="mx-auto max-w-6xl px-6 py-20" ref={ref}>
      <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Colleges had portals. Guardians and students were not in them.</h2>
      <p className="mt-3 max-w-2xl text-mute">We surveyed 20 college students and 19 guardians and benchmarked ten portals. The gaps were clear, so they became the feature list.</p>
      <div className="mt-10 grid divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {SURVEY.map((s) => (
          <div key={s.text} className="px-0 py-6 sm:px-6 first:pl-0">
            <p className="font-display text-6xl font-semibold tracking-tight text-brand-700 tnum"><CountUp value={seen ? s.value : 0} decimals={s.decimals || 0} suffix={s.suffix} /></p>
            <p className="mt-2 text-sm text-mute">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-3 text-sm md:grid-cols-3">
        {[['No guardian access', 'Guardians get their own sign-in, linked to their child by the college office.'], ['No notification system', 'Every notice, leave decision and result reaches people in the app and by email.'], ['Weak security', 'Hashed passwords, signed sessions, role-based access and admin approval of every account.']].map(([a, b]) => (
          <div key={a} className="rounded-lg bg-sunken px-4 py-3"><p className="font-semibold">{a}</p><p className="mt-0.5 text-mute">{b}</p></div>
        ))}
      </div>
    </section>
  );
}

function Roles() {
  const [key, setKey] = useState('guardian');
  const role = ROLES.find((r) => r.key === key);
  return (
    <section className="bg-sunken/70 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">One portal, four points of view.</h2>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {ROLES.map((r) => (
            <button key={r.key} role="tab" aria-selected={key === r.key} onClick={() => setKey(r.key)}
              className={cx('relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors', key === r.key ? 'text-white' : 'bg-surface text-mute hover:text-ink')}>
              {key === r.key && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <r.icon size={16} className="relative" /><span className="relative">{r.label}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="font-display text-2xl font-medium">{role.lead}</p>
              <ul className="mt-5 space-y-3">
                {role.points.map((p) => (
                  <li key={p} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} strokeWidth={3} /></span>{p}</li>
                ))}
              </ul>
            </div>
            <div className="ruled rounded-xl border border-line bg-surface p-5">
              <p className="mb-2 font-display text-sm font-semibold text-mute">A morning in Setu</p>
              {role.story.map(([t, s]) => (
                <div key={t} className="flex gap-4" style={{ minHeight: 36 }}>
                  <span className="w-16 shrink-0 pt-1.5 text-sm font-semibold text-brand-700 tnum">{t}</span>
                  <span className="pt-1.5 leading-snug">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function LeaveFlow() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_.8fr]">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">A leave request, start to finish.</h2>
        <p className="mt-3 max-w-xl text-mute">The flow from the project report, built end to end: nobody has to chase anybody.</p>
        <ol className="relative mt-10 space-y-8 pl-12">
          <motion.span className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-0.5 origin-top bg-brand-300" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
          {FLOW.map(([title, text], i) => (
            <motion.li key={title} className="relative" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.18, duration: 0.45 }}>
              <span className="absolute -left-12 grid h-8 w-8 place-items-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">{i + 1}</span>
              <p className="font-display text-lg font-semibold">{title}</p>
              <p className="text-mute">{text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="grid place-items-center">
        <div className="relative w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-pop">
          <p className="text-xs text-mute">Leave request</p>
          <p className="mt-1 font-display text-xl font-semibold">Ayaan Rahman</p>
          <p className="text-sm text-mute">2 days from Sat 11 Oct. Sessional fever, doctor advised rest.</p>
          <div className="mt-5 rounded-lg bg-sunken p-3 text-sm"><span className="font-semibold">Ms Karim:</span> Get well soon. Please collect the notes from the portal.</div>
          <motion.span className="absolute -right-3 -top-4 inline-block rounded border-[3px] border-brand-700 bg-surface px-3 py-1 font-display text-xl font-bold uppercase tracking-wider text-brand-700"
            initial={{ scale: 2.2, opacity: 0, rotate: -18 }} whileInView={{ scale: 1, opacity: 1, rotate: -8 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: 1.2, type: 'spring', stiffness: 460, damping: 20 }}>
            Approved
          </motion.span>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-canvas text-ink">
      <section className="lattice relative isolate overflow-hidden bg-river text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_78%_32%,rgba(242,169,0,0.16),transparent_70%)]" />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn text-white/85 hover:bg-white/10">Sign in</Link>
            <Link to="/register" className="btn btn-gold">Create account</Link>
          </nav>
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-14">
          <div>
            <motion.h1 className="font-display text-[44px] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[70px]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              The bridge between classroom and home.
            </motion.h1>
            <motion.p className="mt-5 font-display text-lg text-marigold-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>শিক্ষক, শিক্ষার্থী ও অভিভাবকের মাঝে একটি সেতু</motion.p>
            <motion.p className="mt-5 max-w-lg text-lg text-white/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
              Notices, attendance, results, leave and fees in one place. Guardians see what teachers see, and everyone is told the moment something changes.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <Link to="/register" className="btn btn-gold !px-6 !py-3 text-base">Create an account</Link>
              <Link to="/login" className="btn !px-6 !py-3 text-base text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">Try a demo sign-in</Link>
            </motion.div>
          </div>
          <BridgeHero />
        </div>
      </section>
      <Survey />
      <Roles />
      <LeaveFlow />
      <section className="px-6 pb-20">
        <div className="lattice relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-river px-8 py-14 text-center text-white">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">Bring your whole college onto one page.</h2>
          <p className="mx-auto mt-3 max-w-md text-white/70">Registration is free for students, teachers and guardians. The college office approves each account.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn btn-gold !px-6 !py-3">Create an account</Link>
            <Link to="/login" className="btn !px-6 !py-3 text-white ring-1 ring-inset ring-white/30 hover:bg-white/10">Sign in</Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-line px-6 py-8 text-sm text-mute">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span className="text-ink"><Logo light={false} /></span>
          <p>Setu means bridge in Bangla. Built from the final-year design project "An Efficient Student Portal Development for College Level Students of Bangladesh".</p>
        </div>
      </footer>
    </div>
  );
}
