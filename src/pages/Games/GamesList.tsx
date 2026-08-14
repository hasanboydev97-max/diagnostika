import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Crown, ArrowLeft, Gamepad2, Brain, Flame, BookOpen, Languages, ChevronRight, Sparkles, Search, Grid, Zap } from 'lucide-react';

const COLORS = {
  blue: {
    gradient: 'from-blue-600 via-indigo-600 to-indigo-700',
    text: 'text-indigo-600',
    hoverText: 'group-hover:text-indigo-700',
    badgeBg: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  },
  indigo: {
    gradient: 'from-indigo-600 via-purple-600 to-purple-700',
    text: 'text-indigo-600',
    hoverText: 'group-hover:text-indigo-700',
    badgeBg: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  },
  amber: {
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    text: 'text-amber-600',
    hoverText: 'group-hover:text-amber-700',
    badgeBg: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  purple: {
    gradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
    text: 'text-fuchsia-600',
    hoverText: 'group-hover:text-fuchsia-700',
    badgeBg: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-700'
  },
  teal: {
    gradient: 'from-teal-500 via-emerald-600 to-green-700',
    text: 'text-emerald-600',
    hoverText: 'group-hover:text-emerald-700',
    badgeBg: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  rose: {
    gradient: 'from-rose-500 via-pink-600 to-purple-600',
    text: 'text-rose-600',
    hoverText: 'group-hover:text-rose-700',
    badgeBg: 'bg-rose-50 border-rose-100 text-rose-700'
  },
  cyan: {
    gradient: 'from-cyan-500 via-sky-600 to-blue-600',
    text: 'text-sky-600',
    hoverText: 'group-hover:text-sky-700',
    badgeBg: 'bg-sky-50 border-sky-100 text-sky-700'
  }
};

interface GameItem {
  id: string;
  route: string;
  tag: string;
  category: 'math' | 'logic' | 'languages';
  title: string;
  description: string;
  icon: React.ElementType;
  colorObj: typeof COLORS.blue;
  isNew?: boolean;
}

const ALL_GAMES: GameItem[] = [
  {
    id: 'formula-chain',
    route: '/games/formula-chain',
    tag: 'Matematika & Fizika',
    category: 'math',
    title: 'Formula Zanjiri',
    description: 'Formulalar va mantiqiy bloklarni to\'g\'ri ketma-ketlikda yig\'ing. KaTeX mantiqiy puzzle!',
    icon: Sparkles,
    colorObj: COLORS.indigo,
    isNew: true
  },
  {
    id: 'mistake-inspector',
    route: '/games/mistake-inspector',
    tag: 'Mantiq & Tahlil',
    category: 'logic',
    title: 'Detektiv: Xatoni Top',
    description: 'Mantiqiy yechimlardan yashirin xatoni toping va uni to\'g\'ri variant bilan almashtiring.',
    icon: Search,
    colorObj: COLORS.amber,
    isNew: true
  },
  {
    id: 'match-master',
    route: '/games/match-master',
    tag: 'Xotira & Juftliklar',
    category: 'logic',
    title: 'Juftliklar Ustasi',
    description: '3D flip kartalarni ag\'darib, mantiqan mos fan atamalari va formulalar juftligini toping.',
    icon: Grid,
    colorObj: COLORS.purple,
    isNew: true
  },
  {
    id: 'word-blast',
    route: '/games/word-blast',
    tag: 'Tezkor Reaksiya',
    category: 'languages',
    title: 'Tezkor Atamalar Shot',
    description: 'Atamalarni tezlik bilan to\'g\'ri kategoriyaga yo\'naltiring. Diqqat va tezkorlik!',
    icon: Zap,
    colorObj: COLORS.teal,
    isNew: true
  },
  {
    id: 'math-ninja',
    route: '/games/math-ninja',
    tag: 'Matematika',
    category: 'math',
    title: 'Tezkor Hisob (Math Ninja)',
    description: 'Qisqa vaqt ichida eng ko\'p matematik misollarni yeching. Tezlik va aniqlik — g\'alaba kaliti!',
    icon: Brain,
    colorObj: COLORS.blue
  },
  {
    id: 'english-words',
    route: '/games/english-words',
    tag: 'Ingliz Tili',
    category: 'languages',
    title: 'English Words',
    description: 'O\'zbek so\'zni ko\'r va inglizcha tarjimasini tez tanla. Lug\'atingizni kengaytiring!',
    icon: BookOpen,
    colorObj: COLORS.rose
  },
  {
    id: 'russian-words',
    route: '/games/russian-words',
    tag: 'Rus Tili',
    category: 'languages',
    title: 'Rus So\'zlari',
    description: 'O\'zbek so\'zni ko\'r va ruscha tarjimasini tez tanla. Rus tilini o\'yin orqali o\'rganing!',
    icon: Languages,
    colorObj: COLORS.cyan
  }
];

const GamesList = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'math' | 'logic' | 'languages'>('all');

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

  const filteredGames = ALL_GAMES.filter(g => activeCategory === 'all' || g.category === activeCategory);

  return (
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50 overflow-x-hidden selection:bg-indigo-100">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
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
              Interaktiv Mini O'yinlar
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
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
            {/* Title Section */}
            <div className="mb-10 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3 font-sans leading-tight">
                Interaktiv Ta'limiy O'yinlar
              </h2>
              <p className="text-slate-500 text-base font-sans leading-relaxed">
                Dars mazmunini teranlashtirish va o'quvchilar mantiqiy hamda tanqidiy fikrlashini rivojlantiruvchi o'yinlar ekotizimi.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'math', label: 'Matematika & Fanlar' },
                { id: 'logic', label: 'Mantiq & Tahlil' },
                { id: 'languages', label: 'Tillar & Lug\'at' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeCategory === tab.id ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch pb-16">
              {filteredGames.map(game => {
                const Icon = game.icon;
                return (
                  <div
                    key={game.id}
                    onClick={() => navigate(game.route)}
                    className="group relative flex flex-col bg-white rounded-3xl border border-slate-200/80 cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 h-full"
                  >
                    {/* Top Section */}
                    <div className={`relative h-44 w-full bg-gradient-to-br ${game.colorObj.gradient} overflow-hidden shrink-0 flex items-center justify-center`}>
                      <div className="absolute top-[-30%] left-[-10%] w-[70%] h-[140%] bg-white/10 rounded-full blur-[40px] transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700" />
                      
                      {/* Badge & New Tag */}
                      <div className="absolute top-4 left-5 right-5 z-10 flex items-center justify-between">
                        <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold tracking-wider uppercase">
                          {game.tag}
                        </div>
                        {game.isNew && (
                          <div className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3 fill-slate-950" /> YANGI
                          </div>
                        )}
                      </div>

                      {/* Icon */}
                      <div className="relative z-10 text-white transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-xl mt-3">
                        <Icon size={70} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-7 flex-1 flex flex-col bg-white">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                          <Flame className="w-3.5 h-3.5" /> Interaktiv
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-slate-900 mb-2 font-sans tracking-tight">
                        {game.title}
                      </h3>

                      <p className="text-slate-500 text-[14px] leading-relaxed mb-6 flex-1 font-sans">
                        {game.description}
                      </p>

                      {/* Footer CTA */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className={`font-semibold text-sm transition-colors text-slate-600 ${game.colorObj.hoverText}`}>
                          O'ynashni boshlash
                        </span>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 text-slate-400 group-hover:text-slate-900 transition-colors">
                          <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamesList;
