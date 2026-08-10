const questions = [
  "Hisoblang: 1",
  "Ifodani soddalashtiring: 1",
  "Kvadrat tenglamaning diskriminantini toping: 1",
  "Agar 1 tenglama karrali bo'lsa...",
  "Viyet teoremasiga ko'ra, 1 tenglamaning..."
];

function isQuestionBroken(qText) {
  if (!qText) return true;
  if (qText.includes('$') || qText.includes('`')) return false;
  const hasMathVerb = /hisoblang|hisobla|soddalashtir|yeching|toping|topingiz|qutqaring|irratsional|ildiz|tenglama|viyet|sistemasini|sistemasidan|oralig|qiymatini|yig.indisini|ko.paytmasini|arifmetigi|diskriminant|karrali/i.test(qText);
  if (!hasMathVerb) return false;
  return /\\b1\\b/.test(qText) || /:\\s*\\d+\\s*[+\\-*\\/]?\\s*$/.test(qText);
}

for (const q of questions) {
  console.log(`"${q}" -> Broken? ${isQuestionBroken(q)}`);
}
