import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-xl px-4 py-3 rounded-xl text-sm">
        <div className="font-bold text-neutral-main mb-2">{data.name}</div>
        <div className="flex items-center gap-2">
          <span className="font-black text-primary">{data.value}%</span>
          <span className="text-xs font-medium text-slate-400">({data.correct}/{data.total} to'g'ri)</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function TopicProgressList({ results = {}, blueprint }: Props) {
  const topicsMap: Record<string, { total: number; correct: number }> = {};
  
  blueprint.forEach(q => {
    if (!topicsMap[q.topic]) {
      topicsMap[q.topic] = { total: 0, correct: 0 };
    }
    topicsMap[q.topic].total++;
    if (results[q.id]) topicsMap[q.topic].correct++;
  });

  const chartData = Object.entries(topicsMap)
    .map(([topic, stat]) => ({
      name: topic,
      value: Math.round((stat.correct / stat.total) * 100),
      correct: stat.correct,
      total: stat.total,
    }))
    .sort((a, b) => b.value - a.value); // Sort by highest score first

  const chartHeight = Math.max(300, chartData.length * 45); // Dynamic height based on items

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>07</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Mavzular bo'yicha tahlil</h2>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 overflow-hidden">
        <div className="w-full mt-2" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value >= 75 ? '#059669' : entry.value >= 40 ? '#d97706' : '#e11d48'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
