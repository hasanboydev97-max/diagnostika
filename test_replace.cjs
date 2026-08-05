let text = '{"q": "\\\\sqrt{25}, \\frac{1}{2}, \\right, \\tan, \\begin, \\nu, new\\nline"}';

// 1. Escape any backslash that is NOT followed by a valid JSON escape
text = text.replace(/(?<!\\)\\([^"\\/bfnrt])/g, "\\\\$1");

// 2. Escape backslashes that collide with JSON escapes but are actually LaTeX
text = text.replace(/(?<!\\)\\b(egin|eta|ullet|ar|mod|oldsymbol|f)/g, "\\\\b$1");
text = text.replace(/(?<!\\)\\f(rac|orall)/g, "\\\\f$1");
text = text.replace(/(?<!\\)\\r(ight|ho|angle|m)/g, "\\\\r$1");
text = text.replace(/(?<!\\)\\t(an|ext|imes|o|riangle|heta|ilde)/g, "\\\\t$1");
text = text.replace(/(?<!\\)\\n(u|abla|eq|eg|exists)/g, "\\\\n$1");

console.log("Fixed JSON:", text);
const obj = JSON.parse(text);
console.log("Parsed Object:", obj);
