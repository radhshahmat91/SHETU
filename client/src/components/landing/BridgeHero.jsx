import { motion } from 'framer-motion';
import { CalendarCheck, GraduationCap, Megaphone, UserCheck } from 'lucide-react';

const ARC = 'M110 262 Q280 40 450 262';
const BACK = 'M450 262 Q280 40 110 262';
// x, y where each hanger meets the arc (quadratic curve: y = 262 - 444t(1-t), x = 110 + 340t)
const HANGERS = [[160, 206], [200, 176], [240, 157], [280, 151], [320, 157], [360, 176], [400, 206]];
const CHIPS = [
  { icon: CalendarCheck, text: 'Leave approved', pos: 'left-0 top-[15%]', delay: 1.5 },
  { icon: UserCheck, text: 'Attendance 92%', pos: 'right-0 top-[4%]', delay: 2.1 },
  { icon: GraduationCap, text: 'Physics Mid Term 41/50', pos: 'right-[1%] bottom-[16%]', delay: 2.7 },
  { icon: Megaphone, text: 'New notice from the office', pos: 'left-[3%] bottom-[5%]', delay: 3.3 },
];
const draw = (delay, duration) => ({ initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay, duration, ease: [0.22, 1, 0.36, 1] } });

// Hero moment: home and school are joined by a bridge that draws itself, then messages start crossing it.
export default function BridgeHero() {
  return (
    <div className="relative mx-auto aspect-[7/5] w-full max-w-[560px]">
      <svg viewBox="0 0 560 400" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
        <motion.g stroke="#fff" strokeOpacity=".16" strokeWidth="2" strokeLinecap="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.8 }}>
          {[338, 358, 378].map((y, i) => <path key={y} d={`M${-10 + i * 22} ${y} q35 -10 70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0 t70 0`} />)}
        </motion.g>

        <motion.g initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
          <path d="M0 270H112V340H0Z" fill="#fff" fillOpacity=".07" />
          <path d="M22 270V214H80V270" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinejoin="round" />
          <path d="M13 218 51 184 89 218" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <rect x="38" y="232" width="26" height="22" rx="3" fill="#f2a900" />
          <path d="M51 232v22M38 243h26" stroke="#0b2a22" strokeWidth="2" />
        </motion.g>

        <motion.g initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}>
          <path d="M448 270H560V340H448Z" fill="#fff" fillOpacity=".07" />
          <path d="M462 270V198H540V270" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinejoin="round" />
          <path d="M454 202 501 168 548 202" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M501 168V136" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
          <path d="M501 136l24 8-24 8Z" fill="#f2a900" />
          <path d="M478 270V220M501 270V220M524 270V220" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
        </motion.g>

        <motion.path d="M96 262H464" stroke="#fff" strokeWidth="6" strokeLinecap="round" {...draw(0.6, 0.8)} />
        <motion.path d={ARC} stroke="#f2a900" strokeWidth="5" strokeLinecap="round" {...draw(0.9, 1.2)} />
        {HANGERS.map(([x, y], i) => (
          <motion.path key={x} d={`M${x} ${y + 2}V262`} stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" {...draw(1.7 + i * 0.07, 0.35)} />
        ))}

        {[0, 1.7, 3.4].map((b) => (
          <circle key={`f${b}`} r="5.5" fill="#f2a900" opacity="0">
            <animateMotion dur="5.1s" begin={`${2.4 + b}s`} repeatCount="indefinite" path={ARC} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="5.1s" begin={`${2.4 + b}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {[0.9, 2.6].map((b) => (
          <circle key={`r${b}`} r="4.5" fill="#fff" opacity="0">
            <animateMotion dur="5.8s" begin={`${3 + b}s`} repeatCount="indefinite" path={BACK} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="5.8s" begin={`${3 + b}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {CHIPS.map(({ icon: Icon, text, pos, delay }, i) => (
        <motion.div key={text} className={`absolute ${pos}`} initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 380, damping: 22 }}>
          <div className="flex animate-float items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-river shadow-pop" style={{ animationDelay: `${i * 0.9}s` }}>
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-white"><Icon size={14} /></span>
            {text}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
