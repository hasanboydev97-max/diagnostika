import { sanitizeQuestion } from './server/utils/mathSanitizer.js';
const q = { questionText: "\\sqrt{2} \\cdot \\sqrt{8}" };
console.log("Before sanitizer:", q.questionText);
const sanitized = sanitizeQuestion(q);
console.log("After sanitizer:", sanitized.questionText);
