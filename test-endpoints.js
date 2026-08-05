import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

async function run() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  
  console.log('Testing generate...');
  const prompt = `Yaratib berilishi kerak bo'lgan test:
Fan: Matematika
Mavzu: Kasrlar
Savollar soni: 2

Faqat valid JSON formatida javob qaytar. Har bir savol obyekti quydagi maydonlarga ega bo'lsin:
- questionText (string)
- options (array of strings, 4 ta variant)
- correctOption (string, options ichidagi bitta qiymat bilan aynan bir xil bo'lishi kerak)
- type (string, "multiple_choice")

JSON dan boshqa hech qanday izoh yoki markdown yozma. Array qaytar.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('Raw output:', text);
    const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    console.log('Parsed successfully! Items count:', parsed.length);
  } catch (e) {
    console.error('Error generating:', e);
  }
}
run();
