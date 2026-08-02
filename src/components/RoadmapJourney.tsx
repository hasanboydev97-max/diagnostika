import { useState } from 'react';
import { Bike, Flag, Target, ArrowRight, CheckCircle2, Map, ChevronDown } from 'lucide-react';

const roadmapData = [
  {
    id: 1,
    time: '1-bosqich (0-3 oy)',
    goal: "Asosiy bo'shliqlarni yopish",
    exercises: ['Algebra va funksiyalar: kunlik 5 ta mashq', "Sintezlash ko'nikmasiga doir o'yinlar"],
    outcome: '65% barqaror natija',
    color: '#1e3a8a',
    bgClass: 'bg-primary',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-100',
  },
  {
    id: 2,
    time: '2-bosqich (3-6 oy)',
    goal: "O'rta qiyinlikdagi mavzularni mustahkamlash",
    exercises: ['Hajm va geometriya masalalari', 'Mantiqiy zanjirlarni davom ettirish'],
    outcome: '75% barqaror natija',
    color: '#2563eb',
    bgClass: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    lightBorder: 'border-blue-100',
  },
  {
    id: 3,
    time: '3-bosqich (6-12 oy)',
    goal: 'Qiyin masalalar ustida ishlash',
    exercises: ['Tenglama va tengsizliklar: amaliy masalalar', 'Olimpiada tipidagi masalalar bilan ishlash'],
    outcome: '85% dan yuqori natija',
    color: '#059669',
    bgClass: 'bg-success',
    lightBg: 'bg-emerald-50',
    lightBorder: 'border-emerald-100',
  }
];

export default function RoadmapJourney() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <section className="space-y-6 relative max-w-5xl mx-auto pt-8">
      {/* Header */}
      <div className="text-center space-y-2 md:space-y-4 mb-6 md:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 text-primary rounded-full text-sm font-bold tracking-wider border border-primary/10">
          <Map size={16} />
          <span className="font-display uppercase">Bosqichma-bosqich reja</span>
        </div>
        <h2 className="text-xl md:text-3xl lg:text-4xl text-neutral-main font-display font-semibold">Rivojlanish yo'li</h2>
        <p className="text-neutral-secondary max-w-2xl mx-auto text-xs md:text-lg leading-relaxed">
          Kelgusi oylarda natijalarni yaxshilash va kamchiliklarni to'ldirish uchun tuzilgan aniq qadamlar.
        </p>
      </div>

      {/* ===== MOBILE LAYOUT: Clean Accordion Steps ===== */}
      <div className="md:hidden space-y-3">
        {roadmapData.map((step) => {
          const isActive = activeStep === step.id;
          const isCompleted = activeStep > step.id;

          return (
            <div
              key={step.id}
              className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                isActive
                  ? 'border-transparent shadow-[0_8px_30px_-8px_rgba(30,58,138,0.15)]'
                  : 'border-slate-200 bg-white'
              }`}
              style={isActive ? { background: `linear-gradient(135deg, ${step.color}08 0%, white 60%)`, borderColor: `${step.color}30` } : {}}
            >
              {/* Step Header — always visible */}
              <button
                className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => setActiveStep(step.id)}
              >
                {/* Step number badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isActive || isCompleted ? step.bgClass + ' text-white shadow-md' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isActive ? (
                    <Bike size={18} className="animate-bounce" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={18} />
                  ) : step.id === 3 ? (
                    <Flag size={16} />
                  ) : (
                    <span className="font-bold text-sm">{step.id}</span>
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{ color: isActive ? step.color : '#94a3b8' }}
                  >
                    {step.time}
                  </div>
                  <div className={`text-sm font-bold leading-tight ${isActive ? 'text-neutral-main' : 'text-slate-500'}`}>
                    {step.goal}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                  size={18}
                  className={`shrink-0 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}
                  style={{ color: isActive ? step.color : '#cbd5e1' }}
                />
              </button>

              {/* Expanded content */}
              <div
                className="grid transition-all duration-400 ease-in-out"
                style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
                    {/* Exercises */}
                    <div className="pt-3">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Target size={12} style={{ color: step.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mashqlar</span>
                      </div>
                      <ul className="space-y-2">
                        {step.exercises.map((ex, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div
                              className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${step.color}15` }}
                            >
                              <ArrowRight size={9} style={{ color: step.color }} />
                            </div>
                            <span className="text-xs text-neutral-main leading-relaxed font-medium">{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Outcome */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: `${step.color}10`, border: `1px solid ${step.color}20` }}
                    >
                      <CheckCircle2 size={15} style={{ color: step.color }} />
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Kutilayotgan natija</div>
                        <div className="text-sm font-bold" style={{ color: step.color }}>{step.outcome}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== DESKTOP LAYOUT (original alternating) ===== */}
      <div className="hidden md:block relative">
        {/* Vertical Winding SVG Background */}
        <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-32 pointer-events-none z-0">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 1000">
            <defs>
              <linearGradient id="roadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="roadActiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <path d="M 50,0 Q 80,125 50,250 T 50,500 T 50,750 T 50,1000" stroke="url(#roadGradient)" strokeWidth="4" fill="none" strokeDasharray="8 8" />
            <path d="M 50,0 Q 80,125 50,250 T 50,500 T 50,750 T 50,1000" stroke="url(#roadActiveGradient)" strokeWidth="6" fill="none" strokeLinecap="round"
                  className="transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ strokeDasharray: 2000, strokeDashoffset: activeStep === 1 ? 1750 : activeStep === 2 ? 1000 : 0 }} />
          </svg>
        </div>

        <div className="space-y-16 relative z-10 py-4">
          {roadmapData.map((step, index) => {
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            const isLeft = index % 2 === 0;

            return (
              <div key={step.id} className={`flex flex-row items-center gap-16 ${isLeft ? '' : 'flex-row-reverse'}`}>
                <div className="hidden md:block md:w-1/2"></div>
                
                {/* Center Node */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 shadow-xl border-[4px] border-background-main z-20 ${
                      isActive || isCompleted
                        ? (step.id === 3 ? 'bg-success text-white' : 'bg-primary text-white')
                        : 'bg-white text-slate-400 hover:scale-110 hover:border-slate-200'
                    }`}
                    onClick={() => setActiveStep(step.id)}
                  >
                    {isActive ? (
                      <Bike size={24} className="animate-bounce" />
                    ) : isCompleted ? (
                      <CheckCircle2 size={24} />
                    ) : step.id === 3 ? (
                      <Flag size={20} />
                    ) : (
                      <span className="font-display font-bold text-xl">{step.id}</span>
                    )}
                  </div>
                  {isActive && <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${step.id === 3 ? 'bg-success' : 'bg-primary'}`}></div>}
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-1/2 ${isLeft ? 'md:pr-16 text-left md:text-right' : 'md:pl-16 text-left'}`}>
                  <div
                    className={`p-8 rounded-3xl transition-all duration-300 cursor-pointer border backdrop-blur-sm relative group ${
                      isActive
                        ? 'border-primary/20 bg-white shadow-[0_20px_40px_-15px_rgba(30,58,138,0.1)] scale-[1.02]'
                        : 'border-border/60 bg-white/60 hover:bg-white hover:shadow-lg hover:border-border scale-100'
                    }`}
                    onClick={() => setActiveStep(step.id)}
                  >
                    <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-16 h-px bg-border/50 z-[-1] transition-all duration-500 ${isLeft ? '-right-16 group-hover:bg-primary/30' : '-left-16 group-hover:bg-primary/30'} ${isActive ? 'bg-primary/30' : ''}`}></div>

                    <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${isActive ? 'text-primary' : 'text-neutral-secondary'}`}>
                      {step.time}
                    </div>
                    <h3 className={`text-xl md:text-2xl font-display font-semibold mb-4 ${isActive ? 'text-neutral-main' : 'text-neutral-secondary'}`}>
                      {step.goal}
                    </h3>

                    <div
                      className="grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      style={{ gridTemplateRows: isActive ? '1fr' : '0fr', opacity: isActive ? 1 : 0 }}
                    >
                      <div className="overflow-hidden">
                        <div className="pt-4 border-t border-slate-100 space-y-5">
                          <div>
                            <div className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3 ${isLeft ? 'md:justify-end' : ''} text-neutral-secondary`}>
                              <Target size={14} className="text-primary" /> Mashqlar:
                            </div>
                            <ul className="space-y-3">
                              {step.exercises.map((ex, i) => (
                                <li key={i} className={`flex items-start gap-3 text-neutral-main ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                                  <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <ArrowRight size={12} className={`text-primary ${isLeft ? 'md:rotate-180' : ''}`} />
                                  </div>
                                  <span className="leading-relaxed font-medium text-sm">{ex}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className={`pt-3 flex flex-col ${isLeft ? 'md:items-end' : 'md:items-start'} gap-2`}>
                            <div className="text-[11px] font-bold text-neutral-secondary uppercase tracking-widest">Kutilayotgan natija</div>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-display font-bold border ${step.id === 3 ? 'bg-success/10 text-success border-success/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                              <CheckCircle2 size={18} />
                              {step.outcome}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
