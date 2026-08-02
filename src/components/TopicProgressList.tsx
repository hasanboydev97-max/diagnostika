import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function TopicProgressList({ results = {}, blueprint }: Props) {
  const topicsMap: Record<string, { total: number; correct: number }> = {};
  
  blueprint.forEach(q => {
    if (!topicsMap[q.topic]) {
      topicsMap[q.topic] = { total: 0, correct: 0 };
    }
    topicsMap[q.topic].total++;
    if (results[q.id]) topicsMap[q.topic].correct++;
  });

  const allTopics = Object.entries(topicsMap).map(([name, stat]) => ({
    name,
    score: Math.round((stat.correct / stat.total) * 100),
    correct: stat.correct,
    total: stat.total,
  }));

  // Group topics by mastery level
  const strong = allTopics.filter(t => t.score >= 80).sort((a, b) => b.score - a.score);
  const average = allTopics.filter(t => t.score >= 40 && t.score < 80).sort((a, b) => b.score - a.score);
  const weak = allTopics.filter(t => t.score < 40).sort((a, b) => a.score - b.score);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">07</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Mavzular bo'yicha tahlil</h2>
          <p className="text-xs md:text-sm text-neutral-secondary mt-1">
            Qaysi mavzularda kuchlisiz va qaysilarida oqsoqlik bor?
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Strong Topics */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-emerald-50/50 p-4 border-b border-emerald-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">Kuchli o'zlashtirilgan</h3>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">{strong.length} ta mavzu</div>
            </div>
          </div>
          <div className="p-4 flex-1">
            {strong.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Mavzular yo'q</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {strong.map(t => (
                  <div key={t.name} className="group relative px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-default">
                    <span className="text-xs font-semibold text-emerald-800">{t.name}</span>
                    <span className="ml-2 text-[10px] font-black text-emerald-600">{t.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Average Topics */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-amber-50/50 p-4 border-b border-amber-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">Rivojlantirish kerak</h3>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{average.length} ta mavzu</div>
            </div>
          </div>
          <div className="p-4 flex-1">
            {average.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Mavzular yo'q</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {average.map(t => (
                  <div key={t.name} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-default">
                    <span className="text-xs font-semibold text-amber-800">{t.name}</span>
                    <span className="ml-2 text-[10px] font-black text-amber-600">{t.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-rose-50/50 p-4 border-b border-rose-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 text-sm">Qayta o'qish zarur</h3>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">{weak.length} ta mavzu</div>
            </div>
          </div>
          <div className="p-4 flex-1">
            {weak.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Mavzular yo'q</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weak.map(t => (
                  <div key={t.name} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-default">
                    <span className="text-xs font-semibold text-rose-800">{t.name}</span>
                    <span className="ml-2 text-[10px] font-black text-rose-600">{t.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
