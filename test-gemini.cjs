require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No API key');
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Siz malakali Matematika o'qituvchisisiz. Quyidagi mavzuda maktab o'quvchilari uchun test savollari tuzing:
Mavzu: Kvadrat tenglamalar va ildiz
Savollar soni: 2

Faqat valid JSON formatida javob qaytar. Har bir savol obyekti quydagi maydonlarga ega bo'lsin:
- questionText (string)
- options (array of strings, 4 ta variant)
- correctOption (string, options ichidagi bitta qiymat bilan aynan bir xil bo'lishi kerak)
- type (string, "multiple_choice")
- subtopic (string, ushbu savol qaysi aniq qoidaga/kichik mavzuga doir ekanligi, masalan "Kasrlarni qo'shish", qisqa 1-2 so'z)

MUHIM QOIDA: Agar savol yoki variantlar ichida har qanday matematik formula, tenglama, kasr yoki ildiz (masalan kvadrat ildiz, x^2) kelsa, ularni QAT'IY ravishda LaTeX (KaTeX) formatida yozing va albatta "$" belgilari orasiga oling. Masalan: "$x^2 - 5x + 6 = 0$" yoki "$\\sqrt{16}$". Matnli qismlar (masalan "tenglamani yeching") $ belgisidan tashqarida qolsin. Backslashlarni "\\\\" ko'rinishida escape qilishni unutmang.

JSON dan boshqa hech qanday izoh yoki markdown yozma. Array qaytar.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    console.log("Raw output from Gemini:");
    console.log(text);
}

test();
