const str1 = '{"math": "\\\\sqrt{x}"}'; // This is how LLM should return it (2 slashes)
const str2 = '{"math": "\\sqrt{x}"}'; // This is the bug (1 slash)

console.log("Original str1 parse:", JSON.parse(str1));
try {
  console.log("Original str2 parse:", JSON.parse(str2));
} catch (e) {
  console.log("Original str2 parse failed (expected)");
}

const fixRegex = /(?<!\\)\\(?!["\\/bfnrt])/g;

console.log("Fixed str1:", str1.replace(fixRegex, "\\\\"));
console.log("Fixed str2:", str2.replace(fixRegex, "\\\\"));

console.log("Fixed str1 parse:", JSON.parse(str1.replace(fixRegex, "\\\\")));
console.log("Fixed str2 parse:", JSON.parse(str2.replace(fixRegex, "\\\\")));
