
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  // AI often escapes backslashes in JSON, resulting in double backslashes (\\sqrt) instead of (\sqrt).
  // KaTeX treats \\ as a newline, breaking the math format. We fix this by replacing \\ followed by a letter with a single \.
  const cleanContent = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  return (
    <div className={`math-rendered ${className}`}>
      <Latex>{cleanContent}</Latex>
    </div>
  );
}
