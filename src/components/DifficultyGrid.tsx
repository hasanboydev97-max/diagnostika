import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const levels = [
  { key: 'Oson' as const, label: 'Oson', sub: 'Asosiy tushunchalar', color: '#059669' },
  { key: "O'rta" as const, label: "O'rta", sub: "Qo'llash va tahlil", color: '#0284c7' },
  { key: 'Qiyin' as const, label: 'Qiyin', sub: 'Mantiq va sintez', color: '#e11d48' },
] as const;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-xl px-4 py-3 rounded-xl text-sm">
        <div className="font-bold text-neutral-main mb-1">{data.label}</div>
        <div className="text-xs text-slate-500 mb-2">{data.sub}</div>
        <div className="flex items-center gap-2">
          <span className="font-black" style={{ color: data.color }}>{data.value}%</span>
          <span className="text-xs font-medium text-slate-400">({data.correct}/{data.total} to'g'ri)</span>
        </div>
      </div>
    );
  }
  return null;
};

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

  const chartData = levels.map(level => {
    const stat = diffStats[level.key];
    const value = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    return {
      name: level.key,
      label: level.label,
      sub: level.sub,
      value,
      correct: stat.correct,
      total: stat.total,
      color: level.color,
    };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>05</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Bilim chuqurligi</h2>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 flex flex-col items-center">
        <div className="w-full h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
