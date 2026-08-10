const MATH_VERB_RE = /hisoblang|hisobla|soddalashtir|yeching|toping|topingiz|qutqaring|irratsional|ildiz|tenglama|viyet|sistemasini|sistemasidan|oraligidagi|oralig.idagi|qiymatini|yig.indisini|ko.paytmasini|arifmetigi|diskriminant|karrali/i;
function sanitizeQuestions(questionsList) {
  if (!Array.isArray(questionsList)) return questionsList;
  return questionsList.map((q) => {
    let qText = (q.questionText || '').trim();
    console.log('Testing:', qText);
    const hasRealFormula = qText.includes('$') || qText.includes('`') || qText.includes('<code>');
    if (hasRealFormula) return { ...q, questionText: qText };
    const hasMathVerb = MATH_VERB_RE.test(qText);
    if (!hasMathVerb) return { ...q, questionText: qText };
    const hasBare1 = /\b1\b/.test(qText);
    const hasTrailingNum = /:\s*\d+\s*[+\-*\/]?\s*$/.test(qText);
    console.log('hasMathVerb:', hasMathVerb, 'hasBare1:', hasBare1, 'hasTrailingNum:', hasTrailingNum);
    if (!hasBare1 && !hasTrailingNum) return { ...q, questionText: qText };
    return { ...q, questionText: 'FIXED' };
  });
}
console.log(sanitizeQuestions([{questionText: 'Ifodani soddalashtiring: 1'}]));
console.log(sanitizeQuestions([{questionText: 'Kvadrat tenglamaning diskriminantini toping: 1'}]));
