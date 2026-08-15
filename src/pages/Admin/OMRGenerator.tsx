import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';
import { FileDown, Plus, Minus, Settings, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MeshGradient from '../../components/ui/MeshGradient';
import { Link } from 'react-router-dom';

export default function OMRGenerator() {
  const [testTitle, setTestTitle] = useState('Ona tili va Adabiyot - 1-chorak testi');
  const [schoolName, setSchoolName] = useState('1-Umumiy O\'rta Ta\'lim Maktabi');
  const [questionCount, setQuestionCount] = useState(30);
  const [optionsCount, setOptionsCount] = useState(4); // A, B, C, D
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Create a new PDF document (A4 size)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Draw Alignment Markers (Crucial for OMR scanning)
      const markerSize = 10;
      doc.setFillColor(0, 0, 0); // Solid black
      
      // Top-Left Marker
      doc.rect(margin, margin, markerSize, markerSize, 'F');
      // Top-Right Marker
      doc.rect(pageWidth - margin - markerSize, margin, markerSize, markerSize, 'F');
      // Bottom-Left Marker
      doc.rect(margin, pageHeight - margin - markerSize, markerSize, markerSize, 'F');
      // Bottom-Right Marker
      doc.rect(pageWidth - margin - markerSize, pageHeight - margin - markerSize, markerSize, markerSize, 'F');

      // Add Headers
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName, pageWidth / 2, margin + 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(testTitle, pageWidth / 2, margin + 25, { align: 'center' });

      // Student Details Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.rect(margin + 20, margin + 35, pageWidth - (margin * 2) - 40, 25);
      
      doc.text("O'quvchining F.I.Sh: _______________________________________", margin + 25, margin + 45);
      doc.text("Sinf: _________      Sana: ___/___/20__", margin + 25, margin + 55);

      // Bubble Sheet Grid Settings
      const startY = margin + 75;
      const bubblesPerRow = Math.ceil(questionCount / 3); // 3 columns
      const colWidth = (pageWidth - (margin * 2)) / 3;
      const bubbleRadius = 2.5;
      const spacingY = 10;
      
      doc.setFontSize(10);
      const labels = ['A', 'B', 'C', 'D', 'E'];

      // Draw Bubbles
      for (let i = 0; i < questionCount; i++) {
        const col = Math.floor(i / bubblesPerRow);
        const row = i % bubblesPerRow;
        
        const xPos = margin + 15 + (col * colWidth);
        const yPos = startY + (row * spacingY);

        // Question Number
        doc.text(`${i + 1}.`, xPos - 8, yPos + 1);

        // Options
        for (let opt = 0; opt < optionsCount; opt++) {
          const bubbleX = xPos + (opt * 12);
          
          doc.setDrawColor(100, 100, 100);
          doc.circle(bubbleX, yPos, bubbleRadius, 'S');
          
          doc.setFontSize(7);
          doc.text(labels[opt], bubbleX - 1, yPos + 1);
        }
      }

      // Footer Instructions
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text("Ko'rsatma: Faqat bitta to'g'ri javobni qora ruchkada to'liq bo'yang. X belgisini qo'ymang.", pageWidth / 2, pageHeight - margin + 5, { align: 'center' });

      // Save PDF
      doc.save(`OMR_Javoblar_Varagasi_${testTitle.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF muvaffaqiyatli yaratildi!");
    } catch (error) {
      console.error(error);
      toast.error("PDF yaratishda xatolik yuz berdi.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar / Layout could go here, for now it's a full page */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <MeshGradient />
        
        {/* Header */}
        <header className="relative z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">OMR Varaqa Generatori</h1>
              <p className="text-xs font-medium text-slate-500">Testlarni chop etish uchun tayyorlash</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/omr-scanner" className="px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Skannerga o'tish
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Settings Column */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800">Varaqa Sozlamalari</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Maktab / Muassasa nomi</label>
                  <input 
                    type="text" 
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Test Mavzusi / Sarlavhasi</label>
                  <input 
                    type="text" 
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Savollar soni</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button onClick={() => setQuestionCount(Math.max(10, questionCount - 5))} className="p-3 text-slate-500 hover:bg-slate-200 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center font-bold text-slate-800">{questionCount}</div>
                      <button onClick={() => setQuestionCount(Math.min(90, questionCount + 5))} className="p-3 text-slate-500 hover:bg-slate-200 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Variantlar soni</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button onClick={() => setOptionsCount(Math.max(3, optionsCount - 1))} className="p-3 text-slate-500 hover:bg-slate-200 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center font-bold text-slate-800">{['A,B,C', 'A,B,C,D', 'A-E'][optionsCount - 3]}</div>
                      <button onClick={() => setOptionsCount(Math.min(5, optionsCount + 1))} className="p-3 text-slate-500 hover:bg-slate-200 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[16px] py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><FileDown className="w-5 h-5" /> PDF Yaratish va Yuklab olish</>
                  )}
                </button>
                <p className="text-center text-xs text-slate-500 font-medium mt-4">
                  *Varaqani printerdan A4 formatda chop eting
                </p>
              </div>
            </motion.div>

            {/* Preview Column */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-200/50 rounded-[2rem] p-6 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              
              {/* Mock PDF Paper */}
              <div className="w-full aspect-[1/1.414] bg-white shadow-2xl rounded-sm p-8 relative flex flex-col z-10 transition-transform hover:scale-[1.02] duration-300">
                {/* Markers */}
                <div className="absolute top-4 left-4 w-4 h-4 bg-slate-900" />
                <div className="absolute top-4 right-4 w-4 h-4 bg-slate-900" />
                <div className="absolute bottom-4 left-4 w-4 h-4 bg-slate-900" />
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-slate-900" />
                
                {/* Content Mock */}
                <div className="text-center space-y-1 mb-6 mt-2">
                  <div className="h-3 w-48 bg-slate-200 mx-auto rounded-full" />
                  <div className="h-4 w-64 bg-slate-300 mx-auto rounded-full" />
                </div>
                
                <div className="w-full h-16 border-2 border-slate-200 rounded-md mb-8 p-3 space-y-3">
                  <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                  <div className="h-2 w-1/2 bg-slate-100 rounded-full" />
                </div>

                <div className="flex-1 grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, col) => (
                    <div key={col} className="space-y-3">
                      {[...Array(Math.ceil(questionCount / 3))].map((_, row) => (
                        <div key={row} className="flex items-center gap-1.5 opacity-40">
                          <span className="text-[6px] font-bold text-slate-400 w-3 text-right">{col * Math.ceil(questionCount/3) + row + 1}.</span>
                          {[...Array(optionsCount)].map((_, opt) => (
                            <div key={opt} className="w-2.5 h-2.5 rounded-full border border-slate-400" />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </main>
      </div>
    </div>
  );
}
