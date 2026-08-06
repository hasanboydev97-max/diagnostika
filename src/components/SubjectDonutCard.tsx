import type { QuestionBlueprint } from '../lib/blueprint';
import { motion } from 'framer-motion';
interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const categories = [
  { key: 'math',       label: 'Matematika',       color: '#059669' },
  { key: 'logic',      label: 'Mantiq',            color: '#0284c7' },
  { key: 'analytical', label: 'Analitik fikrlash', color: '#d97706' },
  { key: 'verbal',     label: "Og'zaki nutq",      color: '#7c3aed' },
  { key: 'creativity', label: 'Kreativlik',        color: '#e11d48' },
];

export default function SubjectDonutCard({ results = {}, blueprint }: Props) {
  const cards = categories.map(cat => {
    const qs = blueprint.filter(q => q.category === cat.key);
    const correct = qs.filter(q => results[q.id]).length;
    const value = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    return { ...cat, value, correct, total: qs.length };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">06</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Fanlar bo'yicha o'zlashtirish</h2>

      <motion.div 
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        {cards.map((card) => {
          const r = 36;
          const circ = 2 * Math.PI * r;
          const offset = circ - (card.value / 100) * circ;

          return (
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
              }}
              key={card.key} 
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default group"
            >
              
              <div className="relative w-24 h-24 mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="#f8fafc" strokeWidth="12" className="transition-colors group-hover:stroke-slate-100" />
                  <circle
                    cx="50" cy="50" r={r}
                    fill="none"
                    stroke={card.color}
                    strokeWidth="12"
                    strokeLinecap="butt"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-[22px] font-black leading-none" style={{ color: card.color }}>
                    {card.value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 leading-none mt-1">%</span>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-main text-center leading-tight min-h-[24px] flex items-center group-hover:text-black transition-colors">
                {card.label}
              </div>
              <div className="text-[9px] font-bold text-slate-400 mt-2">
                {card.correct}/{card.total} ta savol
              </div>

            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
