
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { autoFormatMath } from '../utils/mathFormatter';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  let cleanContent = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  cleanContent = autoFormatMath(cleanContent);

  const parts = cleanContent.split('$');

  return (
    <div className={`math-rendered ${className}`}>
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>;
        } else {
          try {
            const html = katex.renderToString(part, {
              throwOnError: false,
              displayMode: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index} className="text-red-500 font-bold">${part}$</span>;
          }
        }
      })}
    </div>
  );
}
