import { useState, useEffect } from 'react';
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
                  Yangi Avlod Platformasi
                </span>
                Ta'limni aniq o'lchash va tahlil qilish uchun <span className="italic text-black/70">yagona markaz.</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mb-12">
                O'quvchilar va o'qituvchilar uchun mo'ljallangan zamonaviy test platformasi. Natijalarni sun'iy intellekt orqali chuqur o'rganing.
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
              Portals
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
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">O'quvchi Portali</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    Shaxsiy test natijalarini ko'rish va reytingni tahlil qilish.
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
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">O'qituvchi Portali</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    Testlarni AI yordamida yaratish va guruhlarni boshqarish.
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
                  <h3 className="text-2xl md:text-3xl font-medium mb-3 transition-all duration-300 group-hover:translate-x-1">Boshqaruv Paneli</h3>
                  <p className="text-neutral-500 leading-relaxed max-w-md transition-all duration-300 delay-75 group-hover:translate-x-1">
                    Tizimni to'liq monitoring qilish, statistikani kuzatish.
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
              F.A.Q
            </motion.h2>
          </div>
          <div className="md:col-span-8 flex flex-col">
            {[
              { q: "Platformadan foydalanish qanday amalga oshiriladi?", a: "Tizim 3 ta asosiy portalga bo'lingan. O'quvchi, O'qituvchi va Admin. Har bir portalga tegishli login parollar orqali kiriladi." },
              { q: "AI orqali test yaratish qanday ishlaydi?", a: "O'qituvchilar test yaratish bo'limida Gemini AI yordamida avtomatik tarzda savollar yaratishi mumkin. Faqatgina fanni va savollar sonini kiritish kifoya." },
              { q: "O'quvchi natijalari qachon e'lon qilinadi?", a: "O'quvchi testni yakunlashi bilan avtomatik ravishda tekshiriladi va natijalar xulosasi darhol ekranga chiqadi." }
            ].map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: idx * 0.1 }}
                key={idx} 
                className="border-b border-black/10"
              >
                <button 
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full py-8 flex items-center justify-between text-left focus:outline-none group pointer-events-auto"
                >
                  <span className="text-xl font-medium pr-8">{item.q}</span>
                  <motion.div
                    animate={{ rotate: activeFaq === idx ? 45 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0"
                  >
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" strokeWidth={1.5} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pb-8 text-gray-500 leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-20 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto border-t border-black/10">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-lg">HB.</span>
            <span className="text-sm font-medium tracking-[0.2em] text-[#111111]">DIAGNOSTIKA</span>
          </div>
          <p className="text-sm text-neutral-500 font-medium">© {new Date().getFullYear()} HB. Barcha huquqlar himoyalangan.</p>
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
              className="mb-4 bg-white/90 backdrop-blur-xl border border-black/10 rounded-2xl shadow-2xl w-72 overflow-hidden"
            >
              <div className="p-4 border-b border-black/5 flex items-center justify-between">
                <span className="font-medium text-sm">Theme Settings</span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-6">
                
                {/* Type Selection */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Style</span>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setIsMinimal(false)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isMinimal ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                      Mesh Gradient
                    </button>
                    <button
                      onClick={() => setIsMinimal(true)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isMinimal ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                      Minimal (Pure)
                    </button>
                  </div>
                </div>

                {/* Color Selection */}
                <AnimatePresence>
                  {!isMinimal && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colors</span>
                      <div className="grid grid-cols-4 gap-2">
                        {palettes.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPaletteIndex(idx)}
                            className={`w-full aspect-square rounded-full flex items-center justify-center transition-all ${paletteIndex === idx ? 'ring-2 ring-black ring-offset-2' : 'hover:scale-110'}`}
                            style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}
                            title={p.name}
                          >
                            {paletteIndex === idx && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
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
