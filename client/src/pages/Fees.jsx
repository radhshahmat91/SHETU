import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { useDebounced } from '../hooks/useDebounced';
import { api, notifyError } from '../lib/api';
import { Empty, Field, LoadError, Modal, PageHeader, PageSkeleton, Panel, Segmented, Spinner, Stamp, cx } from '../components/ui';
import { Ledger } from '../components/dash';
import { fmtDate, money } from '../lib/format';

const METHODS = ['bKash', 'Nagad', 'Rocket', 'Card'];

function Family() {
  const { user } = useAuth();
  const { child } = useChild();
  const guardian = user.role === 'guardian';
  const { data, loading, error, reload } = useFetch('/fees', { params: { child } });
  const [paying, setPaying] = useState(null);
  const [method, setMethod] = useState('bKash');
  const [busy, setBusy] = useState(false);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const due = data.items.filter((f) => f.status === 'due');
  const paid = data.items.filter((f) => f.status === 'paid').sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  const pay = async () => {
    setBusy(true);
    try { await api.put(`/fees/${paying._id}/pay`, { method }); toast.success('Payment recorded. A receipt is in your notifications.'); setPaying(null); reload(); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Fees" subtitle={guardian ? 'Dues for your child. Pay online and the college office is updated instantly.' : 'What is due and what has been paid. Guardians can pay from their own account.'} />
      <Ledger items={[{ label: 'Due now', value: data.totals.due, money: true, tone: data.totals.due ? 'text-marigold-600' : '', hint: `${due.length} item${due.length === 1 ? '' : 's'}` }, { label: 'Paid so far', value: data.totals.paid, money: true, hint: `${paid.length} payment${paid.length === 1 ? '' : 's'}` }]} />
      <Panel title="To pay" pad={false} className="mb-5">
        {due.length === 0 ? <Empty icon={Wallet} title="Nothing due" text="All fees are paid. Thank you." /> : (
          <ul className="divide-y divide-line">
            {due.map((f) => (
              <li key={f._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                <div className="min-w-[200px] flex-1"><p className="font-semibold">{f.title}</p><p className="text-sm text-mute">Due {fmtDate(f.dueDate)}</p></div>
                {new Date(f.dueDate) < new Date() ? <Stamp tone="bad">Overdue</Stamp> : <Stamp tone="warn">Due</Stamp>}
                <p className="w-24 text-right font-display text-lg font-semibold tnum">{money(f.amount)}</p>
                {guardian && <button className="btn btn-primary" onClick={() => setPaying(f)}>Pay now</button>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {paid.length > 0 && (
        <Panel title="Payment history" pad={false}>
          <ul className="divide-y divide-line">
            {paid.map((f) => (
              <li key={f._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                <div className="min-w-[200px] flex-1"><p className="font-semibold">{f.title}</p><p className="text-sm text-mute">{fmtDate(f.paidAt)}, {f.method}, {f.trxId}</p></div>
                <Stamp tone="ok" animate={false}>Paid</Stamp>
                <p className="w-24 text-right font-display font-semibold tnum">{money(f.amount)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Modal open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${money(paying.amount)}` : ''}
        footer={<><button className="btn btn-ghost" onClick={() => setPaying(null)}>Cancel</button><button className="btn btn-primary" onClick={pay} disabled={busy}>{busy && <Spinner />}Confirm payment</button></>}>
        <p className="mb-3 font-semibold">{paying?.title}</p>
        <div className="grid grid-cols-2 gap-2">{METHODS.map((m) => <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m} className={cx('rounded-lg border px-4 py-3 text-left font-semibold transition-colors', method === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line hover:border-brand-300')}>{m}</button>)}</div>
        <p className="mt-4 rounded-lg bg-marigold-500/10 px-3 py-2 text-sm">Demo checkout: no real money moves. Connect a gateway such as bKash, Nagad or SSLCommerz before going live.</p>
      </Modal>
    </>
  );
}

function Admin() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, reload } = useFetch('/fees', { params: { status: status || undefined, q: dq || undefined } });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', amount: '', dueDate: '', className: '', group: '', section: '' });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try { const { data: r } = await api.post('/fees', f); toast.success(`Fee created for ${r.count} students. Guardians were emailed.`); setOpen(false); reload(); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const markPaid = async (fee) => { try { await api.put(`/fees/${fee._id}/pay`, { method: 'Cash' }); toast.success('Marked as paid'); reload(); } catch (e) { notifyError(e); } };
  const remove = async (fee) => { if (!window.confirm(`Delete "${fee.title}" for ${fee.student?.name}?`)) return; try { await api.delete(`/fees/${fee._id}`); reload(); } catch (e) { notifyError(e); } };

  if (error) return <LoadError error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Fees" subtitle="Create fees for a class, section or the whole college. Students and guardians are notified.">
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New fee</button>
      </PageHeader>
      {data && <Ledger items={[{ label: 'Outstanding', value: data.totals.due, money: true, tone: 'text-marigold-600' }, { label: 'Collected', value: data.totals.paid, money: true }]} />}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented id="feestatus" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, { value: 'due', label: 'Due' }, { value: 'paid', label: 'Paid' }]} />
        <div className="relative w-full sm:w-64"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" /><input className="input !pl-9" placeholder="Search student name or ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {loading && !data ? <PageSkeleton /> : data.items.length === 0 ? <Panel><Empty icon={Wallet} title="No fees found" text="Create a fee to see it here." /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {data.items.map((fee) => (
              <li key={fee._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
                <div className="min-w-[200px] flex-1"><p className="font-semibold">{fee.student?.name} <span className="text-sm font-normal text-mute">{fee.student?.userId}, {fee.student?.className} {fee.student?.section}</span></p><p className="text-sm text-mute">{fee.title}, due {fmtDate(fee.dueDate)}</p></div>
                <Stamp tone={fee.status === 'paid' ? 'ok' : new Date(fee.dueDate) < new Date() ? 'bad' : 'warn'} animate={false}>{fee.status === 'paid' ? 'Paid' : new Date(fee.dueDate) < new Date() ? 'Overdue' : 'Due'}</Stamp>
                <p className="w-24 text-right font-display font-semibold tnum">{money(fee.amount)}</p>
                {fee.status === 'due' && <button className="btn btn-soft !py-1.5" onClick={() => markPaid(fee)}>Mark paid</button>}
                <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(fee)} aria-label="Delete fee"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New fee"
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={create} disabled={busy || !f.title || !f.amount || !f.dueDate}>{busy && <Spinner />}Create and notify</button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Monthly tuition (November)" /></Field>
          <Field label="Amount (BDT)"><input className="input" type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Due date"><input className="input" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label="Class"><select className="input" value={f.className} onChange={(e) => setF({ ...f, className: e.target.value })}><option value="">All classes</option><option>1st Year</option><option>2nd Year</option></select></Field>
          <Field label="Group"><select className="input" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}><option value="">All groups</option><option>Science</option><option>Commerce</option><option>Humanities</option></select></Field>
          <Field label="Section (optional)"><input className="input" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} placeholder="A" /></Field>
        </div>
      </Modal>
    </>
  );
}

export default function Fees() {
  const { user } = useAuth();
  return user.role === 'admin' ? <Admin /> : <Family />;
}
