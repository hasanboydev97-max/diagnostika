import { useState } from 'react';
import type { StudentResult } from '../lib/db';
import { sendTelegramNotification, getSavedChatId } from '../lib/telegram';
import { Send, X, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  result: StudentResult;
  onClose: () => void;
}

export default function TelegramSendModal({ result, onClose }: Props) {
  const [chatId, setChatId] = useState(getSavedChatId());
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!chatId.trim()) {
      toast.error('Iltimos Telegram Chat ID yoki Kanal ID masini kiriting.');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading('Telegram ga yuborilmoqda...');

    try {
      const res = await sendTelegramNotification(chatId, result);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        onClose();
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (err: any) {
      toast.error('Xatolik: ' + (err.message || err.toString()), { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white border border-black/10 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Send className="w-5 h-5 ml-0.5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-black leading-tight">Telegram ga Yuborish</h3>
                <p className="text-xs text-gray-500">@hbdiagnostikasi_bot orqali</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* O'quvchi xulosasi qisqacha */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex justify-between">
              <span>{result.studentName} ({result.grade || '5'}-sinf)</span>
              <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${result.totalScore >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {result.totalScore}/100 ball
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              Ushbu o'quvchining to'liq diagnostika hisoboti va AI tavsiyalari Telegram boti orqali jo'natiladi.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Telegram Chat ID yoki Kanal ID
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Masalan: 123456789 yoki -100123456789"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Instruction on how to get Chat ID */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-[11px] text-sky-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sky-950">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                <span>Chat ID qanday olinadi?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sky-800 leading-relaxed">
                <li>Botga o'ting: <a href="https://t.me/hbdiagnostikasi_bot" target="_blank" rel="noreferrer" className="underline font-bold hover:text-sky-950">@hbdiagnostikasi_bot</a></li>
                <li>Botga <b>/start</b> tugmasini bosing</li>
                <li>Bot javobida chiqqan <b>Chat ID</b> raqamini shu yerga kiriting</li>
              </ol>
              <a
                href="https://t.me/hbdiagnostikasi_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 pt-1"
              >
                <span>Telegram Botni Ochish</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className={`flex-1 py-3 bg-sky-500 text-white hover:bg-sky-600 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 ${
                isSending ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-0.5" />
                  <span>Yuborish</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
