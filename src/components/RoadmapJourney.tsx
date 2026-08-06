import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Flag, Target, ArrowRight, CheckCircle2, Map } from 'lucide-react';

export interface RoadmapStep {
  id?: number;
  time: string;
  goal: string;
  exercises: string[];
  outcome: string;
  color?: string;
  bgClass?: string;
  icon?: any;
}

const defaultRoadmapData: RoadmapStep[] = [
  {
    id: 1,
    time: '1-bosqich (0-3 oy)',
    goal: "Asosiy bo'shliqlarni yopish",
    exercises: ['Algebra va funksiyalar: kunlik 5 ta mashq', "Sintezlash ko'nikmasiga doir o'yinlar"],
    outcome: '65% barqaror natija',
    color: '#1e3a8a',
    bgClass: 'bg-primary',
    icon: Bike,
  },
  {
    id: 2,
    time: '2-bosqich (3-6 oy)',
    goal: "O'rta qiyinlikdagi mavzularni mustahkamlash",
    exercises: ['Hajm va geometriya masalalari', 'Mantiqiy zanjirlarni davom ettirish'],
    outcome: '75% barqaror natija',
    color: '#2563eb',
    bgClass: 'bg-blue-500',
    icon: Target,
  },
  {
    id: 3,
    time: '3-bosqich (6-12 oy)',
    goal: 'Qiyin masalalar ustida ishlash',
    exercises: ['Tenglama va tengsizliklar: amaliy masalalar', 'Olimpiada tipidagi masalalar bilan ishlash'],
    outcome: '85% dan yuqori natija',
    color: '#059669',
    bgClass: 'bg-success',
    icon: Flag,
  }
];

export default function RoadmapJourney({ data }: { data?: RoadmapStep[] | null }) {
  const [activeStep, setActiveStep] = useState(1);

  // AI dan kelgan ma'lumotlarni default ma'lumotlar ustiga yozish (ikonkalar va ranglarni saqlab qolish uchun)
  const finalData = (data && data.length > 0) ? defaultRoadmapData.map((def, i) => {
    if (data[i]) {
      return {
        ...def,
        time: data[i].time || def.time,
        goal: data[i].goal || def.goal,
        exercises: data[i].exercises || def.exercises,
        outcome: data[i].outcome || def.outcome
      };
    }
    return def;
  }) : defaultRoadmapData;

  return (
    <section className="space-y-6 relative max-w-4xl mx-auto pt-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-xs font-black tracking-widest uppercase border border-slate-200">
          <Map size={14} />
          Bosqichma-bosqich reja
        </div>
        <h2 className="text-2xl md:text-4xl text-neutral-main font-bold">Rivojlanish yo'li</h2>
        <p className="text-neutral-secondary max-w-2xl mx-auto text-sm md:text-base">
          Kelgusi oylarda natijalarni yaxshilash va kamchiliklarni to'ldirish uchun tuzilgan aniq qadamlar.
        </p>
      </div>

      <div className="relative">
        {/* Vertical Line Background */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div 
          className="absolute left-6 md:left-1/2 top-0 w-[3px] bg-primary -translate-x-1/2 rounded-full"
          initial={{ height: 0 }}
          animate={{ height: `${(activeStep / finalData.length) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        <div className="space-y-8 md:space-y-12 relative z-10">
          {finalData.map((step, index) => {
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > (step.id || 0);
            const Icon = step.icon;
            
            // For desktop alternating
            const isLeft = index % 2 === 0;

            return (
              <div key={step.id} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
                
                {/* Desktop Left Spacer */}
                <div className={`hidden md:block w-1/2 ${isLeft ? 'pr-12 text-right' : 'order-last pl-12 text-left'}`}>
                  {isLeft && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-slate-400'}`}
                    >
                      {step.time}
                    </motion.div>
                  )}
                  {!isLeft && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-slate-400'}`}
                    >
                      {step.time}
                    </motion.div>
                  )}
                </div>

                {/* Center Node */}
                <div 
                  className={`absolute left-6 md:static md:left-auto -translate-x-1/2 md:translate-x-0 w-12 h-12 rounded-full border-4 flex items-center justify-center cursor-pointer transition-colors duration-500 shrink-0 shadow-sm z-20 ${
                    isActive || isCompleted 
                      ? 'bg-primary border-white text-white' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveStep(step.id || 1)}
                >
                  {isCompleted ? <CheckCircle2 size={20} /> : (Icon && <Icon size={20} className={isActive ? 'animate-pulse' : ''} />)}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                  )}
                </div>

                {/* Content Card (Mobile: padding left. Desktop: padding side based on alternating) */}
                <div className={`w-full md:w-1/2 pl-16 md:pl-0 ${isLeft ? 'md:order-last md:pl-12' : 'md:pr-12'}`}>
                  <motion.div 
                    layout
                    onClick={() => setActiveStep(step.id || 1)}
                    className={`cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ${
                      isActive 
                        ? 'border-primary/20 bg-white shadow-xl shadow-primary/5 ring-1 ring-primary/10' 
                        : 'border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-5 md:p-6">
                      <div className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        {step.time}
                      </div>
                      <h3 className={`text-lg md:text-xl font-bold mb-1 ${isActive ? 'text-neutral-main' : 'text-slate-600'}`}>
                        {step.goal}
                      </h3>
                      
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 border-t border-slate-100 space-y-4">
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                                  <Target size={14} className="text-primary" /> Mashqlar
                                </div>
                                <ul className="space-y-2.5">
                                  {step.exercises.map((ex, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                      <div className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <ArrowRight size={10} className="text-primary" />
                                      </div>
                                      <span className="text-sm font-medium text-slate-700 leading-snug">{ex}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                <CheckCircle2 size={24} className="text-success shrink-0" />
                                <div>
                                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Kutilayotgan natija</div>
                                  <div className="font-bold text-neutral-main">{step.outcome}</div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
