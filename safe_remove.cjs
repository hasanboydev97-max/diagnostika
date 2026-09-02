const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const buttonStr = `                      <button 
                        type="button"
                        onClick={() => setIsAiModalOpen(true)}
                        className="w-full text-left py-4 mt-4 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-between gap-2 bg-black text-white hover:bg-neutral-800 shadow-md group"
                      >
                        <span>AI Test Yaratish (Moslashuvchan)</span>
                        <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                      </button>`;
content = content.replace(buttonStr, '');

const modalStr = `      {isAiModalOpen && (
        <AiTestCreatorModal
          initialGrade={grade}
          blueprint={currentBlueprint}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}`;
content = content.replace(modalStr, '');

content = content.replace(/const \[isAiModalOpen, setIsAiModalOpen\] = useState\(false\);/, '');
content = content.replace(/import AiTestCreatorModal from '\.\.\/components\/AiTestCreatorModal';\r?\n?/, '');

fs.writeFileSync('src/pages/Admin.tsx', content, 'utf8');
console.log("Safely removed AI modal from Admin.tsx");
