import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { api, notifyError } from '../lib/api';
import { Avatar, Empty, Field, LoadError, Modal, PageHeader, PageSkeleton, Panel, Spinner, cx } from '../components/ui';
import { DAYS, fmtTime } from '../lib/format';

const COLORS = ['#006a4e', '#d99100', '#3b6fb6', '#c2410c', '#2f9e44', '#a23b72', '#0e7490', '#6d28d9'];

function CourseForm({ course, onClose, onSaved }) {
  const { data: t } = useFetch('/admin/users', { params: { role: 'teacher', status: 'active' } });
  const [f, setF] = useState(() => ({ code: '', title: '', className: '1st Year', group: 'Science', section: 'A', room: '', color: COLORS[0], schedule: [], ...course, teacher: course?.teacher?._id || course?.teacher || '' }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const sched = (i, k, v) => setF((s) => ({ ...s, schedule: s.schedule.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { code: f.code, title: f.title, className: f.className, group: f.group, section: f.section, teacher: f.teacher, room: f.room, color: f.color, schedule: f.schedule.filter((s) => s.day && s.start && s.end) };
      if (course?._id) await api.put(`/courses/${course._id}`, body); else await api.post('/courses', body);
      toast.success('Course saved');
      onSaved();
    } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={course?._id ? 'Edit course' : 'New course'} wide
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !f.code || !f.title || !f.teacher}>{busy && <Spinner />}Save course</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course code" hint="Must be unique, for example PHY-1A"><input className="input" value={f.code} onChange={set('code')} /></Field>
        <Field label="Title"><input className="input" value={f.title} onChange={set('title')} /></Field>
        <Field label="Class"><select className="input" value={f.className} onChange={set('className')}><option>1st Year</option><option>2nd Year</option></select></Field>
        <Field label="Group" hint="Choose All for common subjects"><select className="input" value={f.group} onChange={set('group')}><option>All</option><option>Science</option><option>Commerce</option><option>Humanities</option></select></Field>
        <Field label="Section"><input className="input" value={f.section} onChange={set('section')} /></Field>
        <Field label="Room"><input className="input" value={f.room || ''} onChange={set('room')} /></Field>
        <Field label="Teacher" className="sm:col-span-2"><select className="input" value={f.teacher} onChange={set('teacher')}><option value="">Choose a teacher</option>{(t?.items || []).map((u) => <option key={u._id} value={u._id}>{u.name}{u.subject ? `, ${u.subject}` : ''}</option>)}</select></Field>
        <div className="sm:col-span-2">
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => setF({ ...f, color: c })} aria-label={`Colour ${c}`} className={cx('h-7 w-7 rounded-full ring-offset-2 ring-offset-surface transition', f.color === c && 'ring-2 ring-ink')} style={{ background: c }} />)}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between"><span className="label !mb-0">Weekly classes</span><button type="button" className="btn btn-soft !py-1" onClick={() => setF({ ...f, schedule: [...f.schedule, { day: 'Sun', start: '09:00', end: '09:45' }] })}><Plus size={14} />Add</button></div>
          {f.schedule.map((s, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <select className="input !w-24" value={s.day} onChange={(e) => sched(i, 'day', e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
              <input className="input" type="time" value={s.start} onChange={(e) => sched(i, 'start', e.target.value)} />
              <input className="input" type="time" value={s.end} onChange={(e) => sched(i, 'end', e.target.value)} />
              <button type="button" className="btn btn-ghost !p-2" onClick={() => setF({ ...f, schedule: f.schedule.filter((_, j) => j !== i) })} aria-label="Remove class"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function Courses() {
  const { user } = useAuth();
  const { child } = useChild();
  const navigate = useNavigate();
  const admin = user.role === 'admin';
  const { data, loading, error, reload } = useFetch('/courses', { params: { child } });
  const [edit, setEdit] = useState(null);

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.code}? Its materials and records stay in the database but disappear from the portal.`)) return;
    try { await api.delete(`/courses/${c._id}`); toast.success('Course deleted'); reload(); } catch (e) { notifyError(e); }
  };

  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const items = data.items;

  return (
    <>
      <PageHeader title={admin ? 'Courses' : user.role === 'teacher' ? 'My courses' : 'Courses'} subtitle={admin ? 'Create courses, assign teachers and set the weekly routine.' : 'Open a course for materials, assignments, quizzes and more.'}>
        {admin && <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={16} />New course</button>}
      </PageHeader>
      {items.length === 0 ? <Panel><Empty icon={BookOpen} title="No courses yet" text={admin ? 'Create the first course to get started.' : 'Courses appear here once the college office assigns them.'} /></Panel> : (
        <Panel pad={false}>
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c._id} className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-sunken/60">
                <span className="h-11 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <Link to={`/app/courses/${c._id}`} className="min-w-[200px] flex-1">
                  <p className="font-display text-lg font-semibold leading-tight group-hover:text-brand-700">{c.title}</p>
                  <p className="text-sm text-mute">{c.code}, {c.className} {c.group !== 'All' ? c.group : ''} Section {c.section}, {c.room}</p>
                </Link>
                <div className="flex min-w-[170px] items-center gap-2"><Avatar name={c.teacher?.name} size={28} /><span className="text-sm">{c.teacher?.name}</span></div>
                <div className="flex flex-wrap gap-1.5">{(c.schedule || []).map((s, i) => <span key={i} className="chip tnum">{s.day} {fmtTime(s.start)}</span>)}</div>
                {user.role !== 'student' && user.role !== 'guardian' && <span className="chip">{c.studentCount} students</span>}
                {admin && (
                  <span className="flex gap-1">
                    <button className="btn btn-ghost !p-2" onClick={() => setEdit(c)} aria-label={`Edit ${c.code}`}><Pencil size={16} /></button>
                    <button className="btn btn-ghost !p-2 hover:!text-stamp" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}><Trash2 size={16} /></button>
                  </span>
                )}
                {!admin && <button className="btn btn-soft !py-1.5" onClick={() => navigate(`/app/courses/${c._id}`)}>Open</button>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {edit && <CourseForm course={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}
