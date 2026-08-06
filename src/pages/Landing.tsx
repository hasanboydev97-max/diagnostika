import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Activity, Users, ShieldAlert, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function Landing() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1]
      } 
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-center items-center py-12 px-6 sm:px-12 font-sans selection:bg-zinc-200 selection:text-black">
      
      {/* Background Grid - Extremely subtle, engineering feel */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col mb-16 md:mb-24"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 border border-zinc-200 rounded-lg flex items-center justify-center p-1 bg-white shadow-sm">
              <img src={logo} alt="Maktab Logosi" className="w-full h-full object-contain mix-blend-darken" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Platforma ishga tushdi
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 mb-6 leading-[1.1]">
            Maktab Diagnostikasi. <br className="hidden md:block" />
            <span className="text-zinc-400">Ta'limni aniq o'lchash.</span>
          </h1>
          
          <p className="text-base md:text-lg text-zinc-600 max-w-2xl leading-relaxed">
            Diagnostika testlarini o'tkazish, tahlil qilish va nazorat qilish uchun yagona markazlashtirilgan tizim. Maqsadli foydalanuvchilar uchun maxsus portallar.
          </p>
        </motion.div>

        {/* Cards Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {/* Student Card */}
          <motion.div variants={itemVariants} className="group">
            <div 
              onClick={() => navigate('/login')}
              className="h-full bg-white border border-zinc-200 hover:border-zinc-400 p-6 sm:p-8 cursor-pointer transition-colors duration-200 flex flex-col"
            >
              <div className="w-10 h-10 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:border-zinc-900 group-hover:text-white text-zinc-700 transition-colors duration-200">
                <Activity strokeWidth={2} className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-2">O'quvchi Portali</h2>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1 mb-8">
                Tizimga kiring, shaxsiy test natijalaringizni ko'ring va umumiy reytingdagi o'rningizni tahlil qiling.
              </p>
              <div className="flex items-center text-sm font-medium text-zinc-900 mt-auto">
                Kirish
                <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Teacher Card */}
          <motion.div variants={itemVariants} className="group">
            <div 
              onClick={() => navigate('/online-tests')}
              className="h-full bg-white border border-zinc-200 hover:border-zinc-400 p-6 sm:p-8 cursor-pointer transition-colors duration-200 flex flex-col"
            >
              <div className="w-10 h-10 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:border-zinc-900 group-hover:text-white text-zinc-700 transition-colors duration-200">
                <Users strokeWidth={2} className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-2">O'qituvchi Portali</h2>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1 mb-8">
                Yangi onlayn testlar formati yarating, guruhlarni boshqaring va sun'iy intellekt xulosalarini oling.
              </p>
              <div className="flex items-center text-sm font-medium text-zinc-900 mt-auto">
                Boshqarish
                <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div variants={itemVariants} className="group">
            <div 
              onClick={() => navigate('/superadmin')}
              className="h-full bg-white border border-zinc-200 hover:border-zinc-400 p-6 sm:p-8 cursor-pointer transition-colors duration-200 flex flex-col"
            >
              <div className="w-10 h-10 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:border-zinc-900 group-hover:text-white text-zinc-700 transition-colors duration-200">
                <ShieldAlert strokeWidth={2} className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-2">Super Admin</h2>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1 mb-8">
                Markazlashgan boshqaruv. O'qituvchilarni ro'yxatdan o'tkazish, test statistikasini monitoring qilish.
              </p>
              <div className="flex items-center text-sm font-medium text-zinc-900 mt-auto">
                Monitoring
                <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
          
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-6 w-full z-10 flex justify-center"
      >
        <p className="text-[11px] text-zinc-400 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} MAKTAB DIAGNOSTIKASI. BARCHA HUQUQLAR HIMOYALANGAN.
        </p>
      </motion.div>
    </div>
  );
}
