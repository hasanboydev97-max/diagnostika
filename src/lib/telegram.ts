import type { StudentResult } from './db';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8655887259:AAFqueAir7n1rsnHxQKWQilrn3mSUNr-nJg';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const SAVED_CHAT_ID_KEY = 'maktab_telegram_saved_chat_id';

export const getSavedChatId = (): string => {
  return localStorage.getItem(SAVED_CHAT_ID_KEY) || '';
};

export const saveChatId = (chatId: string): void => {
  if (chatId) {
    localStorage.setItem(SAVED_CHAT_ID_KEY, chatId.trim());
  }
};

export function formatTelegramMessage(result: StudentResult): string {
  const isPass = result.totalScore >= 70;
  const statusEmoji = isPass ? '🟢' : '🔴';
  const statusText = isPass ? "O'TDI (Yaxshi)" : "YIQILDI (Qoniqarsiz)";
  
  // Calculate subject scores breakdown
  const subjectScores: Record<string, { correct: number; total: number }> = {};
  if (result.blueprintSnapshot) {
    result.blueprintSnapshot.forEach(q => {
      const cat = q.category || 'Boshqa';
      if (!subjectScores[cat]) {
        subjectScores[cat] = { correct: 0, total: 0 };
      }
      subjectScores[cat].total += 1;
      if (result.questionResults[q.id]) {
        subjectScores[cat].correct += 1;
      }
    });
  }

  let subjectBreakdownText = '';
  Object.entries(subjectScores).forEach(([subject, stat]) => {
    const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    subjectBreakdownText += `  • <b>${subject}:</b> ${pct}% (${stat.correct}/${stat.total})\n`;
  });

  const baseUrl = window.location.origin || 'https://bmdiagnostika.vercel.app';
  const summaryLink = `${baseUrl}/summary/${result.id}`;

  const cleanAdvice = result.aiAdviceText 
    ? result.aiAdviceText.substring(0, 200) + (result.aiAdviceText.length > 200 ? '...' : '') 
    : 'Natijalar ustida ishlash tavsiya etiladi.';

  return `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓

👤 <b>O'quvchi:</b> ${result.studentName}
🏫 <b>Sinf:</b> ${result.grade || '5'}-sinf
📅 <b>Sana:</b> ${new Date(result.createdAt || Date.now()).toLocaleDateString('uz-UZ')}

📊 <b>Umumiy Natija:</b> <b>${result.totalScore} / 100 ball</b> ${statusEmoji} (${statusText})

📌 <b>Fanlar bo'yicha ko'rsatkichlar:</b>
${subjectBreakdownText || '  • Ma\'lumot shakllanmagan\n'}
💡 <b>AI Tavsiyasi:</b>
<i>${cleanAdvice}</i>

🔗 <b>To'liq va batafsil diagnostika hisoboti:</b>
<a href="${summaryLink}">Batafsil Hisobotni Ko'rish</a>`;
}

export async function sendTelegramNotification(chatId: string, result: StudentResult): Promise<{ success: boolean; message: string }> {
  if (!chatId || !chatId.trim()) {
    return { success: false, message: "Chat ID kiritilmadi." };
  }

  const cleanChatId = chatId.trim();
  saveChatId(cleanChatId);

  const textMessage = formatTelegramMessage(result);

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: textMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: "Xabar Telegram boti orqali muvaffaqiyatli yuborildi!" };
    } else {
      console.error('Telegram API error:', data);
      return { 
        success: false, 
        message: data.description || "Telegram ga yuborishda xatolik yuz berdi. Chat ID ni tekshiring." 
      };
    }
  } catch (error: any) {
    console.error('Telegram network error:', error);
    return { success: false, message: "Tarmoq xatoligi: " + (error.message || error.toString()) };
  }
}
