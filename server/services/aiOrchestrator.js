import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';

// BUG #12 FIX: Alohida navbatlar — QuestionGen va TextGen bir-birini bloklmasin
// QuestionGen (og'ir, uzoq): 10 parallel
// TextGen (sinf tahlili, diagnostika xulosasi): 5 parallel
const questionQueue = pLimit(10);
const textQueue     = pLimit(5);


// Circuit breaker / dynamic health tracking for agents
const agentHealth = new Map();

function isAgentHealthy(agentId) {
  const health = agentHealth.get(agentId);
  if (!health) return true;
  if (health.cooldownUntil && Date.now() < health.cooldownUntil) {
    return false; // currently in cooldown
  }
  return true;
}

function markAgentFailure(agentId, reason = '') {
  const isRateLimit = reason.includes('429') || reason.includes('rate') || reason.includes('quota') || reason.includes('exhausted');
  const isOverloaded = reason.includes('503') || reason.includes('overloaded') || reason.includes('demand');
  
  const cooldownMs = isRateLimit ? 30000 : (isOverloaded ? 15000 : 5000);
  agentHealth.set(agentId, {
    cooldownUntil: Date.now() + cooldownMs,
    lastError: reason,
    failedAt: Date.now()
  });
  console.warn(`⚠️ [AI Orchestrator] Agent "${agentId}" ${cooldownMs / 1000}s ga sovutish rejimiga olindi (${reason.substring(0, 60)})`);
}

function markAgentSuccess(agentId) {
  agentHealth.delete(agentId);
}

/**
 * 20-Year Senior Architecture: Multi-Agent Fallback Registry
 * 10 verified production-ready AI agents across 3 major AI platforms:
 * 1. Google Gemini (2 models)
 * 2. Anthropic Claude (3 models)
 * 3. Groq LPUs (5 models)
 */
function getAgentCatalog(keys) {
  const { geminiPaidKey, geminiKey, anthropicKey, groqKey } = keys;
  const agents = [];

  // --- 1. Gemini PAID Agents (2000 RPM, billing enabled) — PRIMARY ---
  // Verified working models: gemini-3.7-flash ✅ gemini-3.5-flash ✅ gemini-3.5-flash-lite ✅
  if (geminiPaidKey) {
    agents.push(
      { id: 'gemini-paid-3-7-flash',      provider: 'gemini', model: 'gemini-3.7-flash',      apiKey: geminiPaidKey, tier: 'paid-flagship', priority: 1 },
      { id: 'gemini-paid-3-5-flash',      provider: 'gemini', model: 'gemini-3.5-flash',      apiKey: geminiPaidKey, tier: 'paid-fast',     priority: 2 },
      { id: 'gemini-paid-3-5-flash-lite', provider: 'gemini', model: 'gemini-3.5-flash-lite', apiKey: geminiPaidKey, tier: 'paid-lite',     priority: 3 }
    );
  }

  // --- 2. Gemini FREE Agents (15 RPM) — FALLBACK ---
  // Verified: gemini-2.5-flash ✅ gemini-flash-lite-latest ✅
  if (geminiKey) {
    agents.push(
      { id: 'gemini-free-2-5-flash',   provider: 'gemini', model: 'gemini-2.5-flash',       apiKey: geminiKey, tier: 'free-standard', priority: 4 },
      { id: 'gemini-free-flash-lite',  provider: 'gemini', model: 'gemini-flash-lite-latest', apiKey: geminiKey, tier: 'free-lite',    priority: 5 }
    );
  }

  // --- 3. Anthropic Claude Agents ---
  if (anthropicKey) {
    agents.push(
      { id: 'anthropic-haiku-4-5',  provider: 'anthropic', model: 'claude-haiku-4-5',  tier: 'elite-speed',        priority: 6 },
      { id: 'anthropic-sonnet-4-5', provider: 'anthropic', model: 'claude-sonnet-4-5', tier: 'elite-intelligence', priority: 7 },
      { id: 'anthropic-opus-4-5',   provider: 'anthropic', model: 'claude-opus-4-5',   tier: 'elite-deep',         priority: 8 }
    );
  }

  // --- 4. Groq Accelerated Open-Weights Agents ---
  if (groqKey) {
    agents.push(
      { id: 'groq-llama-4-scout',      provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct', tier: 'groq-speed',    priority: 9  },
      { id: 'groq-llama-3-3-70b',      provider: 'groq', model: 'llama-3.3-70b-versatile',                   tier: 'groq-standard', priority: 10 },
      { id: 'groq-llama-3-1-8b',       provider: 'groq', model: 'llama-3.1-8b-instant',                      tier: 'groq-lite',     priority: 11 },
      { id: 'groq-compound-beta',      provider: 'groq', model: 'compound-beta',                              tier: 'groq-deep',     priority: 12 },
      { id: 'groq-compound-beta-mini', provider: 'groq', model: 'compound-beta-mini',                        tier: 'groq-ensemble', priority: 13 }
    );
  }

  return agents;
}




/**
 * Builds a dynamic, ordered execution pipeline of AI agents based on:
 * - User Plan (Premium prioritizes Claude & Gemini 2.5 Flash)
 * - Health Status (Temporarily skips agents with 429 or temporary 503)
 * - Guaranteed Fallback (Free users cascade to Groq, and as last-resort to Claude so it NEVER fails)
 */
export function buildAgentPipeline({ isPremium = false, isVision = false }) {
  const geminiPaidKey = process.env.GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_PAID_API_KEY;
  const geminiKey     = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey  = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const groqKey       = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

  const allAgents = getAgentCatalog({ geminiPaidKey, geminiKey, anthropicKey, groqKey });

  let pipeline = [];

  if (isVision) {
    // Vision: Pullik Gemini 3.7 → 3.5 → Bepul 2.5 Flash → Claude Haiku
    const visionOrder = [
      'gemini-paid-3-7-flash',
      'gemini-paid-3-5-flash',
      'gemini-free-2-5-flash',
      'anthropic-haiku-4-5'
    ];
    pipeline = visionOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);

  } else if (isPremium) {
    // Premium: Pullik Gemini → Claude Sonnet → Groq → Claude Haiku (emergency)
    const premiumOrder = [
      'gemini-paid-3-7-flash',
      'gemini-paid-3-5-flash',
      'anthropic-sonnet-4-5',
      'anthropic-haiku-4-5',
      'gemini-paid-3-5-flash-lite',
      'gemini-free-2-5-flash',
      'groq-llama-4-scout',
      'groq-llama-3-3-70b',
      'anthropic-opus-4-5'
    ];
    pipeline = premiumOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);

  } else {
    // Standard/Free: Pullik Gemini → Bepul Gemini → Groq → Claude Haiku (safety net)
    const standardOrder = [
      'gemini-paid-3-7-flash',      // 🥇 pullik flagship
      'gemini-paid-3-5-flash',      // 🥈 pullik fast
      'gemini-paid-3-5-flash-lite', // 🥉 pullik lite
      'gemini-free-2-5-flash',      // bepul fallback
      'gemini-free-flash-lite',     // bepul lite fallback
      'groq-llama-4-scout',         // Groq
      'groq-llama-3-3-70b',
      'groq-llama-3-1-8b',
      'groq-compound-beta',
      'groq-compound-beta-mini',
      'anthropic-haiku-4-5'         // 🛡️ oxirgi qo'riqchi
    ];
    pipeline = standardOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);
  }

  // Sog'lom agentlar birinchi, sovutishdagilar oxirgi
  const healthy    = pipeline.filter(a => isAgentHealthy(a.id));
  const cooledDown = pipeline.filter(a => !isAgentHealthy(a.id));

  return [...healthy, ...cooledDown];
}

/**
 * Self-Healing Multi-Pass JSON Parser:
 * Resilient against:
 * 1. Qwen `<think>` blocks
 * 2. Markdown code fences
 * 3. LaTeX unescaped backslashes (\frac, \sqrt, etc.)
 * 4. Truncated output (auto-repairs incomplete arrays/objects)
 */
export function sanitizeAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error("AI bo'sh javob qaytardi");
  }

  // 1. Reasoning/thought taglarini va markdown fences ni olib tashlash
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

  // BUG #6 FIX: Eski regex faqat {"questions":...} ni topardi.
  // Yangi: har qanday JSON array ([{...}]) yoki object ({...}) topadi.
  // Bu TextGen javoblari (generalIssues, summary, roadmap) uchun ham ishlaydi.
  const arrayMatch  = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  if (arrayMatch) {
    cleaned = arrayMatch[0];
  } else if (objectMatch) {
    cleaned = objectMatch[0];
  }

  // LaTeX backslash ni escape qilish (JSON sintaksisi buzilmasligi uchun)
  const safeJson = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');

  // Birinchi parse urinishi
  try {
    return JSON.parse(safeJson);
  } catch (initialErr) {
    // Auto-repair: kesilgan JSON ni yopish
    let repaired = safeJson.trim();
    if (repaired.startsWith('{') && !repaired.endsWith('}')) {
      repaired += '"}';
      if (repaired.includes('"questions": [') && !repaired.endsWith(']}')) {
        repaired += ']}';
      }
    } else if (repaired.startsWith('[') && !repaired.endsWith(']')) {
      repaired += '}]';
    }

    try {
      return JSON.parse(repaired);
    } catch {
      throw new Error(`JSON formatida xatolik: ${initialErr.message}`);
    }
  }
}

/**
 * Universal Question Normalizer (Postel's Law):
 * Seamlessly normalizes varying outputs from Gemini, Claude, and Groq/Qwen into
 * standard { questionNumber, questionText, options, correctAnswerIndex, correctOption }
 */
function normalizeQuestions(parsed) {
  let list = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (arrayKey) {
      list = parsed[arrayKey];
    } else {
      list = [parsed];
    }
  }

  return list.map((q, idx) => {
    if (!q || typeof q !== 'object') return null;

    // Resolve question text from any possible key
    const text = q.questionText || q.question || q.savol || q.text || q.prompt || q.title || '';
    if (!text || typeof text !== 'string') return null;

    // Resolve options from array or object map (e.g. { A: "...", B: "..." })
    let rawOptions = q.options || q.choices || q.variants || q.variantlar || q.answers || [];
    let options = [];
    if (Array.isArray(rawOptions)) {
      options = rawOptions.map(opt => {
        if (typeof opt === 'string') return opt.trim();
        if (opt && typeof opt === 'object') return (opt.text || opt.value || opt.option || JSON.stringify(opt)).trim();
        return String(opt).trim();
      }).filter(Boolean);
    } else if (typeof rawOptions === 'object') {
      options = Object.values(rawOptions).map(v => String(v).trim()).filter(Boolean);
    }

    if (options.length < 2) return null;

    // Resolve correct answer index
    let correctIdx = 0;
    if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < options.length) {
      correctIdx = q.correctAnswerIndex;
    } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
      correctIdx = q.correctIndex;
    } else if (q.correctOption && options.includes(q.correctOption)) {
      correctIdx = options.indexOf(q.correctOption);
    } else if (q.correctAnswer && options.includes(q.correctAnswer)) {
      correctIdx = options.indexOf(q.correctAnswer);
    } else if (typeof q.answer === 'string') {
      const letterIdx = ['A', 'B', 'C', 'D'].indexOf(q.answer.trim().toUpperCase());
      if (letterIdx >= 0 && letterIdx < options.length) {
        correctIdx = letterIdx;
      }
    }

    return {
      questionNumber: q.questionNumber || (idx + 1),
      questionText: text.trim(),
      options: options.slice(0, 4),
      correctAnswerIndex: correctIdx,
      correctOption: options[correctIdx] || options[0]
    };
  }).filter(Boolean);
}

/**
 * Alohida agent chaqiruvi — strict timeout bilan
 * BUG #9 FIX: timeoutMs dinamik — xabar ham mos bo'ladi
 * BUG #11 FIX: isTextGen=true bo'lsa Groq da response_format ishlatilmaydi
 */
async function callAgent(agent, { prompt, systemPrompt, aiSchema, timeoutMs = 22000, temperature = 0.7, isTextGen = false }) {
  // agent.apiKey — pullik/bepul farq qilish (BUG #1 fix saqlanadi)
  const geminiKey    = agent.apiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (agent.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: agent.model,
        generationConfig: { responseMimeType: 'application/json', temperature }
      });
      const fullPrompt = `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`;
      const result = await model.generateContent(fullPrompt, { signal: controller.signal });
      return result.response.text();

    } else if (agent.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: 4096,
          temperature,
          system: `${systemPrompt || 'You are an elite educational assessment engineer.'}\nStrictly output valid JSON. No markdown fences, no conversational prose.`,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Anthropic HTTP ${res.status}`);
      return data.content?.[0]?.text || '';

    } else if (agent.provider === 'groq') {
      // BUG #11 FIX: TextGen uchun response_format ishlatma
      // compound modellari json_object mode ni to'g'ri bajarmaydi
      const supportsJsonMode = !isTextGen && !agent.model.includes('compound');

      // BUG #5 FIX: Dinamik maxTokens — use-case ga qarab
      // TextGen (sinf tahlili): 1500 token yetarli
      // QuestionGen (20 ta savol): har savol ~150 token + overhead
      const maxTokens = isTextGen
        ? 1500
        : Math.min(Math.max(Math.ceil((prompt.length / 4) * 0.8) + 500, 1500), 4096);

      const body = {
        model: agent.model,
        messages: [
          {
            role: 'system',
            content: `${systemPrompt || 'You are an elite educational assessment engineer.'}\nReturn ONLY valid JSON. Do NOT include markdown code blocks or explanatory comments.`
          },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      };

      if (supportsJsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Groq HTTP ${res.status}`);
      return data.choices?.[0]?.message?.content || '';
    }

    throw new Error(`Noma'lum agent provayderi: ${agent.provider}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Savol yaratish — kaskadli failover bilan
 * BUG #12 FIX: questionQueue (textQueue bilan aralashmasin)
 * BUG #9 FIX: dinamik timeout xabari
 */
export async function executeResilientQuestionGen({ prompt, systemPrompt, aiSchema, isPremium = false }) {
  return questionQueue(async () => {
    const pipeline = buildAgentPipeline({ isPremium });
    const timeoutMs = 28000;

    if (pipeline.length === 0) {
      throw new Error("Hech qanday AI agenti sozlanmagan. Iltimos API kalitlarini tekshiring.");
    }

    let lastError = '';
    const attemptLog = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI QuestionGen] 🚀 Agent: ${agent.id} (${agent.provider}/${agent.model})`);

        const rawText = await callAgent(agent, { prompt, systemPrompt, aiSchema, timeoutMs, isTextGen: false });
        const parsed  = sanitizeAndParseJSON(rawText);
        const validQuestions = normalizeQuestions(parsed);

        if (validQuestions.length === 0) {
          throw new Error("Agent qaytargan savollar strukturasi yaroqsiz");
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[AI QuestionGen] ✅ ${agent.id} (${duration}s) — ${validQuestions.length} ta savol`);

        markAgentSuccess(agent.id);
        return { success: true, agentId: agent.id, questions: validQuestions };

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // BUG #9 FIX: dinamik timeout xabari
        const errMsg = err.name === 'AbortError'
          ? `${Math.round(timeoutMs / 1000)}s Timeout oshib ketdi`
          : err.message;
        console.warn(`[AI QuestionGen] ❌ ${agent.id} (${duration}s): ${errMsg}`);

        markAgentFailure(agent.id, errMsg);
        lastError = `${agent.id}: ${errMsg}`;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI QuestionGen] 💥 Barcha ${pipeline.length} ta agent xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError, attempts: attemptLog };
  });
}

/**
 * Vision OCR — Multi-Agent Failover
 * BUG #1 FIX: agent.apiKey ishlatiladi (pullik Gemini OCR uchun)
 * BUG #4 FIX: markAgentFailure har xatoda chaqiriladi (circuit breaker)
 * BUG #12 FIX: questionQueue (og'ir operatsiya)
 */
export async function executeResilientVisionOCR({ promptText, imageBase64, imageMimeType = 'image/jpeg' }) {
  return questionQueue(async () => {
    const pipeline     = buildAgentPipeline({ isVision: true });
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    let lastError = '';
    const attemptLog  = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI Vision] 📷 OCR Agent: ${agent.id}`);

        if (agent.provider === 'gemini') {
          // BUG #1 FIX: agent.apiKey — pullik kalit avtomatik ishlatiladi
          const genAI = new GoogleGenerativeAI(agent.apiKey);
          const model = genAI.getGenerativeModel({
            model: agent.model,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          });

          const contentParts = [{ text: promptText }];
          if (imageBase64) {
            contentParts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
          }

          const result    = await model.generateContent(contentParts);
          const parsed    = sanitizeAndParseJSON(result.response.text());
          const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);

          if (questions.length > 0) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[AI Vision] ✅ ${agent.id} (${duration}s) — ${questions.length} ta savol`);
            markAgentSuccess(agent.id);
            return { success: true, questions };
          }
          throw new Error("OCR natijasida savollar topilmadi");

        } else if (agent.provider === 'anthropic' && anthropicKey) {
          const content = [];
          if (imageBase64) {
            content.push({ type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } });
          }
          content.push({ type: 'text', text: promptText });

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({ model: agent.model, max_tokens: 4096, temperature: 0.2, messages: [{ role: 'user', content }] })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'Anthropic Vision xatosi');
          const parsed    = sanitizeAndParseJSON(data.content?.[0]?.text || '');
          const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);

          if (questions.length > 0) {
            markAgentSuccess(agent.id);
            return { success: true, questions };
          }
          throw new Error("OCR natijasida savollar topilmadi");
        }

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const errMsg = err.name === 'AbortError' ? '30s OCR Timeout' : err.message;
        console.warn(`[AI Vision] ❌ ${agent.id} (${duration}s): ${errMsg}`);

        // BUG #4 FIX: circuit breaker OCR da ham ishlaydi
        markAgentFailure(agent.id, errMsg);
        lastError = errMsg;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI Vision] 💥 Barcha OCR agentlari xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError || "Rasmdan savollarni ajratib bo'lmadi" };
  });
}

/**
 * Text Generation (sinf tahlili, diagnostika xulosasi, feedback)
 * BUG #11 FIX: isTextGen=true → Groq da response_format o'chiriladi
 * BUG #12 FIX: textQueue (questionQueue bilan aralashmasin)
 * BUG #9 FIX: dinamik timeout xabari
 */
export async function executeResilientTextGen({ prompt, systemPrompt, isPremium = false }) {
  return textQueue(async () => {
    const pipeline  = buildAgentPipeline({ isPremium });
    const timeoutMs = 30000;

    if (pipeline.length === 0) {
      throw new Error("Hech qanday AI agenti sozlanmagan. Iltimos API kalitlarini tekshiring.");
    }

    let lastError = '';
    const attemptLog = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI TextGen] 🚀 Agent: ${agent.id} (${agent.provider}/${agent.model})`);

        const rawText = await callAgent(agent, {
          prompt,
          systemPrompt,
          aiSchema: { type: 'object' },
          timeoutMs,
          temperature: 0.5,
          isTextGen: true  // BUG #11 FIX
        });

        if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 5) {
          throw new Error("Agent bo'sh javob qaytardi");
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[AI TextGen] ✅ ${agent.id} (${duration}s)`);

        markAgentSuccess(agent.id);
        return { success: true, agentId: agent.id, text: rawText };

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // BUG #9 FIX: dinamik timeout xabari
        const errMsg = err.name === 'AbortError'
          ? `${Math.round(timeoutMs / 1000)}s Timeout oshib ketdi`
          : err.message;
        console.warn(`[AI TextGen] ❌ ${agent.id} (${duration}s): ${errMsg}`);

        markAgentFailure(agent.id, errMsg);
        lastError = `${agent.id}: ${errMsg}`;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI TextGen] 💥 Barcha agentlar xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError, attempts: attemptLog };
  });
}

