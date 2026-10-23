import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { api, notifyError } from '../lib/api';
import { Avatar, Empty, LoadError, PageHeader, PageSkeleton, Panel, Spinner, cx } from '../components/ui';
import { timeAgo } from '../lib/format';

const who = (u, me) => (me.role === 'guardian' ? [u.subject, u.designation].filter(Boolean).join(', ') || 'Teacher' : `${u.relation || 'Guardian'}${u.children?.length ? ` of ${u.children.map((c) => c.name).join(', ')}` : ''}`);

// Guardian-to-teacher messages: the "contact the teachers" feature from the report.
export default function Messages() {
  const { user } = useAuth();
  const convs = useFetch('/messages/conversations');
  const contacts = useFetch('/messages/contacts');
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef(null);

  const load = useCallback(async (id, quiet) => {
    try {
      const { data } = await api.get(`/messages/with/${id}`);
      setThread(data.items);
      if (!quiet) convs.reload();
    } catch (e) { if (!quiet) notifyError(e); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return undefined;
    setThread([]);
    load(active._id);
    const t = setInterval(() => load(active._id, true), 15000);
    return () => clearInterval(t);
  }, [active?._id, load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post('/messages', { to: active._id, body: text });
      setThread((t) => [...t, data.item]);
      setText('');
      convs.reload();
    } catch (err) { notifyError(err); } finally { setSending(false); }
  };

  if (convs.error) return <LoadError error={convs.error} onRetry={convs.reload} />;
  if (convs.loading || contacts.loading || !convs.data || !contacts.data) return <PageSkeleton />;

  const talked = new Set(convs.data.items.map((c) => c.user._id));
  const fresh = contacts.data.items.filter((c) => !talked.has(c._id));

  return (
    <>
      <PageHeader title="Messages" subtitle={user.role === 'guardian' ? "Write to your child's teachers directly. They are notified when you send a message." : 'Guardians of your students can reach you here.'} />
      <Panel pad={false} className="overflow-hidden">
        <div className="grid min-h-[520px] lg:grid-cols-[320px_1fr]">
          <aside className={cx('border-line lg:border-r', active ? 'hidden lg:block' : 'block')}>
            <ul className="divide-y divide-line">
              {convs.data.items.map((c) => (
                <li key={c.user._id}>
                  <button onClick={() => setActive(c.user)} className={cx('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken', active?._id === c.user._id && 'bg-brand-50')}>
                    <Avatar name={c.user.name} size={38} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.user.name}</span><span className="block truncate text-sm text-mute">{c.last.mine ? 'You: ' : ''}{c.last.body}</span></span>
                    {c.unread > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">{c.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {fresh.length > 0 && <p className="border-y border-line bg-sunken/60 px-4 py-2 text-xs font-semibold text-mute">Start a conversation</p>}
            <ul className="divide-y divide-line">
              {fresh.map((c) => (
                <li key={c._id}><button onClick={() => setActive(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"><Avatar name={c.name} size={34} /><span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="block truncate text-xs text-mute">{who(c, user)}</span></span></button></li>
              ))}
            </ul>
            {!convs.data.items.length && !fresh.length && <Empty icon={MessageSquare} title="No contacts yet" text="Contacts appear once your child is linked and has courses." />}
          </aside>

          <section className={cx('flex min-h-[520px] flex-col', active ? 'flex' : 'hidden lg:flex')}>
            {!active ? <div className="m-auto"><Empty icon={MessageSquare} title="Pick someone to message" text="Choose a conversation on the left." /></div> : (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button className="btn btn-ghost !p-1.5 lg:hidden" onClick={() => setActive(null)} aria-label="Back to conversations"><ChevronLeft size={18} /></button>
                  <Avatar name={active.name} size={36} />
                  <div><p className="font-semibold leading-tight">{active.name}</p><p className="text-xs text-mute">{who(active, user)}</p></div>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" style={{ maxHeight: 420 }}>
                  {thread.length === 0 && <p className="py-10 text-center text-sm text-mute">No messages yet. Say hello.</p>}
                  {thread.map((m) => {
                    const mine = String(m.from) === String(user._id);
                    return (
                      <motion.div key={m._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx('flex', mine && 'justify-end')}>
                        <div className={cx('max-w-[78%] rounded-2xl px-3.5 py-2', mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-sunken')}>
                          <p className="whitespace-pre-line text-[15px] leading-snug">{m.body}</p>
                          <p className={cx('mt-0.5 text-[11px]', mine ? 'text-white/70' : 'text-mute')}>{timeAgo(m.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={end} />
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
                  <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" aria-label="Message" />
                  <button className="btn btn-primary" disabled={sending || !text.trim()}>{sending ? <Spinner /> : <Send size={16} />}Send</button>
                </form>
              </>
            )}
          </section>
        </div>
      </Panel>
    </>
  );
}
