let safeContent = "$\\sqrt2\\cdot\\sqrt8$ ifodani hisoblang.";
console.log("INITIAL:", safeContent);

// 1. Fix ,frac to \frac
safeContent = safeContent.replace(/,frac\{/g, '\\frac{');

// 2. Fix $inner$$ -> $$inner$$
safeContent = safeContent.replace(/(?<!\$)\$(?!\$)([^$\n]{1,300}?)\$\$(?!\$)/g, (_, inner) => `$$${inner}$$`);

// 3. Remove orphan trailing $$ like `=0$$` -> `=0`
const allDoubles = safeContent.match(/\$\$/g) || [];
if (allDoubles.length % 2 !== 0) {
  safeContent = safeContent.replace(/\$\$(?=[^$]*$)/, '');
}

// 0. Fix spaces INSIDE math blocks which breaks remark-math parsing
safeContent = safeContent.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_, inner) => {
  return '$' + inner.trim() + '$';
});
safeContent = safeContent.replace(/\$\$([^$]+?)\$\$/g, (_, inner) => {
  return '$$' + inner.trim() + '$$';
});

// 4. Ensure space around block math
safeContent = safeContent.replace(/(\$\$)([^\s$\\.,!?;:\n\d([{'\-])/gu, '$1 $2');
safeContent = safeContent.replace(/([^\s$\\])(\$\$)/gu, '$1 $2');

// 5. Ensure space around inline math
safeContent = safeContent.replace(/((?<!\$)\$(?!\$)(?:[^$\n\\]|\\.){1,150}?\$(?!\$))([^\s$.,!?;:\n([{'\-])/gu, '$1 $2');
safeContent = safeContent.replace(/([^\s$\\])(\$(?!\$))/gu, '$1 $2');

// 6. Fix merged text after digit or brace (e.g. =0tenglama -> =0 tenglama)
safeContent = safeContent.replace(/(=\s*-?\d+(?:\.\d+)?)([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
safeContent = safeContent.replace(/([}\]])([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');

// 7. Fix odd single $ count by escaping the last one
const singleCount = (safeContent.match(/(?<!\$)\$(?!\$)/g) || []).length;
if (singleCount % 2 !== 0) {
  safeContent = safeContent.replace(/(?<!\$)\$(?!\$)(?=[^$]*$)/, '\\$');
}

// 8. Remove empty delimiters
safeContent = safeContent.replace(/\$\$\s*\$\$/g, '');

console.log("FINAL:", safeContent);
