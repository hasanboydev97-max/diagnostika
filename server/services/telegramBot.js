/**
 * Telegram Bot Service — index.js dan ajratildi.
 *
 * Long-polling alohida module'da — main thread bilan izolyatsiya qilingan.
 * Bot komandalar: /start, /obuna, natija ID qidirish
 */
import mongoose from 'mongoose';
import { TelegramSubscription, Result } from '../models/index.js';
import { escapeRegex } from '../utils/regexUtils.js';
import { ENV } from '../config/env.js';

const BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

// ─── Xabar yuborish ──────────────────────────────────────────────────────────
export async function sendMessage(chatId, text, replyMarkup = null) {
  if (!API_BASE) return { ok: false, error: 'Token yo\'q' };

  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('[TelegramBot] Xabar yuborishda xatolik:', err.message);
    return { ok: false, error: String(err) };
  }
}

// ─── Natija Telegram'ga broadcast ────────────────────────────────────────────
export async function broadcastResultToTelegram(data) {
  if (!data?.studentName) return;

  try {
    const cleanName = data.studentName.replace(/\s*\([^)]*\)/g, '').trim();
    const subs = await TelegramSubscription.find({
      studentName: new RegExp('^' + escapeRegex(cleanName) + '$', 'i'),
    });

    if (!subs?.length) return;

    const score =
      data.totalScore > 0
        ? Math.round((data.score / data.totalScore) * 100)
        : data.score || 0;

    const isPass = score >= 70;
    const statusEmoji = isPass ? '🟢' : '🔴';
    const resultLink = data.id?.startsWith('res_')
      ? `${ENV.FRONTEND_URL}/online-tests/results/${data.id}`
      : `${ENV.FRONTEND_URL}/summary/${data.id || data._id}`;

    const msg =
      `🔔 <b>YANGI NATIJA QO'SHILDI</b> 🔔\n\n` +
      `👤 <b>O'quvchi:</b> ${cleanName}\n` +
      `📊 <b>Natija:</b> <b>${score}/100 ball</b> ${statusEmoji}\n\n` +
      `🔗 <a href="${resultLink}">Batafsil Hisobotni Ko'rish</a>`;

    for (const sub of subs) {
      await sendMessage(sub.chatId, msg);
    }
  } catch (err) {
    console.error('[TelegramBot] Broadcast xatosi:', err.message);
  }
}

// ─── Komandalarni qayta ishlash ───────────────────────────────────────────────
async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const senderName = msg.from?.first_name || 'Foydalanuvchi';

  // /start
  if (text === '/start') {
    const welcomeMsg =
      `👋 <b>Assalomu alaykum, ${senderName}!</b>\n\n` +
      `<b>HB Diagnostika Rasmiy Boti</b>ga xush kelibsiz.\n\n` +
      `Siz ushbu bot orqali:\n` +
      `• Diagnostika va imtihon xulosalarini avtomatik olishingiz\n` +
      `• Test ID kiritib natijalarni izlashingiz\n` +
      `• Telegram WebApp orqali imtihon topshirishingiz mumkin.\n\n` +
      `Sizning <b>Chat ID:</b> <code>${chatId}</code>`;

    await sendMessage(chatId, welcomeMsg, {
      inline_keyboard: [[{
        text: '📱 HB Diagnostika WebApp-ni Ochish',
        web_app: { url: ENV.FRONTEND_URL },
      }]],
    });
    return;
  }

  // /obuna <ism>
  if (text.startsWith('/obuna')) {
    const parts = text.split(' ');
    if (parts.length < 2) {
      await sendMessage(chatId, '⚠️ Iltimos, ismni kiriting. Masalan:\n<code>/obuna Alisher Navoiy</code>');
      return;
    }
    const nameToSub = parts.slice(1).join(' ').trim();
    try {
      await TelegramSubscription.findOneAndUpdate(
        { chatId: String(chatId), studentName: nameToSub },
        { chatId: String(chatId), studentName: nameToSub },
        { upsert: true },
      );
      await sendMessage(chatId,
        `✅ <b>Muvaffaqiyatli!</b>\n\n` +
        `Siz endi <b>${nameToSub}</b> ismli o'quvchining barcha yangi test natijalarini avtomatik ravishda qabul qilasiz.`,
      );
    } catch {
      await sendMessage(chatId, "⚠️ Obuna bo'lishda xatolik yuz berdi.");
    }
    return;
  }

  // Natija ID bo'yicha qidirish (5-6 raqamli, res_... yoki MongoDB ObjectId)
  if (/^\d{5,6}$/.test(text) || text.startsWith('res_') || /^[a-f0-9]{24}$/i.test(text)) {
    try {
      const searchQuery = mongoose.Types.ObjectId.isValid(text)
        ? { $or: [{ _id: text }, { id: text }] }
        : { id: text };

      const { OnlineTestResult } = await import('../models/index.js');
      const found = (await Result.findOne(searchQuery)) || (await OnlineTestResult.findOne(searchQuery));

      if (found) {
        const displayScore =
          found.totalScore > 0 && found.totalScore !== found.score
            ? `${found.score}/${found.totalScore} (${Math.round((found.score / found.totalScore) * 100)}%)`
            : `${found.totalScore ?? found.score}/100`;

        await sendMessage(chatId,
          `🎓 <b>HB DIAGNOSTIKA NATIJASI</b> 🎓\n\n` +
          `👤 <b>O'quvchi:</b> ${found.studentName}\n` +
          `🏫 <b>Sinf:</b> ${found.grade || '—'}\n` +
          `📊 <b>Natija:</b> <b>${displayScore}</b>\n\n` +
          `🔗 <a href="${ENV.FRONTEND_URL}/summary/${found.id || found._id}">Batafsil Hisobotni Ko'rish</a>`,
        );
      } else {
        await sendMessage(chatId, `⚠️ <code>${text}</code> ID bo'yicha natija topilmadi.`);
      }
    } catch {
      await sendMessage(chatId, '⚠️ Qidirishda xatolik yuz berdi.');
    }
    return;
  }

  // Boshqa xabarlar
  await sendMessage(chatId,
    `Sizning <b>Chat ID:</b> <code>${chatId}</code>\n\nDiagnostika natijasini ko'rish uchun 6-xonali Test ID sini yuboring yoki WebApp ni oching.`,
    { inline_keyboard: [[{ text: '📱 WebApp-ni Ochish', web_app: { url: ENV.FRONTEND_URL } }]] },
  );
}

// ─── Long-polling tsikli ──────────────────────────────────────────────────────
let _lastUpdateId = 0;
let _isRunning = false;

export async function startTelegramPolling() {
  if (!API_BASE) {
    console.warn('⚠️  Telegram polling o\'tkazib yuborildi — TELEGRAM_BOT_TOKEN yo\'q.');
    return;
  }

  if (_isRunning) {
    console.warn('⚠️  Telegram polling allaqachon ishlayapti.');
    return;
  }

  _isRunning = true;
  console.log('🤖 HB DIAGNOSTIKA Telegram Bot ishga tushdi...');

  while (_isRunning) {
    try {
      const res = await fetch(
        `${API_BASE}/getUpdates?offset=${_lastUpdateId + 1}&timeout=25`,
        { signal: AbortSignal.timeout(35_000) }, // Timeout: polling + buffer
      );
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          _lastUpdateId = update.update_id;
          // Har bir update'ni xatoga chiday beruvchi tarzda qayta ishlaymiz
          handleUpdate(update).catch(err =>
            console.error('[TelegramBot] Update error:', err.message),
          );
        }
      }

      // Bo'sh tsiklda minimal delay — CPU ni tejash
      if (!data.result?.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) {
      if (err.name !== 'TimeoutError') {
        console.error('[TelegramBot] Polling xatosi:', err.message);
      }
      // Xato bo'lsa 5 soniya kutib qayta urinish
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

export function stopTelegramPolling() {
  _isRunning = false;
}
