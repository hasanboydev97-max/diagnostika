import { BrainCircuit, Lightbulb, Puzzle, Layers, Sparkles } from 'lucide-react';
import type { ThinkingType, QuestionBlueprint } from '../lib/blueprint';

const thinkingNodes = [
  {
    id: 'analytical',
    name: 'Analitik',
    type: 'Analitik' as ThinkingType,
    color: '#1e3a8a',
    bgColor: 'bg-primary',
    icon: <Layers size={16} />,
    path: "M 50 50 C 40 50, 25 40, 25 25"
  },
  {
    id: 'inductive',
    name: 'Induktiv',
    type: 'Induktiv' as ThinkingType,
    color: '#d97706',
    bgColor: 'bg-warning',
    icon: <Lightbulb size={16} />,
    path: "M 50 50 C 60 50, 75 40, 75 25"
  },
  {
    id: 'deductive',
    name: 'Deduktiv',
    type: 'Deduktiv' as ThinkingType,
    color: '#059669',
    bgColor: 'bg-success',
    icon: <Puzzle size={16} />,
    path: "M 50 50 C 40 50, 25 60, 25 75"
  },
  {
    id: 'spatial',
    name: 'Fazoviy',
    type: 'Fazoviy' as ThinkingType,
    color: '#dc2626',
    bgColor: 'bg-danger',
    icon: <Sparkles size={16} />,
    path: "M 50 50 C 60 50, 75 60, 75 75"
  }
];

interface Props {
  results?: Record<number, boolean>;
  blueprint: QuestionBlueprint[];
}

export default function ThinkingTypeGraph({ results = {}, blueprint }: Props) {
  const dynamicNodes = thinkingNodes.map(node => {
    const qs = blueprint.filter(q => q.thinkingType === node.type);
    const correct = qs.filter(q => results[q.id]).length;
    const score = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    return { ...node, score, correct, total: qs.length };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">09</span>
      </div>
      <h2 className="text-lg md:text-2xl font-display font-bold text-neutral-main">
        Fikrlash turlari profili
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score rows — same on all screens */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit size={12} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fikrlash turlari</span>
          </div>
          <div className="divide-y divide-slate-100">
            {dynamicNodes.map((node) => (
              <div key={node.id} className="py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{node.name}</span>
                  </div>
                  <div className="h-[3px] bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${node.score}%`, backgroundColor: node.color }} />
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                    {node.correct}/{node.total} to'g'ri
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-3xl font-black leading-none" style={{ color: node.color }}>{node.score}</span>
                  <span className="text-xs font-bold text-slate-400 ml-0.5">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Mind-map SVG visual */}
        <div className="hidden md:flex bg-[#f8fafc] rounded-2xl border border-slate-100 p-8 relative overflow-hidden items-center justify-center">
          <div className="absolute inset-0 opacity-40 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {dynamicNodes.map(node => (
                <linearGradient key={`g-${node.id}`} id={`g-${node.id}`} x1="50%" y1="50%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.05" />
                  <stop offset="100%" stopColor={node.color} stopOpacity="0.6" />
                </linearGradient>
              ))}
            </defs>
            {dynamicNodes.map(node => (
              <g key={`path-${node.id}`}>
                <path d={node.path} stroke="#e2e8f0" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="5 5" />
                <path d={node.path} stroke={`url(#g-${node.id})`} strokeWidth="3" fill="none"
                  vectorEffect="non-scaling-stroke" strokeLinecap="round"
                  className="animate-pulse" style={{ animationDuration: '3s' }} />
              </g>
            ))}
          </svg>

          {/* Center hub */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-primary rounded-full shadow-[0_0_40px_rgba(30,58,138,0.3)] border-[6px] border-white text-white flex flex-col items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20" style={{ animationDuration: '4s' }} />
              <BrainCircuit size={28} className="mb-1 text-blue-200" />
              <span className="font-black text-[9px] tracking-widest uppercase opacity-70">Fikrlash</span>
            </div>
          </div>

          {/* Corner labels */}
          {dynamicNodes.map((node, i) => {
            const positions = ['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'];
            return (
              <div key={node.id} className={`absolute ${positions[i]} flex items-center gap-1.5 z-10`}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${node.color}20`, color: node.color }}>
                  {node.icon}
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{node.name}</div>
                  <div className="text-sm font-black" style={{ color: node.color }}>{node.score}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%  { transform: skewX(-20deg) translateX(-150%); }
          50% { transform: skewX(-20deg) translateX(250%);  }
          100%{ transform: skewX(-20deg) translateX(250%);  }
        }
      `}</style>
    </section>
  );
}
