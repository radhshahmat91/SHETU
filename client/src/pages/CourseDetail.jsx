import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Avatar, LoadError, PageSkeleton, Tabs } from '../components/ui';
import { fmtTime } from '../lib/format';
import MaterialsTab from './course/MaterialsTab';
import AssignmentsTab from './course/AssignmentsTab';
import QuizzesTab from './course/QuizzesTab';
import AttendanceTab from './course/AttendanceTab';
import ResultsTab from './course/ResultsTab';
import RosterTab from './course/RosterTab';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { child } = useChild();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useFetch(`/courses/${id}`, { params: { child } });
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;

  const { course: c, counts } = data;
  const staff = user.role === 'teacher' || user.role === 'admin';
  const tabs = [
    { value: 'materials', label: 'Materials', count: counts.materials },
    { value: 'assignments', label: 'Assignments', count: counts.assignments },
    { value: 'quizzes', label: 'Quizzes', count: counts.quizzes },
    ...(staff ? [{ value: 'attendance', label: 'Attendance' }, { value: 'results', label: 'Marks' }, { value: 'students', label: 'Students', count: counts.students }] : []),
  ];
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'materials';

  return (
    <>
      <Link to="/app/courses" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-mute hover:text-ink"><ChevronLeft size={16} />All courses</Link>
      <header className="lattice relative mb-6 overflow-hidden rounded-xl px-6 py-6 text-white sm:px-8" style={{ backgroundColor: c.color }}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">{c.code}, {c.className} {c.group !== 'All' ? c.group : ''} Section {c.section}, {c.room}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.title}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">{(c.schedule || []).map((s, i) => <span key={i} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium tnum">{s.day} {fmtTime(s.start)} to {fmtTime(s.end)}</span>)}</div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-black/25 px-3.5 py-2.5">
            <Avatar name={c.teacher?.name} size={38} />
            <div className="text-sm"><p className="font-semibold">{c.teacher?.name}</p><a href={`mailto:${c.teacher?.email}`} className="flex items-center gap-1 text-white/75 hover:text-white"><Mail size={13} />{c.teacher?.email}</a></div>
          </div>
        </div>
      </header>

      <Tabs id="course" tabs={tabs} value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} />
      <div className="mt-5">
        {tab === 'materials' && <MaterialsTab course={c} canManage={staff} onChange={reload} />}
        {tab === 'assignments' && <AssignmentsTab course={c} canManage={staff} child={child} onChange={reload} />}
        {tab === 'quizzes' && <QuizzesTab course={c} canManage={staff} child={child} onChange={reload} />}
        {tab === 'attendance' && staff && <AttendanceTab course={c} />}
        {tab === 'results' && staff && <ResultsTab course={c} />}
        {tab === 'students' && staff && <RosterTab course={c} />}
      </div>
    </>
  );
}
