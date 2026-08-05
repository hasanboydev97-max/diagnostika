const text1 = "\\begin{cases} x+y=5 \\\\ x-y=1 \\end{cases}";
const text2 = "\\frac{1}{3}x^{3} funksiya";
const text3 = "Tenglamaning ildizlarini toping";

function format(text) {
    let processed = text.replace(/(?<![\\{A-Za-z])\b[a-zA-Z'oʻgʻ]{2,}\b(?![}A-Za-z])/gi, (match) => {
        // Exclude common math variables that might be 2 letters, though rare.
        // Actually, protecting things inside {} is done by `(?<!\\{)` and `(?!\})`.
        return `\\text{${match}}`;
    });
    return processed;
}

console.log(format(text1));
console.log(format(text2));
console.log(format(text3));
