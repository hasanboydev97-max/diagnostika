import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Minus, Settings, CheckCircle2, 
  Printer, Sparkles, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import { Link, useNavigate } from 'react-router-dom';
import { generateOMRPdf } from '../../lib/omrPdfGenerator';

export default function OMRGenerator() {
  const navigate = useNavigate();
  const [testTitle, setTestTitle] = useState('Ona tili va Adabiyot - 1-chorak testi');
  const [schoolName, setSchoolName] = useState('1-Umumiy O\'rta Ta\'lim Maktabi');
  const [subject, setSubject] = useState('Ona tili');
  const [questionCount, setQuestionCount] = useState(30);
  const [optionsCount, setOptionsCount] = useState(4); // A, B, C, D
  const [variant, setVariant] = useState('A');
  const [includeStudentIdGrid, setIncludeStudentIdGrid] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    if (!testTitle.trim() || !schoolName.trim()) {
      toast.error("Iltimos, maktab nomi va test sarlavhasini kiriting.");
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
        includeStudentIdGrid,
        variant
      });

      doc.save(`OMR_Javoblar_Varagasi_${testTitle.replace(/\s+/g, '_')}_Variant_${variant}.pdf`);
      toast.success("Standardlashtirilgan OMR Javoblar varaqasi (PDF) tayyor!");
    } catch (error: any) {
      console.error(error);
      toast.error("PDF yaratishda xatolik yuz berdi: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = questionCount > 60 ? 4 : questionCount <= 20 ? 2 : 3;
  const rowsPerCol = Math.ceil(questionCount / columns);
  const labels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen font-sans text-neutral-900 bg-[#fbfbfb] relative overflow-hidden flex flex-col">
      <MeshGradient />
      
      {/* Top Navigation Bar */}
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
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-base font-bold tracking-tight text-neutral-900 leading-tight">OMR Javoblar Varaqasi Studiyasi</h1>
            </div>
            <p className="text-xs font-medium text-neutral-500">Cambridge / DTM / SAT Standartidagi Optik Blank Generatori</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to="/admin/omr-scanner" 
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={15} className="text-emerald-400" /> Skanner Hubiga O'tish
          </Link>
        </div>
      </header>

      {/* Studio Workspace */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Column (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/10 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <Settings size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Varaqa Parametrlari</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                A4 Standart
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">
                  Maktab / Muassasa Nomi
                </label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                  placeholder="Masalan: 1-Umumiy O'rta Ta'lim Maktabi"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">
                  Test Sarlavhasi / Mavzusi
                </label>
                <input 
                  type="text" 
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-4 py-3 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                  placeholder="Masalan: 1-Chorak Yakuniy Testi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">Fan</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-neutral-50 border border-black/10 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black transition-all"
                    placeholder="Matematika"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">Variant</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">Savollar soni</label>
                  <div className="flex items-center border border-black/10 rounded-2xl overflow-hidden bg-neutral-50">
                    <button onClick={() => setQuestionCount(Math.max(5, questionCount - 5))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Minus size={14} />
                    </button>
                    <div className="flex-1 text-center font-bold text-xs text-neutral-900">{questionCount} ta</div>
                    <button onClick={() => setQuestionCount(Math.min(90, questionCount + 5))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">Variantlar</label>
                  <div className="flex items-center border border-black/10 rounded-2xl overflow-hidden bg-neutral-50">
                    <button onClick={() => setOptionsCount(Math.max(3, optionsCount - 1))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Minus size={14} />
                    </button>
                    <div className="flex-1 text-center font-bold text-xs text-neutral-900">{optionsCount} ta ({labels.slice(0, optionsCount).join('-')})</div>
                    <button onClick={() => setOptionsCount(Math.min(5, optionsCount + 1))} className="p-2.5 text-neutral-500 hover:bg-neutral-200 transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Student ID Bubble Matrix Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 bg-neutral-50 border border-black/10 rounded-2xl cursor-pointer hover:bg-neutral-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">6-Xonali O'quvchi ID Matritsasi</span>
                    <span className="text-[11px] text-neutral-500 font-medium">DTM/SAT uslubidagi 0-9 doirachali ID qatori</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeStudentIdGrid}
                    onChange={(e) => setIncludeStudentIdGrid(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="w-full bg-neutral-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-4 rounded-2xl transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Printer size={16} className="text-emerald-400" />
                    Chop Etish uchun PDF Yuklab Olish (A4)
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-neutral-400 font-medium mt-3">
                * PDF 300 DPI yuqori aniqlikda, optik datchiklarga 100% moslashtirilgan.
              </p>
            </div>
          </motion.div>

          {/* Live Realistic Paper Preview (Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" /> A4 Jonli Varaqa Ko'rinishi (Preview)
              </span>
              <span className="text-xs font-mono font-bold text-neutral-400">210mm x 297mm</span>
            </div>

            {/* A4 Paper Sheet Mockup */}
            <div className="w-full max-w-[560px] aspect-[1/1.414] bg-white rounded-xl shadow-2xl border border-neutral-300 p-5 md:p-7 relative flex flex-col justify-between text-neutral-900 select-none overflow-hidden">
              
              {/* 4 Corner Solid Optical Markers */}
              <div className="absolute top-3 left-3 w-4 h-4 bg-neutral-950 rounded-[1px]" />
              <div className="absolute top-3 right-3 w-4 h-4 bg-neutral-950 rounded-[1px]" />
              <div className="absolute bottom-3 left-3 w-4 h-4 bg-neutral-950 rounded-[1px]" />
              <div className="absolute bottom-3 right-3 w-4 h-4 bg-neutral-950 rounded-[1px]" />

              {/* Optical Timing Tracks */}
              <div className="absolute left-2.5 top-14 bottom-14 flex flex-col justify-between pointer-events-none opacity-80">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-1 h-1.5 bg-neutral-900 rounded-[0.5px]" />
                ))}
              </div>
              <div className="absolute right-2.5 top-14 bottom-14 flex flex-col justify-between pointer-events-none opacity-80">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-1 h-1.5 bg-neutral-900 rounded-[0.5px]" />
                ))}
              </div>

              {/* Inner Printable Content Area */}
              <div className="flex-1 flex flex-col justify-between px-3 py-1">
                
                {/* 1. Header Box */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-300">
                  <div className="border border-neutral-800 px-2 py-1 text-center rounded-[2px]">
                    <div className="text-[6px] font-black tracking-widest text-neutral-900">HB DIAGNOSTIKA</div>
                    <div className="text-[5px] text-neutral-500 font-mono">OMR v2.5</div>
                  </div>

                  <div className="text-center flex-1 px-3">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-600 truncate max-w-[240px] mx-auto">
                      {schoolName || 'MAKTAB NOMI'}
                    </div>
                    <div className="text-[12px] font-black text-neutral-950 leading-tight truncate max-w-[280px] mx-auto">
                      {testTitle || 'Test Nomi'}
                    </div>
                    <div className="text-[7px] text-neutral-500 font-medium">
                      Fan: {subject || 'Umumiy'} • {questionCount} ta savol • 2026-yil
                    </div>
                  </div>

                  <div className="border border-neutral-800 px-2.5 py-0.5 text-center rounded-[2px]">
                    <div className="text-[5px] font-bold text-neutral-500">VARIANT</div>
                    <div className="text-[12px] font-black leading-none">{variant}</div>
                  </div>
                </div>

                {/* 2. Student Info & ID Matrix Section */}
                <div className="grid grid-cols-12 gap-2 my-2">
                  {/* Left: Name and Signature */}
                  <div className={`border border-neutral-300 p-2 rounded-[2px] ${includeStudentIdGrid ? 'col-span-8' : 'col-span-12'}`}>
                    <div className="text-[7px] font-bold bg-neutral-100 px-1 py-0.5 mb-1.5 text-neutral-800">
                      1. O'QUVCHI MA'LUMOTLARI (KATTA HARFLARDA)
                    </div>
                    <div className="text-[6.5px] text-neutral-700 font-medium mb-1">
                      F.I.Sh:
                    </div>
                    {/* Letter boxes */}
                    <div className="grid grid-cols-12 gap-0.5 mb-2">
                      {[...Array(12)].map((_, idx) => (
                        <div key={idx} className="h-4 border border-neutral-400 bg-white" />
                      ))}
                    </div>
                    <div className="text-[6.5px] text-neutral-600 flex justify-between font-mono">
                      <span>Sinf: _______</span>
                      <span>Sana: ___/___/20__</span>
                      <span>Imzo: ________</span>
                    </div>

                    {/* How to mark diagram */}
                    <div className="mt-1.5 pt-1 border-t border-neutral-200 text-[6px] text-neutral-600 flex items-center gap-2">
                      <span className="font-bold">Bo'yash:</span>
                      <span className="flex items-center gap-0.5 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-neutral-950 inline-block"></span> To'g'ri
                      </span>
                      <span className="flex items-center gap-0.5 text-rose-700">
                        <span className="w-2 h-2 rounded-full border border-neutral-400 text-center leading-none text-[5px]">x</span> Noto'g'ri
                      </span>
                    </div>
                  </div>

                  {/* Right: 6-Digit ID Matrix */}
                  {includeStudentIdGrid && (
                    <div className="col-span-4 border border-neutral-300 p-1.5 rounded-[2px]">
                      <div className="text-[6.5px] font-bold bg-neutral-100 px-1 py-0.5 mb-1 text-center text-neutral-800">
                        2. O'QUVCHI ID
                      </div>
                      <div className="grid grid-cols-6 gap-0.5 mb-1">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-3 border border-neutral-600 bg-white text-center text-[5px]" />
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                          <div key={digit} className="grid grid-cols-6 gap-0.5 text-center">
                            {[...Array(6)].map((_, col) => (
                              <div key={col} className="w-2 h-2 mx-auto rounded-full border border-neutral-400 text-[4.5px] flex items-center justify-center font-bold">
                                {digit}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Answer Bubble Grid */}
                <div className="flex-1 grid gap-2 my-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {[...Array(columns)].map((_, colIdx) => {
                    const startQ = colIdx * rowsPerCol + 1;
                    const endQ = Math.min(questionCount, (colIdx + 1) * rowsPerCol);
                    if (startQ > questionCount) return null;

                    return (
                      <div key={colIdx} className="border border-neutral-300 rounded-[2px] overflow-hidden flex flex-col">
                        <div className="bg-neutral-900 text-white text-[6.5px] font-bold py-0.5 text-center">
                          SAVOLLAR: {startQ} - {endQ}
                        </div>
                        <div className="p-1 space-y-1 flex-1">
                          {[...Array(rowsPerCol)].map((_, r) => {
                            const qNum = startQ + r;
                            if (qNum > questionCount) return null;

                            return (
                              <div 
                                key={r} 
                                className={`flex items-center justify-between px-1 py-0.5 rounded-[1px] ${
                                  Math.floor((qNum - 1) / 5) % 2 === 1 ? 'bg-neutral-100/60' : ''
                                }`}
                              >
                                <span className="text-[6.5px] font-bold text-neutral-800 w-3">
                                  {qNum < 10 ? `0${qNum}` : qNum}.
                                </span>
                                <div className="flex items-center gap-1">
                                  {labels.slice(0, optionsCount).map((opt) => (
                                    <div 
                                      key={opt}
                                      className="w-2.5 h-2.5 rounded-full border border-neutral-500 text-[5px] font-bold flex items-center justify-center text-neutral-700 bg-white"
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

                {/* 4. Footer Verification */}
                <div className="text-center pt-1 border-t border-neutral-200 text-[5.5px] text-neutral-400 font-mono">
                  HB Diagnostika OMR Optical Recognition Form • Standart A4 • Varaqani buklamang
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
