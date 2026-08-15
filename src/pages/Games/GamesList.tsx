import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentTeacher, getToken } from '../../lib/auth';
import { Crown, ArrowLeft, Gamepad2, Brain, Flame, BookOpen, Languages, ChevronRight, Sparkles, Search, Grid, Zap } from 'lucide-react';

interface GameItem {
  id: string;
  route: string;
  tag: string;
  category: 'math' | 'logic' | 'languages';
  title: string;
  description: string;
  icon: React.ElementType;
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
    isNew: true
  },
  {
    id: 'math-ninja',
    route: '/games/math-ninja',
    tag: 'Matematika',
    category: 'math',
    title: 'Tezkor Hisob (Math Ninja)',
    description: 'Qisqa vaqt ichida eng ko\'p matematik misollarni yeching. Tezlik va aniqlik — g\'alaba kaliti!',
    icon: Brain
  },
  {
    id: 'english-words',
    route: '/games/english-words',
    tag: 'Ingliz Tili',
    category: 'languages',
    title: 'English Words',
    description: 'O\'zbek so\'zni ko\'r va inglizcha tarjimasini tez tanla. Lug\'atingizni kengaytiring!',
    icon: BookOpen
  },
  {
    id: 'russian-words',
    route: '/games/russian-words',
    tag: 'Rus Tili',
    category: 'languages',
    title: 'Rus So\'zlari',
    description: 'O\'zbek so\'zni ko\'r va ruscha tarjimasini tez tanla. Rus tilini o\'yin orqali o\'rganing!',
    icon: Languages
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 font-sans">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  const filteredGames = ALL_GAMES.filter(g => activeCategory === 'all' || g.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-zinc-900 selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-indigo-50 text-zinc-700 hover:text-indigo-600 transition-colors border border-zinc-200/60 hover:border-indigo-200"
            title="Ortga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs">
              <Gamepad2 className="w-5 h-5" strokeWidth={2} />
            </div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-wider uppercase">
              O'yinlar Portali
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center my-12 bg-white border border-amber-200/80 p-8 md:p-12 rounded-3xl shadow-xl shadow-amber-500/5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Crown className="w-8 h-8" strokeWidth={2} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-900 tracking-tight">Premium Obuna Zarur</h2>
            <p className="text-zinc-600 text-sm mb-8 leading-relaxed max-w-md mx-auto">
              Ta'limiy o'yinlar modulidan foydalanish va o'quvchilaringiz darslarini interaktiv o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition-all shadow-sm shadow-amber-500/20 w-full"
            >
              Tarifni O'zgartirish
            </button>
          </div>
        ) : (
          <div>
            {/* Title Section */}
            <div className="mb-10 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-3">
                Interaktiv Ta'limiy O'yinlar
              </h1>
              <p className="text-zinc-600 text-xs md:text-sm font-medium border-l-3 border-indigo-500 pl-4 leading-relaxed">
                Dars mazmunini teranlashtirish va o'quvchilar mantiqiy hamda tanqidiy fikrlashini rivojlantiruvchi o'yinlar ekotizimi.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2.5 mb-10 flex-wrap">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'math', label: 'Matematika & Fanlar' },
                { id: 'logic', label: 'Mantiq & Tahlil' },
                { id: 'languages', label: 'Tillar & Lug\'at' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wider transition-all ${
                    activeCategory === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 border border-zinc-200/80 shadow-xs'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 items-stretch pb-16">
              {filteredGames.map(game => {
                const Icon = game.icon;
                const getCategoryGradient = (cat: string) => {
                  switch (cat) {
                    case 'math': return 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20';
                    case 'logic': return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20';
                    case 'languages': return 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20';
                    default: return 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-900/20';
                  }
                };

                return (
                  <div
                    key={game.id}
                    onClick={() => navigate(game.route)}
                    className="bg-white border border-zinc-200/80 hover:border-indigo-300 rounded-2xl p-6 md:p-7 shadow-xs hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col group relative overflow-hidden cursor-pointer h-full justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${getCategoryGradient(game.category)}`}>
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        
                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1.5">
                          {game.isNew && (
                            <span className="px-2.5 py-1 border border-amber-300/70 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" /> YANGI
                            </span>
                          )}
                          <span className="px-2.5 py-1 border border-zinc-200/80 bg-zinc-50 text-zinc-600 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                            {game.tag}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                          <Flame className="w-3 h-3 text-indigo-500" /> Interaktiv
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors mb-2.5 tracking-tight">
                        {game.title}
                      </h3>

                      <p className="text-zinc-500 font-normal text-xs md:text-sm leading-relaxed mb-6">
                        {game.description}
                      </p>
                    </div>

                    <div className="w-full py-3 px-4 bg-indigo-50/70 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md group-hover:shadow-indigo-600/20">
                      <span>O'ynashni boshlash</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
