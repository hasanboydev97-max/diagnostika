import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function TopicProgressList({ results = {}, blueprint }: Props) {
  // Barcha mavzularni yig'ish va ularning nechtasi to'g'ri bo'lganini hisoblash
  const topicStats: Record<string, { total: number; correct: number }> = {};
  
  blueprint.forEach(q => {
    if (!topicStats[q.topic]) {
      topicStats[q.topic] = { total: 0, correct: 0 };
    }
    topicStats[q.topic].total++;
    if (results[q.id]) {
      topicStats[q.topic].correct++;
    }
  });

  const topics = Object.entries(topicStats).map(([name, stats]) => {
    const value = Math.round((stats.correct / stats.total) * 100);
    const color = value >= 80 ? 'bg-success' : value === 0 ? 'bg-danger/80' : 'bg-warning';
    return { name, value, color };
  }).sort((a, b) => b.value - a.value); // Eng yuqori ballilar tepada
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>07</span>
      </div>
      <h2 className="text-2xl font-bold text-neutral-main">Mavzular bo'yicha</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-border p-4 md:p-8">
        <div className="space-y-4 md:space-y-5">
          {topics.map((topic, index) => (
            <div key={index} className="flex items-center gap-3 md:gap-6">
              <div className="w-1/3 md:w-1/4 text-xs md:text-sm font-medium text-neutral-main truncate" title={topic.name}>
                {topic.name}
              </div>
              <div className="flex-1 h-2 md:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${topic.color} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${topic.value}%` }}
                ></div>
              </div>
              <div className={`w-10 md:w-12 text-right text-xs md:text-sm font-bold ${
                topic.value >= 80 ? 'text-success' : topic.value === 0 ? 'text-danger/80' : 'text-warning'
              }`}>
                {topic.value}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
