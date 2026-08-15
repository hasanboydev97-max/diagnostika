import { Download } from 'lucide-react';

interface FooterProps {
  onPrint: () => void;
  isGeneratingPdf?: boolean;
}

export default function Footer({ onPrint, isGeneratingPdf }: FooterProps) {
  return (
    <footer className="pt-8 pb-6 border-t border-slate-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HB Diagnostikasi" className="w-10 h-10 rounded-md object-contain border border-slate-200 bg-white p-0.5 shadow-sm" />
          <div>
            <h3 className="font-display font-bold text-neutral-main text-sm">HB Diagnostikasi</h3>
            <p className="text-xs text-neutral-secondary mt-0.5">Diagnostika xulosasi &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
        
        <button 
          onClick={onPrint}
          disabled={isGeneratingPdf}
          className={`print-hide group flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm transition-all shadow-md ${isGeneratingPdf ? 'bg-slate-500 text-slate-200 cursor-not-allowed' : 'bg-neutral-main hover:bg-slate-800 text-white hover:shadow-lg hover:-translate-y-0.5'}`}
        >
          {isGeneratingPdf ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Download size={18} className="group-hover:animate-bounce" />
          )}
          <span>{isGeneratingPdf ? "Yuklanmoqda..." : "PDF yuklab olish"}</span>
        </button>
      </div>
    </footer>
  );
}
