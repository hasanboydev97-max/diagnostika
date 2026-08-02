import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const categories = [
  { key: 'math'       as const, label: 'Matematika',       color: '#059669' },
  { key: 'logic'      as const, label: 'Mantiq',            color: '#0284c7' },
  { key: 'analytical' as const, label: 'Analitik fikrlash', color: '#d97706' },
  { key: 'verbal'     as const, label: "Og'zaki nutq",      color: '#7c3aed' },
  { key: 'creativity' as const, label: 'Kreativlik',        color: '#e11d48' },
];

export default function SubjectDonutCard({ results = {}, blueprint }: Props) {
  const rows = categories.map(cat => {
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

      {/* Unified score rows — same on all screens */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Asosiy yo'nalishlar</div>
        <div className="divide-y divide-slate-100">
          {rows.map((item) => (
            <div key={item.key} className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
                </div>
                <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
                <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                  {item.correct}/{item.total} to'g'ri
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-4xl font-black leading-none" style={{ color: item.color }}>{item.value}</span>
                <span className="text-sm font-bold text-slate-400 ml-0.5">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
