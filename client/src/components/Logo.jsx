export default function Logo({ size = 36, text = true, light = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="15" fill={light ? '#134a3c' : '#0b2a22'} />
        <path d="M9 41Q32 6 55 41" fill="none" stroke="#f2a900" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 41V29M32 41V23M44 41V29" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
        <path d="M7 45h50" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {text && <span className="font-display text-xl font-bold tracking-tight">Setu</span>}
    </span>
  );
}
