import { BrainCircuit, Lightbulb, Puzzle, Layers, Sparkles } from 'lucide-react';
import type { ThinkingType, QuestionBlueprint } from '../lib/blueprint';

const thinkingNodes = [
  { 
    id: 'analytical', 
    name: 'Analitik', 
    type: 'Analitik' as ThinkingType,
    color: '#1e3a8a', 
    bgColor: 'bg-primary',
    textColor: 'text-primary',
    light: 'bg-blue-50',
    emoji: '🧩',
    icon: <Layers size={20} />, 
    desc: "Muammoni mayda qismlarga bo'lib, chuqur tahlil qilish va qonuniyatlarni topish qobiliyati.",
    path: "M 50 50 C 40 50, 25 40, 25 25"
  },
  { 
    id: 'inductive', 
    name: 'Induktiv', 
    type: 'Induktiv' as ThinkingType,
    color: '#d97706',
    bgColor: 'bg-warning',
    textColor: 'text-warning',
    light: 'bg-amber-50',
    emoji: '💡',
    icon: <Lightbulb size={20} />, 
    desc: "Kichik detallar va yagona faktlardan kelib chiqib, umumiy to'g'ri xulosaga kela olish.",
    path: "M 50 50 C 60 50, 75 40, 75 25"
  },
  { 
    id: 'deductive', 
    name: 'Deduktiv', 
    type: 'Deduktiv' as ThinkingType,
    color: '#059669', 
    bgColor: 'bg-success',
    textColor: 'text-success',
    light: 'bg-emerald-50',
    emoji: '🔗',
    icon: <Puzzle size={20} />, 
    desc: "Umumiy qoidalar va mavjud haqiqatlardan aniq xususiy xulosalar keltirib chiqarish.",
    path: "M 50 50 C 40 50, 25 60, 25 75"
  },
  { 
    id: 'spatial', 
    name: 'Fazoviy', 
    type: 'Fazoviy' as ThinkingType,
    color: '#dc2626', 
    bgColor: 'bg-danger',
    textColor: 'text-danger',
    light: 'bg-red-50',
    emoji: '🌐',
    icon: <Sparkles size={20} />, 
    desc: "Obyektlarni makonda tasavvur qilish, ularning shakli va o'rnini ongda o'zgartira olish.",
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
    <section className="space-y-4 relative max-w-[1440px] mx-auto pt-4">
      <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
        <span className="font-display">09</span>
      </div>
      <h2 className="text-xl md:text-3xl font-display font-semibold text-neutral-main">
        Fikrlash turlari profili
      </h2>
      <p className="text-neutral-secondary text-xs md:text-sm leading-relaxed">
        Turli xil fikrlash qobiliyatlari qanday shakllangani va o'zaro qanday bog'langanini ko'rsatuvchi markazlashgan tahliliy xarita.
      </p>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="md:hidden bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Mini brain header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-b border-primary/10">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <BrainCircuit size={16} className="text-white" />
          </div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Asosiy Fikrlash Turlari</span>
        </div>

        {/* List rows */}
        {dynamicNodes.map((node, index) => (
          <div
            key={node.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${index < dynamicNodes.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${node.light}`} style={{ color: node.color }}>
              {node.icon}
            </div>

            {/* Name + Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-neutral-main uppercase tracking-wide">{node.name}</span>
                <span className="text-[11px] font-bold ml-2 shrink-0" style={{ color: node.color }}>
                  {node.score}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${node.score}%`, backgroundColor: node.color }}
                />
              </div>
            </div>

            {/* Score badge */}
            <div
              className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ color: node.color, backgroundColor: `${node.color}15` }}
            >
              {node.correct}/{node.total}
            </div>
          </div>
        ))}
      </div>

      {/* ===== DESKTOP LAYOUT (original mind-map) ===== */}
      <div className="hidden md:block bg-[#f8fafc] rounded-[2.5rem] shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] border border-slate-200/60 p-16 relative overflow-hidden">
        
        {/* Decorative Dotted Grid */}
        <div className="absolute inset-0 opacity-[0.5] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>

        {/* SVG Connections */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {dynamicNodes.map(node => (
                <linearGradient key={`grad-${node.id}`} id={`grad-${node.id}`} x1="50%" y1="50%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.1" />
                  <stop offset="100%" stopColor={node.color} stopOpacity="0.7" />
                </linearGradient>
              ))}
            </defs>
            {dynamicNodes.map(node => (
              <g key={`path-${node.id}`}>
                <path d={node.path} stroke="#e2e8f0" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="6 6" />
                <path 
                  d={node.path} 
                  stroke={`url(#grad-${node.id})`} 
                  strokeWidth="4.5" 
                  fill="none" 
                  vectorEffect="non-scaling-stroke" 
                  strokeLinecap="round"
                  className="animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center">
          <div className="w-36 h-36 bg-primary rounded-full shadow-[0_0_50px_rgba(30,58,138,0.35)] border-[8px] border-white text-white flex flex-col items-center justify-center relative group cursor-default">
            <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-25" style={{ animationDuration: '4s' }}></div>
            <div className="absolute -inset-4 rounded-full border border-primary/20"></div>
            <div className="absolute -inset-8 rounded-full border border-primary/10"></div>
            <BrainCircuit size={36} className="mb-2 text-blue-200 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-display font-bold text-xs tracking-widest uppercase opacity-80">Asosiy</span>
            <span className="font-bold text-xl tracking-wide">Fikrlash</span>
          </div>
        </div>

        {/* 2x2 Grid for Cards */}
        <div className="grid grid-cols-2 gap-6 gap-x-48 lg:gap-x-[400px] gap-y-28 relative z-10">
          {dynamicNodes.map((node, i) => (
            <div 
              key={node.id} 
              className={`bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] border border-white hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-500 ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'} max-w-[320px] w-full relative overflow-hidden group`}
            >
              <div className={`absolute top-0 left-0 w-full h-1.5 ${node.bgColor} opacity-90`}></div>
              
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-sm ${node.textColor} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                    {node.icon}
                  </div>
                  <h3 className="font-display font-bold text-xl text-neutral-main tracking-wide">{node.name}</h3>
                </div>
                <div className={`text-3xl font-display font-bold ${node.textColor} drop-shadow-sm`}>
                  {node.score}<span className="text-lg opacity-70">%</span>
                </div>
              </div>
              
              <p className="text-[13px] text-neutral-secondary leading-relaxed mb-6 font-medium">
                {node.desc}
              </p>
              
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full ${node.bgColor} rounded-full relative overflow-hidden transition-all duration-1000 ease-out`} 
                  style={{ width: `${node.score}%` }}
                >
                  <div className="absolute inset-0 bg-white/20" style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shimmer 2.5s infinite' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: skewX(-20deg) translateX(-150%); }
          50% { transform: skewX(-20deg) translateX(250%); }
          100% { transform: skewX(-20deg) translateX(250%); }
        }
      `}</style>
    </section>
  );
}
