import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Zap, Crown, ArrowLeft, Gamepad2, Brain, Flame, BookOpen, Languages, Play } from 'lucide-react';

// ─── Color Palettes for the 3D Cards ──────────────────────────────────────
const COLORS = {
  blue: {
    bg: 'bg-[#3B82F6]',
    border: 'border-[#3B82F6]',
    shadow: 'shadow-[#1D4ED8]',
  },
  purple: {
    bg: 'bg-[#8B5CF6]',
    border: 'border-[#8B5CF6]',
    shadow: 'shadow-[#5B21B6]',
  },
  teal: {
    bg: 'bg-[#0D9488]',
    border: 'border-[#0D9488]',
    shadow: 'shadow-[#0F766E]',
  }
};

// ─── Reusable 3D Game Card ──────────────────────────────────────────────────
interface GameCardProps {
  onClick: () => void;
  colorObj: typeof COLORS.blue;
  tag: string;
  title: string;
  description: string;
  emoji: string;
  icon: React.ElementType;
}

const GameCard = ({
  onClick, colorObj, tag, title, description, emoji, icon: Icon
}: GameCardProps) => {
  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col rounded-[32px] cursor-pointer group hover:-translate-y-1 active:translate-y-1 active:scale-[0.98] transition-all duration-200 bg-white border-[3px] ${colorObj.border} shadow-[0_8px_0_0] hover:shadow-[0_12px_0_0] active:shadow-[0_0px_0_0] ${colorObj.shadow} h-full`}
    >
      {/* Header section (Graphic Area) */}
      <div className={`relative overflow-hidden rounded-t-[28px] p-8 flex flex-col items-center justify-center shrink-0 ${colorObj.bg}`}>
        {/* Badge & Emoji */}
        <div className="absolute top-5 left-5 z-10">
          <div className="bg-white/25 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl backdrop-blur-md shadow-sm">
            {tag}
          </div>
        </div>
        <div className="absolute top-5 right-5 text-3xl z-10 drop-shadow-md">
          {emoji}
        </div>
        
        {/* Giant icon */}
        <div className="text-white transform group-hover:scale-110 group-hover:rotate-[5deg] transition-transform duration-500 drop-shadow-2xl mt-4 mb-2 relative z-10">
          <Icon size={90} strokeWidth={2.5} />
        </div>
        
        {/* Decorative Glossy Elements */}
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-[30px]" />
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-black/10 rounded-full blur-[30px]" />
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
      </div>

      {/* Body section (Text & Action) */}
      <div className="p-7 flex-1 flex flex-col bg-white rounded-b-[28px]">
        <div className="flex items-center gap-2 mb-3">
           <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg">
             <Flame className="w-3 h-3" /> QIZIQARLI
           </span>
        </div>
        
        <h3 className="text-[24px] font-black text-slate-800 mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-slate-500 font-bold text-[15px] leading-relaxed mb-8 flex-1">
          {description}
        </p>

        {/* Action Button - Syncs with card color */}
        <div className={`w-full py-4 rounded-[18px] text-white font-black text-lg flex items-center justify-center gap-2 transition-colors ${colorObj.bg}`}>
          Hozir O'ynash <Play className="w-5 h-5" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────

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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="w-10 h-10 border-[4px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  return (
    <div className="min-h-screen relative font-sans text-slate-900 bg-[#F4F6F8] overflow-x-hidden selection:bg-indigo-200">
      {/* Subtle Premium Background Elements */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-slate-200/40 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 bg-white/70 backdrop-blur-2xl border-b border-slate-200/70 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-white border-[2px] border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-sm">
               <Gamepad2 className="w-4 h-4 text-indigo-600" strokeWidth={3} />
            </div>
            <h1 className="text-[17px] font-black text-slate-800 tracking-tight uppercase">Mini O'yinlar</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center mt-12 bg-white border-[3px] border-amber-200 p-10 rounded-[32px] shadow-[0_12px_0_0_rgba(251,191,36,0.3)]">
            <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200">
              <Crown className="w-12 h-12" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-800">Premium obuna zarur</h2>
            <p className="text-slate-600 font-bold mb-8 leading-relaxed">
              Ta'limiy o'yinlar modulidan foydalanish va o'quvchilaringiz darslarini qiziqarli o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-amber-500 text-white px-8 py-4 rounded-[16px] font-black text-lg border-b-[4px] border-amber-700 hover:bg-amber-400 active:border-b-0 active:translate-y-[4px] transition-all w-full shadow-lg"
            >
              Tarifni o'zgartirish
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-10 text-center">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-800 drop-shadow-sm">
                Bosh Qotirmalar
              </h2>
              <p className="text-base font-bold text-slate-500 max-w-2xl mx-auto">
                O'quvchilar e'tiborini tortish va bilimlarini mustahkamlash uchun mo'ljallangan interaktiv va qiziqarli o'yinlar to'plami.
              </p>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 items-stretch">
              {/* 1 — Math */}
              <GameCard
                onClick={() => navigate('/games/math-ninja')}
                colorObj={COLORS.blue}
                tag="Matematika"
                title="Tezkor Hisob"
                description="Qisqa vaqt ichida eng ko'p matematik misollarni yeching. Tezlik va aniqlik — g'alaba kaliti!"
                emoji="🔢"
                icon={Brain}
              />

              {/* 2 — English */}
              <GameCard
                onClick={() => navigate('/games/english-words')}
                colorObj={COLORS.purple}
                tag="Ingliz Tili"
                title="English Words"
                description="O'zbek so'zni ko'r va inglizcha tarjimasini tez tanla. Lug'atingizni kengaytiring!"
                emoji="🇬🇧"
                icon={BookOpen}
              />

              {/* 3 — Russian */}
              <GameCard
                onClick={() => navigate('/games/russian-words')}
                colorObj={COLORS.teal}
                tag="Rus Tili"
                title="Rus So'zlari"
                description="O'zbek so'zni ko'r va ruscha tarjimasini tez tanla. Rus tilini o'yin orqali o'rganing!"
                emoji="🇷🇺"
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
