import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, User, GraduationCap, Settings, Palette, Check, X } from 'lucide-react';
import MeshGradient, { palettes } from '../components/ui/MeshGradient';

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Landing() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMinimal, setIsMinimal] = useState(() => {
    return localStorage.getItem('bg-minimal') === 'true';
  });
  const [paletteIndex, setPaletteIndex] = useState(() => {
    const saved = localStorage.getItem('bg-palette');
    return saved ? parseInt(saved, 10) : new Date().getDay();
  });

  useEffect(() => {
    localStorage.setItem('bg-minimal', isMinimal.toString());
    localStorage.setItem('bg-palette', paletteIndex.toString());
  }, [isMinimal, paletteIndex]);

  return (
    <div className="min-h-screen text-[#111111] font-sans selection:bg-black selection:text-white relative overflow-hidden">
      <MeshGradient isMinimal={isMinimal} paletteIndex={paletteIndex} />


      <div className="max-w-5xl mx-auto px-6 pt-16 pb-8 md:pt-32 md:pb-12 flex flex-col gap-16 md:gap-32 relative z-10 pointer-events-none">
        
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 md:sticky md:top-32 h-fit">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="flex items-center gap-3 mb-8 md:mb-0">
              <div className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center font-bold text-xs tracking-tighter bg-white text-black">
                HB.
              </div>
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500">
                Diagnostika
              </span>
            </motion.div>
          </div>
          <div className="md:col-span-8">
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-medium tracking-tight mb-8 leading-[1.1] relative">
                <span className="block mb-6 text-xs font-semibold tracking-[0.2em] uppercase text-gray-400 bg-white border border-gray-200 rounded-full px-4 py-1.5 w-fit shadow-sm">
                  {t('landing.badge')}
                </span>
                {t('landing.title_1')} <span className="italic text-black/70">{t('landing.title_2')}</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mb-12">
                {t('landing.subtitle')}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* PORTALS SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 border-t border-black/10 pt-16 md:pt-32">
          <div className="md:col-span-4 md:sticky md:top-32 h-fit">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500"
            >
              {t('landing.portals')}
            </motion.h2>
          </div>
             <div className="md:col-span-8 flex flex-col">
            {/* O'quvchi Portali */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/login')}
              className="relative group cursor-pointer border-b border-black/10 py-10 px-6 -mx-6 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto overflow-hidden"
            >
              <div className="absolute inset-0 bg-neutral-100 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0 rounded-xl" />
              
              <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 group-hover:border-black/30 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <User className="w-6 h-6 text-neutral-500 group-hover:text-black transition-colors duration-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">{t('landing.student_portal')}</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    {t('landing.student_desc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="relative z-10 w-6 h-6 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-2 group-hover:text-black transition-all duration-500" strokeWidth={1.5} />
            </motion.div>

            {/* O'qituvchi Portali */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/online-tests')}
              className="relative group cursor-pointer border-b border-black/10 py-10 px-6 -mx-6 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto overflow-hidden"
            >
              <div className="absolute inset-0 bg-neutral-100 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0 rounded-xl" />

              <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 group-hover:border-black/30 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <GraduationCap className="w-6 h-6 text-neutral-500 group-hover:text-black transition-colors duration-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">{t('landing.teacher_portal')}</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    {t('landing.teacher_desc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="relative z-10 w-6 h-6 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-2 group-hover:text-black transition-all duration-500" strokeWidth={1.5} />
            </motion.div>

            {/* Super Admin */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/superadmin')}
              className="relative group cursor-pointer border-b border-black/10 py-10 px-6 -mx-6 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto overflow-hidden"
            >
              <div className="absolute inset-0 bg-neutral-100 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0 rounded-xl" />

              <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 group-hover:border-black/30 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <Settings className="w-6 h-6 text-neutral-500 group-hover:text-black transition-colors duration-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">{t('landing.admin_portal')}</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    {t('landing.admin_desc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="relative z-10 w-6 h-6 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-2 group-hover:text-black transition-all duration-500" strokeWidth={1.5} />
            </motion.div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 border-t border-black/10 pt-16 md:pt-32">
          <div className="md:col-span-4 md:sticky md:top-32 h-fit">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500"
            >
              {t('landing.faq')}
            </motion.h2>
          </div>
          <div className="md:col-span-8 flex flex-col gap-3">
            {[
              { q: t('landing.faq_q1'), a: t('landing.faq_a1') },
              { q: t('landing.faq_q2'), a: t('landing.faq_a2') },
              { q: t('landing.faq_q3'), a: t('landing.faq_a3') }
            ].map((item, idx) => {
              const isActive = activeFaq === idx;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  key={idx} 
                  className={`relative group rounded-2xl overflow-hidden transition-all duration-500 border ${
                    isActive 
                      ? 'bg-black/[0.04] border-transparent shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] scale-[1.01]' 
                      : 'bg-transparent border-black/5 hover:border-black/10 hover:bg-black/[0.02] hover:scale-[1.005]'
                  }`}
                >
                  <button 
                    onClick={() => setActiveFaq(isActive ? null : idx)}
                    className="w-full px-5 md:px-6 py-5 md:py-5 flex items-center justify-between text-left focus:outline-none pointer-events-auto"
                  >
                    <span className={`text-base md:text-lg font-medium pr-8 transition-colors duration-300 ${isActive ? 'text-black' : 'text-black/80 group-hover:text-black'}`}>
                      {item.q}
                    </span>
                    <motion.div
                      animate={{ rotate: isActive ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-black text-white shadow-md' 
                          : 'bg-black/5 text-black/50 group-hover:bg-black/10 group-hover:text-black'
                      }`}
                    >
                      <Plus className="w-4 h-4" strokeWidth={1.5} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <p className="px-5 md:px-6 pb-5 md:pb-6 text-black/60 leading-relaxed text-sm md:text-base">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-20 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto border-t border-black/10">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-lg">HB.</span>
            <span className="text-sm font-medium tracking-[0.2em] text-[#111111]">DIAGNOSTIKA</span>
          </div>
          <p className="text-sm text-neutral-500 font-medium">© {new Date().getFullYear()} HB. {t('landing.footer_rights')}</p>
        </footer>
      </div>

      {/* THEME SETTINGS BUTTON & POPOVER */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end">
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                className="mb-4 bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-[24px] shadow-[0_16px_40px_rgb(0,0,0,0.12)] w-[300px] overflow-hidden"
              >
                <div className="p-5 border-b border-black/5 flex items-center justify-between">
                  <span className="font-semibold text-sm tracking-tight">{t('landing.settings_title')}</span>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-black/40 hover:text-black hover:bg-black/5 p-1.5 rounded-full transition-colors">
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="p-6 space-y-8">
                  
                  {/* Language Selection */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-bold text-black/40 uppercase tracking-[0.3em]">{t('landing.settings_language')}</span>
                    <div className="flex bg-black/[0.04] p-1 rounded-[14px]">
                      {['uz', 'ru', 'en'].map(lang => (
                        <button
                          key={lang}
                          onClick={() => i18n.changeLanguage(lang)}
                          className={`flex-1 py-2 text-[11px] tracking-wide font-semibold rounded-[10px] transition-all duration-300 uppercase ${
                            i18n.language === lang || (!i18n.language && lang==='uz') 
                              ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-black scale-[1.02]' 
                              : 'text-black/50 hover:text-black hover:bg-black/[0.02]'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type Selection */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-bold text-black/40 uppercase tracking-[0.3em]">{t('landing.settings_style')}</span>
                    <div className="flex bg-black/[0.04] p-1 rounded-[14px]">
                      <button
                        onClick={() => setIsMinimal(false)}
                        className={`flex-1 py-2 px-1 text-[11px] leading-tight font-semibold rounded-[10px] transition-all duration-300 ${
                          !isMinimal 
                            ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-black scale-[1.02]' 
                            : 'text-black/50 hover:text-black hover:bg-black/[0.02]'
                        }`}
                      >
                        {t('landing.settings_mesh')}
                      </button>
                      <button
                        onClick={() => setIsMinimal(true)}
                        className={`flex-1 py-2 px-1 text-[11px] leading-tight font-semibold rounded-[10px] transition-all duration-300 ${
                          isMinimal 
                            ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-black scale-[1.02]' 
                            : 'text-black/50 hover:text-black hover:bg-black/[0.02]'
                        }`}
                      >
                        {t('landing.settings_minimal')}
                      </button>
                    </div>
                  </div>

                  {/* Color Selection */}
                  <AnimatePresence>
                    {!isMinimal && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                        exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 overflow-hidden pt-1 pb-3 -mx-2 px-2"
                      >
                        <span className="block text-[10px] font-bold text-black/40 uppercase tracking-[0.3em]">{t('landing.settings_colors')}</span>
                        <div className="flex flex-wrap gap-3">
                          {palettes.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPaletteIndex(idx)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-400 ${
                                paletteIndex === idx 
                                  ? 'ring-[2px] ring-black/20 ring-offset-[3px] scale-110 shadow-sm' 
                                  : 'hover:scale-105 border border-black/5 opacity-80 hover:opacity-100'
                              }`}
                              style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}
                              title={p.name}
                            >
                              {paletteIndex === idx && <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={2.5} />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-12 h-12 bg-white text-black border border-black/10 rounded-full shadow-lg flex items-center justify-center hover:scale-105 hover:shadow-xl transition-all"
        >
          <Palette className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
