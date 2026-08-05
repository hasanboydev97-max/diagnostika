const katex = require('katex');
const text = "\\text{Ushbu}~f(x)~=~\\frac{1}{3}x^{3}~-~4x~\\text{funksiyaning}~\\text{kritik}~\\text{nuqtalarini}~\\text{toping}.";
try {
  console.log(katex.renderToString(text));
} catch (e) {
  console.error("KATEX ERROR:", e.message);
}
