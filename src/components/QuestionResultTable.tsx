
import { CheckCircle2, XCircle } from 'lucide-react';
import type { QuestionBlueprint } from '../lib/blueprint';
import FormattedText from './FormattedText';

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function QuestionResultTable({ results = {}, blueprint }: Props) {
  const displayQuestions = blueprint.map(q => ({
    ...q,
    correct: !!results[q.id]
  }));
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>04</span>
      </div>
      <h2 className="text-2xl font-bold text-neutral-main">Har bir savol</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-neutral-secondary uppercase tracking-wider font-semibold border-b border-border text-[10px] md:text-xs">
              <tr>
                <th className="px-2 py-3 md:px-6 md:py-4 w-8 md:w-16">#</th>
                <th className="px-2 py-3 md:px-6 md:py-4">Mavzu / Savol matni (qisqacha)</th>
                <th className="px-2 py-3 md:px-6 md:py-4 hidden sm:table-cell">Ko'nikma</th>
                <th className="px-2 py-3 md:px-6 md:py-4 hidden md:table-cell">Sarflangan vaqt</th>
                <th className="px-2 py-3 md:px-6 md:py-4 text-center">Qiyinlik</th>
                <th className="px-2 py-3 md:px-6 md:py-4 text-center">Natija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-neutral-main text-[11px] md:text-sm">
              {displayQuestions.map((q) => (
                <tr key={q.id} className={`transition-colors ${q.correct ? 'hover:bg-slate-50' : 'bg-amber-50 hover:bg-amber-100/50 border-l-2 md:border-l-4 border-l-warning'}`}>
                  <td className="px-2 py-3 md:px-6 md:py-4 font-medium text-slate-400">{String(q.id).padStart(2, '0')}</td>
                  <td className="px-2 py-3 md:px-6 md:py-4 font-medium min-w-[120px]">
                    <div className="line-clamp-2"><FormattedText content={q.topic} /></div>
                    {/* Show skill on mobile inside topic column */}
                    <div className="text-[9px] text-slate-500 mt-1 sm:hidden">{q.skill}</div>
                  </td>
                  <td className="px-2 py-3 md:px-6 md:py-4 text-slate-600 whitespace-nowrap hidden sm:table-cell">{q.skill}</td>
                  <td className="px-2 py-3 md:px-6 md:py-4 text-slate-500 whitespace-nowrap hidden md:table-cell">{q.timeEstimate}</td>
                  <td className="px-1 py-3 md:px-6 md:py-4 text-center">
                    <span className={`px-1.5 py-1 md:px-2 rounded-md text-[9px] md:text-xs font-medium whitespace-nowrap ${
                      q.difficulty === 'Oson' ? 'bg-success/10 text-success' :
                      q.difficulty === 'O\'rta' ? 'bg-primary/10 text-primary' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-2 py-3 md:px-6 md:py-4 flex justify-center items-center h-full">
                    {q.correct ? (
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-border p-4 text-center text-sm text-primary font-medium cursor-pointer hover:bg-slate-100 transition-colors">
          Barcha savollarni ko'rish &darr;
        </div>
      </div>
    </section>
  );
}
