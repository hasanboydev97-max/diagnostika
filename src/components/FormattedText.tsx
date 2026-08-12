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

  // --- Senior Level: AI tomonidan generatsiya qilingan noto'g'ri matematik ifodalarni to'g'irlash ---
  // 1. Noto'g'ri kasr vergulini to'g'irlash: ,frac{...} -> \frac{...}
  safeContent = safeContent.replace(/,frac\{/g, '\\frac{');

  // 2. Chala qolib ketgan blok ifodalarni yopish: $$ ... $ -> $$ ... $$
  safeContent = safeContent.replace(/\$\$([^$]+?)\$(?!\$)/g, '$$$$$1$$$$');

  // 3. Ochiq dollar belgisi unutilgan qismlarni yopish: masalan 42\text{ da}$ yoki 2\frac{1}{2}$
  // (\d+...) orqali raqam bilan boshlanib, $ bilan tugaydigan so'zlarni $...$ ichiga olamiz.
  safeContent = safeContent.replace(/(?<!\$)(?<!\d)(\d+(?:,\d+)?(?:\\frac\{[^}]*\}\{[^}]*\})?(?:\s*\\text\{[^}]*\})?)\$(?!\$)/g, '$$$1$$');
  
  // 4. Huddi shunday, agar $$ bilan tugasa: 12\text{ da}$$ -> $$12\text{ da}$$
  safeContent = safeContent.replace(/(?<!\$)(?<!\d)(\d+(?:,\d+)?(?:\\frac\{[^}]*\}\{[^}]*\})?(?:\s*\\text\{[^}]*\})?)\$\$/g, '$$$$$1$$$$');
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
