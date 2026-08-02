import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBDic8BnP3_urlpL5pAyelpNCYzm6V25zI');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
  try {
    console.log("Gemini API ga so'rov yuborilmoqda (ListModels)...");
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBDic8BnP3_urlpL5pAyelpNCYzm6V25zI');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

run();
