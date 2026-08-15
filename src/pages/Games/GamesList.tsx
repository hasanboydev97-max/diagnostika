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
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  const isPremium = teacher?.plan === 'premium';

  const filteredGames = ALL_GAMES.filter(g => activeCategory === 'all' || g.category === activeCategory);

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/online-tests')}
            className="w-10 h-10 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors text-black rounded-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center border-2 border-black">
              <Gamepad2 className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <h1 className="text-[16px] font-black text-black tracking-widest uppercase">
              O'yinlar
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {!isPremium ? (
          <div className="max-w-xl mx-auto text-center mt-12 bg-white border-2 border-black p-10 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-white text-black border-2 border-black flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10" strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-black font-sans uppercase tracking-tighter">Premium obuna zarur</h2>
            <p className="text-black text-[15px] mb-8 font-sans font-medium">
              Ta'limiy o'yinlar modulidan foydalanish va o'quvchilaringiz darslarini qiziqarli o'yinlar bilan boyitish uchun Premium tarifiga o'ting.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-white text-black border-2 border-black px-8 py-3.5 font-bold text-[12px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Tarifni o'zgartirish
            </button>
          </div>
        ) : (
          <div>
            {/* Title Section */}
            <div className="mb-10 max-w-2xl">
              <h1 className="font-sans font-black uppercase tracking-tighter text-3xl md:text-5xl mb-4 text-black">
                Interaktiv Ta'limiy O'yinlar
              </h1>
              <p className="text-black text-base font-bold font-sans border-l-4 border-black pl-4">
                Dars mazmunini teranlashtirish va o'quvchilar mantiqiy hamda tanqidiy fikrlashini rivojlantiruvchi o'yinlar ekotizimi.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 mb-12 flex-wrap">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'math', label: 'Matematika & Fanlar' },
                { id: 'logic', label: 'Mantiq & Tahlil' },
                { id: 'languages', label: 'Tillar & Lug\'at' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`border-2 border-black rounded-none px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                    activeCategory === tab.id
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-zinc-100'
                  }`}
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
                    className="bg-white border-2 border-black rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col group relative overflow-hidden cursor-pointer h-full"
                  >
                    <div className="flex justify-between items-start mb-6">
                      {/* Icon */}
                      <div className="w-12 h-12 bg-white text-black border-2 border-black flex items-center justify-center">
                        <Icon size={24} strokeWidth={2} />
                      </div>
                      
                      {/* Badges */}
                      <div className="flex flex-col items-end gap-2">
                        {game.isNew && (
                          <div className="px-2 py-1 border border-black bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-none flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> YANGI
                          </div>
                        )}
                        <div className="px-2 py-1 border border-black bg-white text-black text-[9px] font-bold uppercase tracking-wider rounded-none">
                          {game.tag}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-black bg-white border border-black px-2 py-1 rounded-none">
                        <Flame className="w-3 h-3" /> Interaktiv
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-black mb-3 font-sans tracking-tight uppercase">
                      {game.title}
                    </h3>

                    <p className="text-black font-medium text-[14px] leading-relaxed mb-6 flex-1 font-sans">
                      {game.description}
                    </p>

                    <button className="mt-6 w-full py-3 bg-white text-black border-2 border-black font-bold text-[10px] uppercase tracking-widest group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center gap-2">
                      O'ynashni boshlash
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
