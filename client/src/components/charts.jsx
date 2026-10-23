export const COLORS = { brand: '#12805f', gold: '#f2a900', red: '#cd3426', sky: '#3b82f6', mute: '#7f9a8f' };
export const GRID = 'rgba(127,154,143,0.22)';
export const axis = { stroke: 'transparent', tick: { fill: COLORS.mute, fontSize: 12 } };

export function Tip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-pop">
      {render ? render(payload[0].payload, label) : <><p className="font-semibold">{label}</p><p className="text-mute">{payload[0].value}</p></>}
    </div>
  );
}
