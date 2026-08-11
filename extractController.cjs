const fs = require('fs');
const code = fs.readFileSync('server/index.js', 'utf8');

// The segments we want:
// 608 to 688: submitTestResult
// 690 to 705: deleteTest
// 707 to 715: getTestResultById
// 717 to 893: generateAITest
// 953 to 1037: classAnalysis

// We can extract by finding `app.post('/api/online-test-results'` and capturing the block.
function extractEndpoint(pattern, newName) {
  const match = code.match(pattern);
  if (!match) return `// NOT FOUND: ${newName}`;
  
  let block = match[0];
  let openBraces = 0;
  let endIndex = match.index;
  let started = false;
  
  for (let i = match.index; i < code.length; i++) {
    if (code[i] === '{') {
      openBraces++;
      started = true;
    }
    if (code[i] === '}') {
      openBraces--;
      if (started && openBraces === 0) {
        // end of function found
        endIndex = i + 1;
        // check for `);`
        if (code[i+1] === ')' && code[i+2] === ';') {
          endIndex += 2;
        }
        break;
      }
    }
  }
  
  const extracted = code.substring(match.index, endIndex);
  
  // Replace signature
  const signatureRegex = /app\.(post|delete|get)\('[^']+',\s*(authMiddleware,\s*)?async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/;
  return extracted.replace(signatureRegex, `export const ${newName} = async (req, res) => {`);
}

const submitTestResult = extractEndpoint(/app\.post\('\/api\/online-test-results',\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/, 'submitTestResult');
const deleteTest = extractEndpoint(/app\.delete\('\/api\/online-tests\/:id',\s*authMiddleware,\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/, 'deleteTest');
const getTestResultById = extractEndpoint(/app\.get\('\/api\/online-test-results\/:id',\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/, 'getTestResultById');
const generateAITest = extractEndpoint(/app\.post\('\/api\/online-tests\/generate',\s*authMiddleware,\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/, 'generateAITest');
const classAnalysis = extractEndpoint(/app\.post\('\/api\/online-tests\/:id\/class-analysis',\s*authMiddleware,\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/, 'classAnalysis');

const finalCode = `\n\n${submitTestResult}\n\n${deleteTest}\n\n${getTestResultById}\n\n${generateAITest}\n\n${classAnalysis}\n`;

fs.appendFileSync('server/controllers/onlineTestController.js', finalCode);
console.log('Appended successfully');
