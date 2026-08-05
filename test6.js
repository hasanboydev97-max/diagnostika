const tests = [
  "Hisoblang: \\left| 3 - \\sqrt{11} \\right| + \\left| 4 - \\sqrt{11} \\right|",
  "Ushbu f(x) = \\frac{1}{3}x^{3} - 4x funksiyaning kritik nuqtalarini toping.",
  "x^2 - 7x + 10 = 0 kvadrat tenglamaning ildizlari x_1 va x_2 bo'lsa, x_1^2 + x_2^2 ning qiymatini toping.",
  "Nuqtaning to'g'ri chiziqli harakat qonuni s\\left(t\\right) = 2t^{3} - 5t^{2} + 4t + 3 (metrlarda) ko'rinishga ega. Vaqt t = 2\\text{ s} bo'lganda, nuqtaning oniy tezligini toping.",
  "2\\sqrt{11}-7",
  "-1",
  "Tenglamaning ildizlari yig'indisini toping: \\left| 2x - 5 \\right| = 9",
  "x = \\pm 2",
  "10\\text{ m/s}",
  "Ifodani soddalashtiring: \\frac{\\sqrt{a} - \\sqrt{b}}{\\sqrt[4]{a} - \\sqrt[4]{b}} (a > 0, b > 0, a \\neq b)",
  "$$ \\sqrt{144} $$",
  "2\\text{ sm}"
];

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
  
  let result = "";
  let inMath = false;
  let mathBuffer = "";
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '') {
      if (inMath) {
        mathBuffer += token;
      } else {
        result += token;
      }
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
      if (!inMath) {
        inMath = true;
      }
      mathBuffer += token;
    }
  }
  
  if (inMath) {
    let trimmed = mathBuffer.trimRight();
    let spaces = mathBuffer.substring(trimmed.length);
    if (trimmed.length > 0) {
      result += `$${trimmed}$${spaces}`;
    }
  }
  
  return result;
}

tests.forEach((t, i) => {
  console.log(`\n--- Test ${i+1} ---`);
  console.log("IN: ", t);
  console.log("OUT:", autoFormatMath(t));
});
