import { CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
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

  const strong = allTopics.filter(t => t.score >= 80).sort((a, b) => b.score - a.score);
  const average = allTopics.filter(t => t.score >= 40 && t.score < 80).sort((a, b) => b.score - a.score);
  const weak = allTopics.filter(t => t.score < 40).sort((a, b) => a.score - b.score);

  const tiers = [
    {
      id: 'strong',
      title: "Kuchli o'zlashtirilgan",
      desc: "Yaxshi tushunilgan va ishonchli mavzular",
      items: strong,
      icon: <CheckCircle2 size={22} />,
      classes: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-100",
        text: "text-emerald-900",
        textDesc: "text-emerald-700/70",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        badgeBg: "bg-emerald-100/50",
        badgeText: "text-emerald-700",
        chipBg: "bg-emerald-50/50 hover:bg-emerald-50",
        chipBorder: "border-emerald-100",
        scoreText: "text-emerald-600",
      }
    },
    {
      id: 'average',
      title: "Rivojlantirish kerak",
      desc: "Qisman tushunilgan, takrorlashni talab qiladi",
      items: average,
      icon: <TrendingUp size={22} />,
      classes: {
        bg: "bg-amber-50/50",
        border: "border-amber-100",
        text: "text-amber-900",
        textDesc: "text-amber-700/70",
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        badgeBg: "bg-amber-100/50",
        badgeText: "text-amber-700",
        chipBg: "bg-amber-50/50 hover:bg-amber-50",
        chipBorder: "border-amber-100",
        scoreText: "text-amber-600",
      }
    },
    {
      id: 'weak',
      title: "Qayta o'qish zarur",
      desc: "Oqsoqlik bor, qayta o'qilishi shart",
      items: weak,
      icon: <AlertTriangle size={22} />,
      classes: {
        bg: "bg-rose-50/50",
        border: "border-rose-100",
        text: "text-rose-900",
        textDesc: "text-rose-700/70",
        iconBg: "bg-rose-100",
        iconColor: "text-rose-600",
        badgeBg: "bg-rose-100/50",
        badgeText: "text-rose-700",
        chipBg: "bg-rose-50/50 hover:bg-rose-50",
        chipBorder: "border-rose-100",
        scoreText: "text-rose-600",
      }
    }
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">07</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Mavzular bo'yicha tahlil</h2>
          <p className="text-xs md:text-sm text-neutral-secondary mt-1">
            Qaysi mavzularda kuchlisiz va qaysilarida oqsoqlik bor?
          </p>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {tiers.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Header Panel */}
            <div className={`p-5 md:w-64 shrink-0 ${t.classes.bg} border-b md:border-b-0 md:border-r ${t.classes.border} flex flex-col justify-center`}>
              <div className={`w-10 h-10 rounded-2xl ${t.classes.iconBg} flex items-center justify-center mb-4 ${t.classes.iconColor} shadow-sm`}>
                {t.icon}
              </div>
              <h3 className={`font-bold ${t.classes.text} text-base mb-1`}>{t.title}</h3>
              <p className={`text-[11px] md:text-xs ${t.classes.textDesc} mb-4 leading-relaxed`}>{t.desc}</p>
              <div className={`inline-flex items-center justify-center px-3 py-1.5 ${t.classes.badgeBg} ${t.classes.badgeText} text-[10px] font-black uppercase tracking-widest rounded-lg w-fit`}>
                {t.items.length} ta mavzu
              </div>
            </div>
            
            {/* Right Content Panel */}
            <div className="p-5 flex-1 bg-white">
              {t.items.length === 0 ? (
                <div className="h-full min-h-[60px] flex items-center justify-center md:justify-start text-sm text-slate-400/80 italic font-medium">
                  Ushbu toifaga kiruvchi mavzular yo'q
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {t.items.map(topic => (
                    <div 
                      key={topic.name} 
                      className={`group px-3 py-2 ${t.classes.chipBg} border ${t.classes.chipBorder} rounded-xl transition-all hover:shadow-sm cursor-default flex items-center gap-3`}
                    >
                      <span className="text-xs md:text-sm font-semibold text-slate-700">{topic.name}</span>
                      <span className={`text-[10px] md:text-xs font-black ${t.classes.scoreText} bg-white px-2 py-0.5 rounded-md shadow-sm border ${t.classes.chipBorder}`}>
                        {topic.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
