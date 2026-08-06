import { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-[#111111] font-sans selection:bg-black selection:text-white relative overflow-hidden">
      {/* Aceternity Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#fdfdfd]">
        <div className="absolute inset-0 opacity-50"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
             }}
        />
        <div
          className="absolute -inset-[10px] opacity-40 will-change-transform"
          style={{
            backgroundImage: `repeating-linear-gradient(100deg, #fff 10%, #fff 15%, transparent 20%, transparent 25%), repeating-linear-gradient(100deg, #3b82f6 10%, #a855f7 15%, #3b82f6 20%, #ec4899 25%, #3b82f6 30%)`,
            backgroundSize: '200% 200%',
            backgroundPosition: '50% 50%, 50% 50%',
            filter: 'blur(30px)',
            maskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)',
            animation: 'aurora 25s linear infinite'
          }}
        />
        <div
          className="absolute -inset-[10px] opacity-30 will-change-transform mix-blend-difference"
          style={{
            backgroundImage: `repeating-linear-gradient(100deg, #fff 10%, #fff 15%, transparent 20%, transparent 25%), repeating-linear-gradient(100deg, #10b981 10%, #3b82f6 15%, #8b5cf6 20%, #f43f5e 25%, #10b981 30%)`,
            backgroundSize: '200% 200%',
            backgroundPosition: '50% 50%, 50% 50%',
            filter: 'blur(40px)',
            maskImage: 'radial-gradient(ellipse at 0% 100%, black 10%, transparent 70%)',
            animation: 'aurora-reverse 30s linear infinite'
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16 md:py-32 flex flex-col gap-16 md:gap-32 relative z-10">
        
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
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
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
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
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
              className="group cursor-pointer border-b border-black/10 py-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
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
                  className="w-full py-8 flex items-center justify-between text-left focus:outline-none group"
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
        <footer className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-black/10 pt-12 pb-6 text-center">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">
            &copy; {new Date().getFullYear()} Maktab Diagnostikasi.
          </span>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">
            Barcha huquqlar himoyalangan.
          </span>
        </footer>

      </div>
    </div>
  );
}
