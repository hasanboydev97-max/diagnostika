interface Props {
  scores: {
    math: number;
    logic: number;
    analytical: number;
    verbal: number;
    creativity: number;
  };
  totalScore: number;
}

export default function ScoreBreakdownTable({ scores, totalScore }: Props) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span>03</span>
      </div>
      <h2 className="text-2xl font-bold text-neutral-main">Umumiy ball qanday hisoblandi</h2>
      <p className="text-neutral-secondary mb-6">Har bir fan bo'yicha olingan xom ballar va ularning yakuniy ballga ta'siri (vazni).</p>
      
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-neutral-secondary uppercase tracking-wider font-semibold border-b border-border text-[10px] md:text-xs">
              <tr>
                <th className="px-3 py-3 md:px-6 md:py-4">Fan</th>
                <th className="px-3 py-3 md:px-6 md:py-4">Xom ball</th>
                <th className="px-3 py-3 md:px-6 md:py-4">Fan vazni</th>
                <th className="px-3 py-3 md:px-6 md:py-4">Hissa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-neutral-main text-xs md:text-sm">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">Matematika</td>
                <td className="px-3 py-3 md:px-6 md:py-4">{scores.math}/100</td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× 20%</td>
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {(scores.math * 0.2).toFixed(1)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">Mantiq</td>
                <td className="px-3 py-3 md:px-6 md:py-4">{scores.logic}/100</td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× 20%</td>
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {(scores.logic * 0.2).toFixed(1)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">Analitik fikrlash</td>
                <td className="px-3 py-3 md:px-6 md:py-4">{scores.analytical}/100</td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× 20%</td>
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {(scores.analytical * 0.2).toFixed(1)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">Og'zaki nutq</td>
                <td className="px-3 py-3 md:px-6 md:py-4">{scores.verbal}/100</td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× 20%</td>
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {(scores.verbal * 0.2).toFixed(1)}</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">Kreativlik</td>
                <td className="px-3 py-3 md:px-6 md:py-4">{scores.creativity}/100</td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× 20%</td>
                <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {(scores.creativity * 0.2).toFixed(1)}</td>
              </tr>
              <tr className="bg-slate-50 font-bold border-t-2 border-border">
                <td className="px-3 py-3 md:px-6 md:py-4">Umumiy o'rtacha ball</td>
                <td className="px-3 py-3 md:px-6 md:py-4"></td>
                <td className="px-3 py-3 md:px-6 md:py-4"></td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-primary text-base md:text-lg">{totalScore}/100</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-sm text-neutral-secondary bg-slate-50 p-4 rounded-xl border border-border">
        <strong>Formula:</strong> Har bir fanning bahosi barcha fanlar yig'indisining 20% qismini tashkil qiladi.
      </div>
    </section>
  );
}
