import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { api, notifyError } from '../lib/api';
import { Bar, LoadError, PageSkeleton, Panel, Spinner, Stamp, cx } from '../components/ui';

function Review({ questions, answers, correct }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Panel key={i}>
          <p className="font-display font-semibold">{i + 1}. {q.text}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((o, k) => (
              <div key={k} className={cx('flex items-center justify-between rounded-lg border px-3 py-2 text-sm', k === correct?.[i] ? 'border-brand-600 bg-brand-50 font-semibold' : k === answers?.[i] ? 'border-stamp bg-stamp/5' : 'border-line')}>
                <span>{o}</span>
                {k === correct?.[i] && <span className="text-xs text-brand-700">Correct answer</span>}
                {k === answers?.[i] && k !== correct?.[i] && <span className="text-xs text-stamp">Your answer</span>}
                {k === answers?.[i] && k === correct?.[i] && <span className="text-xs text-brand-700">Your answer</span>}
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

export default function QuizPlayer() {
  const { id } = useParams();
  const { user } = useAuth();
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch(`/quizzes/${id}`, { params: { child } });
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  const submit = async () => {
    if (busy || result) return;
    setBusy(true);
    try {
      const { data: r } = await api.post(`/quizzes/${id}/attempt`, { answers: data.quiz.questions.map((_, i) => (Number.isInteger(answers[i]) ? answers[i] : -1)) });
      setResult(r);
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!started || result) return undefined;
    if (left <= 0) { if (!autoTried.current) { autoTried.current = true; submit(); } return undefined; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }); // runs each tick on purpose: the countdown re-arms itself and always sees the latest answers

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const { quiz, attempt, canTake, closed } = data;
  const qs = quiz.questions;
  const back = <Link to="/app/quizzes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-mute hover:text-ink"><ChevronLeft size={16} />All quizzes</Link>;

  const done = result?.attempt || attempt;
  if (done) {
    const correct = result ? result.correct : qs.map((q) => q.correctIndex);
    return (
      <>
        {back}
        <div className="mb-6 flex flex-wrap items-center gap-5">
          <div><h1 className="font-display text-3xl font-semibold">{quiz.title}</h1><p className="text-mute">{quiz.course?.title}</p></div>
          <motion.div className="ml-auto" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <p className="font-display text-5xl font-semibold tnum">{done.score}<span className="text-2xl text-mute">/{done.total}</span></p>
          </motion.div>
        </div>
        <Review questions={qs} answers={done.answers} correct={correct} />
      </>
    );
  }

  if (!['student', 'guardian'].includes(user.role)) {
    return (<>{back}<h1 className="mb-4 font-display text-3xl font-semibold">{quiz.title}</h1><Review questions={qs} answers={[]} correct={qs.map((q) => q.correctIndex)} /></>);
  }
  if (!canTake) {
    return (<>{back}<Panel><div className="py-8 text-center"><Stamp tone="mute">{closed ? 'Closed' : 'Not attempted'}</Stamp><p className="mt-4 font-display text-xl font-semibold">{quiz.title}</p><p className="mt-1 text-mute">{closed ? 'This quiz has closed.' : 'Your child has not taken this quiz yet.'}</p></div></Panel></>);
  }

  if (!started) {
    return (
      <>
        {back}
        <Panel className="mx-auto max-w-xl">
          <div className="py-4 text-center">
            <p className="text-sm text-mute">{quiz.course?.title}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">{quiz.title}</h1>
            <p className="mt-3 text-mute">{qs.length} questions, {quiz.durationMin} minutes. You get one attempt, and the quiz is submitted automatically when time runs out.</p>
            <button className="btn btn-primary mt-6 !px-8 !py-3" onClick={() => { setStarted(true); setLeft(quiz.durationMin * 60); }}>Start quiz</button>
          </div>
        </Panel>
      </>
    );
  }

  const q = qs[idx];
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1"><p className="mb-1.5 text-sm text-mute">Question {idx + 1} of {qs.length}</p><Bar value={((idx + 1) / qs.length) * 100} className="h-2" /></div>
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display font-semibold tnum', left < 30 ? 'bg-stamp/10 text-stamp' : 'bg-sunken')}><Timer size={15} />{mm}:{ss}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
          <Panel>
            <h2 className="font-display text-xl font-semibold leading-snug">{q.text}</h2>
            <div className="mt-5 space-y-2.5">
              {q.options.map((o, k) => (
                <button key={k} onClick={() => setAnswers((a) => { const n = [...a]; n[idx] = k; return n; })} aria-pressed={answers[idx] === k}
                  className={cx('flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-150', answers[idx] === k ? 'scale-[1.01] border-brand-600 bg-brand-50 font-semibold' : 'border-line hover:border-brand-300 hover:bg-sunken')}>
                  <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold', answers[idx] === k ? 'border-brand-600 bg-brand-600 text-white' : 'border-line text-mute')}>{String.fromCharCode(65 + k)}</span>{o}
                </button>
              ))}
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 flex justify-between">
        <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
        {idx < qs.length - 1 ? <button className="btn btn-primary" onClick={() => setIdx(idx + 1)}>Next question</button>
          : <button className="btn btn-gold" onClick={submit} disabled={busy}>{busy && <Spinner />}Finish and submit</button>}
      </div>
    </div>
  );
}
