import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, Scan, Zap, Brain, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import { Link } from 'react-router-dom';
import { processWithGemini, processWithOpenCV, type OMRResult } from '../../lib/omrScanner';

export default function OMRScanner() {
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai' | 'local'>('ai');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OMRResult | null>(null);
  const totalQuestions = 30; // Matches generator default

  const handleMediaError = useCallback((err: string | DOMException) => {
    console.error("Kamera xatosi:", err);
    toast.error("Kameraga ulanib bo'lmadi. Ruxsat berilganligini tekshiring.");
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImageSrc(imageSrc);
      if (imageSrc) {
        processImage(imageSrc, mode);
      }
    }
  }, [webcamRef, mode]);

  const processImage = async (base64Image: string, selectedMode: 'ai' | 'local') => {
    setIsProcessing(true);
    setResult(null);
    try {
      if (selectedMode === 'ai') {
        const aiResult = await processWithGemini(base64Image, totalQuestions);
        setResult(aiResult);
        toast.success('AI orqali muvaffaqiyatli tekshirildi!');
      } else {
        const localResult = await processWithOpenCV(base64Image, totalQuestions);
        setResult(localResult);
        toast.success('Lokal tizim orqali tekshirildi!');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Tekshirishda xatolik yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  };

  const retake = () => {
    setImageSrc(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      <MeshGradient />
      
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">OMR Skanner</h1>
            <p className="text-xs font-medium text-slate-500">Javoblar varag'ini tekshirish</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/omr-generator" className="px-4 py-2 bg-white text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 flex items-center gap-2 text-sm">
            Orqaga qaytish
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 flex flex-col md:flex-row gap-6 lg:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Column: Camera / Scanner */}
        <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
          {/* Mode Selector */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 mb-6">
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mode === 'ai' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Brain className={`w-4 h-4 ${mode === 'ai' ? 'text-indigo-500' : ''}`} />
              AI Vision (Pullik/Aqlli)
            </button>
            <button
              onClick={() => setMode('local')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mode === 'local' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Zap className={`w-4 h-4 ${mode === 'local' ? 'text-amber-400' : ''}`} />
              OpenCV (Bepul/Tez)
            </button>
          </div>

          {/* Camera Viewfinder */}
          <div className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl relative aspect-[3/4] sm:aspect-auto sm:flex-1 border-4 border-white">
            {!imageSrc ? (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  onUserMediaError={handleMediaError}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Scanner Overlay Guide */}
                <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/40">
                  <div className="w-full h-full border-2 border-dashed border-white/50 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 -mt-0.5 -ml-0.5" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 -mt-0.5 -mr-0.5" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 -mb-0.5 -ml-0.5" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 -mb-0.5 -mr-0.5" />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white/70 font-medium text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                        Qog'oz burchaklarini ramkaga to'g'rilang
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scan Button */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                  <button
                    onClick={capture}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-6 h-6 text-slate-800" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <img src={imageSrc} alt="Scanned document" className="absolute inset-0 w-full h-full object-cover" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                    <p className="text-white font-medium text-lg animate-pulse">
                      {mode === 'ai' ? 'AI Tahlil qilmoqda...' : 'Varaqa tekshirilmoqda...'}
                    </p>
                  </div>
                )}
                {!isProcessing && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={retake}
                      className="px-6 py-3 bg-white text-slate-800 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-5 h-5" /> Qaytadan olish
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4">
          <AnimatePresence>
            {result ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">Muvaffaqiyatli</h3>
                <p className="text-sm text-slate-500 mb-6">F.I.Sh: Avtomatik Aniqlanmadi (Tez orada)</p>
                
                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                  <div className="text-sm font-semibold text-slate-500 mb-1">UMUMIY NATIJA</div>
                  <div className="text-4xl font-black text-indigo-600 mb-2">{result.score}%</div>
                  <div className="text-sm font-medium text-slate-600">
                    To'g'ri javoblar: <span className="font-bold text-slate-800">{result.correctCount} / {result.total}</span>
                  </div>
                </div>

                <div className="w-full flex items-center gap-2 text-xs font-medium text-slate-400 justify-center mb-6">
                  <Brain className="w-3.5 h-3.5" />
                  Tekshirildi: {result.method}
                </div>

                {/* Detected Answers Table (if available) */}
                {result.answers && result.answers.length > 0 && (
                  <div className="w-full text-left">
                    <h4 className="font-semibold text-sm text-slate-700 mb-3 border-b pb-2">Batafsil natijalar:</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {result.answers.map((ans, idx) => (
                        <div key={idx} className={`flex justify-between items-center text-xs p-1.5 rounded ${ans.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <span className="font-medium">{ans.q}-savol</span>
                          <span className="font-bold">{ans.ans || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-200 border-dashed flex flex-col items-center text-center h-full justify-center text-slate-400"
              >
                <Scan className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-medium">Natijalar bu yerda ko'rinadi. Varaqani skaner qiling.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
