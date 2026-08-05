function isTextWord(word: string): boolean {
  // Strip trailing punctuation for the check
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  
  if (cleanWord.length < 2) return false; // Single letters are math (x, y, a)
  
  // Checking for ANY backslash, digits, or math symbols explicitly
  for (let i = 0; i < cleanWord.length; i++) {
    const c = cleanWord[i];
    if ("0123456789+*/=<>|[]{}^_-\\".includes(c)) {
      return false; // It's math
    }
  }
  
  // If it's purely letters (including Uzbek characters)
  return /^[a-zA-Z'oʻgʻ]+$/i.test(cleanWord);
}

export function autoFormatMath(text: string): string {
  if (!text) return text;
  
  // 1. Strip all existing $ to normalize the string
  let normalized = text.replace(/\$/g, '');
  
  // 2. Split into words preserving spaces
  const tokens = normalized.split(/(\s+)/);
  
  let result = "";
  let inMath = false;
  let mathBuffer = "";
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '') {
      // Space token
      if (inMath) {
        mathBuffer += token;
      } else {
        result += token;
      }
      continue;
    }
    
    if (isTextWord(token)) {
      if (inMath) {
        // End math block
        let trimmed = mathBuffer.trimRight();
        let spaces = mathBuffer.substring(trimmed.length);
        result += `$${trimmed}$${spaces}`;
        inMath = false;
        mathBuffer = "";
      }
      result += token;
    } else {
      // Math word
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
