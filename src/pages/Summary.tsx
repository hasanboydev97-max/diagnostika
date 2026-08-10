import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db, type StudentResult } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';
import { sendTelegramNotification, getSavedChatId } from '../lib/telegram';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import WelcomeModal from '../components/WelcomeModal';
import Footer from '../components/Footer';
import ScoreBreakdownTable from '../components/ScoreBreakdownTable';
import QuestionResultTable from '../components/QuestionResultTable';
import DifficultyGrid from '../components/DifficultyGrid';
import SubjectDonutCard from '../components/SubjectDonutCard';
import TopicProgressList from '../components/TopicProgressList';
import SkillsRadarChart from '../components/SkillsRadarChart';
import ThinkingTypeGraph from '../components/ThinkingTypeGraph';
import RoadmapJourney from '../components/RoadmapJourney';
import { QUESTIONS_BLUEPRINT } from '../lib/blueprint';
import MeshGradient from '../components/ui/MeshGradient';

export default function Summary() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentResult | null>(null);
  const [cohortAverage, setCohortAverage] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRegeneratingAi, setIsRegeneratingAi] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    
    setIsGeneratingPdf(true);
    
    // Add print mode to disable animations
    element.classList.add('print-mode');

    try {
      // html-to-image uses SVG foreignObject which perfectly supports Tailwind v4's oklch() colors
      const dataUrl = await htmlToImage.toJpeg(element, { 
        quality: 0.98, 
        pixelRatio: 2, 
        backgroundColor: '#f8fafc',
        style: { transform: 'scale(1)', transformOrigin: 'top left' }, // prevents weird scaling issues
        filter: (node) => {
          // Exclude elements with print-hide class from the PDF output without hiding them on the screen
          if (node && node.nodeType === 1) {
            return !(node as HTMLElement).classList.contains('print-hide');
          }
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a3'
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Calculate how many pages we need based on height, A3 height is ~420mm
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add new pages if the content is longer than one A3 page
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Diagnostika_Xulosasi_${studentData?.studentName.replace(/\s+/g, '_') || 'Natija'}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("PDF yaratishda xatolik yuz berdi: " + err);
    } finally {
      element.classList.remove('print-mode');
      setIsGeneratingPdf(false);
    }
  };

  const handleRegenerateAi = async () => {
    if (!studentData) return;
    setIsRegeneratingAi(true);
    try {
      const bp = studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT;
      const aiResponse = await generateDiagnosticSummary(
        studentData.studentName,
        studentData.grade || '5',
        studentData.scores,
        studentData.questionResults,
        bp
      );
      
      const updatedData = {
        ...studentData,
        aiSummaryText: aiResponse.summary,
        aiAdviceText: aiResponse.advice,
        aiRoadmap: aiResponse.roadmap
      };
      
      await db.saveResult(updatedData);
      setStudentData(updatedData);
      alert("Xulosa qayta generatsiya qilindi!");
    } catch (e) {
      alert("Xatolik: " + e);
    } finally {
      setIsRegeneratingAi(false);
    }
  };

  useEffect(() => {
    if (resultId) {
      db.getResult(resultId).then(data => {
        if (data) {
          setStudentData(data);
          
          // Auto-send Telegram notification if Chat ID is saved and not sent for this session yet
          const savedChatId = getSavedChatId();
          const sentKey = `tg_auto_sent_${resultId}`;
          if (savedChatId && !sessionStorage.getItem(sentKey)) {
            sessionStorage.setItem(sentKey, 'true');
            sendTelegramNotification(savedChatId, data).catch((err: any) => console.error('Auto Telegram error:', err));
          }

          // Calculate cohort average
          db.getAllResults().then(all => {
             const sameGrade = all.filter(r => r.grade === data.grade);
             if (sameGrade.length > 1) { // we need at least 1 other to compare
                const total = sameGrade.reduce((acc, curr) => acc + curr.totalScore, 0);
                setCohortAverage(Math.round(total / sameGrade.length));
             } else {
                setCohortAverage(null);
             }
          });
        } else {
          alert("Bunday natija topilmadi!");
          navigate('/login');
        }
      });
    } else {
      navigate('/login');
    }
  }, [resultId, navigate]);

  if (!studentData) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col pt-12 px-4 md:px-12 space-y-12 w-full max-w-[1440px] mx-auto animate-pulse">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center pb-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            <div className="h-6 w-48 bg-slate-200 rounded-full"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
          </div>
        </div>
        
        {/* Skeleton Section 1 */}
        <div className="space-y-4">
          <div className="h-4 w-12 bg-slate-200 rounded-full"></div>
          <div className="h-8 w-64 bg-slate-200 rounded-full"></div>
          <div className="h-20 bg-slate-200 rounded-2xl w-full max-w-4xl"></div>
        </div>

        {/* Skeleton Section 2 */}
        <div className="space-y-4 pt-8">
          <div className="h-4 w-12 bg-slate-200 rounded-full"></div>
          <div className="h-8 w-64 bg-slate-200 rounded-full"></div>
          <div className="h-64 bg-slate-200 rounded-3xl w-full"></div>
        </div>
      </div>
    );
  }

  const sectionVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const totalScore = studentData.totalScore;
  const isPass = totalScore >= 70;
  const minRange = Math.max(0, totalScore - 3);
  const maxRange = Math.min(100, totalScore + 3);

  return (
    <div className="min-h-screen relative font-sans text-[#111111] overflow-x-hidden bg-[#fdfdfd]">
      <MeshGradient />
      
      {/* Welcome Overlay */}
      {showWelcome && (
        <WelcomeModal 
          score={totalScore} 
          threshold={70} 
          onClose={() => setShowWelcome(false)}
          candidateName={studentData.studentName}
          grade={`${studentData.grade || '5'}-sinf`}
          scores={studentData.scores}
        />
      )}

      <div ref={printRef} className="print-container relative z-10 pb-20 md:pb-24">
        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-[15px] sm:px-6 md:px-12 pt-3 sm:pt-6 md:pt-12 space-y-6 md:space-y-16">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-[15px] sm:p-8 md:p-12 rounded-2xl md:rounded-[2rem] flex flex-col space-y-10 md:space-y-20">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/5 pb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HB Ta'lim Diagnostikasi" className="h-10 md:h-14 w-auto object-contain rounded-lg bg-white p-1 border border-black/5 shadow-sm" />
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg md:text-xl text-neutral-main">HB Diagnostikasi</h1>
              <p className="text-[10px] text-gray-500">{studentData.studentName} • {studentData.grade || '5'}-sinf</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-3 text-xs md:text-sm font-medium text-neutral-secondary">
            <span className="hidden sm:inline">{studentData.studentName} ({studentData.grade || '5'}-sinf)</span>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-primary/10 items-center justify-center text-primary font-bold">
              {studentData.studentName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => {
                document.body.style.overflow = 'unset';
                window.scrollTo(0, 0);
                navigate('/');
              }}
              className="print-hide flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-neutral-main text-white rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider hover:bg-neutral-900 transition-colors shadow-sm"
            >
              Chiqish
            </button>
          </div>
        </header>

        <motion.div 
          initial={isGeneratingPdf ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={sectionVariants}
        >
          {/* 01. Bir qarashda */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary text-xs md:text-sm font-bold tracking-wider">
            <span>01</span>
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-neutral-main">Bir qarashda</h2>
          <p className="text-xs md:text-base text-neutral-secondary leading-relaxed max-w-4xl">
            O'quvchi <strong className="text-neutral-main font-semibold">{studentData.studentName}</strong> kirish imtihonida umumiy <strong className="text-neutral-main font-semibold">{totalScore}/100</strong> ball oldi — <strong className="text-neutral-main font-semibold">{isPass ? 'yaxshi (dasturni ishonchli o\'zlashtiradi)' : 'qoniqarsiz (qo\'shimcha tayyorgarlik talab etiladi)'}</strong>. 
          </p>
        </section>
        </motion.div>

        <motion.div 
          initial={isGeneratingPdf ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={sectionVariants}
        >
        {/* 02. Umumiy daraja */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary text-xs md:text-sm font-bold tracking-wider">
            <span>02</span>
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-neutral-main font-display mb-1">Umumiy daraja</h2>
          <p className="text-xs md:text-base text-neutral-secondary mb-4 md:mb-6">Umumiy ball qaysi toifada va daraja oralig'i bo'yicha tahlil.</p>
          
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-4 sm:p-6 md:p-10">
            {/* Mobile: big score top, then 2-col grid below */}
            <div className="md:hidden flex flex-col items-center text-center pb-4 mb-4 border-b border-slate-100">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Umumiy natija</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-primary">{totalScore}</span>
                <span className="text-xl text-slate-400 font-medium">/100</span>
              </div>
              <div className={`text-white text-[10px] px-3.5 py-1 rounded-full font-black tracking-widest uppercase ${isPass ? 'bg-success' : 'bg-danger'}`}>
                {isPass ? "O'TDI" : 'YIQILDI'}
              </div>
            </div>
            <div className="md:hidden grid grid-cols-2 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Diapazon</div>
                <div className="text-xl font-black text-neutral-main">{minRange}–{maxRange}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Sinf o'rtachasi</div>
                <div className="text-xl font-black text-neutral-main">{cohortAverage !== null ? `${cohortAverage}` : 'N/A'}</div>
              </div>
            </div>

            {/* Desktop: 3-col grid */}
            <div className="hidden md:grid grid-cols-3 gap-8 text-center divide-x divide-border">
              <div className="pt-4 md:pt-0 flex flex-col items-center">
                <div className="text-xs font-bold text-neutral-secondary mb-3 uppercase tracking-widest">Umumiy natija</div>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-primary">{totalScore}</span>
                  <span className="text-xl text-neutral-secondary font-medium">/100</span>
                </div>
                <div className="text-sm text-neutral-secondary mb-3">Barcha fanlar bo'yicha</div>
                <div className={`mt-auto text-white text-xs px-4 py-1.5 rounded-full font-bold tracking-wider ${isPass ? 'bg-success' : 'bg-danger'}`}>
                  {isPass ? 'O\'TDI' : 'YIQILDI'}
                </div>
              </div>
              
              <div className="pt-6 md:pt-0 flex flex-col items-center justify-center">
                <div className="text-xs font-bold text-neutral-secondary mb-3 uppercase tracking-widest">To'plam diapazoni</div>
                <div className="text-4xl md:text-5xl font-bold text-neutral-main mb-2">{minRange}–{maxRange}</div>
                <div className="text-sm text-neutral-secondary">Haqiqiy daraja shu oraliqda</div>
              </div>
              
              <div className="pt-6 md:pt-0 flex flex-col items-center justify-center">
                <div className="text-xs font-bold text-neutral-secondary mb-3 uppercase tracking-widest">Sinf o'rtachasi</div>
                <div className="text-4xl md:text-5xl font-bold text-neutral-main mb-2">
                  {cohortAverage !== null ? cohortAverage : '---'}
                </div>
                <div className="text-sm text-neutral-secondary">
                  {cohortAverage !== null 
                    ? (totalScore > cohortAverage 
                        ? `O'rtachadan ${totalScore - cohortAverage} ball baland` 
                        : (totalScore < cohortAverage ? `O'rtachadan ${cohortAverage - totalScore} ball past` : "O'rtacha darajada")) 
                    : "Ma'lumot yetarli emas"}
                </div>
              </div>
            </div>
            
            {/* Gradient Bar connecting visually */}
            <div className="mt-8 md:mt-16 pt-6 relative">
              <div className="flex justify-between text-[10px] md:text-xs font-bold text-neutral-secondary mb-2 px-1">
                <span>0</span>
                <span>35</span>
                <span>50</span>
                <span>67</span>
                <span>84</span>
                <span>100</span>
              </div>
              
              <div className="h-5 md:h-6 w-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]"></div>
              
              <div className="flex justify-between text-[9px] sm:text-xs font-bold mt-3 px-1 tracking-widest uppercase">
                <span className="text-danger w-[35%] text-left md:text-center">Sayoz</span>
                <span className="text-warning w-[15%] text-left md:text-center">Zaif</span>
                <span className="text-yellow-600 w-[17%] text-left md:text-center">O'rta</span>
                <span className="text-primary w-[17%] text-left md:text-center">Yaxshi</span>
                <span className="text-success w-[16%] text-right md:text-center">Yuqori</span>
              </div>
              
              {/* Marker at totalScore */}
              <div className="absolute top-10 md:top-12 -ml-[10px] md:-ml-[12px] w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-md z-10 transition-all flex items-center justify-center" style={{ left: `${Math.max(3, Math.min(97, totalScore))}%` }}>
                <div className="w-2 h-2 bg-neutral-900 rounded-full"></div>
              </div>
              <div className="absolute top-0 -translate-x-1/2 bg-neutral-main text-white font-bold text-[10px] md:text-xs px-2.5 py-1 rounded shadow-lg" style={{ left: `${Math.max(5, Math.min(95, totalScore))}%` }}>{totalScore}</div>
            </div>
          </div>
        </section>
        </motion.div>

        <motion.div 
          initial={isGeneratingPdf ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={sectionVariants}
        >
        {/* AI Diagnostics Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
            <span>03</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-neutral-main">Tizim xulosasi</h2>
            {studentData.aiSummaryText?.includes('Texnik xatolik') && (
              <button 
                onClick={handleRegenerateAi}
                disabled={isRegeneratingAi}
                className="print-hide text-sm bg-primary/10 text-primary px-3 py-1.5 rounded font-medium hover:bg-primary/20 transition-colors"
              >
                {isRegeneratingAi ? 'Generatsiya...' : 'Qayta urinib ko\'rish'}
              </button>
            )}
          </div>
          <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-black/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-base md:text-lg text-neutral-900 mb-2 md:mb-3">Tahlil</h3>
              <p className="text-neutral-700 leading-relaxed text-sm md:text-lg mb-4 md:mb-8">{studentData.aiSummaryText}</p>
              
              <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="font-bold text-base md:text-lg text-neutral-900 mb-2 flex items-center gap-2">
                  <span className="text-lg md:text-xl">💡</span> Amaliy Tavsiyalar
                </h3>
                <p className="text-neutral-700 leading-relaxed italic text-sm md:text-base">{studentData.aiAdviceText}</p>
              </div>
            </div>
          </div>
        </section>
        </motion.div>

        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <ScoreBreakdownTable scores={studentData.scores} totalScore={totalScore} />
        </motion.div>

        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <QuestionResultTable results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <DifficultyGrid results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <SubjectDonutCard results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <TopicProgressList results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <SkillsRadarChart results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <ThinkingTypeGraph results={studentData.questionResults} blueprint={studentData.blueprintSnapshot || QUESTIONS_BLUEPRINT} />
        </motion.div>
        
        <motion.div initial={isGeneratingPdf ? "visible" : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={sectionVariants}>
          <RoadmapJourney data={studentData.aiRoadmap} score={totalScore} />
        </motion.div>
        </div>
        
        <Footer onPrint={handleDownloadPdf} isGeneratingPdf={isGeneratingPdf} />
      </div>
      </div>
    </div>
  );
}
