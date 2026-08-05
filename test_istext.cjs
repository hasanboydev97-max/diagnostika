function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  if (/[0-9\\+*/=<>|\[\]{}^_\-]/.test(cleanWord)) return false;
  return /^[a-zA-Z'oʻgʻ]+$/i.test(cleanWord);
}
console.log('isTextWord("\\\\sin(x)"):', isTextWord('\\sin(x)'));
console.log('isTextWord("\\\\sqrt{75}"):', isTextWord('\\sqrt{75}'));
console.log('isTextWord("\\\\text{ cm}"):', isTextWord('\\text{ cm}'));
