require('ignore-styles');
const React = require('react');
const { renderToString } = require('react-dom/server');
const Latex = require('react-latex-next').default;

const math = "Ushbu $f(x) = \\frac{1}{3}x^{3} - 4x$ funksiyaning kritik nuqtalarini toping.";
const math2 = "Hisoblang: $\\left| 3 - \\sqrt{11} \\right| + \\left| 4 - \\sqrt{11} \\right|$";
const math3 = "Tenglamaning ildizlari yig'indisini toping: $\\left|2x - 5\\right| = 9$";

console.log(renderToString(React.createElement(Latex, null, math)));
console.log(renderToString(React.createElement(Latex, null, math2)));
console.log(renderToString(React.createElement(Latex, null, math3)));
