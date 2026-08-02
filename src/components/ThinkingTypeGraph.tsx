import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { QuestionBlueprint, ThinkingType } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

const thinkingNodes = [
  { id: 'analytical', name: 'Analitik', type: 'Analitik' as ThinkingType },
  { id: 'inductive', name: 'Induktiv', type: 'Induktiv' as ThinkingType },
  { id: 'deductive', name: 'Deduktiv', type: 'Deduktiv' as ThinkingType },
  { id: 'spatial', name: 'Fazoviy', type: 'Fazoviy' as ThinkingType },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-xl px-4 py-3 rounded-xl text-sm">
        <div className="font-bold text-neutral-main mb-2">{data.name} fikrlash</div>
        <div className="flex items-center gap-2">
          <span className="font-black text-primary">{data.score}%</span>
          <span className="text-xs font-medium text-slate-400">({data.correct}/{data.total})</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ThinkingTypeGraph({ results = {}, blueprint }: Props) {
  const chartData = thinkingNodes.map(node => {
    const qs = blueprint.filter(q => q.thinkingType === node.type);
    const correct = qs.filter(q => results[q.id]).length;
    const score = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    return { ...node, score, correct, total: qs.length };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">09</span>
      </div>
      <h2 className="text-lg md:text-2xl font-display font-bold text-neutral-main">
        Fikrlash turlari profili
      </h2>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#1e3a8a" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#1e3a8a' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
