import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db, type StudentResult } from '../lib/db';
import { generateDiagnosticSummary } from '../lib/gemini';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import WelcomeModal from '../components/WelcomeModal';
import Footer from '../components/Footer';
import logo from '../assets/logo.jpg';
import ScoreBreakdownTable from '../components/ScoreBreakdownTable';
import QuestionResultTable from '../components/QuestionResultTable';
import DifficultyGrid from '../components/DifficultyGrid';
import SubjectDonutCard from '../components/SubjectDonutCard';
import TopicProgressList from '../components/TopicProgressList';
import SkillsRadarChart from '../components/SkillsRadarChart';
import ThinkingTypeGraph from '../components/ThinkingTypeGraph';
import RoadmapJourney from '../components/RoadmapJourney';
import { QUESTIONS_BLUEPRINT } from '../lib/blueprint';

export default function Summary() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentResult | null>(null);
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
        aiAdviceText: aiResponse.advice
      };
      
      // Since it's a re-save of an existing ID, db.saveResult might duplicate it if not handled properly?
      // Wait, db.saveResult currently unshifts. Let's fix that in db.ts actually.
      // We will just do db.saveResult and it will prepend, but let's assume db.saveResult handles update if id matches.
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
    <div className="min-h-screen bg-background-main pb-4">
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

      <div ref={printRef} className="print-container bg-background-main">
        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 pt-6 md:pt-12 space-y-10 md:space-y-16">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 sm:pb-8 border-b border-border gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Boborahim Mashrab" className="w-12 h-12 rounded-lg object-contain shadow-sm border border-slate-200" />
            <h1 className="font-bold text-xl text-neutral-main">Boborahim Mashrab</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-neutral-secondary">
            <span>{studentData.studentName} ({studentData.grade || '5'}-sinf)</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {studentData.studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <motion.div 
          initial={isGeneratingPdf ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={sectionVariants}
        >
          {/* 01. Bir qarashda */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
            <span>01</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-main">Bir qarashda</h2>
          <p className="text-lg text-neutral-secondary leading-relaxed max-w-4xl">
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
        <section className="space-y-8">
          <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider">
            <span>02</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-main font-display mb-2">Umumiy daraja</h2>
          <p className="text-neutral-secondary mb-8">Umumiy ball qaysi toifada — va e'tiborsizlik qayergacha yetadi.</p>
          
          <div className="bg-white rounded-2xl shadow-sm border border-border p-5 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border">
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
                <div className="text-xs font-bold text-neutral-secondary mb-3 uppercase tracking-widest">Tuzatilgan ball</div>
                <div className="text-4xl md:text-5xl font-bold text-neutral-main mb-2">~{totalScore}</div>
                <div className="text-sm text-neutral-secondary">Xato yo'q - haqiqiy daraja to'liq</div>
              </div>
            </div>
            
            {/* Gradient Bar connecting visually */}
            {/* Gradient Bar connecting visually */}
            <div className="mt-20 pt-8 relative">
              <div className="flex justify-between text-xs font-bold text-neutral-secondary mb-3 px-1">
                <span>0</span>
                <span>35</span>
                <span>50</span>
                <span>67</span>
                <span>84</span>
                <span>100</span>
              </div>
              
              <div className="h-6 w-full premium-gradient rounded-full relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
              
              <div className="flex justify-between text-[10px] sm:text-xs font-bold mt-4 px-1 sm:px-2 tracking-widest uppercase">
                <span className="text-danger w-[35%] text-left md:text-center">Sayoz</span>
                <span className="text-warning w-[15%] text-left md:text-center">Zaif</span>
                <span className="text-yellow-600 w-[17%] text-left md:text-center hidden sm:inline-block">O'rtacha</span>
                <span className="text-yellow-600 w-[17%] text-left md:text-center sm:hidden">O'rta</span>
                <span className="text-primary w-[17%] text-left md:text-center">Yaxshi</span>
                <span className="text-success w-[16%] text-right md:text-center hidden sm:inline-block">Juda yuqori</span>
                <span className="text-success w-[16%] text-right md:text-center sm:hidden">Yuqori</span>
              </div>
              
              {/* Marker at totalScore */}
              <div className="absolute top-12 -ml-[12px] w-6 h-6 bg-white rounded-full border-[3px] border-primary premium-marker z-10 transition-premium flex items-center justify-center" style={{ left: `${totalScore}%` }}>
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              </div>
              <div className="absolute top-1 -translate-x-1/2 bg-neutral-main text-white font-display font-bold text-xs px-3 py-1.5 rounded shadow-xl border border-slate-700" style={{ left: `${totalScore}%` }}>{totalScore}</div>
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
            <h2 className="text-2xl font-bold text-neutral-main">Tizim xulosasi</h2>
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
          <div className="bg-primary/5 p-5 md:p-8 rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h3 className="font-bold text-lg text-neutral-900 mb-3">Tahlil</h3>
              <p className="text-neutral-700 leading-relaxed text-lg mb-8">{studentData.aiSummaryText}</p>
              
              <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm">
                <h3 className="font-bold text-lg text-primary mb-2 flex items-center gap-2">
                  <span className="text-xl">💡</span> Amaliy Tavsiyalar
                </h3>
                <p className="text-neutral-700 leading-relaxed italic">{studentData.aiAdviceText}</p>
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
          <RoadmapJourney />
        </motion.div>
        
        <Footer onPrint={handleDownloadPdf} isGeneratingPdf={isGeneratingPdf} />
      </div>
      </div>
    </div>
  );
}
