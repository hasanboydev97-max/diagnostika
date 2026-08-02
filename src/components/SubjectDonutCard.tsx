import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const categories = [
  { key: 'math',       name: 'Matematika',       fill: '#059669' },
  { key: 'logic',      name: 'Mantiq',            fill: '#0284c7' },
  { key: 'analytical', name: 'Analitik fikrlash', fill: '#d97706' },
  { key: 'verbal',     name: "Og'zaki nutq",      fill: '#7c3aed' },
  { key: 'creativity', name: 'Kreativlik',        fill: '#e11d48' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-xl px-4 py-3 rounded-xl text-sm">
        <div className="font-bold text-neutral-main mb-2">{data.name}</div>
        <div className="flex items-center gap-2">
          <span className="font-black" style={{ color: data.fill }}>{data.value}%</span>
          <span className="text-xs font-medium text-slate-400">({data.correct}/{data.total} to'g'ri)</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function SubjectDonutCard({ results = {}, blueprint }: Props) {
  const chartData = categories.map(cat => {
    const qs = blueprint.filter(q => q.category === cat.key);
    const correct = qs.filter(q => results[q.id]).length;
    const value = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    // We add a tiny baseline so even 0% shows a tiny bit of color, or just rely on background.
    return { ...cat, value, correct, total: qs.length };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">06</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Fanlar bo'yicha o'zlashtirish</h2>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-8 flex flex-col md:flex-row items-center gap-8">
        
        <div className="w-full md:w-1/2 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="25%" 
              outerRadius="100%" 
              barSize={16} 
              data={chartData}
              startAngle={180}
              endAngle={-180}
            >
              <RadialBar
                background={{ fill: '#f1f5f9' }}
                dataKey="value"
                cornerRadius={10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
            Fanlar ko'rsatkichi
          </div>
          {chartData.map((item) => (
            <div key={item.key} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.fill}15` }}>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-neutral-main mb-1">{item.name}</div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${item.value}%`, backgroundColor: item.fill }} 
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-black" style={{ color: item.fill }}>{item.value}%</div>
                <div className="text-[10px] font-bold text-slate-400">{item.correct}/{item.total}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
