import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('fake-key');

async function test() {
  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];
  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[AI Gen] ${modelName} — urinish ${attempt}/3...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' }
        });
        await model.generateContent('hello');
      } catch (err) {
        console.warn(`  ✗ ${modelName} urinish ${attempt}: ${err.message}`);
      }
    }
  }
}
test();
