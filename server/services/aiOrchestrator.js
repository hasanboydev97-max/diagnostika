import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';

// BUG #12 FIX: Alohida navbatlar â€” QuestionGen va TextGen bir-birini bloklmasin
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
  console.warn(`âš ï¸ [AI Orchestrator] Agent "${agentId}" ${cooldownMs / 1000}s ga sovutish rejimiga olindi (${reason.substring(0, 60)})`);
}

function markAgentSuccess(agentId) {
  agentHealth.delete(agentId);
}

/**
 * 20-Year Senior Architecture: Multi-Agent Fallback Registry
 * Cost-Optimized Cascading Fallback:
 * 1. Google Gemini Paid (gemini-2.5-flash) â€” Primary Flagship (~$0.075 / 1M tokens, 2000 RPM)
 * 2. Google Gemini Free (gemini-2.5-flash) â€” Standard Fallback (15 RPM)
 * 3. Groq Accelerated LPUs (qwen/qwen3.8-27b, openai/gpt-oss-20b) â€” Fast & Free LPU Fallback
 * 4. Anthropic Claude (claude-haiku-4-5-20251001, claude-sonnet-4-5-20250929) â€” Emergency Safety Net Only
 */
function getAgentCatalog(keys) {
  const { geminiPaidKey, geminiKey, anthropicKey, groqKey } = keys;
  const agents = [];

  // --- 1. Gemini PAID Agents (PRIMARY FLAGSHIP - 2000 RPM, $0.075 / 1M tokens) ---
  if (geminiPaidKey) {
    agents.push(
      { id: 'gemini-paid-2-5-flash', provider: 'gemini', model: 'gemini-2.5-flash', apiKey: geminiPaidKey, tier: 'paid-flagship', priority: 1 }
    );
  }

  // --- 2. Gemini FREE Agents (15 RPM FALLBACK) ---
  if (geminiKey) {
    agents.push(
      { id: 'gemini-free-2-5-flash', provider: 'gemini', model: 'gemini-2.5-flash', apiKey: geminiKey, tier: 'free-standard', priority: 2 }
    );
  }

  // --- 3. Groq Accelerated Open-Weights Agents (FREE LPU) ---
  if (groqKey) {
    agents.push(
      { id: 'groq-qwen-27b',    provider: 'groq', model: 'qwen/qwen3.8-27b',   tier: 'groq-speed',    priority: 3 },
      { id: 'groq-gpt-oss-20b', provider: 'groq', model: 'openai/gpt-oss-20b', tier: 'groq-standard', priority: 4 }
    );
  }

  // --- 4. Anthropic Claude Agents (EMERGENCY SAFETY NET - High precision, preserves user budget) ---
  if (anthropicKey) {
    agents.push(
      { id: 'anthropic-haiku-4-5',  provider: 'anthropic', model: 'claude-haiku-4-5-20251001', tier: 'elite-speed',        priority: 5 },
      { id: 'anthropic-sonnet-4-5', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', tier: 'elite-intelligence', priority: 6 }
    );
  }

  return agents;
}




/**
 * Dynamic Cost-Optimized Pipeline:
 * - Paid Gemini 2.5 Flash is ALWAYS priority #1 (fastest, cheapest, 2000 RPM)
 * - Groq LPU & Free Gemini serve as secondary free fallbacks
 * - Anthropic Claude is the last-resort emergency shield so requests NEVER fail
 */
export function buildAgentPipeline({ isPremium = false, isVision = false }) {
  const geminiPaidKey = process.env.GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_PAID_API_KEY;
  const geminiKey     = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey  = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const groqKey       = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  const allAgents = getAgentCatalog({ geminiPaidKey, geminiKey, anthropicKey, groqKey });

  let pipeline = [];

  if (isVision) {
    // Vision & OMR: 1. Pullik Gemini 2.5 Flash -> 2. Bepul Gemini 2.5 Flash -> 3. Claude Haiku (Safety net)
    const visionOrder = [
      'gemini-paid-2-5-flash',
      'gemini-free-2-5-flash',
      'anthropic-haiku-4-5'
    ];
    pipeline = visionOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);

  } else if (isPremium) {
    // Premium: 1. Pullik Gemini 2.5 Flash -> 2. Bepul Gemini -> 3. Groq -> 4. Claude Haiku -> 5. Claude Sonnet
    const premiumOrder = [
      'gemini-paid-2-5-flash',
      'gemini-free-2-5-flash',
      'groq-qwen-27b',
      'groq-gpt-oss-20b',
      'anthropic-haiku-4-5',
      'anthropic-sonnet-4-5'
    ];
    pipeline = premiumOrder.map(id => allAgents.find(a => a.id === id)).filter(Boolean);

  } else {
    // Standard/Free: 1. Pullik Gemini 2.5 Flash -> 2. Bepul Gemini -> 3. Groq -> 4. Claude Haiku
    const standardOrder = [
      'gemini-paid-2-5-flash',
      'gemini-free-2-5-flash',
      'groq-qwen-27b',
      'groq-gpt-oss-20b',
      'anthropic-haiku-4-5'
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
  let safeJson = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
  safeJson = safeJson.replace(/(?<!\\)\\b(egin|eta|ullet|ar|mod|oldsymbol|f)/g, "\\\\b$1");
  safeJson = safeJson.replace(/(?<!\\)\\f(rac|orall)/g, "\\\\f$1");
  safeJson = safeJson.replace(/(?<!\\)\\r(ight|ho|angle|m)/g, "\\\\r$1");
  safeJson = safeJson.replace(/(?<!\\)\\t(an|ext|imes|o|riangle|heta|ilde)/g, "\\\\t$1");
  safeJson = safeJson.replace(/(?<!\\)\\n(u|abla|eq|eg|exists)/g, "\\\\n$1");

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
 * Alohida agent chaqiruvi â€” strict timeout bilan
 * BUG #9 FIX: timeoutMs dinamik â€” xabar ham mos bo'ladi
 * BUG #11 FIX: isTextGen=true bo'lsa Groq da response_format ishlatilmaydi
 */
async function callAgent(agent, { prompt, systemPrompt, aiSchema, timeoutMs = 22000, temperature = 0.7, isTextGen = false }) {
  // agent.apiKey â€” pullik/bepul farq qilish (BUG #1 fix saqlanadi)
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
        generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens: 8192 }
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

      // Groq on-demand OTPM limit is 1000 tokens for free tier
      const maxTokens = Math.min(
        isTextGen ? 1000 : Math.max(Math.ceil((prompt.length / 4) * 0.8) + 300, 500),
        1000
      );

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
 * Savol yaratish â€” kaskadli failover bilan
 * BUG #12 FIX: questionQueue (textQueue bilan aralashmasin)
 * BUG #9 FIX: dinamik timeout xabari
 */
export async function executeResilientQuestionGen({ prompt, systemPrompt, aiSchema, isPremium = false, temperature = 0.82 }) {
  return questionQueue(async () => {
    const pipeline = buildAgentPipeline({ isPremium });
    const timeoutMs = 85000;

    if (pipeline.length === 0) {
      throw new Error("Hech qanday AI agenti sozlanmagan. Iltimos API kalitlarini tekshiring.");
    }

    let lastError = '';
    const attemptLog = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI QuestionGen] Agent: ${agent.id} (${agent.provider}/${agent.model}) [temp=${temperature}]`);

        const rawText = await callAgent(agent, { prompt, systemPrompt, aiSchema, timeoutMs, temperature, isTextGen: false });
        const parsed  = sanitizeAndParseJSON(rawText);
        const validQuestions = normalizeQuestions(parsed);

        if (validQuestions.length === 0) {
          throw new Error("Agent qaytargan savollar strukturasi yaroqsiz");
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[AI QuestionGen] âœ… ${agent.id} (${duration}s) â€” ${validQuestions.length} ta savol`);

        markAgentSuccess(agent.id);
        return { success: true, agentId: agent.id, questions: validQuestions };

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // BUG #9 FIX: dinamik timeout xabari
        const errMsg = err.name === 'AbortError'
          ? `${Math.round(timeoutMs / 1000)}s Timeout oshib ketdi`
          : err.message;
        console.warn(`[AI QuestionGen] âŒ ${agent.id} (${duration}s): ${errMsg}`);

        markAgentFailure(agent.id, errMsg);
        lastError = `${agent.id}: ${errMsg}`;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI QuestionGen] ðŸ’¥ Barcha ${pipeline.length} ta agent xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError, attempts: attemptLog };
  });
}

/**
 * Vision OCR â€” Multi-Agent Failover
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
        console.log(`[AI Vision] ðŸ“· OCR Agent: ${agent.id}`);

        if (agent.provider === 'gemini') {
          // BUG #1 FIX: agent.apiKey â€” pullik kalit avtomatik ishlatiladi
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
          
          if (parsed) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[AI Vision] âœ… ${agent.id} (${duration}s)`);
            markAgentSuccess(agent.id);
            // Agar massiv bo'lsa (savollar) uni questions ga o'raymiz, yo'qsa to'g'ridan to'g'ri qaytaramiz
            return { 
              success: true, 
              questions: Array.isArray(parsed) ? parsed : (parsed.questions || []),
              rawData: parsed
            };
          }
          throw new Error("OCR natijasi noto'g'ri (bo'sh)");

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
          
          if (parsed) {
            markAgentSuccess(agent.id);
            return { 
              success: true, 
              questions: Array.isArray(parsed) ? parsed : (parsed.questions || []),
              rawData: parsed
            };
          }
          throw new Error("OCR natijasi noto'g'ri (bo'sh)");
        }

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const errMsg = err.name === 'AbortError' ? '30s OCR Timeout' : err.message;
        console.warn(`[AI Vision] âŒ ${agent.id} (${duration}s): ${errMsg}`);

        // BUG #4 FIX: circuit breaker OCR da ham ishlaydi
        markAgentFailure(agent.id, errMsg);
        lastError = errMsg;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI Vision] ðŸ’¥ Barcha OCR agentlari xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError || "Rasmdan savollarni ajratib bo'lmadi" };
  });
}

/**
 * Text Generation (sinf tahlili, diagnostika xulosasi, feedback)
 * BUG #11 FIX: isTextGen=true â†’ Groq da response_format o'chiriladi
 * BUG #12 FIX: textQueue (questionQueue bilan aralashmasin)
 * BUG #9 FIX: dinamik timeout xabari
 */
export async function executeResilientTextGen({ prompt, systemPrompt, isPremium = false }) {
  return textQueue(async () => {
    const pipeline  = buildAgentPipeline({ isPremium });
    const timeoutMs = 85000;

    if (pipeline.length === 0) {
      throw new Error("Hech qanday AI agenti sozlanmagan. Iltimos API kalitlarini tekshiring.");
    }

    let lastError = '';
    const attemptLog = [];

    for (const agent of pipeline) {
      const startTime = Date.now();
      try {
        console.log(`[AI TextGen] ðŸš€ Agent: ${agent.id} (${agent.provider}/${agent.model})`);

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
        console.log(`[AI TextGen] âœ… ${agent.id} (${duration}s)`);

        markAgentSuccess(agent.id);
        return { success: true, agentId: agent.id, text: rawText };

      } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        // BUG #9 FIX: dinamik timeout xabari
        const errMsg = err.name === 'AbortError'
          ? `${Math.round(timeoutMs / 1000)}s Timeout oshib ketdi`
          : err.message;
        console.warn(`[AI TextGen] âŒ ${agent.id} (${duration}s): ${errMsg}`);

        markAgentFailure(agent.id, errMsg);
        lastError = `${agent.id}: ${errMsg}`;
        attemptLog.push(`${agent.id} (${errMsg})`);
      }
    }

    console.error(`[AI TextGen] ðŸ’¥ Barcha agentlar xato:\n  - ${attemptLog.join('\n  - ')}`);
    return { success: false, error: lastError, attempts: attemptLog };
  });
}

