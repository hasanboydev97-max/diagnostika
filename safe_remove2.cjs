const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace button exactly
content = content.replace(/<button[^>]*onClick=\{\(\) => setIsAiModalOpen\(true\)\}[^>]*>[\s\S]*?AI Test Yaratish \(Moslashuvchan\)[\s\S]*?<\/button>/, '');

// Replace modal exactly
content = content.replace(/\{isAiModalOpen && \([\s\S]*?<AiTestCreatorModal[\s\S]*?\/>\s*\)\}/, '');

fs.writeFileSync('src/pages/Admin.tsx', content, 'utf8');
console.log("Safely removed AI modal UI from Admin.tsx");
