
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface FormattedTextProps {
  content: string;
  className?: string;
}

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  return (
    <div className={`math-rendered ${className}`}>
      <Latex>{content}</Latex>
    </div>
  );
}
