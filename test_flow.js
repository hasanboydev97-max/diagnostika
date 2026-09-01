const jsonParsed = JSON.parse('{"questions": [{"questionText": "\\\\sqrt{2}"}]}');
let rawText = JSON.stringify(jsonParsed.questions);
console.log("rawText:", rawText);
const raw = rawText;
const safeRaw = raw.replace(/(?<!\\)\\([^nrtb"\\])/g, '\\\\$1');
console.log("safeRaw:", safeRaw);
let parsedObj = JSON.parse(safeRaw);
console.log("parsedObj:", parsedObj);
