import { GoogleGenerativeAI } from '@google/generative-ai';

async function analyzeKey() {
  const apiKey = "AIzaSyA9hI5VuihfRCI4ofqYVirfQNHtyqkTQBU";
  console.log("Analyzing API Key Capabilities...");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // 1. Test basic text generation (gemini-flash-latest)
    console.log("\\n1. Testing basic text generation (gemini-flash-latest)...");
    const flashModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const startTime = Date.now();
    const flashResult = await flashModel.generateContent("Qisqacha 'Salom Dunyo' deb yozing.");
    const flashTime = Date.now() - startTime;
    console.log("✅ Success! Response time:", flashTime, "ms");
    console.log("Response:", flashResult.response.text());
    
    // 2. Test JSON structure enforcement
    console.log("\\n2. Testing JSON output capabilities...");
    const jsonPrompt = `Bitta savol yozing. Faqat JSON formatida qaytaring: {"question": "...", "answer": "..."}`;
    const jsonResult = await flashModel.generateContent(jsonPrompt);
    console.log("✅ Success! Raw output:", jsonResult.response.text().substring(0, 50) + "...");
    
    // 3. Test Pro model capability (gemini-pro-latest)
    console.log("\\n3. Testing Pro model capabilities (gemini-pro-latest)...");
    const proModel = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
    const proResult = await proModel.generateContent("2+2=?");
    console.log("✅ Success! Pro model is accessible. Response:", proResult.response.text());

  } catch (error) {
    console.error("❌ Capability test failed:", error.message);
  }
}

analyzeKey();
