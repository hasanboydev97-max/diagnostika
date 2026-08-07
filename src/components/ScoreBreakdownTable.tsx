interface Props {
  scores: Record<string, number>;
  totalScore: number;
}

export default function ScoreBreakdownTable({ scores, totalScore }: Props) {
  const categories = Object.keys(scores || {});
  const numCategories = categories.length || 1;
  const weightPercent = (100 / numCategories).toFixed(1);

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
              {categories.map((category) => {
                const rawScore = scores[category];
                const impact = (rawScore / numCategories).toFixed(1);
                return (
                  <tr key={category} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium">{category}</td>
                    <td className="px-3 py-3 md:px-6 md:py-4">{rawScore}/100</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 text-slate-500">× {weightPercent}%</td>
                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium">= {impact}</td>
                  </tr>
                );
              })}
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
        <strong>Formula:</strong> Har bir fanning bahosi barcha fanlar yig'indisining {weightPercent}% qismini tashkil qiladi.
      </div>
    </section>
  );
}
