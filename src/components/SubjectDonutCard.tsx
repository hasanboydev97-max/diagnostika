import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { SubjectCategory, QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const categories: { key: SubjectCategory; label: string; color: string; bg: string; light: string; emoji: string }[] = [
  { key: 'math',       label: 'Matematika',       color: '#059669', bg: 'bg-emerald-500', light: 'bg-emerald-50',  emoji: '📐' },
  { key: 'logic',      label: 'Mantiq',            color: '#0284c7', bg: 'bg-sky-500',     light: 'bg-sky-50',     emoji: '🔗' },
  { key: 'analytical', label: 'Analitik fikrlash', color: '#d97706', bg: 'bg-amber-500',   light: 'bg-amber-50',   emoji: '🔍' },
  { key: 'verbal',     label: "Og'zaki nutq",      color: '#7c3aed', bg: 'bg-violet-500',  light: 'bg-violet-50',  emoji: '💬' },
  { key: 'creativity', label: 'Kreativlik',         color: '#e11d48', bg: 'bg-rose-500',    light: 'bg-rose-50',    emoji: '✨' },
];

export default function SubjectDonutCard({ results = {}, blueprint }: Props) {
  const donuts = categories.map(cat => {
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
      <h2 className="text-xl md:text-2xl text-neutral-main font-bold">
        Fanlar bo'yicha o'zlashtirish
      </h2>

      {/* Desktop: Donut Grid (md+) */}
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {donuts.map((item, index) => (
          <div key={index} className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-border/50 p-5 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <h3 className="text-[10px] font-bold text-neutral-secondary mb-4 uppercase tracking-widest leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
              {item.label}
            </h3>
            <div className="w-24 h-24 relative mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: item.value || 1 }, { value: Math.max(100 - item.value, 0) }]}
                    cx="50%" cy="50%"
                    innerRadius="72%" outerRadius="100%"
                    startAngle={90} endAngle={-270}
                    dataKey="value" stroke="none" cornerRadius={6} paddingAngle={0}
                  >
                    <Cell fill={item.value === 0 ? '#fca5a5' : item.color} />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</span>
                  <span className="text-xs opacity-60 ml-0.5" style={{ color: item.color }}>%</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-neutral-secondary font-medium bg-slate-50 px-3 py-1 rounded-full">
              {item.correct}/{item.total} to'g'ri
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Beautiful horizontal progress rows */}
      <div className="md:hidden bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {donuts.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 px-4 py-3.5 ${index < donuts.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            {/* Emoji Icon */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${item.light}`}
            >
              {item.emoji}
            </div>

            {/* Subject Name + Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-neutral-main truncate uppercase tracking-wide">{item.label}</span>
                <span className="text-[11px] font-bold ml-2 shrink-0" style={{ color: item.color }}>
                  {item.value}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
            </div>

            {/* Score badge */}
            <div
              className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ color: item.color, backgroundColor: `${item.color}15` }}
            >
              {item.correct}/{item.total}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
