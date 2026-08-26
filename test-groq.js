import dotenv from 'dotenv';
dotenv.config();

async function testGroq() {
  const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.log('GROQ_API_KEY topilmadi');
    return;
  }
  
  const prompt = `
▶ QOIDA 1 — MATEMATIKA VA FIZIKA:
  - Barcha formulalar, tenglamalar, kasrlar va ifodalar QAT'IY RAVISHDA LaTeX (KaTeX) formatida, $ belgisi ichida bo'lishi shart! 
  - Kasrlar uchun / emas, \\frac{}{} ishlating.
  
▶ QOIDA 2 — DOLLAR BALANSI:
  Har bir ochuvchi $ yoki $$ uchun aynan bir yopuvchi bo'lishi SHART.

Menga 2 ta Matematika savoli (Kvadrat tenglama) yozib ber. Format: JSON. 
Hech qanday izohsiz faqat JSON qaytar. { "questions": [ { "questionText": "...", "options":["..."], "correctOption":"...", "type":"multiple_choice", "subtopic":"math", "difficulty":"oson"} ] }`;

  console.log('Fetching from Groq...');
  console.time('Groq Time');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });
    console.timeEnd('Groq Time');
    
    const data = await res.json();
    if (!res.ok) {
      console.log('Groq Error:', data);
      return;
    }
    console.log('Groq Success. Output:');
    const content = data.choices[0].message.content;
    console.log(content);
    
    // Test JSON parse
    const parsed = JSON.parse(content);
    console.log('JSON ishlayapti:', Array.isArray(parsed.questions) ? parsed.questions.length + ' ta savol' : 'Xato format');
  } catch(e) {
    console.log("Xato:", e.message);
  }
}
testGroq();
