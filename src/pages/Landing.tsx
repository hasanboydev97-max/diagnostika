import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Plus, User, GraduationCap, Settings, Palette, Check, X,
  Zap, Crown, Copy, ExternalLink, Send
} from 'lucide-react';
import MeshGradient, { palettes } from '../components/ui/MeshGradient';
import { getToken } from '../lib/auth';
import { db } from '../lib/db';
import { toast } from 'sonner';
import type { PlanType } from '../utils/planLimits';

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

  // Subscription state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanType | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);

  const token = getToken();

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
              <img src="/logo.png" alt="HB Diagnostikasi" className="w-10 h-10 rounded-xl object-contain bg-white border border-black/10 p-1 shadow-sm" />
              <span className="font-extrabold text-lg tracking-tight text-neutral-900">HB Diagnostikasi</span>
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

        {/* PRICING SECTION (PREMIUM MINIMALIST UI) */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 border-t border-black/10 pt-16 md:pt-32">
          <div className="md:col-span-4 md:sticky md:top-32 h-fit">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <h2 className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-500 mb-4">
                {t('landing.pricing_title', 'TARIFLAR')}
              </h2>
              <h3 className="text-3xl md:text-4xl font-medium tracking-tight mb-4 text-[#111111] leading-tight">
                Mos tarifni <span className="italic text-black/70">tanlang</span>
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-8">
                {t('landing.pricing_subtitle', 'Har bir o\'qituvchi va ta\'lim muassasasi uchun moslashtirilgan xizmat paketlari.')}
              </p>

              {/* Minimalist Billing Cycle Switch */}
              <div className="inline-flex items-center p-1 bg-black/[0.04] border border-black/10 rounded-2xl pointer-events-auto">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.06)] scale-[1.02]'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Oylik
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    billingCycle === 'yearly'
                      ? 'bg-black text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] scale-[1.02]'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <span>Yillik</span>
                  <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    -20%
                  </span>
                </button>
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-8 flex flex-col gap-6 pointer-events-auto">
            {/* FREE PLAN ITEM */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              onClick={() => {
                if (token) navigate('/online-tests');
                else navigate('/login');
              }}
              className="relative group cursor-pointer border border-black/10 hover:border-black/30 rounded-3xl p-8 transition-all duration-500 overflow-hidden bg-white/50 backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-neutral-100/80 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-gray-400">BOSHLANG'ICH</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight mb-2 group-hover:translate-x-1 transition-transform duration-300">
                    Free (Bepul)
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-sm mb-6 group-hover:translate-x-1 transition-transform duration-300 delay-75">
                    Platforma imkoniyatlari bilan bepul tanishib chiqish uchun.
                  </p>

                  <ul className="space-y-2.5 text-xs text-gray-600 font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black shrink-0" strokeWidth={1.5} />
                      <span>Kuniga 3 ta AI test yaratish</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black shrink-0" strokeWidth={1.5} />
                      <span>Maksimal 2 ta aktiv onlayn test</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black shrink-0" strokeWidth={1.5} />
                      <span>Test boshiga 15 ta o'quvchi</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col md:items-end justify-between shrink-0">
                  <div className="text-3xl md:text-4xl font-medium tracking-tight text-neutral-900 mb-6">
                    0 <span className="text-xs text-gray-400 font-normal tracking-normal">so'm / abadiy</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-black group-hover:translate-x-1 transition-transform">
                    <span>Bepul Boshlash</span>
                    <ArrowRight className="w-5 h-5 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-1 transition-all duration-500" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* STANDARD PLAN ITEM (RECOMMENDED 🔥) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
              onClick={() => {
                if (!token) {
                  toast.info("Tarifni tanlash uchun avval tizimga kiring!");
                  navigate('/login');
                } else {
                  setSelectedPlanForPayment('standard');
                }
              }}
              className="relative group cursor-pointer border-2 border-black rounded-3xl p-8 transition-all duration-500 overflow-hidden bg-white shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
            >
              <div className="absolute inset-0 bg-neutral-900 text-white origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-semibold tracking-[0.3em] uppercase bg-black text-white group-hover:bg-amber-400 group-hover:text-black transition-colors px-2.5 py-0.5 rounded-full">
                      ENG OMMABOP
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight mb-2 group-hover:translate-x-1 group-hover:text-white transition-all duration-300">
                    Standard (Standart)
                  </h3>
                  <p className="text-sm text-gray-500 group-hover:text-neutral-300 leading-relaxed max-w-sm mb-6 group-hover:translate-x-1 transition-all duration-300 delay-75">
                    Faol o'qituvchilar va repetitorlar uchun eng mukammal tanlov.
                  </p>

                  <ul className="space-y-2.5 text-xs text-gray-700 group-hover:text-neutral-200 font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black group-hover:text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span>Kuniga <b>25 ta AI test</b> (Math + Formula)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black group-hover:text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span><b>Cheksiz</b> aktiv onlayn testlar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black group-hover:text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span>Test boshiga <b>50 ta o'quvchi</b></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-black group-hover:text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span><b>PDF + DOCX (Word)</b> yuklab olish</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col md:items-end justify-between shrink-0">
                  <div className="text-3xl md:text-4xl font-medium tracking-tight text-neutral-900 group-hover:text-white mb-6 transition-colors">
                    {billingCycle === 'monthly' ? '49,000' : '470,000'}
                    <span className="text-xs text-gray-400 group-hover:text-neutral-400 font-normal tracking-normal ml-1">
                      so'm / {billingCycle === 'monthly' ? 'oy' : 'yil'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-black group-hover:text-white group-hover:translate-x-1 transition-all">
                    <span>Tanlash</span>
                    <ArrowRight className="w-5 h-5 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-1 transition-all duration-500" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* PREMIUM PLAN ITEM 👑 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              onClick={() => {
                if (!token) {
                  toast.info("Tarifni tanlash uchun avval tizimga kiring!");
                  navigate('/login');
                } else {
                  setSelectedPlanForPayment('premium');
                }
              }}
              className="relative group cursor-pointer border border-neutral-900 rounded-3xl p-8 transition-all duration-500 overflow-hidden bg-[#050505] text-white shadow-2xl"
            >
              <div className="absolute inset-0 bg-neutral-900 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.87,0,0.13,1)] z-0" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-semibold tracking-[0.3em] uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                      PROFESSIONAL / MAKTAB
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight mb-2 group-hover:translate-x-1 transition-transform duration-300">
                    Premium (Maktab)
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed max-w-sm mb-6 group-hover:translate-x-1 transition-transform duration-300 delay-75">
                    Maktablar, litseylar va o'quv markazlari uchun cheksiz imkoniyatlar.
                  </p>

                  <ul className="space-y-2.5 text-xs text-neutral-300 font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span><b>Cheksiz AI testlar</b> + OCR Scanser</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span><b>Cheksiz</b> o'quvchilar va aktiv testlar</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span><b>PDF + DOCX + Excel</b> natijalar analitikasi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
                      <span>Maktab logotipi va 24/7 VIP menejer</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col md:items-end justify-between shrink-0">
                  <div className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-6">
                    {billingCycle === 'monthly' ? '99,000' : '950,000'}
                    <span className="text-xs text-neutral-400 font-normal tracking-normal ml-1">
                      so'm / {billingCycle === 'monthly' ? 'oy' : 'yil'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white group-hover:translate-x-1 transition-transform">
                    <span>Ulanish</span>
                    <ArrowRight className="w-5 h-5 transform -rotate-45 group-hover:rotate-0 group-hover:translate-x-1 transition-all duration-500" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
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
            <img src="/logo.png" alt="HB Logo" className="w-8 h-8 rounded-lg object-contain bg-white border border-black/10 p-0.5" />
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

      {/* SUBSCRIPTION PAYMENT MODAL */}
      <AnimatePresence>
        {selectedPlanForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-black/10 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedPlanForPayment(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {selectedPlanForPayment === 'standard' ? <Zap className="w-6 h-6 text-amber-400" /> : <Crown className="w-6 h-6 text-amber-400" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 capitalize">
                    {selectedPlanForPayment} Tarifiga Ulanish
                  </h3>
                  <p className="text-xs text-neutral-500">
                    To'lov qilgandan so'ng admin доступni tezkor ochib beradi
                  </p>
                </div>
              </div>

              {/* Plan Price Summary */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">To'lov summasi</span>
                  <span className="text-2xl font-extrabold text-neutral-900">
                    {selectedPlanForPayment === 'standard' 
                      ? (billingCycle === 'monthly' ? '49,000 so\'m' : '470,000 so\'m')
                      : (billingCycle === 'monthly' ? '99,000 so\'m' : '950,000 so\'m')}
                  </span>
                </div>
                <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl uppercase">
                  {billingCycle === 'monthly' ? '1 Oylik' : '1 Yillik (-20%)'}
                </span>
              </div>

              {/* Payment Details */}
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    💳 KARTA RAQAMI (CLICK / PAYME)
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg md:text-xl font-bold tracking-wider">
                      8600 0000 0000 0000
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("8600000000000000");
                        setCopiedCard(true);
                        toast.success("Karta raqami nusxalandi!");
                        setTimeout(() => setCopiedCard(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCard ? 'Nusxalandi' : 'Nusxalash'}</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-400 block mt-1">Egasining ismi: HB DIAGNOSTIKA MCHJ</span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 p-2">
                  <span>Yoki Telegram orqali bog'laning:</span>
                  <a
                    href="https://t.me/hb_admin_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-black font-bold hover:underline flex items-center gap-1"
                  >
                    <span>@hb_admin_bot</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Telefon raqamingiz yoki to'lov cheki (kodi):
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: +998 90 123 45 67 yoki Chek kodi #8492"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 focus:outline-none focus:border-black text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPlanForPayment(null)}
                  className="flex-1 py-3 rounded-2xl border border-neutral-200 text-neutral-700 font-semibold text-xs hover:bg-neutral-100 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={async () => {
                    if (!selectedPlanForPayment || !token) return;
                    setIsSubmittingPayment(true);
                    try {
                      await db.requestSubscription(token, selectedPlanForPayment, paymentNote);
                      toast.success("To'lov so'rovi yuborildi! Admin tez orada dostupni faollashtiradi.");
                      setSelectedPlanForPayment(null);
                      setPaymentNote('');
                    } catch (err: any) {
                      toast.error(err.message || "Xatolik yuz berdi");
                    } finally {
                      setIsSubmittingPayment(false);
                    }
                  }}
                  disabled={isSubmittingPayment}
                  className="flex-1 py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmittingPayment ? (
                    <span>Yuborilmoqda...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>So'rovni Yuborish</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
