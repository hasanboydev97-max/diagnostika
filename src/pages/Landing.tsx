import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Users, ShieldAlert, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function Landing() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-['Space_Grotesk'] selection:bg-slate-900 selection:text-white relative overflow-hidden">
      
      {/* Subtle grid background for premium engineering feel */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none"></div>

      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16 text-center"
        >
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl transform -rotate-3 transition-transform hover:rotate-0 duration-300 overflow-hidden border-2 border-white ring-1 ring-slate-100 mb-6">
            <img src={logo} alt="Maktab Logosi" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
            Maktab Diagnostikasi
          </h1>
          <p className="text-base md:text-lg text-slate-500 max-w-xl">
            Ta'lim sifatini oshirish uchun mo'ljallangan yagona intellektual platforma. O'zingizga mos bo'limni tanlang.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {/* Student Card */}
          <motion.div variants={itemVariants} className="group relative">
            <div className="absolute inset-0 bg-blue-100 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
            <div 
              onClick={() => navigate('/login')}
              className="relative h-full bg-white border border-slate-200 p-8 rounded-3xl cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all duration-300 flex flex-col group-hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Activity strokeWidth={2.5} className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">O'quvchilar</h2>
              <p className="text-sm text-slate-500 flex-1 mb-8">
                Tizimga kirish orqali barcha diagnostika natijalaringizni, sun'iy intellekt xulosalarini va o'sish ko'rsatkichingizni ko'rib chiqing.
              </p>
              <div className="flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                Tizimga kirish
                <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Teacher Card */}
          <motion.div variants={itemVariants} className="group relative">
            <div className="absolute inset-0 bg-emerald-100 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
            <div 
              onClick={() => navigate('/online-tests')}
              className="relative h-full bg-white border border-slate-200 p-8 rounded-3xl cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all duration-300 flex flex-col group-hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Users strokeWidth={2.5} className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">O'qituvchilar</h2>
              <p className="text-sm text-slate-500 flex-1 mb-8">
                O'quvchilaringiz uchun onlayn testlar yarating, ularning natijalarini kuzatib boring va avtomatik hisobotlarni oling.
              </p>
              <div className="flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
                Boshqaruv paneli
                <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div variants={itemVariants} className="group relative">
            <div className="absolute inset-0 bg-purple-100 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
            <div 
              onClick={() => navigate('/superadmin')}
              className="relative h-full bg-white border border-slate-200 p-8 rounded-3xl cursor-pointer hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300 flex flex-col group-hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <ShieldAlert strokeWidth={2.5} className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Super Admin</h2>
              <p className="text-sm text-slate-500 flex-1 mb-8">
                Tizimning to'liq nazorati. O'qituvchilarni boshqarish, barcha testlarni tahlil qilish va umumiy reytinglarni ko'rish paneli.
              </p>
              <div className="flex items-center text-sm font-semibold text-purple-600 group-hover:text-purple-700">
                Admin Paneliga o'tish
                <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 text-center w-full">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Maktab Diagnostikasi platformasi.
        </p>
      </div>
    </div>
  );
}
