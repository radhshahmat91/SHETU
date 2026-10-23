import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useFetch } from '../hooks/useFetch';
import { Empty, LoadError, PageHeader, PageSkeleton, Panel, cx } from '../components/ui';
import { DAYS, fmtTime, todayDay } from '../lib/format';

// The weekly timetable, laid out the way it hangs on a classroom wall: periods down, days across.
export default function Routine() {
  const { child } = useChild();
  const { data, loading, error, reload } = useFetch('/courses/schedule', { params: { child } });
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data) return <PageSkeleton />;
  const today = todayDay();
  const slots = [...new Set(data.items.map((i) => `${i.start}-${i.end}`))].sort();
  return (
    <>
      <PageHeader title="Class routine" subtitle="Your week at a glance. Today is highlighted." />
      {!slots.length ? <Panel><Empty icon={CalendarDays} title="No classes scheduled" text="The college office sets the weekly routine for each course." /></Panel> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-28 p-3 text-left text-xs font-medium text-mute">Period</th>
                {DAYS.map((d) => (
                  <th key={d} className={cx('p-3 text-left font-display text-base font-semibold', d === today && 'text-brand-700')}>
                    {d === today ? <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-marigold-500" />{d}</span> : d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((key) => {
                const [start, end] = key.split('-');
                return (
                  <tr key={key} className="border-t border-line">
                    <td className="p-3 align-top text-xs leading-5 text-mute tnum">{fmtTime(start)}<br />{fmtTime(end)}</td>
                    {DAYS.map((d) => {
                      const it = data.items.find((i) => i.day === d && i.start === start && i.end === end);
                      return (
                        <td key={d} className={cx('p-1.5 align-top', d === today && 'bg-brand-50/60')}>
                          {it && (
                            <Link to={`/app/courses/${it.course._id}`} className="block rounded-md border-l-4 bg-sunken px-2.5 py-2 transition-colors hover:bg-brand-50" style={{ borderColor: it.course.color }}>
                              <p className="font-semibold leading-tight">{it.course.title}</p>
                              <p className="text-xs text-mute">{it.course.code}, {it.course.room}</p>
                            </Link>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
