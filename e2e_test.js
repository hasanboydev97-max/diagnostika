import { sanitizeQuestion } from './server/utils/mathSanitizer.js';
import fs from 'fs';

// 1. AI Output Simulation (What the API returns over HTTP)
// In a perfectly constrained decoding, AI returns properly escaped JSON:
const apiResponse = `{"questionText": "Tenglamani yeching: $$\\sqrt{50} = 5\\sqrt{2}$$"}`;

// 2. onlineTestController.js parsing
let rawText = apiResponse;
const raw = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
const safeRaw = raw.replace(/(?<!\\)\\([^nrtb"\\])/g, '\\\\$1');
let parsedObj = JSON.parse(safeRaw);
let q = parsedObj;

console.log("After JSON.parse:", q.questionText);

// 3. mathSanitizer.js processing
const sanitized = sanitizeQuestion(q);
console.log("After mathSanitizer:", sanitized.questionText);

// 4. DB Save & API Send (JSON.stringify)
const networkResponse = JSON.stringify(sanitized);
console.log("Sent over network:", networkResponse);

// 5. Frontend receive
const frontendReceived = JSON.parse(networkResponse);
console.log("Frontend state:", frontendReceived.questionText);

// 6. FormattedText.tsx processing
let safeContent = String(frontendReceived.questionText);
safeContent = safeContent.replace(/,frac\{/g, '\\frac{');
safeContent = safeContent.replace(/(?<!\$)\$(?!\$)([^$\n]{1,300}?)\$\$(?!\$)/g, (_, inner) => `$$${inner}$$`);
const allDoubles = safeContent.match(/\$\$/g) || [];
if (allDoubles.length % 2 !== 0) safeContent = safeContent.replace(/\$\$(?=[^$]*$)/, '');
safeContent = safeContent.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_, inner) => '$' + inner.trim() + '$');
safeContent = safeContent.replace(/\$\$([^$]+?)\$\$/g, (_, inner) => '$$' + inner.trim() + '$$');
safeContent = safeContent.replace(/(=\s*-?\d+(?:\.\d+)?)([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
safeContent = safeContent.replace(/([}\]])([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
const singleCount = (safeContent.match(/(?<!\$)\$(?!\$)/g) || []).length;
if (singleCount % 2 !== 0) safeContent = safeContent.replace(/(?<!\$)\$(?!\$)(?=[^$]*$)/, '\\$');
safeContent = safeContent.replace(/\$\$\s*\$\$/g, '');

console.log("Passed to ReactMarkdown:", safeContent);
