import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import FormattedText from './FormattedText';
import { aiApi } from '../lib/apiClient';
import { toast } from 'sonner';

interface MistakeExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    questionText: string;
    options?: string[];
    studentAnswer?: string;
    correctAnswer?: string;
    subject?: string;
    grade?: string;
  } | null;
}

export default function MistakeExplainerModal({
  isOpen,
  onClose,
  question,
}: MistakeExplainerModalProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !question) {
      setExplanation('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    aiApi
      .explainMistake({
        questionText: question.questionText,
        options: question.options,
        studentAnswer: question.studentAnswer,
        correctAnswer: question.correctAnswer,
        subject: question.subject,
        grade: question.grade,
      })
      .then((res) => {
        if (isMounted) {
          setExplanation(res.explanation);
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error(err.message || 'Tushuntirish olishda xatolik');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, question]);

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    toast.success('Tushuntirish nusxalandi');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !question) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/5 bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">AI Pedagogik Mentor</h3>
                <p className="text-xs text-gray-500">Xatoni tushunish va to'g'ri yechim</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-sm">
            {/* Question Brief */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Savol:</div>
              <div className="text-gray-900 font-medium">
                <FormattedText content={question.questionText} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                {question.studentAnswer && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-800 rounded-xl border border-red-100">
                    <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <div>
                      <div className="text-[10px] text-red-600 font-bold uppercase">Sizning javobingiz:</div>
                      <div className="font-semibold">{question.studentAnswer}</div>
                    </div>
                  </div>
                )}
                {question.correctAnswer && (
                  <div className="flex items-center gap-2 p-2.5 bg-green-50 text-green-800 rounded-xl border border-green-100">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <div>
                      <div className="text-[10px] text-green-600 font-bold uppercase">To'g'ri javob:</div>
                      <div className="font-semibold">{question.correctAnswer}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Explanation Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Batafsil Tushuntirish:
                </span>
                {explanation && (
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black font-medium transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Nusxalandi" : "Nusxalash"}
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold animate-pulse">AI yechimni tahlil qilmoqda...</p>
                </div>
              ) : explanation ? (
                <div className="p-5 bg-gradient-to-br from-blue-50/40 via-white to-neutral-50 rounded-2xl border border-blue-100/70 text-gray-800 leading-relaxed space-y-3 prose prose-sm max-w-none">
                  <FormattedText content={explanation} />
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Tushuntirish mavjud emas.
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-black/5 bg-neutral-50/80 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors"
            >
              Tushundim, rahmat!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
