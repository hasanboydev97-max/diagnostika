import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans selection:bg-black selection:text-white relative overflow-hidden">
      {/* Interactive Architect Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0,0,0,0.03), transparent 60%),
            linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          backgroundPosition: '0 0, 0 0, 0 0'
        }}
      />

      <div className="max-w-5xl mx-auto px-6 py-16 md:py-32 flex flex-col gap-16 md:gap-32 relative z-10 pointer-events-none">
        
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
              <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-medium tracking-tight mb-8 leading-[1.1]">
                Ta'limni aniq o'lchash va tahlil qilish uchun yagona markaz.
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
          <div className="md:col-span-8 flex flex-col gap-0">
            {/* O'quvchi Portali */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/login')}
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-medium mb-3 group-hover:pl-4 transition-all duration-300">O'quvchi Portali</h3>
                <p className="text-gray-500 leading-relaxed max-w-md group-hover:pl-4 transition-all duration-300 delay-75">
                  Shaxsiy test natijalarini ko'rish va reytingni tahlil qilish.
                </p>
              </div>
              <ArrowRight className="w-6 h-6 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500" strokeWidth={1.5} />
            </motion.div>

            {/* O'qituvchi Portali */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/online-tests')}
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-medium mb-3 group-hover:pl-4 transition-all duration-300">O'qituvchi Portali</h3>
                <p className="text-gray-500 leading-relaxed max-w-md group-hover:pl-4 transition-all duration-300 delay-75">
                  Testlarni AI yordamida yaratish va guruhlarni boshqarish.
                </p>
              </div>
              <ArrowRight className="w-6 h-6 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500" strokeWidth={1.5} />
            </motion.div>

            {/* Super Admin */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              onClick={() => navigate('/superadmin')}
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-auto"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-medium mb-3 group-hover:pl-4 transition-all duration-300">Boshqaruv Paneli</h3>
                <p className="text-gray-500 leading-relaxed max-w-md group-hover:pl-4 transition-all duration-300 delay-75">
                  Tizimni to'liq monitoring qilish, statistikani kuzatish.
                </p>
              </div>
              <ArrowRight className="w-6 h-6 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500" strokeWidth={1.5} />
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
    </div>
  );
}
