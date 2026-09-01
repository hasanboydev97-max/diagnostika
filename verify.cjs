const fs = require('fs');
const content = fs.readFileSync('src/components/FormattedText.tsx', 'utf8');

if (content.includes('safeContent.replace(/([^\s$\\])(\\$(?!\\$))/gu, \'$1 $2\');')) {
  console.log("BAD: Rule 5 is still there!");
} else {
  console.log("OK: Rule 5 removed.");
}

if (content.includes('safeContent.replace(/([^\s$\\])(\\$\\$)/gu, \'$1 $2\');')) {
  console.log("BAD: Rule 4 is still there!");
} else {
  console.log("OK: Rule 4 removed.");
}
