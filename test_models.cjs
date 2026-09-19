const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModels() {
  const geminiKey = process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey);
  
  const modelsToTest = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro'
  ];
  
  console.log('Testing Gemini models with vision...\n');
  
  const imagePath = 'C:/Users/hasan/.gemini/antigravity/brain/dfdac500-07e5-45eb-961e-b4f50bca6d8a/.user_uploaded/media_1789797641149.jpg';
  const fs = require('fs');
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.1 } });
      const result = await model.generateContent([
        'Return exactly this JSON: {"test": "ok", "model": "' + modelName + '"}',
        { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
      ]);
      const text = result.response.text();
      console.log(`✅ ${modelName}: ${text.substring(0, 80)}`);
    } catch (err) {
      console.log(`❌ ${modelName}: ${err.message.substring(0, 100)}`);
    }
  }
}

testModels();
