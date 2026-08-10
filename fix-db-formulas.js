import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI missing!");
  process.exit(1);
}

const OnlineTestSchema = new mongoose.Schema({
  id: String,
  title: String,
  subject: String,
  questions: Array
}, { strict: false });

const OnlineTest = mongoose.model('OnlineTest', OnlineTestSchema);

function sanitizeQuestions(questionsList) {
  if (!Array.isArray(questionsList)) return questionsList;
  return questionsList.map((q) => {
    let qText = q.questionText || '';

    const asksForFormula = /quyidagi (ifoda|formula|amallar|dastur|kod)/i.test(qText);
    const cleanForCheck = qText.replace(/A1\s*=\s*\d+|B1\s*=\s*\d+/gi, '');
    const hasFormula = qText.includes('$') || qText.includes('`') || qText.includes('<code>') || /(=|\+|-|\*|\/|\\frac|\\sqrt)/.test(cleanForCheck);

    if (asksForFormula && !hasFormula) {
      if (/A1\s*=\s*12.*B1\s*=\s*4/i.test(qText)) {
        qText = qText.replace(/quyidagi formulaning/i, 'quyidagi `=A1/B1 + 3` formulaning');
      } else {
        const sampleFormulas = [
          '`=A1*2 + B1`',
          '`=SUM(A1:B2)`',
          '`=(A1+B1)/2`',
          '`=A1/B1 + 3`',
          '`=A1^2 - B1`',
          '`=AVERAGE(A1:A5)`'
        ];
        const formulaToInject = sampleFormulas[qText.length % sampleFormulas.length];
        qText = qText.replace(/quyidagi (ifoda|formula|dastur kodi|kod)/i, `quyidagi ${formulaToInject} $1si`);
      }
    }

    // Strip dangling AI trailing numbers like ": 1" or ": 12"
    qText = qText.replace(/:\s*\d+\s*$/, ':');

    return {
      ...q,
      questionText: qText
    };
  });
}

async function fixDatabaseFormulas() {
  try {
    console.log("MongoDB Atlas'ga ulanmoqda...");
    await mongoose.connect(MONGODB_URI);
    console.log("Muvaffaqiyatli ulandi! Baza testlari tekshirilmoqda...");

    const tests = await OnlineTest.find();
    console.log(`Jami ${tests.length} ta test topildi. Har biri tekshirilmoqda...`);

    let updatedCount = 0;
    for (const test of tests) {
      if (test.questions && Array.isArray(test.questions)) {
        const healedQuestions = sanitizeQuestions(test.questions);
        test.questions = healedQuestions;
        test.markModified('questions');
        await test.save();
        updatedCount++;
      }
    }

    console.log(`✅ ${updatedCount} ta testning barcha savol va formulalari bazada to'liq tuzatildi va saqlandi!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

fixDatabaseFormulas();
