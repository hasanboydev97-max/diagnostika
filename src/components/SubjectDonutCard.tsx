import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { SubjectCategory, QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function SubjectDonutCard({ results = {}, blueprint }: Props) {
  const categories: { key: SubjectCategory; label: string; color: string }[] = [
    { key: 'math', label: 'Matematika', color: '#059669' },
    { key: 'logic', label: 'Mantiq', color: '#0284c7' },
    { key: 'analytical', label: 'Analitik fikrlash', color: '#d97706' },
    { key: 'verbal', label: 'Og\'zaki nutq', color: '#7c3aed' },
    { key: 'creativity', label: 'Kreativlik', color: '#e11d48' }
  ];

  const donuts = categories.map(cat => {
    const qs = blueprint.filter(q => q.category === cat.key);
    const correct = qs.filter(q => results[q.id]).length;
    const value = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    
    // override color if 0%
    const finalColor = value === 0 ? '#dc2626' : cat.color;

    return {
      name: cat.label,
      value,
      color: finalColor,
      count: qs.length
    };
  });
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">06</span>
      </div>
      <h2 className="text-2xl text-neutral-main">Fanlar bo'yicha o'zlashtirish (Asosiy yo'nalishlar)</h2>
      
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {donuts.map((item, index) => (
          <div key={index} className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-border/50 p-3 sm:p-5 flex flex-col items-center text-center transition-premium hover:shadow-md hover:-translate-y-1 group">
            <h3 className="text-[9px] sm:text-xs font-bold text-neutral-secondary mb-3 sm:mb-5 h-8 flex items-center justify-center uppercase tracking-widest leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
              {item.name}
            </h3>
            
            <div className="w-16 h-16 sm:w-24 sm:h-24 relative mb-3 sm:mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: item.value || 1 }, { value: Math.max(100 - item.value, 0) }]}
                    cx="50%"
                    cy="50%"
                    innerRadius="75%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={5}
                    paddingAngle={0}
                  >
                    <Cell fill={item.value === 0 ? '#fca5a5' : item.color} />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline">
                  <span className="text-xl sm:text-2xl font-display font-semibold tracking-tighter" style={{ color: item.value === 0 ? '#dc2626' : item.color }}>{item.value}</span>
                  <span className="text-[10px] sm:text-sm font-medium ml-0.5 opacity-60" style={{ color: item.value === 0 ? '#dc2626' : item.color }}>%</span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] sm:text-xs text-neutral-secondary font-medium bg-background-main px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap">
              {item.count} ta savol
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
