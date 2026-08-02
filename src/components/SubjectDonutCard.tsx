import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const categories = [
  { key: 'math'       as const, label: 'Matematika',       color: '#059669', light: '#d1fae5' },
  { key: 'logic'      as const, label: 'Mantiq',            color: '#0284c7', light: '#e0f2fe' },
  { key: 'analytical' as const, label: 'Analitik fikrlash', color: '#d97706', light: '#fef3c7' },
  { key: 'verbal'     as const, label: "Og'zaki nutq",      color: '#7c3aed', light: '#ede9fe' },
  { key: 'creativity' as const, label: 'Kreativlik',        color: '#e11d48', light: '#ffe4e6' },
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {rows.map((item) => {
          const chartData = [
            { name: 'To\'g\'ri', value: item.value },
            { name: 'Xato', value: 100 - item.value }
          ];

          return (
            <div key={item.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center">
              <div className="h-28 w-28 relative mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={item.color} />
                      <Cell fill={item.light} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black leading-none" style={{ color: item.color }}>
                    {item.value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 leading-none mt-0.5">%</span>
                </div>
              </div>
              
              <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-600 text-center mb-1 leading-tight min-h-[30px] flex items-center justify-center">
                {item.label}
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                {item.correct}/{item.total} ta savol
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
