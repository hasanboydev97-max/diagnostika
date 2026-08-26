import { sanitizeMathText } from './server/utils/mathSanitizer.js';
console.log('1:', sanitizeMathText('Tenglamaning ildizlarini toping: \$\^{2}-16=0\$\$'));
console.log('2:', sanitizeMathText('Hisoblang: \$\$\\sqrt{81}-\\sqrt{25}+\\sqrt{16}\$\$'));
console.log('3:', sanitizeMathText('\$\$[0^{\\circ}, 90^{\\circ}]\$\$ oraligidagi \$\\\sin x-\\sqrt{3}=0\$\$'));
