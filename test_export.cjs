const katex = require("katex");
const fs = require("fs");

// We need to simulate autoFormatMath because importing TS into Node is annoying.
function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  for (let i = 0; i < cleanWord.length; i++) {
    const c = cleanWord[i];
    if ("0123456789+*/=<>|[]{}^_-\\".includes(c)) return false;
  }
  return /^[a-zA-Z'oʻgʻ]+$/i.test(cleanWord);
}

function autoFormatMath(text) {
  if (!text) return text;
  let normalized = text.replace(/\$/g, '');
  const tokens = normalized.split(/(\s+)/);
  let result = "";
  let inMath = false;
  let mathBuffer = "";
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
        result += `$${trimmed}$${spaces}`;
        inMath = false;
        mathBuffer = "";
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
    if (trimmed.length > 0) result += `$${trimmed}$${spaces}`;
  }
  return result;
}

function renderMathForWord(content) {
  if (!content) return "";
  const cleanContent = autoFormatMath(content);
  const parts = cleanContent.split("$");
  let result = "";
  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      result += part;
    } else {
      try {
        result += katex.renderToString(part, {
          throwOnError: false,
          output: "mathml",
          displayMode: false
        });
      } catch (e) {
        result += `$${part}$`;
      }
    }
  });
  return result;
}

console.log(renderMathForWord("1. Tenglamani yeching: $$\\sqrt{x+5}=3$$"));
