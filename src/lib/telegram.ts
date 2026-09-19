import type { StudentResult } from './db';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SAVED_CHAT_ID_KEY = 'maktab_telegram_saved_chat_id';
const DEFAULT_CHAT_ID = '1744670071';

export const getSavedChatId = (): string => {
  const envChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';
  return localStorage.getItem(SAVED_CHAT_ID_KEY) || envChatId || DEFAULT_CHAT_ID;
};

export const saveChatId = (chatId: string): void => {
  if (chatId) {
    localStorage.setItem(SAVED_CHAT_ID_KEY, chatId.trim());
  }
};

export async function sendTelegramNotification(chatId: string, result: StudentResult): Promise<{ success: boolean; message: string }> {
  if (!chatId || !chatId.trim()) {
    return { success: false, message: "Chat ID kiritilmadi." };
  }

  const cleanChatId = chatId.trim();
  saveChatId(cleanChatId);

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/telegram/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId: cleanChatId, result })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, message: "Xabar Telegram boti orqali muvaffaqiyatli yuborildi!" };
    } else {
      return { success: false, message: data.error || "Telegram ga yuborishda xatolik yuz berdi." };
    }
  } catch (error: any) {
    console.error('Telegram network error:', error);
    return { success: false, message: "Tarmoq xatoligi: " + (error.message || error.toString()) };
  }
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<{ success: boolean; message: string }> {
  if (!chatId || !chatId.trim()) {
    return { success: false, message: "Chat ID kiritilmadi." };
  }
  
  const cleanChatId = chatId.trim();

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/telegram/send-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId: cleanChatId, message: text })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, message: "Xabar muvaffaqiyatli yuborildi!" };
    } else {
      return { success: false, message: data.error || "Telegram ga yuborishda xatolik yuz berdi." };
    }
  } catch (error: any) {
    console.error('Telegram network error:', error);
    return { success: false, message: "Tarmoq xatoligi: " + (error.message || error.toString()) };
  }
}
