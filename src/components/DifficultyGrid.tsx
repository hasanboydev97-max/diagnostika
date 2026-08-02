import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const levels = [
  {
    key: 'Oson' as const,
    label: 'Oson',
    sub: 'Asosiy tushunchalar',
    color: '#059669',
  },
  {
    key: "O'rta" as const,
    label: "O'rta",
    sub: "Qo'llash va tahlil",
    color: '#1e3a8a',
  },
  {
    key: 'Qiyin' as const,
    label: 'Qiyin',
    sub: 'Mantiq va sintez',
    color: '#7c3aed',
  },
] as const;

export default function DifficultyGrid({ results = {}, blueprint }: Props) {
  const diffStats: Record<string, { total: number; correct: number }> = {
    'Oson':  { total: 0, correct: 0 },
    "O'rta": { total: 0, correct: 0 },
    'Qiyin': { total: 0, correct: 0 },
  };

  blueprint.forEach(q => {
    diffStats[q.difficulty].total++;
    if (results[q.id]) diffStats[q.difficulty].correct++;
  });

  const getPercent = (key: string) => {
    const s = diffStats[key];
    if (!s || s.total === 0) return 0;
    return Math.round((s.correct / s.total) * 100);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>05</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Bilim chuqurligi</h2>

      {/* Unified score rows — same on all screens */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Qiyinlik darajalari</div>
        <div className="divide-y divide-slate-100">
          {levels.map((level) => {
            const pct = getPercent(level.key);
            const stat = diffStats[level.key];
            return (
              <div key={level.key} className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{level.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">— {level.sub}</span>
                  </div>
                  <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: level.color }} />
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                    {stat.correct}/{stat.total} to'g'ri
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-4xl font-black leading-none" style={{ color: level.color }}>{pct}</span>
                  <span className="text-sm font-bold text-slate-400 ml-0.5">%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
