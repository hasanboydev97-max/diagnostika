import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (content === null || content === undefined || content === '') return null;

  // AI-dan kelgan ba'zi xom qochirilgan (escaped) HTML elementlarni tozalash (agar kerak bo'lsa)
  // Ammo odatda react-markdown buni o'zi xavfsiz bajara oladi. 
  // Shunchaki o'zbek alifbosidagi o' va g' uchun qo'shimcha xavfsizlik (ixtiyoriy).
  let safeContent = String(content);

  // --- Senior Level Robust Frontend Sanitization (Fallback for old DB entries) ---
  
  // 1. Fix ,frac to \frac
  safeContent = safeContent.replace(/,frac\{/g, '\\frac{');

  // 2. Fix $inner$$ -> $$inner$$
  safeContent = safeContent.replace(/(?<!\$)\$(?!\$)([^$\n]{1,300}?)\$\$(?!\$)/g, (_, inner) => `$$${inner}$$`);

  // 3. Remove orphan trailing $$ like `=0$$` -> `=0`
  const allDoubles = safeContent.match(/\$\$/g) || [];
  if (allDoubles.length % 2 !== 0) {
    safeContent = safeContent.replace(/\$\$(?=[^$]*$)/, '');
  }

  // 4. Ensure space around block math
  safeContent = safeContent.replace(/(\$\$)([^\s$\\.,!?;:\n\d([{'\-])/gu, '$1 $2');
  safeContent = safeContent.replace(/([^\s$\\])(\$\$)/gu, '$1 $2');

  // 5. Ensure space around inline math
  safeContent = safeContent.replace(/((?<!\$)\$(?!\$)(?:[^$\n\\]|\\.){1,150}?\$(?!\$))([^\s$.,!?;:\n([{'\-])/gu, '$1 $3');
  safeContent = safeContent.replace(/([^\s$\\])(\$(?!\$))/gu, '$1 $2');

  // 6. Fix merged text after digit or brace (e.g. =0tenglama -> =0 tenglama)
  safeContent = safeContent.replace(/(=\s*-?\d+(?:\.\d+)?)([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');
  safeContent = safeContent.replace(/([}\]])([\u0400-\u04FF\u02BCa-zA-Zʻʼ'])/gu, '$1 $2');

  // 7. Fix odd single $ count by escaping the last one
  const singleCount = (safeContent.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (singleCount % 2 !== 0) {
    safeContent = safeContent.replace(/(?<!\$)\$(?!\$)(?=[^$]*$)/, '\\$');
  }

  // 8. Remove empty delimiters
  safeContent = safeContent.replace(/\$\$\s*\$\$/g, '');
  safeContent = safeContent.replace(/(?<!\$)\$\s*\$(?!\$)/g, '');

  // --------------------------------------------------------------------------------------------------

  return (
    <div className={`math-rendered ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: 'html' }]]}
        components={{
          // Matn savol/variant ichida bitta qatorda (yoki mos paragraphda) qolishi uchun
          p: ({ children }) => <span className="inline-block">{children}</span>,
          // Informatika uchun inline kod bloki
          code: ({ children, ...props }) => (
            <code className="bg-zinc-100 text-pink-600 px-1.5 py-0.5 rounded text-[0.9em] font-mono border border-zinc-200" {...props}>
              {children}
            </code>
          ),
          // Informatika uchun preformatted kod bloki (agar AI shunday yuborsa)
          pre: ({ children, ...props }) => (
            <pre className="bg-zinc-100 p-2 my-2 rounded overflow-x-auto text-sm font-mono text-zinc-800 border border-zinc-200" {...props}>
              {children}
            </pre>
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
