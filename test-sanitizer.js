import { sanitizeMathText } from './server/utils/mathSanitizer.js';
const input = "$x_1$ va $ x_2 $ sonlari $$ x^{2}-3x-5=0 $$ tenglamaning ildizlari bo'lsa, $x_1^{3}+x_2^{3} $";
function test(text) {
  let t = text;
  console.log('0:', t);
  t = t.replace(/(?<![\\$])\$(?!\$)([^$\n]+?)(?<![\\$])\$(?!\$)/g, (_, inner) => '$' + inner.trim() + '$');
  console.log('1 (fixSpaceInside):', t);
  t = t.replace(/((?<![\\$])\$(?!\$)(?:[^$\n\\]|\\.){1,150}?\$(?!\$))([^\s$.,!?;:\n([{'\-])/gu, '$1 $2');
  console.log('2 (ensure space after):', t);
  t = t.replace(/([^\s$\\])(\$(?!\$))/gu, '$1 $2');
  console.log('3 (ensure space before):', t);
  return t;
}
console.log('FINAL:', test(input));
