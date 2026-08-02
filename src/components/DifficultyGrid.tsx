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
      
      <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-2 md:mb-4">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-0.5 md:mb-1 text-sm md:text-base">Oson</h3>
            <p className="text-[10px] md:text-sm text-neutral-secondary mb-2 md:mb-4 hidden sm:block">Asosiy tushunchalar</p>
            <div className="text-2xl md:text-3xl font-display font-bold text-success mb-0.5 md:mb-1">{getPercent('Oson')}%</div>
            <p className="text-[10px] md:text-sm text-neutral-secondary font-medium">{diffStats['Oson'].correct}/{diffStats['Oson'].total}</p>
          </div>
          
          <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 md:mb-4">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-0.5 md:mb-1 text-sm md:text-base">O'rta</h3>
            <p className="text-[10px] md:text-sm text-neutral-secondary mb-2 md:mb-4 hidden sm:block">Qo'llash va tahlil</p>
            <div className="text-2xl md:text-3xl font-display font-bold text-primary mb-0.5 md:mb-1">{getPercent("O'rta")}%</div>
            <p className="text-[10px] md:text-sm text-neutral-secondary font-medium">{diffStats["O'rta"].correct}/{diffStats["O'rta"].total}</p>
          </div>
          
          <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 border border-border shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2 md:mb-4">
              <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-main mb-0.5 md:mb-1 text-sm md:text-base">Qiyin</h3>
            <p className="text-[10px] md:text-sm text-neutral-secondary mb-2 md:mb-4 hidden sm:block">Mantiq va sintez</p>
            <div className="text-2xl md:text-3xl font-display font-bold text-purple-600 mb-0.5 md:mb-1">{getPercent('Qiyin')}%</div>
            <p className="text-[10px] md:text-sm text-neutral-secondary font-medium">{diffStats['Qiyin'].correct}/{diffStats['Qiyin'].total}</p>
          </div>
      </div>
    </section>
  );
}
