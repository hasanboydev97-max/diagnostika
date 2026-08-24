import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Minus, Settings, CheckCircle2, 
  Printer, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import { Link, useNavigate } from 'react-router-dom';
import { generateOMRPdf } from '../../lib/omrPdfGenerator';

export default function OMRGenerator() {
  const navigate = useNavigate();
  const [testTitle, setTestTitle] = useState('4-Chorak Imtihon');
  const [schoolName, setSchoolName] = useState('Informatika Fani Testi');
  const [subject, setSubject] = useState('Informatika');
  const [questionCount, setQuestionCount] = useState(30);
  const [optionsCount, setOptionsCount] = useState(4); // A, B, C, D
  const [variant, setVariant] = useState('A');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    if (!testTitle.trim()) {
      toast.error("Iltimos, test sarlavhasini kiriting.");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = generateOMRPdf({
        schoolName,
        testTitle,
        subject,
        questionCount,
        optionsCount,
        variant
      });

      doc.save(`OMR_Javoblar_Varagasi_${testTitle.replace(/\s+/g, '_')}_Variant_${variant}.pdf`);
      toast.success("OMR Javoblar varaqasi (PDF) muvaffaqiyatli yuklandi!");
    } catch (error: any) {
      console.error(error);
      toast.error("PDF yaratishda xatolik: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = questionCount <= 15 ? 1 : questionCount <= 25 ? 2 : questionCount > 60 ? 4 : 3;
  const rowsPerCol = Math.ceil(questionCount / columns);
  const labels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen font-sans text-neutral-900 bg-[#fbfbfb] relative overflow-hidden flex flex-col selection:bg-black selection:text-white">
      <MeshGradient />
      
      {/* Top Header Navigation */}
      <header className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-black/10 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="p-2 bg-white hover:bg-neutral-100 border border-black/10 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-black"></span>
              <h1 className="text-base font-semibold tracking-tight text-neutral-900 leading-tight">OMR Javoblar Varaqasi Studiyasi</h1>
            </div>
            <p className="text-xs text-neutral-500 font-medium">Sodda, nafis va professional A4 optik blank generatsiyasi</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to="/admin/omr-scanner" 
            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={14} className="text-emerald-400" /> Skannerga O'tish
          </Link>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Settings Column (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/10 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-black/5">
                  <Settings size={15} />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Varaqa Parametrlari</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-black/5">
                A4 Standart
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                  Muassasa / Maktab Nomi
                </label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                  placeholder="Masalan: Informatika Fani Testi"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                  Test Sarlavhasi / Mavzusi
                </label>
                <input 
                  type="text" 
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                  placeholder="Masalan: 4-Chorak Imtihon"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Fan</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                    placeholder="Informatika"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Variant</label>
                  <div className="grid grid-cols-4 gap-1 bg-neutral-50 p-1 rounded-2xl border border-black/10">
                    {['A', 'B', 'C', 'D'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVariant(v)}
                        className={`py-1.5 text-xs font-bold rounded-xl transition-all ${variant === v ? 'bg-black text-white shadow-xs' : 'text-neutral-500 hover:text-black'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Savollar soni</label>
                  <div className="flex items-center border border-black/10 rounded-2xl overflow-hidden bg-neutral-50">
                    <button onClick={() => setQuestionCount(Math.max(5, questionCount - 5))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Minus size={13} />
                    </button>
                    <div className="flex-1 text-center font-bold text-xs text-neutral-900">{questionCount} ta</div>
                    <button onClick={() => setQuestionCount(Math.min(90, questionCount + 5))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Variantlar</label>
                  <div className="flex items-center border border-black/10 rounded-2xl overflow-hidden bg-neutral-50">
                    <button onClick={() => setOptionsCount(Math.max(3, optionsCount - 1))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Minus size={13} />
                    </button>
                    <div className="flex-1 text-center font-bold text-xs text-neutral-900">{optionsCount} ta ({labels.slice(0, optionsCount).join('-')})</div>
                    <button onClick={() => setOptionsCount(Math.min(5, optionsCount + 1))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="w-full bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Printer size={15} className="text-emerald-400" />
                    Chop Etish uchun PDF Yuklab Olish (A4)
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-neutral-400 font-medium mt-3">
                * Minimalist standart: yuqori aniqlikdagi optik skanerlash uchun moslangan.
              </p>
            </div>
          </motion.div>

          {/* Clean, Realistic Live Paper Preview (Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                A4 Varaqa Ko'rinishi (Preview)
              </span>
              <span className="text-[11px] font-mono font-bold text-neutral-400">210 × 297 mm</span>
            </div>

            {/* A4 Paper Sheet Minimalist Mockup */}
            <div className="w-full max-w-[540px] aspect-[1/1.414] bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-6 md:p-8 relative flex flex-col justify-between text-neutral-900 select-none">
              
              {/* 4 Sleek Corner Squares */}
              <div className="absolute top-4 left-4 w-3.5 h-3.5 bg-neutral-900 rounded-[1px]" />
              <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-neutral-900 rounded-[1px]" />
              <div className="absolute bottom-4 left-4 w-3.5 h-3.5 bg-neutral-900 rounded-[1px]" />
              <div className="absolute bottom-4 right-4 w-3.5 h-3.5 bg-neutral-900 rounded-[1px]" />

              {/* Inner Subtle Frame */}
              <div className="absolute inset-4 border border-neutral-200/60 rounded-sm pointer-events-none" />

              {/* Printable Body Area */}
              <div className="flex-1 flex flex-col justify-between px-3 py-1 z-10">
                
                {/* 1. Clean Header */}
                <div className="relative text-center pb-2">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                    {schoolName || 'MAKTAB NOMI'}
                  </div>
                  <div className="text-lg font-bold text-neutral-900 tracking-tight leading-tight mt-0.5">
                    {testTitle || 'Test Nomi'}
                  </div>
                  <div className="text-[8px] text-neutral-500 font-medium mt-0.5">
                    Fan: {subject || 'Umumiy'} &nbsp;•&nbsp; Savollar soni: {questionCount} ta &nbsp;•&nbsp; Sana: ___ . ___ . 20___
                  </div>

                  {/* Variant Pill (Right) */}
                  <div className="absolute right-0 top-0 border border-neutral-200 bg-neutral-50 px-2.5 py-1 rounded-md text-center">
                    <div className="text-[6px] font-bold text-neutral-400 uppercase tracking-widest">VARIANT</div>
                    <div className="text-xs font-black text-neutral-900 leading-none">{variant}</div>
                  </div>
                </div>

                {/* 2. Student Info Card */}
                <div className="border border-neutral-200 bg-white rounded-lg p-2.5 my-2 space-y-1.5 shadow-2xs">
                  <div className="flex items-center text-[8.5px] font-bold text-neutral-800">
                    <span className="shrink-0 mr-1.5">O'quvchining F.I.Sh:</span>
                    <span className="flex-1 border-b border-neutral-300 h-2"></span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-medium text-neutral-700 pt-0.5">
                    <div className="flex items-center gap-1 flex-1">
                      <span>Sinf:</span>
                      <span className="w-16 border-b border-neutral-300 h-2"></span>
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <span>Guruh / Xona:</span>
                      <span className="w-16 border-b border-neutral-300 h-2"></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Imzo:</span>
                      <span className="w-16 border-b border-neutral-300 h-2"></span>
                    </div>
                  </div>
                  
                  {/* Subtle Instructions Line */}
                  <div className="pt-1 border-t border-neutral-100 text-[7px] text-neutral-400 flex items-center justify-center gap-3 font-medium">
                    <span>Ko'rsatma: To'g'ri javobni qora ruchkada to'liq bo'yang:</span>
                    <span className="flex items-center gap-1 text-neutral-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-neutral-900 inline-block"></span> ( ● ) To'g'ri
                    </span>
                    <span className="text-neutral-500">
                      ( x ) Noto'g'ri
                    </span>
                  </div>
                </div>

                {/* 3. Spacious Question Bubble Columns */}
                <div className="flex-1 grid gap-3 my-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {[...Array(columns)].map((_, colIdx) => {
                    const startQ = colIdx * rowsPerCol + 1;
                    const endQ = Math.min(questionCount, (colIdx + 1) * rowsPerCol);
                    if (startQ > questionCount) return null;

                    return (
                      <div key={colIdx} className="border border-neutral-200 bg-white rounded-lg p-2 flex flex-col justify-between shadow-2xs">
                        <div className="text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider text-center pb-1.5 border-b border-neutral-100 mb-1">
                          SAVOLLAR {startQ} – {endQ}
                        </div>
                        
                        <div className="space-y-1.5 flex-1 flex flex-col justify-around py-0.5">
                          {[...Array(rowsPerCol)].map((_, r) => {
                            const qNum = startQ + r;
                            if (qNum > questionCount) return null;

                            return (
                              <div key={r} className="flex items-center justify-between px-1">
                                <span className="text-[8px] font-bold text-neutral-700 w-3.5">
                                  {qNum < 10 ? `0${qNum}` : qNum}.
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {labels.slice(0, optionsCount).map((opt) => (
                                    <div 
                                      key={opt}
                                      className="w-3.5 h-3.5 rounded-full border border-neutral-400 text-[6px] font-bold flex items-center justify-center text-neutral-600 bg-white hover:border-black transition-colors"
                                    >
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. Minimalist Clean Footer */}
                <div className="text-center pt-1 text-[6.5px] text-neutral-400 font-medium">
                  HB DIAGNOSTIKA • OPTIK JAVOBLAR VARAQASI • STANDART A4
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
