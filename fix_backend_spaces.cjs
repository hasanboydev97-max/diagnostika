const fs = require('fs');
let content = fs.readFileSync('server/utils/mathSanitizer.js', 'utf8');

// Completely remove ensureSpaceAroundBlockMath
content = content.replace(/\/\*\*\s*\*\s*Math blok \(\$\$\.\.\.\$\$\) bilan atrofdagi matn orasiga bo'sh joy qo'yish\.[\s\S]*?return t;\s*\}/, '');
content = content.replace(/t = ensureSpaceAroundBlockMath\(t\);/, '');

fs.writeFileSync('server/utils/mathSanitizer.js', content, 'utf8');
