const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('src/utils/mathFormatter.ts', 'utf-8');
const js = ts.transpile(code);
eval(js);
const text1 = "\\sqrt{144} - \\sqrt{49} + \\sqrt{25} ning qiymatini toping.";
const text2 = "\\sqrt{2x + 5} = 5 irratsional tenglamani yeching.";
console.log("1:", autoFormatMath(text1));
console.log("2:", autoFormatMath(text2));
