import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { QuestionBlueprint } from '../lib/blueprint';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-main text-white px-4 py-2 rounded-lg shadow-xl border border-slate-700 font-sans text-sm">
        <span className="font-medium opacity-80">{payload[0].payload.subject}:</span>
        <span className="ml-2 font-display font-bold text-lg">{payload[0].value}%</span>
      </div>
    );
  }
  return null;
};

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const SKILL_COLORS: Record<string, string> = {
  'Tushunish':     '#1e3a8a',
  "Qo'llash":      '#d97706',
  'Tahlil qilish': '#059669',
  'Baholash':      '#7c3aed',
  'Sintezlash':    '#e11d48',
};

export default function SkillsRadarChart({ results = {}, blueprint }: Props) {
  const skillStats: Record<string, { total: number; correct: number }> = {
    "Tushunish":  { total: 0, correct: 0 },
    "Qo'llash":   { total: 0, correct: 0 },
    "Tahlil":     { total: 0, correct: 0 },
    "Baholash":   { total: 0, correct: 0 },
    "Sintezlash": { total: 0, correct: 0 },
  };

  blueprint.forEach(q => {
    const isCorrect = results[q.id] || false;
    let skillKey = q.skill as string;
    if (skillKey === "Tahlil qilish") skillKey = "Tahlil";
    if (skillStats[skillKey]) {
      skillStats[skillKey].total++;
      if (isCorrect) skillStats[skillKey].correct++;
    }
  });

  const getPercentage = (skill: string) => {
    const stat = skillStats[skill];
    if (!stat || stat.total === 0) return 0;
    return Math.round((stat.correct / stat.total) * 100);
  };

  const bars = [
    { name: 'Tushunish',     value: getPercentage("Tushunish"),  color: SKILL_COLORS['Tushunish']     },
    { name: "Qo'llash",      value: getPercentage("Qo'llash"),   color: SKILL_COLORS["Qo'llash"]      },
    { name: 'Tahlil qilish', value: getPercentage("Tahlil"),     color: SKILL_COLORS['Tahlil qilish'] },
    { name: 'Baholash',      value: getPercentage("Baholash"),   color: SKILL_COLORS['Baholash']      },
    { name: 'Sintezlash',    value: getPercentage("Sintezlash"), color: SKILL_COLORS['Sintezlash']    },
  ];

  const data = [
    { subject: 'Baholash',   score: getPercentage("Baholash")   },
    { subject: 'Tahlil',     score: getPercentage("Tahlil")     },
    { subject: 'Sintezlash', score: getPercentage("Sintezlash") },
    { subject: "Qo'llash",   score: getPercentage("Qo'llash")   },
    { subject: 'Tushunish',  score: getPercentage("Tushunish")  },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">08</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Ko'nikmalar profili</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Score rows — same on all screens */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Fikrlash darajalari</div>
          <div className="divide-y divide-slate-100">
            {bars.map((bar) => (
              <div key={bar.name} className="py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bar.color }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bar.name}</span>
                  </div>
                  <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-3xl font-black leading-none" style={{ color: bar.color }}>{bar.value}</span>
                  <span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Radar chart — desktop visual bonus */}
        <div className="hidden md:flex bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-col">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Fikrlash xaritasi</div>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                <defs>
                  <linearGradient id="radarGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1e3a8a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="#f1f5f9" strokeWidth={1.5} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'General Sans', fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Radar name="Natija" dataKey="score" stroke="#1e3a8a" strokeWidth={2} fill="url(#radarGradient2)" />
                <Radar dataKey="score" stroke="none" fill="#1e3a8a" fillOpacity={1}
                  dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
