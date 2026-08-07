import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Flag, Target, ArrowRight, CheckCircle2, Map, Trophy, Sparkles } from 'lucide-react';
import FormattedText from './FormattedText';

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

const iconsList = [Bike, Target, Flag, Trophy, Sparkles];

const getAdaptiveFallbackData = (score: number = 50): RoadmapStep[] => {
  if (score >= 80) {
    return [
      {
        id: 1,
        time: "1-BOSQICH (0-2 OY)",
        goal: "Olimpiada va murakkab masalalar",
        exercises: ["Chuqurlashtirilgan algebra va kombinatorika mashqlari", "Mantiqiy va kreativ fikrlashga doir olimpiada topshiriqlari"],
        outcome: "90% dan yuqori barqaror ko'rsatkich",
        icon: Bike
      },
      {
        id: 2,
        time: "2-BOSQICH (2-4 OY)",
        goal: "Tezkor tahlil va xalqaro mezon",
        exercises: ["Vaqt bilan ishlash: tezkor va aniq hisoblash mashqlari", "Murakkab tenglamalar va geometrik isbotlar"],
        outcome: "95% barqaror natija",
        icon: Target
      },
      {
        id: 3,
        time: "3-BOSQICH (4-6 OY)",
        goal: "Oliy mahorat va 100% natija",
        exercises: ["Maktab qabul imtihonlarining barcha variantlarini yechish", "Mukammal sintez ko'nikmasi"],
        outcome: "Maksimal imtihon ko'rsatkichiga erishish",
        icon: Trophy
      }
    ];
  } else if (score >= 50) {
    return [
      {
        id: 1,
        time: "1-BOSQICH (0-3 OY)",
        goal: "O'rta qiyinlikdagi bo'shliqlarni yopish",
        exercises: ["Algebra va funksiyalar: kunlik 5 ta amaliy mashq", "Mantiqiy zanjir va tahlil topshiriqlari"],
        outcome: "70% barqaror natija",
        icon: Bike
      },
      {
        id: 2,
        time: "2-BOSQICH (3-6 OY)",
        goal: "Tahlil va mantiqni mustahkamlash",
        exercises: ["Hajm va geometriya masalalari", "Tenglama va tengsizliklar: amaliy masalalar"],
        outcome: "82% barqaror ko'rsatkich",
        icon: Target
      },
      {
        id: 3,
        time: "3-BOSQICH (6-9 OY)",
        goal: "Murakkab topshiriqlar va sinovlar",
        exercises: ["Kombinatorika va ehtimollar nazariyasi elementlari", "Imtihon simulyatsiyasi testlarini yechish"],
        outcome: "90% dan yuqori natija",
        icon: Flag
      }
    ];
  } else {
    return [
      {
        id: 1,
        time: "1-BOSQICH (0-3 OY)",
        goal: "Elementar baza va poydevor shakllantirish",
        exercises: ["Asosiy arifmetik amallar va sodda tenglamalarni takrorlash", "Ko'rgazmali va mantiqiy mashqlar"],
        outcome: "55% barqaror ko'rsatkichga erishish",
        icon: Bike
      },
      {
        id: 2,
        time: "2-BOSQICH (3-6 OY)",
        goal: "O'rta qiyinlikdagi mavzularga o'tish",
        exercises: ["Matnli masalalar va ularni model ko'rinishida yechish", "Geometrik shakllar xossalari ustida ishlash"],
        outcome: "70% barqaror natija",
        icon: Target
      },
      {
        id: 3,
        time: "3-BOSQICH (6-12 OY)",
        goal: "Mustahkam bilim va tahlil",
        exercises: ["Integratsiyalashgan mantiqiy va analitik mashqlar", "Imtihon namunasidagi testlar"],
        outcome: "85% natijaga erishish",
        icon: Flag
      }
    ];
  }
};

// Helper to separate short title and extra description if AI returns long paragraph as goal
const parseGoal = (rawGoal: string): { title: string; subtitle?: string } => {
  if (!rawGoal) return { title: "Rivojlanish bosqichi" };
  
  if (rawGoal.length > 55) {
    // Check if there is a parenthesis or punctuation to split on
    const splitIndex = rawGoal.search(/[\(\:\-\.]/);
    if (splitIndex > 10 && splitIndex < 45) {
      const title = rawGoal.substring(0, splitIndex).trim();
      const subtitle = rawGoal.substring(splitIndex).replace(/^[\(\:\-\.\s]+/, '').replace(/\)+$/, '').trim();
      return { title, subtitle };
    }
    // Fallback split at ~45 chars
    const title = rawGoal.substring(0, 48).trim() + "...";
    return { title, subtitle: rawGoal };
  }
  return { title: rawGoal };
};

export default function RoadmapJourney({ data, score = 50 }: { data?: RoadmapStep[] | null; score?: number }) {
  const [activeStep, setActiveStep] = useState(1);

  // Dynamic roadmap computation
  let finalData: RoadmapStep[] = [];
  if (data && Array.isArray(data) && data.length > 0) {
    finalData = data.map((item, idx) => ({
      id: idx + 1,
      time: item.time ? item.time.toUpperCase() : `${idx + 1}-BOSQICH (${idx * 3}-${(idx + 1) * 3} OY)`,
      goal: item.goal || "Rivojlanish va takomillashtirish",
      exercises: Array.isArray(item.exercises) ? item.exercises : [String(item.exercises || 'Amaliy mashqlar')],
      outcome: item.outcome || "Yuqori natija",
      icon: iconsList[idx % iconsList.length]
    }));
  } else {
    finalData = getAdaptiveFallbackData(score);
  }

  return (
    <section className="space-y-6 relative max-w-4xl mx-auto pt-8">
      {/* Header */}
      <div className="text-center space-y-3 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[11px] font-bold tracking-widest uppercase border border-slate-200">
          <Map size={14} />
          Shaxsiy qadamlar
        </div>
        <h2 className="text-2xl md:text-4xl text-neutral-main font-bold tracking-tight">Rivojlanish yo'li</h2>
        <p className="text-neutral-secondary max-w-xl mx-auto text-xs md:text-sm leading-relaxed">
          O'quvchining joriy bilim darajasiga ({score}% ball) va kognitiv ko'nikmalariga moslashtirilgan 3 bosqichli rivojlanish xaritasi.
        </p>
      </div>

      <div className="relative">
        {/* Vertical Line Background */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div 
          className="absolute left-6 md:left-1/2 top-0 w-[3px] bg-neutral-900 -translate-x-1/2 rounded-full"
          initial={{ height: 0 }}
          animate={{ height: `${(activeStep / finalData.length) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        <div className="space-y-8 md:space-y-10 relative z-10">
          {finalData.map((step, index) => {
            const stepId = step.id || index + 1;
            const isActive = activeStep === stepId;
            const isCompleted = activeStep > stepId;
            const Icon = step.icon || iconsList[index % iconsList.length];
            const parsedGoal = parseGoal(step.goal);
            
            // For desktop alternating
            const isLeft = index % 2 === 0;

            return (
              <div key={stepId} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
                
                {/* Desktop Left/Right Time Label (Rendered in native font to prevent KaTeX math font bugs!) */}
                <div className={`hidden md:block w-1/2 ${isLeft ? 'pr-12 text-right' : 'order-last pl-12 text-left'}`}>
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-black font-extrabold' : 'text-slate-400'}`}
                  >
                    {step.time}
                  </motion.div>
                </div>

                {/* Center Node */}
                <div 
                  className={`absolute left-6 md:static md:left-auto -translate-x-1/2 md:translate-x-0 w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 z-20 ${
                    isActive || isCompleted 
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-400 hover:border-black hover:text-black'
                  }`}
                  onClick={() => setActiveStep(stepId)}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : (Icon && <Icon size={18} className={isActive ? 'animate-pulse' : ''} />)}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-neutral-900 animate-ping opacity-20"></div>
                  )}
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-1/2 pl-14 md:pl-0 ${isLeft ? 'md:order-last md:pl-12' : 'md:pr-12'}`}>
                  <motion.div 
                    layout
                    onClick={() => setActiveStep(stepId)}
                    className={`cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-black/10 scale-[1.01]' 
                        : 'bg-white/80 border border-slate-200/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-5 md:p-6">
                      {/* Mobile Time Badge */}
                      <div className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                        {step.time}
                      </div>

                      {/* Clean Short Goal Title */}
                      <h3 className={`text-base md:text-lg font-bold tracking-tight leading-snug ${isActive ? 'text-black' : 'text-slate-700'}`}>
                        {parsedGoal.title}
                      </h3>
                      
                      {/* Subtitle if goal was long */}
                      {parsedGoal.subtitle && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {parsedGoal.subtitle}
                        </p>
                      )}
                      
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
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
                                  <Target size={13} className="text-black" /> Rejadagi amaliyotlar
                                </div>
                                <ul className="space-y-2">
                                  {step.exercises.map((ex, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                      <div className="mt-1 w-3.5 h-3.5 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                        <ArrowRight size={9} className="text-black" />
                                      </div>
                                      <span className="text-xs md:text-sm font-medium text-slate-700 leading-normal">
                                        <FormattedText content={ex} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                                <div>
                                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Kutilayotgan natija</div>
                                  <div className="text-xs md:text-sm font-bold text-neutral-900">
                                    <FormattedText content={step.outcome} />
                                  </div>
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
