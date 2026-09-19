const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai'); 
require('dotenv').config();

async function runTest() {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.2 }});

  const imagePath = 'C:/Users/hasan/.gemini/antigravity/brain/dfdac500-07e5-45eb-961e-b4f50bca6d8a/.user_uploaded/media_1789797641149.jpg';
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  
  const prompt = `
    Sen eng yuqori aniqlikdagi OMR (Optical Mark Recognition) va Hujjat Tahlilchisisan (Senior Document AI).
    Senga qog'oz test varaqasi (Bubble sheet / OMR javoblar varag'i) rasmi taqdim etilmoqda.
    Savollar soni: 1 dan 30 gacha.
    Variantlar: A, B, C, D.

    Vazifang:
    1. Varaqa tepasidagi o'quvchining yozma F.I.Sh (Ism-familiyasi), Sinf (masalan '7-A') va ID raqami bo'lsa OCR orqali aniqla. Agar yozilmagan bo'lsa null qaytar.
    2. 1 dan 30 gacha har bir savol uchun o'quvchi tomonidan qoraytirilgan (bo'yalgan) yoki belgilangan doirachani (A, B, C, D) top.

    Qat'iy ravishda faqat quyidagi JSON strukturada qaytar (boshqa hech qanday izohsiz):
    {
      "studentName": "Ism Familiya yoki null",
      "studentClass": "Sinf yoki null",
      "studentId": "ID yoki null",
      "answers": [
        { "q": 1, "ans": "A" },
        { "q": 2, "ans": "C" }
      ],
      "error": null
    }

    MUHIM OGOHLANTIRISH: Rasm biroz xira yoki yorug'lik past bo'lsa ham, ASLO taslim bo'lma! Har bir savol uchun eng ehtimoliy javobni topishga maksimal harakat qil. Faqatgina rasmda varaq umuman bo'lmasagina "error" xabarini qaytarishing mumkin. Aks holda JSON qaytar!
  `;

  console.log('Sending to Gemini...');
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
  ]);
  
  console.log('Gemini Raw Response:');
  console.log(result.response.text());
}
runTest().catch(console.error);
