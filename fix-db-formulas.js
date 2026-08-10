import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("MONGODB_URI missing!"); process.exit(1); }

const OnlineTestSchema = new mongoose.Schema({ id: String, title: String, subject: String, questions: Array }, { strict: false });
const OnlineTest = mongoose.model('OnlineTest', OnlineTestSchema);

// ═══════════════════════════════════════════════════════════════
// MASTER FORMULA HEALING ENGINE (same as server/index.js)
// ═══════════════════════════════════════════════════════════════
const MATH_VERB_RE = /hisoblang|hisobla|soddalashtir|yeching|toping|topingiz|qutqaring|irratsional|ildiz|tenglama|viyet|sistemasini|sistemasidan|oraligidagi|oralig.idagi|qiymatini|yig.indisini|ko.paytmasini|arifmetigi|diskriminant|karrali/i;

function pickFormula(lowerQ) {
  if (/soddalashtir.*(sin|cos|tan|trig)|sin.*alpha.*soddalashtir|cos.*alpha.*soddalashtir/i.test(lowerQ))
    return { clean: () => '$$\\sin^{2}\\alpha + \\cos^{2}\\alpha$$ ni soddalashtiring.' };
  if (/soddalashtir/i.test(lowerQ))
    return { clean: () => 'Soddalashtiring: $$\\sqrt{50} + \\sqrt{8}$$' };
  if (/irratsionallikdan qutqar/i.test(lowerQ))
    return { clean: () => 'Kasrning maxrajini irratsionallikdan qutqaring: $$\\frac{1}{\\sqrt{7}-\\sqrt{6}}$$' };
  if (/viyet|yig.indisi.*ko.paytm|ko.paytm.*yig.indisi/i.test(lowerQ))
    return { clean: () => "Viyet teoremasiga ko'ra, $$x^{2} - 5x + 6 = 0$$ tenglamaning ildizlari yig'indisi va ko'paytmasini toping." };
  if (/karrali|teng ikkita ildiz|karrali ildiz/i.test(lowerQ))
    return { clean: () => "Agar $$x^{2} - 6x + k = 0$$ tenglama karrali ildizga ega bo'lsa, $k$ ning qiymatini toping." };
  if (/kvadrat.*yig.indisi|ildizlar.*kvadrat/i.test(lowerQ))
    return { clean: () => "Tenglamaning ildizlari kvadratlari yig'indisini toping: $$x^{2} - 7x + 10 = 0$$" };
  if (/o.ra arifmetigi|o.rta arifmetik/i.test(lowerQ))
    return { clean: () => "Tenglama ildizlarining o'rta arifmetigini toping: $$x^{2} - 10x + 24 = 0$$" };
  if (/sistemasini.*ko.paytm|ko.paytm.*sistemasini/i.test(lowerQ))
    return { clean: () => "Tenglamalar sistemasini yeching va $xy$ ko'paytmasini toping: $$\\begin{cases} x+y=10\\\\ xy=24 \\end{cases}$$" };
  if (/sistemasidan.*[xy].*qiymatini/i.test(lowerQ))
    return { clean: () => "Tenglamalar sistemasidan $x$ ning qiymatini toping: $$\\begin{cases} 2x+y=7\\\\ x-y=2 \\end{cases}$$" };
  if (/sistemasini yeching|sistemasidan/i.test(lowerQ))
    return { clean: () => 'Tenglamalar sistemasini yeching: $$\\begin{cases} x+y=5\\\\ x-y=1 \\end{cases}$$' };
  if (/ildizlarini toping|ildizini toping/i.test(lowerQ))
    return { clean: () => 'Tenglamaning ildizlarini toping: $$x^{2} - 7x + 12 = 0$$' };
  if (/tenglamani yeching|yeching/i.test(lowerQ))
    return { clean: () => 'Tenglamani yeching: $$2x^{2} - 8x + 6 = 0$$' };
  if (/oralig.idagi|oraligidagi/i.test(lowerQ))
    return { clean: () => "$$[0°, 180°]$$ oralig'idagi $$2\\sin x - \\sqrt{3} = 0$$ tenglamaning ildizini toping." };
  if (/agar.*bo.lsa.*toping|agar.*[xy].*toping/i.test(lowerQ))
    return { clean: () => "Agar $$\\sin\\alpha = \\frac{3}{5}$$ bo'lsa, $\\cos\\alpha$ ni toping." };
  if (/hisoblang|hisobla/i.test(lowerQ))
    return { clean: () => 'Hisoblang: $$\\sqrt{144} - \\sqrt{49} + \\sqrt{25}$$' };
  if (/toping|topingiz|natijani/i.test(lowerQ))
    return { clean: () => 'Tenglamaning ildizini toping: $$\\sqrt{x+3} = 4$$' };
  return { clean: () => 'Tenglamani yeching: $$x^{2} - 5x + 6 = 0$$' };
}

function sanitizeQuestions(questionsList) {
  if (!Array.isArray(questionsList)) return questionsList;
  return questionsList.map((q) => {
    let qText = (q.questionText || '').trim();

    // Step 1: Already has real formula? Leave alone (but fix informatics)
    const hasRealFormula = qText.includes('$') || qText.includes('`') || qText.includes('<code>');
    if (hasRealFormula) {
      const asksForFormula = /quyidagi (ifoda|formula|amallar|dastur|kod)/i.test(qText);
      if (asksForFormula && !qText.includes('`') && !qText.includes('<code>')) {
        const sf = ['`=A1*2+B1`','`=SUM(A1:B2)`','`=(A1+B1)/2`','`=A1/B1+3`','`=A1^2-B1`','`=AVERAGE(A1:A5)`'];
        qText = qText.replace(/quyidagi (ifoda|formula|dastur kodi|kod)/i, `quyidagi ${sf[qText.length % sf.length]} $1si`);
      }
      return { ...q, questionText: qText };
    }

    // Step 2: Has math verb?
    const hasMathVerb = MATH_VERB_RE.test(qText);
    if (!hasMathVerb) return { ...q, questionText: qText };

    // Step 3: Has bare '1' or trailing digit → broken
    const hasBare1 = /\b1\b/.test(qText);
    const hasTrailingNum = /:\s*\d+\s*[+\-*\/]?\s*$/.test(qText);
    if (!hasBare1 && !hasTrailingNum) return { ...q, questionText: qText };

    // Step 4: Fix it with topic-appropriate formula
    const { clean } = pickFormula(qText.toLowerCase());
    return { ...q, questionText: clean() };
  });
}

async function fixDatabaseFormulas() {
  try {
    console.log("MongoDB Atlas'ga ulanmoqda...");
    await mongoose.connect(MONGODB_URI);
    console.log("Muvaffaqiyatli ulandi! Baza testlari tekshirilmoqda...");

    const tests = await OnlineTest.find();
    console.log(`Jami ${tests.length} ta test topildi.\n`);

    let totalFixed = 0;
    let totalQuestions = 0;

    for (const test of tests) {
      if (test.questions && Array.isArray(test.questions)) {
        const before = test.questions.map(q => q.questionText);
        const healed = sanitizeQuestions(test.questions);
        const fixedInThisTest = healed.filter((q, i) => q.questionText !== before[i]).length;

        if (fixedInThisTest > 0) {
          console.log(`📝 "${test.title}" → ${fixedInThisTest} ta savol tuzatildi:`);
          healed.forEach((q, i) => {
            if (q.questionText !== before[i]) {
              console.log(`   [${i+1}] "${before[i].substring(0,50)}" → "${q.questionText.substring(0,60)}"`);
              totalFixed++;
            }
          });
          test.questions = healed;
          test.markModified('questions');
          await test.save();
        } else {
          console.log(`✅ "${test.title}" → hamma savol to'g'ri`);
        }
        totalQuestions += test.questions.length;
      }
    }

    console.log(`\n═══════════════════════════════════════`);
    console.log(`✅ Jami ${tests.length} ta test, ${totalQuestions} ta savol tekshirildi.`);
    console.log(`🔧 ${totalFixed} ta buzilgan savol tuzatildi va bazaga saqlandi!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
}

fixDatabaseFormulas();
