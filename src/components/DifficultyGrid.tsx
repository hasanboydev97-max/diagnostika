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
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: "O'rta" as const,
    label: "O'rta",
    sub: "Qo'llash va tahlil",
    color: '#1e3a8a',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: 'Qiyin' as const,
    label: 'Qiyin',
    sub: 'Mantiq va sintez',
    color: '#7c3aed',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
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

      {/* ===== MOBILE: Clean horizontal rows ===== */}
      <div className="md:hidden divide-y divide-slate-100">
        {levels.map((level) => {
          const pct = getPercent(level.key);
          const stat = diffStats[level.key];
          return (
            <div key={level.key} className="py-4 flex items-center gap-4">
              {/* Left: icon + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {level.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    — {level.sub}
                  </span>
                </div>
                <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: level.color }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                  {stat.correct}/{stat.total} to'g'ri
                </div>
              </div>
              {/* Right: big score */}
              <div className="shrink-0 text-right">
                <span className="text-4xl font-black leading-none" style={{ color: level.color }}>
                  {pct}
                </span>
                <span className="text-sm font-bold text-slate-400 ml-0.5">%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== DESKTOP: 3-column cards ===== */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {levels.map((level) => {
          const pct = getPercent(level.key);
          const stat = diffStats[level.key];
          return (
            <div key={level.key} className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${level.color}15`, color: level.color }}>
                {level.icon}
              </div>
              <h3 className="font-bold text-neutral-main mb-1">{level.label}</h3>
              <p className="text-sm text-neutral-secondary mb-4">{level.sub}</p>
              <div className="text-3xl font-display font-bold mb-1" style={{ color: level.color }}>{pct}%</div>
              <p className="text-sm text-neutral-secondary font-medium">{stat.correct}/{stat.total} to'g'ri</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
