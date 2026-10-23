import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Star, UploadCloud, Inbox, AlertTriangle } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import { initials } from '../lib/format';

export const cx = (...a) => a.filter(Boolean).join(' ');

export const Spinner = ({ className = 'h-4 w-4' }) => (
  <span role="status" aria-label="Loading" className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} />
);
export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={cx('skeleton', className)} />;
export const PageSkeleton = () => (
  <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-28 w-full" /><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div></div>
);

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[15px] text-mute">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = '', pad = true }) {
  return (
    <section className={cx('panel', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={cx('block', className)}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
  </label>
);

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-river/60 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={cx('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </header>
            <div className="overflow-y-auto p-5">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-sunken/60 px-5 py-3.5">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs({ tabs, value, onChange, id = 'tabs' }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cx('relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors', value === t.value ? 'text-brand-700' : 'text-mute hover:text-ink')}>
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-sunken px-1.5 text-xs tnum">{t.count}</span>}
          {value === t.value && <motion.span layoutId={`${id}-underline`} className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand-600" />}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, id = 'seg' }) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((o) => (
        <button type="button" key={o.value} onClick={() => onChange(o.value)}
          className={cx('relative rounded-md px-3 py-1.5 text-sm font-semibold transition-colors', value === o.value ? 'text-ink' : 'text-mute hover:text-ink')}>
          {value === o.value && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// An office rubber stamp: statuses land on the page the way they do on paper.
const STAMP = { ok: 'border-brand-700 text-brand-700', bad: 'border-stamp text-stamp', warn: 'border-marigold-600 text-marigold-600', info: 'border-sky-600 text-sky-600', mute: 'border-mute text-mute' };
export function Stamp({ tone = 'ok', children, animate = true }) {
  return (
    <motion.span
      initial={animate ? { scale: 1.8, opacity: 0, rotate: -14 } : false}
      animate={{ scale: 1, opacity: 1, rotate: -4 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      className={cx('inline-block rounded border-2 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider', STAMP[tone])}
    >
      {children}
    </motion.span>
  );
}

const BADGE = { ok: 'bg-brand-50 text-brand-700', bad: 'bg-stamp/10 text-stamp', warn: 'bg-marigold-500/15 text-marigold-600', info: 'bg-sky-500/10 text-sky-600', mute: 'bg-sunken text-mute' };
export const Badge = ({ tone = 'mute', children, className }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGE[tone], className)}>{children}</span>
);

export function Empty({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon size={22} /></span>
      <p className="font-display text-base font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-mute">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const LoadError = ({ error, onRetry }) => (
  <div className="panel flex items-center gap-3 border-stamp/30 bg-stamp/5 p-4 text-sm">
    <AlertTriangle className="shrink-0 text-stamp" size={18} />
    <span className="flex-1">{error}</span>
    {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
  </div>
);

const AV = ['bg-brand-600 text-white', 'bg-marigold-500 text-river', 'bg-sky-600 text-white', 'bg-rose-600 text-white', 'bg-violet-600 text-white', 'bg-teal-700 text-white'];
export function Avatar({ name = '?', size = 36, className }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={cx('inline-grid shrink-0 place-items-center rounded-full font-display font-semibold', AV[h % AV.length], className)}>
      {initials(name)}
    </span>
  );
}

const RING = { brand: 'stroke-brand-600', gold: 'stroke-marigold-500', bad: 'stroke-stamp' };
export function Ring({ value, size = 120, stroke = 10, tone = 'brand', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} className={RING[tone]}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v / 100) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function CountUp({ value, suffix = '', decimals = 0, fallback = '-' }) {
  const v = useCountUp(value, { decimals });
  if (value === null || value === undefined) return <>{fallback}</>;
  return <>{v}{suffix}</>;
}

export function Stars({ value = 0, onChange, size = 20 }) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100">
          <Star size={size} className={n <= Math.round(value) ? 'fill-marigold-500 text-marigold-500' : 'text-line'} />
        </button>
      ))}
    </div>
  );
}

export function FileInput({ file, onChange, accept }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onChange(e.dataTransfer.files[0] || null); }}
      onClick={() => ref.current?.click()}
      className={cx('flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors', drag ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-400')}
    >
      <UploadCloud size={20} className="shrink-0 text-brand-600" />
      <span className="min-w-0 flex-1 truncate">{file ? file.name : 'Drop a file here or click to browse'}</span>
      {file && <button type="button" className="text-xs font-semibold text-stamp" onClick={(e) => { e.stopPropagation(); onChange(null); if (ref.current) ref.current.value = ''; }}>Remove</button>}
      <input ref={ref} type="file" hidden accept={accept} onChange={(e) => onChange(e.target.files[0] || null)} />
    </div>
  );
}

// small horizontal bar used in marksheets and rating breakdowns
export const Bar = ({ value = 0, tone = 'bg-brand-600', className = 'h-1.5' }) => (
  <div className={cx('overflow-hidden rounded-full bg-sunken', className)}>
    <motion.div className={cx('h-full rounded-full', tone)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
  </div>
);
