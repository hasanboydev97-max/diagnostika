import 'katex/dist/katex.min.css';
import katex from 'katex';
import { autoFormatMath } from '../utils/mathFormatter';

interface FormattedTextProps {
  content: string;
  className?: string;
}

// Escapes HTML entities inside code blocks
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Unescapes basic HTML entities that might have been provided by AI
const unescapeBasic = (text: string) => {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  // 1. Normalize hallucinated spacing in tags from AI
  let text = content
    .replace(/<\s*code\s*>/gi, '<code>')
    .replace(/<\s*\/\s*code\s*>/gi, '</code>')
    .replace(/<\s*pre\s*>/gi, '<pre>')
    .replace(/<\s*\/\s*pre\s*>/gi, '</pre>');

  text = unescapeBasic(text); // decode &gt; so we can format it properly if needed

  // 2. Extract code blocks to prevent math formatting from ruining them
  const codeBlocks: string[] = [];
  let placeholderIndex = 0;

  // Extract ```...```
  text = text.replace(/```([\s\S]*?)```/g, (_, p1) => {
    codeBlocks.push(escapeHtml(p1.trim()));
    return `___PRE_BLOCK_${placeholderIndex++}___`;
  });

  // Extract `...`
  text = text.replace(/`([^`]+)`/g, (_, p1) => {
    codeBlocks.push(escapeHtml(p1));
    return `___CODE_BLOCK_${placeholderIndex++}___`;
  });

  // Extract <pre>...</pre>
  text = text.replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, p1) => {
    codeBlocks.push(escapeHtml(p1.trim()));
    return `___PRE_BLOCK_${placeholderIndex++}___`;
  });

  // Extract <code>...</code>
  text = text.replace(/<code>([\s\S]*?)<\/code>/gi, (_, p1) => {
    codeBlocks.push(escapeHtml(p1));
    return `___CODE_BLOCK_${placeholderIndex++}___`;
  });

  // 3. Apply math formatting only to the non-code parts
  let formattedText = autoFormatMath(text);

  // 4. Split by $ to render math and text
  const parts = formattedText.split('$');
  const renderedElements = parts.map((part, index) => {
    // If it's an even index, it's normal text (but might contain code block placeholders)
    if (index % 2 === 0) {
      // Split the text part by placeholders
      const placeholderRegex = /___(CODE|PRE)_BLOCK_(\d+)___/g;
      const subParts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = placeholderRegex.exec(part)) !== null) {
        // Add text before the placeholder
        if (match.index > lastIndex) {
          subParts.push(<span key={`${index}-${lastIndex}`}>{part.substring(lastIndex, match.index)}</span>);
        }
        
        // Add the code block
        const type = match[1];
        const blockIndex = parseInt(match[2], 10);
        const codeContent = codeBlocks[blockIndex];
        
        if (type === 'PRE') {
          subParts.push(
            <pre key={`pre-${blockIndex}`} className="bg-zinc-100 p-2 my-2 rounded overflow-x-auto text-sm font-mono text-zinc-800 border border-zinc-200">
              <code dangerouslySetInnerHTML={{ __html: codeContent }} />
            </pre>
          );
        } else {
          subParts.push(
            <code key={`code-${blockIndex}`} className="bg-zinc-100 px-1.5 py-0.5 rounded text-[0.9em] font-mono text-pink-600 border border-zinc-200" dangerouslySetInnerHTML={{ __html: codeContent }} />
          );
        }
        
        lastIndex = placeholderRegex.lastIndex;
      }
      
      // Add remaining text
      if (lastIndex < part.length) {
        subParts.push(<span key={`${index}-end`}>{part.substring(lastIndex)}</span>);
      }
      
      return <span key={index}>{subParts}</span>;
    } else {
      // It's a math block
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
  });

  return (
    <div className={`math-rendered ${className}`}>
      {renderedElements}
    </div>
  );
}
