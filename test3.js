const text = "\\sqrt{7-4\\sqrt{3}} + \\sqrt{7+4\\sqrt{3}} + \\frac{\\sqrt{a} - \\sqrt{b}}{\\sqrt[4]{a} - \\sqrt[4]{b}}";

// A single backslash in regex is \\
const commandRegex = /\\[a-zA-Z]+(?:\[[^\]]*\])*(?:\{(?:[^{}]|\{[^{}]*\})*\})*/g;

console.log("Original:", text);
console.log("Matches:", text.match(commandRegex));

const replaced = text.replace(commandRegex, (match) => {
    return `$${match}$`;
});
console.log("Replaced:", replaced);
