import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Zap, Crown, ArrowLeft, Gamepad2, Brain, Flame, BookOpen, Languages } from 'lucide-react';
import MeshGradient from '../../components/ui/MeshGradient';

// ─── Reusable Game Card ────────────────────────────────────────────────────
interface GameCardProps {
  onClick: () => void;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  borderHover: string;
  btnBg: string;
  btnBorder: string;
  tag: string;
  tagBg: string;
  tagText: string;
  title: string;
  description: string;
  emoji: string;
  previewContent: React.ReactNode;
  icon: React.ReactNode;
}

const GameCard = ({
  onClick, gradientFrom, gradientVia, gradientTo,
  borderHover, btnBg, btnBorder,
  tag, tagBg, tagText, title, description, emoji,
  previewContent, icon,
}: GameCardProps) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group border-b-[6px] border-slate-200 ${borderHover} shadow-sm hover:shadow-xl hover:-translate-y-2`}
  >
    {/* Thumbnail */}
    <div className={`h-40 bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} relative overflow-hidden flex items-center justify-center p-4 shrink-0`}>
      <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700" />
      <div className="absolute bottom-[-20%] left-[-10%] w-24 h-24 bg-black/10 rounded-full blur-lg group-hover:scale-125 transition-transform duration-700 delay-100" />
      <div className="absolute -right-6 -bottom-6 rotate-12 group-hover:rotate-0 transition-transform duration-500 opacity-[0.07] text-white">
        {icon}
      </div>
      <div className="relative z-10 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-3 rounded-2xl text-white font-mono text-2xl md:text-3xl font-black drop-shadow-lg transform group-hover:scale-105 transition-transform duration-300">
        {previewContent}
      </div>
    </div>

    {/* Body */}
    <div className="p-6 flex-1 flex flex-col bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] uppercase tracking-widest font-black ${tagBg} ${tagText} px-2.5 py-1 rounded-lg`}>
          {tag}
        </span>
        <span className="text-[10px] uppercase tracking-widest font-black bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg flex items-center gap-1">
          <Flame className="w-3 h-3" /> QIZIQARLI
        </span>
      </div>

      <h3 className="text-2xl font-black mb-2 text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed flex-1">{description} {emoji}</p>

      <div className="mt-auto">
        <div className={`${btnBg} text-white w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors shadow-md border-b-[4px] ${btnBorder} active:border-b-0 active:translate-y-[4px]`}>
          Hozir O'ynash <Zap className="w-5 h-5 fill-white" />
        </div>
      </div>
    </div>
  </div>
);

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
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd]">
        <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd]">
      <MeshGradient />

      {/* Header */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-sm font-semibold text-zinc-900">Ta'limiy O'yinlar</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center mt-8 bg-white/60 backdrop-blur-md border border-amber-200 p-10 rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Premium obuna zarur</h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Ta'limiy o'yinlar modulidan foydalanish va o'quvchilaringiz darslarini qiziqarli o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-neutral-800 transition-colors w-full"
            >
              Tarifni o'zgartirish
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Mini O'yinlar</h2>
              <p className="text-sm text-neutral-500 max-w-xl mx-auto">
                O'quvchilar e'tiborini tortish va darsni interaktiv qilish uchun mo'ljallangan maxsus o'yinlar to'plami.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* 1 — Math */}
              <GameCard
                onClick={() => navigate('/games/math-ninja')}
                gradientFrom="from-[#3B82F6]"
                gradientVia="via-[#6366F1]"
                gradientTo="to-[#8B5CF6]"
                borderHover="hover:border-indigo-500"
                btnBg="bg-[#10B981] hover:bg-[#059669]"
                btnBorder="border-[#059669]"
                tag="Matematika"
                tagBg="bg-indigo-100"
                tagText="text-indigo-600"
                title="Tezkor Hisob"
                description="Qisqa vaqt ichida eng ko'p matematik misollarni yeching. Tezlik va aniqlik — g'alaba kaliti!"
                emoji="🏆"
                previewContent="12 × 4 = ?"
                icon={<Brain className="w-32 h-32" />}
              />

              {/* 2 — English */}
              <GameCard
                onClick={() => navigate('/games/english-words')}
                gradientFrom="from-[#8B5CF6]"
                gradientVia="via-[#A855F7]"
                gradientTo="to-[#EC4899]"
                borderHover="hover:border-violet-500"
                btnBg="bg-[#8B5CF6] hover:bg-[#7C3AED]"
                btnBorder="border-[#6D28D9]"
                tag="Ingliz tili"
                tagBg="bg-violet-100"
                tagText="text-violet-600"
                title="English Words"
                description="O'zbek so'zni ko'r va inglizcha tarjimasini tez tanla. Lug'atingizni kengaytiring!"
                emoji="🇬🇧"
                previewContent={<span>Olma → <span className="opacity-60">?</span></span>}
                icon={<BookOpen className="w-32 h-32" />}
              />

              {/* 3 — Russian */}
              <GameCard
                onClick={() => navigate('/games/russian-words')}
                gradientFrom="from-[#0D9488]"
                gradientVia="via-[#06B6D4]"
                gradientTo="to-[#3B82F6]"
                borderHover="hover:border-teal-500"
                btnBg="bg-[#0D9488] hover:bg-[#0f766e]"
                btnBorder="border-[#0f766e]"
                tag="Rus tili"
                tagBg="bg-teal-100"
                tagText="text-teal-600"
                title="Rus So'zlari"
                description="O'zbek so'zni ko'r va ruscha tarjimasini tez tanla. Rus tilini o'yin orqali o'rganing!"
                emoji="🇷🇺"
                previewContent={<span>Kitob → <span className="opacity-60">?</span></span>}
                icon={<Languages className="w-32 h-32" />}
              />

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamesList;
