import { Mail, Phone } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { Avatar, Empty, LoadError, Panel, Skeleton } from '../../components/ui';

export default function RosterTab({ course }) {
  const { data, loading, error, reload } = useFetch(`/courses/${course._id}/students`);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-48" />;
  if (!data.items.length) return <Panel><Empty title="No students in this section yet" /></Panel>;
  return (
    <Panel pad={false}>
      <ul className="divide-y divide-line">
        {data.items.map((s) => (
          <li key={s._id} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <Avatar name={s.name} size={36} />
            <div className="min-w-[160px] flex-1"><p className="font-semibold">{s.name}</p><p className="text-sm text-mute">Roll {s.roll}, {s.userId}</p></div>
            <span className="flex items-center gap-1.5 text-sm text-mute"><Mail size={14} />{s.email}</span>
            {s.phone && <span className="flex items-center gap-1.5 text-sm text-mute"><Phone size={14} />{s.phone}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
