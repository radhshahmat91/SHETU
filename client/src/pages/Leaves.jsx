import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarX2, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { api, notifyError } from '../lib/api';
import { Avatar, Empty, Field, LoadError, Modal, PageHeader, PageSkeleton, Panel, Spinner, Stamp, Tabs } from '../components/ui';
import { fmtDate, fmtDateTime, isoPlus } from '../lib/format';

const TONE = { pending: 'warn', approved: 'ok', rejected: 'bad' };
const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Declined' };
const spanDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1;

function LeaveRow({ l, staff, onWithdraw, onDecide }) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {staff && <Avatar name={l.student?.name} size={36} />}
        <div className="min-w-[200px] flex-1">
          {staff && <p className="font-semibold">{l.student?.name} <span className="text-sm font-normal text-mute">Roll {l.student?.roll}, {l.student?.className} {l.student?.section}</span></p>}
          <p className={staff ? 'text-sm' : 'font-semibold'}>{l.days} day{l.days > 1 ? 's' : ''}: {fmtDate(l.startDate)}{l.days > 1 ? ` to ${fmtDate(l.endDate)}` : ''}</p>
          <p className="mt-0.5 text-sm text-mute">{l.reason}</p>
        </div>
        <Stamp tone={TONE[l.status]}>{LABEL[l.status]}</Stamp>
        {l.status === 'pending' && onWithdraw && <button className="btn btn-ghost" onClick={() => onWithdraw(l)}>Withdraw</button>}
        {l.status === 'pending' && onDecide && (
          <>
            <button className="btn btn-primary" onClick={() => onDecide(l, 'approved')}><Check size={16} />Approve</button>
            <button className="btn btn-danger" onClick={() => onDecide(l, 'rejected')}><X size={16} />Decline</button>
          </>
        )}
      </div>
      {l.status !== 'pending' && (
        <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm text-mute">{l.decidedBy?.name ? `${l.decidedBy.name}, ${fmtDateTime(l.decidedAt)}` : fmtDateTime(l.decidedAt)}{l.note ? `: ${l.note}` : ''}</p>
      )}
    </li>
  );
}

export default function Leaves() {
  const { user } = useAuth();
  const { child } = useChild();
  const staff = user.role === 'teacher' || user.role === 'admin';
  const { data, loading, error, reload } = useFetch('/leaves', { params: { child } });
  const [f, setF] = useState({ startDate: isoPlus(1), endDate: isoPlus(1), reason: '' });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('pending');
  const [deciding, setDeciding] = useState(null); // { leave, status }
  const [note, setNote] = useState('');

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/leaves', f);
      toast.success('Leave request sent. Your class teacher and guardian have been told.');
      setF({ startDate: isoPlus(1), endDate: isoPlus(1), reason: '' });
      reload();
    } catch (err) { notifyError(err); } finally { setBusy(false); }
  };
  const withdraw = async (l) => { try { await api.delete(`/leaves/${l._id}`); toast.success('Request withdrawn'); reload(); } catch (e) { notifyError(e); } };
  const decide = async () => {
    setBusy(true);
    try {
      await api.put(`/leaves/${deciding.leave._id}/decision`, { status: deciding.status, note });
      toast.success(`Leave ${deciding.status === 'approved' ? 'approved' : 'declined'}. The student and guardian were emailed.`);
      setDeciding(null); setNote(''); reload();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const items = data.items;

  if (staff) {
    const pending = items.filter((l) => l.status === 'pending');
    const shown = tab === 'pending' ? pending : tab === 'decided' ? items.filter((l) => l.status !== 'pending') : items;
    return (
      <>
        <PageHeader title="Leave requests" subtitle={user.role === 'admin' ? 'Every request in the college. The class teacher normally decides, and you can step in.' : 'Requests from students in your section. Your decision is emailed to the student and guardian.'} />
        {user.role === 'teacher' && data.classTeacher === false ? (
          <Panel><Empty icon={CalendarX2} title="You are not a class teacher" text="Leave requests go to the class teacher of each section. Ask the college office if you should be assigned one." /></Panel>
        ) : (
          <>
            <Tabs id="leave" value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'Waiting', count: pending.length }, { value: 'decided', label: 'Decided' }, { value: 'all', label: 'All' }]} />
            <div className="mt-5">
              {shown.length === 0 ? <Panel><Empty icon={CalendarX2} title={tab === 'pending' ? 'No requests waiting' : 'Nothing here'} text="New leave applications will appear here the moment students send them." /></Panel> : (
                <Panel pad={false}><ul className="divide-y divide-line">{shown.map((l) => <LeaveRow key={l._id} l={l} staff onDecide={(leave, status) => setDeciding({ leave, status })} />)}</ul></Panel>
              )}
            </div>
          </>
        )}
        <Modal open={!!deciding} onClose={() => setDeciding(null)} title={deciding?.status === 'approved' ? 'Approve leave' : 'Decline leave'}
          footer={<><button className="btn btn-ghost" onClick={() => setDeciding(null)}>Cancel</button><button className={deciding?.status === 'approved' ? 'btn btn-primary' : 'btn btn-danger'} onClick={decide} disabled={busy}>{busy && <Spinner />}{deciding?.status === 'approved' ? 'Approve and notify' : 'Decline and notify'}</button></>}>
          <p className="mb-3 text-sm text-mute">{deciding?.leave.student?.name}: {deciding?.leave.days} day(s), "{deciding?.leave.reason}"</p>
          <Field label="Note for the student and guardian (optional)"><textarea className="input min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={deciding?.status === 'approved' ? 'Get well soon. Please check the notes on the portal.' : 'Please reapply with the dates after the exam.'} /></Field>
        </Modal>
      </>
    );
  }

  const student = user.role === 'student';
  return (
    <>
      <PageHeader title="Leave" subtitle={student ? 'Apply online. Your guardian is emailed straight away, and the class teacher decides.' : 'Leave requests your child has sent, and what was decided.'} />
      <div className={student ? 'grid gap-5 lg:grid-cols-[380px_1fr]' : ''}>
        {student && (
          <Panel title="Apply for leave" className="h-fit">
            <form onSubmit={apply} className="space-y-4">
              <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-mute">Applying as <span className="font-semibold text-ink">{user.name}</span>, ID {user.userId}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From"><input className="input" type="date" min={isoPlus(0)} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate })} required /></Field>
                <Field label="To"><input className="input" type="date" min={f.startDate} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} required /></Field>
              </div>
              <p className="-mt-1 text-sm text-mute">{f.startDate && f.endDate ? `${spanDays(f.startDate, f.endDate)} day${spanDays(f.startDate, f.endDate) > 1 ? 's' : ''} of leave` : ''}</p>
              <Field label="Reason"><textarea className="input min-h-[100px]" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Tell your teacher why you need leave" required /></Field>
              <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />}Send leave request</button>
            </form>
          </Panel>
        )}
        <Panel title={student ? 'Your requests' : 'Requests'} pad={false}>
          {items.length === 0 ? <Empty icon={CalendarX2} title="No leave requests" text={student ? 'When you apply, the request and its decision are kept here.' : 'Nothing has been requested yet.'} /> : (
            <ul className="divide-y divide-line">{items.map((l) => <LeaveRow key={l._id} l={l} onWithdraw={student ? withdraw : undefined} />)}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}
