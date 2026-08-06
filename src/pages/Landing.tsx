import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Activity, Users, ShieldAlert, ChevronRight, Sparkles } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function Landing() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: "spring", 
        stiffness: 200, 
        damping: 20 
      } 
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-['Space_Grotesk'] selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Premium Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlNWEwY2MiIGZpbGwtb3BhY2l0eT0iMC40Ii8+PC9zdmc+')] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_40%,transparent_100%)] opacity-60"></div>
        
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
        <div className="absolute top-0 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-20 text-center relative"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-slate-200/50 backdrop-blur-md shadow-sm mb-8 text-xs font-semibold text-slate-600">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Ta'limning yangi davri</span>
          </div>

          <div className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mb-8 relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src={logo} alt="Maktab Logosi" className="w-16 h-16 object-contain mix-blend-darken relative z-10" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 mb-6 pb-2 leading-tight">
            Maktab <br className="md:hidden" /> Diagnostikasi
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl font-medium leading-relaxed">
            Ta'lim sifatini raqamli baholash va oshirish uchun mo'ljallangan yagona intellektual platforma. O'zingizga mos portaldan foydalaning.
          </p>
        </motion.div>

        {/* Cards Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full px-4 sm:px-0"
        >
          {/* Student Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <div 
              onClick={() => navigate('/login')}
              className="relative h-full bg-white/40 hover:bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(59,130,246,0.08)] rounded-[2rem] p-8 cursor-pointer transition-all duration-500 flex flex-col hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-500">
                  <Activity strokeWidth={2} className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">O'quvchilar</h2>
                <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-8">
                  Barcha diagnostika natijalaringizni, sun'iy intellekt xulosalarini va shaxsiy o'sish ko'rsatkichingizni tahlil qiling.
                </p>
              </div>

              <div className="mt-auto relative z-10">
                <div className="flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Tizimga kirish
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Teacher Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <div 
              onClick={() => navigate('/online-tests')}
              className="relative h-full bg-white/40 hover:bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(16,185,129,0.08)] rounded-[2rem] p-8 cursor-pointer transition-all duration-500 flex flex-col hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white transition-all duration-500">
                  <Users strokeWidth={2} className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">O'qituvchilar</h2>
                <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-8">
                  Onlayn testlar yarating, o'quvchilar natijalarini kuzatib boring va avtomatlashtirilgan hisobotlarni oling.
                </p>
              </div>

              <div className="mt-auto relative z-10">
                <div className="flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
                  Boshqaruv paneli
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div variants={itemVariants} className="group h-full">
            <div 
              onClick={() => navigate('/superadmin')}
              className="relative h-full bg-white/40 hover:bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(139,92,246,0.08)] rounded-[2rem] p-8 cursor-pointer transition-all duration-500 flex flex-col hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-all duration-500">
                  <ShieldAlert strokeWidth={2} className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Super Admin</h2>
                <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-8">
                  Tizimning to'liq nazorati. O'qituvchilarni boshqarish, barcha testlarni tahlil qilish va umumiy reytinglar.
                </p>
              </div>

              <div className="mt-auto relative z-10">
                <div className="flex items-center text-sm font-semibold text-purple-600 group-hover:text-purple-700">
                  Admin Panel
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
          
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-center w-full z-10"
      >
        <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
          &copy; {new Date().getFullYear()} Maktab Diagnostikasi
        </p>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}
