import type { QuestionBlueprint } from '../lib/blueprint';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function DifficultyGrid({ results = {}, blueprint }: Props) {
  const diffStats = {
    Oson: { total: 0, correct: 0 },
    "O'rta": { total: 0, correct: 0 },
    Qiyin: { total: 0, correct: 0 },
  };

  blueprint.forEach(q => {
    diffStats[q.difficulty].total++;
    if (results[q.id]) {
      diffStats[q.difficulty].correct++;
    }
  });

  const getPercent = (d: keyof typeof diffStats) => {
    if (diffStats[d].total === 0) return 0;
    return Math.round((diffStats[d].correct / diffStats[d].total) * 100);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>05</span>
      </div>
      <h2 className="text-2xl font-bold text-neutral-main">Bilim chuqurligi</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-1">Oson</h3>
            <p className="text-sm text-neutral-secondary mb-4">Asosiy tushunchalar</p>
            <div className="text-3xl font-display font-bold text-success mb-1">{getPercent('Oson')}%</div>
            <p className="text-sm text-neutral-secondary font-medium">{diffStats['Oson'].correct}/{diffStats['Oson'].total} to'g'ri</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-1">O'rta</h3>
            <p className="text-sm text-neutral-secondary mb-4">Qo'llash va tahlil</p>
            <div className="text-3xl font-display font-bold text-primary mb-1">{getPercent("O'rta")}%</div>
            <p className="text-sm text-neutral-secondary font-medium">{diffStats["O'rta"].correct}/{diffStats["O'rta"].total} to'g'ri</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-1">Qiyin</h3>
            <p className="text-sm text-neutral-secondary mb-4">Mantiq va sintez</p>
            <div className="text-3xl font-display font-bold text-purple-600 mb-1">{getPercent('Qiyin')}%</div>
            <p className="text-sm text-neutral-secondary font-medium">{diffStats['Qiyin'].correct}/{diffStats['Qiyin'].total} to'g'ri</p>
          </div>
      </div>
    </section>
  );
}
