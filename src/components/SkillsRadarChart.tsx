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

export default function SkillsRadarChart({ results = {}, blueprint }: Props) {
  // Ko'nikmalarni guruhlash (Tushunish, Qo'llash, Tahlil, Baholash, Sintezlash)
  const skillStats: Record<string, { total: number; correct: number }> = {
    "Tushunish": { total: 0, correct: 0 },
    "Qo'llash": { total: 0, correct: 0 },
    "Tahlil": { total: 0, correct: 0 },
    "Baholash": { total: 0, correct: 0 },
    "Sintezlash": { total: 0, correct: 0 }
  };

  blueprint.forEach(q => {
    const isCorrect = results[q.id] || false;
    
    // Fallback in case skill name differs slightly
    let skillKey = q.skill as string;
    if (skillKey === "Tahlil qilish") skillKey = "Tahlil";
    
    if (skillStats[skillKey]) {
      skillStats[skillKey].total++;
      if (isCorrect) {
        skillStats[skillKey].correct++;
      }
    }
  });

  const getPercentage = (skill: string) => {
    const stat = skillStats[skill];
    if (!stat || stat.total === 0) return 0;
    return Math.round((stat.correct / stat.total) * 100);
  };

  const pTushunish = getPercentage("Tushunish");
  const pQollash = getPercentage("Qo'llash");
  const pTahlil = getPercentage("Tahlil");
  const pBaholash = getPercentage("Baholash");
  const pSintezlash = getPercentage("Sintezlash");

  const data = [
    { subject: 'Baholash', score: pBaholash },
    { subject: 'Tahlil', score: pTahlil },
    { subject: 'Sintezlash', score: pSintezlash },
    { subject: 'Qo\'llash', score: pQollash },
    { subject: 'Tushunish', score: pTushunish },
  ];

  const getBarColor = (val: number) => {
    if(val >= 80) return 'bg-success';
    if(val < 40) return 'bg-danger';
    return 'bg-warning';
  };

  const dynamicBars = [
    { name: 'Tushunish', value: pTushunish, color: getBarColor(pTushunish) },
    { name: 'Qo\'llash', value: pQollash, color: getBarColor(pQollash) },
    { name: 'Tahlil qilish', value: pTahlil, color: getBarColor(pTahlil) },
    { name: 'Baholash', value: pBaholash, color: getBarColor(pBaholash) },
    { name: 'Sintezlash', value: pSintezlash, color: getBarColor(pSintezlash) },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">08</span>
      </div>
      <h2 className="text-2xl text-neutral-main">Ko'nikmalar profili va Fikrlash darajalari</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-border/50 p-10 flex flex-col relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
          
          <h3 className="text-xs font-bold text-neutral-secondary mb-2 uppercase tracking-widest text-center">Fikrlash ko'nikmalari</h3>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <PolarGrid stroke="#f1f5f9" strokeWidth={1.5} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 13, fontFamily: 'General Sans', fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Radar name="Natija" dataKey="score" stroke="#1e3a8a" strokeWidth={2} fill="url(#radarGradient)" />
                {/* Add subtle dots at vertices */}
                <Radar dataKey="score" stroke="none" fill="#1e3a8a" fillOpacity={1} dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-neutral-secondary text-center mt-2 px-6 leading-relaxed">
            Haqiqiy tahlil natijalari (Tanlangan sinf shabloni asosida 100% aniqlik bilan hisoblandi).
          </p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-border/50 p-10 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-neutral-secondary mb-10 uppercase tracking-widest">Fikrlash darajalari (foizda)</h3>
          <div className="space-y-7">
            {dynamicBars.map((bar, index) => (
              <div key={index} className="group">
                <div className="flex justify-between text-sm font-medium mb-3">
                  <span className="text-neutral-main group-hover:text-primary transition-colors">{bar.name}</span>
                  <span className={`font-display font-semibold ${bar.value >= 80 ? 'text-success' : bar.value < 40 ? 'text-danger' : 'text-warning'}`}>
                    {bar.value}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]`} style={{ width: `${bar.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
