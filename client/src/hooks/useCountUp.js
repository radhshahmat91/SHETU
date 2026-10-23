import { useEffect, useState } from 'react';

export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined || Number.isNaN(Number(target))) return undefined;
    const to = Number(target);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVal(to); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(to * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return decimals ? Number(val).toFixed(decimals) : Math.round(val);
}
