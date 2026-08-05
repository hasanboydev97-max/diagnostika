const text1 = "Ushbu f(x) = \\frac{1}{3}x^{3} - 4x funksiyaning kritik nuqtalarini toping.";
const text2 = "Hisoblang: \\left| 3 - \\sqrt{11} \\right| + \\left| 4 - \\sqrt{11} \\right|";
const text3 = "Tenglamaning ildizlari yig'indisini toping: \\left| 2x - 5 \\right| = 9";
const text4 = "2\\text{ m/s}";

function format(text) {
    // 1. Find purely text words (length >= 2, only letters and apostrophes)
    let processed = text.replace(/(?<!\\)\b[a-zA-Z']{2,}\b/g, (match) => {
        return `\\text{${match}}`;
    });
    
    // 2. Escape all spaces to preserve them in math mode, EXCEPT spaces inside \text{}
    // Actually, KaTeX \text{} preserves spaces inside it. 
    // But what if we just replace all literal spaces with `~` or `\ `?
    // Let's replace all spaces with `~`
    processed = processed.replace(/ /g, '~');
    
    // 3. Wrap the whole thing in $
    return `$${processed}$`;
}

console.log(format(text1));
console.log(format(text2));
console.log(format(text3));
console.log(format(text4));
