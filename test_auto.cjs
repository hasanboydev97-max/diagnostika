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
console.log(autoFormatMath('Hisoblang: \\sqrt{75} - \\sqrt{12} + \\sqrt{48}'));
console.log(autoFormatMath('7\\sqrt{3}'));
console.log(autoFormatMath('\\sqrt{2x + 5} = 5'));
