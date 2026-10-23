import { Link } from 'react-router-dom';
import { CountUp, cx } from './ui';
import { fmtTime, timeAgo } from '../lib/format';

// Full-width greeting band with the lattice pattern
export const Band = ({ children, className }) => (
  <section className={cx('lattice relative mb-5 overflow-hidden rounded-xl bg-river px-6 py-6 text-white sm:px-8 sm:py-7', className)}>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_0%,rgba(242,169,0,0.16),transparent_70%)]" />
    <div className="relative flex flex-wrap items-end justify-between gap-5">{children}</div>
  </section>
);

// One ledger strip instead of a row of separate stat cards: cells share a single hairline-divided panel
export function Ledger({ items }) {
  const lg = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 6: 'lg:grid-cols-6' }[items.length] || 'lg:grid-cols-4';
  return (
    <section className={cx('mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line', lg)}>
      {items.map((it) => (
        <div key={it.label} className="bg-surface px-5 py-4">
          <p className="text-sm text-mute">{it.label}</p>
          <p className={cx('mt-0.5 font-display text-[32px] font-semibold leading-tight tnum', it.tone)}>
            {it.money ? <>৳<CountUp value={it.value} fallback="0" /></> : <CountUp value={it.value} suffix={it.suffix} decimals={it.decimals} />}
          </p>
          {it.hint && <p className="text-xs text-mute">{it.hint}</p>}
        </div>
      ))}
    </section>
  );
}

export function ClassRow({ item, to }) {
  const row = (
    <div className="group flex items-stretch gap-4 py-2.5">
      <div className="w-[76px] shrink-0 text-right text-sm tnum"><p className="font-semibold">{fmtTime(item.start)}</p><p className="text-xs text-mute">{fmtTime(item.end)}</p></div>
      <span className="w-1 shrink-0 rounded-full" style={{ background: item.course.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.course.title}</p>
        <p className="truncate text-sm text-mute">{item.course.code}, {item.course.room}{item.course.teacher?.name ? `, ${item.course.teacher.name}` : ''}</p>
      </div>
    </div>
  );
  return to ? <Link to={to} className="block rounded-lg transition-colors hover:bg-sunken">{row}</Link> : row;
}

export const PRIORITY_DOT = { urgent: 'bg-stamp', important: 'bg-marigold-500', normal: 'bg-brand-400' };

export function NoticeRow({ n }) {
  return (
    <Link to="/app/notices" className="flex gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-sunken">
      <span className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[n.priority])} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{n.title}</span>
        <span className="text-xs text-mute">{n.source === 'teacher' ? `${n.postedBy?.name || 'Teacher'}${n.course ? `, ${n.course.code}` : ''}` : 'College office'}, {timeAgo(n.createdAt)}</span>
      </span>
    </Link>
  );
}
