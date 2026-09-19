import { sanitizeQuestion, isQuestionMalformed } from './server/utils/mathSanitizer.js';
import { isAnswerCorrect } from './server/utils/scoring.js';
import { sanitizeAndParseJSON } from './server/services/aiOrchestrator.js';

console.log("=== 1. MATH SANITIZER TESTS ===");
const cases = [
  { opt: "A) animatsiya", expect: "animatsiya" },
  { opt: "-5", expect: "-5" },
  { opt: "- 5", expect: "- 5" },
  { opt: "1.5", expect: "1.5" },
  { opt: "A.I. system", expect: "A.I. system" },
  { opt: "a.m. time", expect: "a.m. time" },
  { opt: "* option", expect: "option" },
  { opt: "1. option", expect: "option" },
  { opt: "D) 100", expect: "100" }
];

cases.forEach(c => {
  const res = sanitizeQuestion({ options: [c.opt] });
  const actual = res.options[0];
  console.log(`[Sanitize] Input: "${c.opt}" | Expected: "${c.expect}" | Actual: "${actual}" | Result: ${actual === c.expect ? '✅ PASS' : '❌ FAIL'}`);
});

console.log("\n=== 2. SCORING / ANSWER VERIFICATION TESTS ===");
const scoreCases = [
  { user: "A", correct: "animatsiya", options: ["animatsiya", "b", "c", "d"], expect: true },
  { user: "0", correct: "animatsiya", options: ["animatsiya", "b", "c", "d"], expect: true },
  { user: "animatsiya", correct: "animatsiya", options: ["animatsiya", "b", "c", "d"], expect: true },
  { user: "A", correct: "xato", options: ["xato", "b", "c", "d"], expect: true },
  { user: "B", correct: "b", options: ["a", "b", "c", "d"], expect: true },
  { user: "B", correct: "a", options: ["a", "b", "c", "d"], expect: false }
];

scoreCases.forEach((c, i) => {
  const actual = isAnswerCorrect(c.user, c.correct, c.options);
  console.log(`[Score] Case ${i+1}: User="${c.user}", Correct="${c.correct}" | Result: ${actual === c.expect ? '✅ PASS' : '❌ FAIL'}`);
});

console.log("\n=== 3. AI ORCHESTRATOR JSON PARSE TESTS ===");
const jsonCases = [
  { name: "Clean JSON", raw: '{"questions": []}' },
  { name: "Markdown fences", raw: '```json\n{"questions": []}\n```' },
  { name: "Thinking blocks", raw: '<think>I should do this</think>\n{"questions": []}' },
  { name: "Unescaped LaTeX frac", raw: '{"questions": [{"text": "\\frac{1}{2}"}]}' },
  { name: "Unescaped LaTeX begin", raw: '{"questions": [{"text": "\\begin{cases}"}]}' }
];

jsonCases.forEach(c => {
  try {
    const parsed = sanitizeAndParseJSON(c.raw);
    console.log(`[JSON Parse] ${c.name}: ✅ PASS`);
  } catch (e) {
    console.log(`[JSON Parse] ${c.name}: ❌ FAIL (${e.message})`);
  }
});
