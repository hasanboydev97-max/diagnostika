const fs = require('fs');
const path = 'server/controllers/onlineTestController.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('2. Block math: $expression$', '2. Block math: $$expression$$');
content = content.replace('Correct:   $\\sqrt{50} = 5\\sqrt{2}$', 'Correct:   $$\\sqrt{50} = 5\\sqrt{2}$$');
content = content.replace('Incorrect: $ \\sqrt{50} = 5\\sqrt{2} $', 'Incorrect: $$ \\sqrt{50} = 5\\sqrt{2} $$');
content = content.replace('3. Every $ and every $ you open', '3. Every $ and every $$ you open');
content = content.replace('unclosed $ or $ at the end', 'unclosed $ or $$ at the end');
content = content.replace('Integralni hisoblang: $\\int_0^1', 'Integralni hisoblang: $$\\int_0^1');
content = content.replace('x^2\\\\,dx$"', 'x^2\\\\,dx$$"');

fs.writeFileSync(path, content, 'utf8');
console.log("Dollars fixed");
