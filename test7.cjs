const katex = require('katex');
const content = "f\\\\left(x\\\\right) = x^{3} - 3x^{2} + 4x - 1";
let cleanContent = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
console.log("cleanContent:", cleanContent);

function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  if (/[0-9\\+*/=<>|\[\]{}^_\-]/.test(cleanWord)) return false;
  return /^[a-zA-Z'oʻgʻ]+$/i.test(cleanWord);
}

function autoFormatMath(text) {
  if (!text) return text;
  let normalized = text.replace(/\$/g, '');
  const tokens = normalized.split(/(\s+)/);
  let result = '';
  let inMath = false;
  let mathBuffer = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '') {
      if (inMath) mathBuffer += token; else result += token;
      continue;
    }
    if (isTextWord(token)) {
      if (inMath) {
        let trimmed = mathBuffer.trimRight();
        let spaces = mathBuffer.substring(trimmed.length);
        result += '$' + trimmed + '$' + spaces;
        inMath = false;
        mathBuffer = '';
      }
      result += token;
    } else {
      if (!inMath) inMath = true;
      mathBuffer += token;
    }
  }
  if (inMath) {
    let trimmed = mathBuffer.trimRight();
    let spaces = mathBuffer.substring(trimmed.length);
    if (trimmed.length > 0) result += '$' + trimmed + '$' + spaces;
  }
  return result;
}

const finalOutput = autoFormatMath(cleanContent);
console.log("finalOutput:", finalOutput);

const Latex = require('react-latex-next').default;
const React = require('react');
const { renderToString } = require('react-dom/server');

try {
  const html = renderToString(React.createElement(Latex, null, finalOutput));
  console.log("REACT HTML:", html);
} catch (e) {
  console.error("REACT ERROR:", e);
}
