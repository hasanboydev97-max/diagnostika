const fs = require('fs');
let content = fs.readFileSync('src/components/FormattedText.tsx', 'utf8');

content = content.replace(/\/\/ 4\. Ensure space around block math[\s\S]*?\/\/ 5\. Ensure space around inline math/, '// 5. Ensure space around inline math');
content = content.replace(/\/\/ 5\. Ensure space around inline math[\s\S]*?\/\/ 6\. Fix merged text after digit or brace/, '// 6. Fix merged text after digit or brace');

fs.writeFileSync('src/components/FormattedText.tsx', content, 'utf8');
