import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Crown, ArrowLeft, Gamepad2, Brain, Flame, BookOpen, Languages, ChevronRight } from 'lucide-react';

// ─── Premium Color Themes ──────────────────────────────────────────────────
const COLORS = {
  blue: {
    gradient: 'from-[#2563EB] via-[#4F46E5] to-[#4338CA]',
    text: 'text-indigo-600',
    hoverText: 'group-hover:text-indigo-700',
  },
  purple: {
    gradient: 'from-[#8B5CF6] via-[#D946EF] to-[#C026D3]',
    text: 'text-fuchsia-600',
    hoverText: 'group-hover:text-fuchsia-700',
  },
  teal: {
    gradient: 'from-[#14B8A6] via-[#10B981] to-[#059669]',
    text: 'text-emerald-600',
    hoverText: 'group-hover:text-emerald-700',
  }
};

// ─── Elegant Game Card ──────────────────────────────────────────────────────
interface GameCardProps {
  onClick: () => void;
  colorObj: typeof COLORS.blue;
  tag: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const GameCard = ({ onClick, colorObj, tag, title, description, icon: Icon }: GameCardProps) => {
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-3xl border border-slate-200/80 cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 h-full"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Top Graphic Section (Glassmorphism & Gradient) */}
      <div className={`relative h-48 w-full bg-gradient-to-br ${colorObj.gradient} overflow-hidden shrink-0 flex items-center justify-center`}>
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-30%] left-[-10%] w-[70%] h-[140%] bg-white/10 rounded-full blur-[40px] transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute bottom-[-30%] right-[-10%] w-[70%] h-[140%] bg-black/10 rounded-full blur-[40px] transform group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-700" />
        
        {/* Elegant Category Badge */}
        <div className="absolute top-4 left-5 z-10">
          <div className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold tracking-wider uppercase shadow-sm">
            {tag}
          </div>
        </div>

        {/* Large Centered Icon */}
        <div className="relative z-10 text-white transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-xl mt-4">
          <Icon size={76} strokeWidth={1.5} />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-7 flex-1 flex flex-col bg-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
             <Flame className="w-3.5 h-3.5" /> Qiziqarli
          </span>
        </div>
        
        {/* Title explicitly uses font-sans to override any heavy custom fonts */}
        <h3 className="text-2xl font-bold text-slate-900 mb-2.5 font-sans tracking-tight">
          {title}
        </h3>
        
        <p className="text-slate-500 text-[15px] leading-relaxed mb-8 flex-1 font-sans">
          {description}
        </p>

        {/* Minimalist Action Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className={`font-semibold text-[15px] font-sans transition-colors text-slate-500 ${colorObj.hoverText}`}>
            O'ynashni boshlash
          </span>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors text-slate-400 ${colorObj.hoverText}`}>
            <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────

const GamesList = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { navigate('/teacher/login'); return; }
    fetchCurrentTeacher().then(fresh => { setTeacher(fresh); setLoading(false); });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  return (
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50 overflow-x-hidden selection:bg-indigo-100">
      
      {/* Ultra-subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Premium Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-95 transition-all text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
               <Gamepad2 className="w-4 h-4 text-indigo-600" strokeWidth={2.5} />
            </div>
            <h1 className="text-[16px] font-bold text-slate-800 tracking-tight font-sans">
              Mini O'yinlar
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center mt-12 bg-white border border-amber-200/60 p-10 rounded-3xl shadow-xl shadow-amber-500/5">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[20px] flex items-center justify-center mx-auto mb-6 border border-amber-100">
              <Crown className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-slate-900 font-sans tracking-tight">Premium obuna zarur</h2>
            <p className="text-slate-500 text-[15px] mb-8 leading-relaxed font-sans">
              Ta'limiy o'yinlar modulidan foydalanish va o'quvchilaringiz darslarini qiziqarli o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-medium text-[15px] hover:bg-slate-800 active:scale-[0.98] transition-all w-full shadow-lg shadow-slate-900/20"
            >
              Tarifni o'zgartirish
            </button>
          </div>
        ) : (
          <div>
            {/* Elegant Title Section */}
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-[42px] font-bold tracking-tight text-slate-900 mb-4 font-sans leading-tight">
                Bosh Qotirmalar
              </h2>
              <p className="text-[16px] text-slate-500 font-sans leading-relaxed">
                O'quvchilar e'tiborini tortish va bilimlarini mustahkamlash uchun mo'ljallangan interaktiv o'yinlar to'plami.
              </p>
            </div>

            {/* Premium Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch pb-16">
              
              {/* Math Card */}
              <GameCard
                onClick={() => navigate('/games/math-ninja')}
                colorObj={COLORS.blue}
                tag="Matematika"
                title="Tezkor Hisob"
                description="Qisqa vaqt ichida eng ko'p matematik misollarni yeching. Tezlik va aniqlik — g'alaba kaliti!"
                icon={Brain}
              />

              {/* English Card */}
              <GameCard
                onClick={() => navigate('/games/english-words')}
                colorObj={COLORS.purple}
                tag="Ingliz Tili"
                title="English Words"
                description="O'zbek so'zni ko'r va inglizcha tarjimasini tez tanla. Lug'atingizni kengaytiring!"
                icon={BookOpen}
              />

              {/* Russian Card */}
              <GameCard
                onClick={() => navigate('/games/russian-words')}
                colorObj={COLORS.teal}
                tag="Rus Tili"
                title="Rus So'zlari"
                description="O'zbek so'zni ko'r va ruscha tarjimasini tez tanla. Rus tilini o'yin orqali o'rganing!"
                icon={Languages}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamesList;
