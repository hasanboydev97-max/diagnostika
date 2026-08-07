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
        time: '1-bosqich (0-2 oy)',
        goal: "Olimpiada va murakkab masalalarga tayyorgarlik",
        exercises: ['Chuqurlashtirilgan algebra va kombinatorika mashqlari', 'Mantiqiy va kreativ fikrlashga doir olimpiada topshiriqlari'],
        outcome: '90% dan yuqori barqaror ko\'rsatkich',
        icon: Bike
      },
      {
        id: 2,
        time: '2-bosqich (2-4 oy)',
        goal: "Xalqaro standart va tezkor tahlil mahorati",
        exercises: ['Vaqt bilan ishlash: tezkor va aniq hisoblash mashqlari', 'Murakkab tenglamalar va geometrik isbotlar'],
        outcome: '95% barqaror natija',
        icon: Target
      },
      {
        id: 3,
        time: '3-bosqich (4-6 oy)',
        goal: "Oliy mahorat va 100% natijaga erishish",
        exercises: ['Maktab qabul imtihonlarining barcha variantlarini 100% ga yechish', 'Mukammal sintez ko\'nikmasi'],
        outcome: 'Maksimal (100%) imtihon ko\'rsatkichiga erishish',
        icon: Trophy
      }
    ];
  } else if (score >= 50) {
    return [
      {
        id: 1,
        time: '1-bosqich (0-3 oy)',
        goal: "O'rta qiyinlikdagi bo'shliqlarni yopish",
        exercises: ['Algebra va funksiyalar: kunlik 5 ta amaliy mashq', 'Mantiqiy zanjir va tahlil topshiriqlari'],
        outcome: '70% barqaror natija',
        icon: Bike
      },
      {
        id: 2,
        time: '2-bosqich (3-6 oy)',
        goal: "Tahlil va mantiqiy fikrlashni mustahkamlash",
        exercises: ['Hajm va geometriya masalalari', 'Tenglama va tengsizliklar: amaliy masalalar'],
        outcome: '82% barqaror ko\'rsatkich',
        icon: Target
      },
      {
        id: 3,
        time: '3-bosqich (6-9 oy)',
        goal: "Qiyin masalalar ustida ishlash va imtihonga tayyorlanish",
        exercises: ['Kombinatorika va ehtimollar nazariyasi elementlari', 'Imtihon simulyatsiyasi testlarini yechish'],
        outcome: '90% dan yuqori natija',
        icon: Flag
      }
    ];
  } else {
    return [
      {
        id: 1,
        time: "1-bosqich (0-3 oy)",
        goal: "Elementar baza va poydevor hosil qilish",
        exercises: ["Asosiy arifmetik amallar va sodda tenglamalarni qayta takrorlash", "Ko'rgazmali va o'yinsimon mantiqiy mashqlar"],
        outcome: "55% barqaror ko'rsatkichga erishish",
        icon: Bike
      },
      {
        id: 2,
        time: "2-bosqich (3-6 oy)",
        goal: "O'rta qiyinlikdagi mavzularga o'tish",
        exercises: ["Matnli masalalar va ularni model ko'rinishida yechish", "Geometrik shakllar xossalari ustida ishlash"],
        outcome: "70% barqaror natija",
        icon: Target
      },
      {
        id: 3,
        time: "3-bosqich (6-12 oy)",
        goal: "Mustahkam bilimlarni shakllantirish va tahlil",
        exercises: ["Integratsiyalashgan mantiqiy va analitik mashqlar", "Imtihon namunasidagi o'rta murakkablikdagi testlar"],
        outcome: "85% natijaga erishish",
        icon: Flag
      }
    ];
  }
};

export default function RoadmapJourney({ data, score = 50 }: { data?: RoadmapStep[] | null; score?: number }) {
  const [activeStep, setActiveStep] = useState(1);

  // Dynamic roadmap computation
  let finalData: RoadmapStep[] = [];
  if (data && Array.isArray(data) && data.length > 0) {
    finalData = data.map((item, idx) => ({
      id: idx + 1,
      time: item.time || `${idx + 1}-bosqich (${idx * 3}-${(idx + 1) * 3} oy)`,
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
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-xs font-black tracking-widest uppercase border border-slate-200">
          <Map size={14} />
          Bosqichma-bosqich moslashtirilgan reja
        </div>
        <h2 className="text-2xl md:text-4xl text-neutral-main font-bold">Rivojlanish yo'li</h2>
        <p className="text-neutral-secondary max-w-2xl mx-auto text-sm md:text-base">
          O'quvchining joriy bilim darajasiga ({score}% natija) va aniqlangan kognitiv ko'nikmalariga asoslangan shaxsiy rivojlanish xaritasi.
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
            const stepId = step.id || index + 1;
            const isActive = activeStep === stepId;
            const isCompleted = activeStep > stepId;
            const Icon = step.icon || iconsList[index % iconsList.length];
            
            // For desktop alternating
            const isLeft = index % 2 === 0;

            return (
              <div key={stepId} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
                
                {/* Desktop Left Spacer */}
                <div className={`hidden md:block w-1/2 ${isLeft ? 'pr-12 text-right' : 'order-last pl-12 text-left'}`}>
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-slate-400'}`}
                  >
                    <FormattedText content={step.time} />
                  </motion.div>
                </div>

                {/* Center Node */}
                <div 
                  className={`absolute left-6 md:static md:left-auto -translate-x-1/2 md:translate-x-0 w-12 h-12 rounded-full border-[3px] flex items-center justify-center cursor-pointer transition-all duration-500 shrink-0 z-20 ${
                    isActive || isCompleted 
                      ? 'bg-neutral-900 border-white text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  onClick={() => setActiveStep(stepId)}
                >
                  {isCompleted ? <CheckCircle2 size={20} /> : (Icon && <Icon size={20} className={isActive ? 'animate-pulse' : ''} />)}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-neutral-900 animate-ping opacity-20"></div>
                  )}
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-1/2 pl-16 md:pl-0 ${isLeft ? 'md:order-last md:pl-12' : 'md:pr-12'}`}>
                  <motion.div 
                    layout
                    onClick={() => setActiveStep(stepId)}
                    className={`cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 scale-[1.02]' 
                        : 'bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
                    }`}
                  >
                    <div className="p-5 md:p-6">
                      <div className="md:hidden text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        <FormattedText content={step.time} />
                      </div>
                      <h3 className={`text-lg md:text-xl font-bold mb-1 ${isActive ? 'text-neutral-main' : 'text-slate-600'}`}>
                        <FormattedText content={step.goal} />
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
                                      <span className="text-sm font-medium text-slate-700 leading-snug">
                                        <FormattedText content={ex} />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                                <CheckCircle2 size={24} className="text-success shrink-0" />
                                <div>
                                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Kutilayotgan natija</div>
                                  <div className="font-bold text-neutral-main">
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
