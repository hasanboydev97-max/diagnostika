import { mml2omml } from 'mathml2omml';
import katex from 'katex';

const mathml = katex.renderToString('x^2', { output: 'mathml', displayMode: false, throwOnError: false });
const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
const mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
const omml = mml2omml(mathStr);
console.log(omml);
