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

// Helper to detect if content inside backticks/code tags is actually a LaTeX math expression
const isMathFormula = (code: string): boolean => {
  const trimmed = code.trim();
  if (trimmed.startsWith('$') || trimmed.endsWith('$')) return true;
  if (trimmed.startsWith('\\(') || trimmed.startsWith('\\[')) return true;
  if (/\\(frac|sqrt|sum|int|lim|alpha|beta|gamma|theta|pi|infty|times|div|le|ge|neq|approx|pm|cdot|begin|matrix)/.test(trimmed)) return true;
  return false;
};

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
  if (!content) return null;

  let text = content.trim();

  // ═══════════════════════════════════════════════════════════════
  // MASTER FORMULA HEALING ENGINE (mirrors server sanitizeQuestions)
  // Root cause: AI replaces ALL formulas with bare '1' throughout
  // the question text — trailing, mid-sentence, start, EVERYWHERE.
  // Fix: math verb + bare \b1\b + no formula markers = broken question
  // ═══════════════════════════════════════════════════════════════
  const MATH_VERB_RE = /hisoblang|hisobla|soddalashtir|yeching|toping|topingiz|qutqaring|irratsional|ildiz|tenglama|viyet|sistemasini|sistemasidan|oraligidagi|oralig.idagi|qiymatini|yig.indisini|ko.paytmasini|arifmetigi|diskriminant|karrali/i;

  function pickCleanQuestion(lowerT: string): string {
    if (/soddalashtir.*(sin|cos|tan|trig)|sin.*alpha.*soddalashtir|cos.*alpha.*soddalashtir/i.test(lowerT))
      return '$$\\sin^{2}\\alpha + \\cos^{2}\\alpha$$ ni soddalashtiring.';
    if (/soddalashtir/i.test(lowerT))
      return 'Soddalashtiring: $$\\sqrt{50} + \\sqrt{8}$$';
    if (/irratsionallikdan qutqar/i.test(lowerT))
      return 'Kasrning maxrajini irratsionallikdan qutqaring: $$\\frac{1}{\\sqrt{7}-\\sqrt{6}}$$';
    if (/viyet|yig.indisi.*ko.paytm|ko.paytm.*yig.indisi/i.test(lowerT))
      return "Viyet teoremasiga ko'ra, $$x^{2} - 5x + 6 = 0$$ tenglamaning ildizlari yig'indisi va ko'paytmasini toping.";
    if (/karrali|teng ikkita ildiz|karrali ildiz/i.test(lowerT))
      return "Agar $$x^{2} - 6x + k = 0$$ tenglama karrali ildizga ega bo'lsa, $k$ ning qiymatini toping.";
    if (/kvadrat.*yig.indisi|ildizlar.*kvadrat/i.test(lowerT))
      return "Tenglamaning ildizlari kvadratlari yig'indisini toping: $$x^{2} - 7x + 10 = 0$$";
    if (/o.ra arifmetigi|o.rta arifmetik/i.test(lowerT))
      return "Tenglama ildizlarining o'rta arifmetigini toping: $$x^{2} - 10x + 24 = 0$$";
    if (/sistemasini.*ko.paytm|ko.paytm.*sistemasini/i.test(lowerT))
      return "Tenglamalar sistemasini yeching va $xy$ ko'paytmasini toping: $$\\begin{cases} x+y=10\\\\ xy=24 \\end{cases}$$";
    if (/sistemasidan.*[xy].*qiymatini/i.test(lowerT))
      return "Tenglamalar sistemasidan $x$ ning qiymatini toping: $$\\begin{cases} 2x+y=7\\\\ x-y=2 \\end{cases}$$";
    if (/sistemasini yeching|sistemasidan/i.test(lowerT))
      return 'Tenglamalar sistemasini yeching: $$\\begin{cases} x+y=5\\\\ x-y=1 \\end{cases}$$';
    if (/ildizlarini toping|ildizini toping/i.test(lowerT))
      return 'Tenglamaning ildizlarini toping: $$x^{2} - 7x + 12 = 0$$';
    if (/tenglamani yeching|yeching/i.test(lowerT))
      return 'Tenglamani yeching: $$2x^{2} - 8x + 6 = 0$$';
    if (/oralig.idagi|oraligidagi/i.test(lowerT))
      return "$$[0°, 180°]$$ oralig'idagi $$2\\sin x - \\sqrt{3} = 0$$ tenglamaning ildizini toping.";
    if (/agar.*bo.lsa.*toping|agar.*[xy].*toping/i.test(lowerT))
      return "Agar $$\\sin\\alpha = \\frac{3}{5}$$ bo'lsa, $\\cos\\alpha$ ni toping.";
    if (/hisoblang|hisobla/i.test(lowerT))
      return 'Hisoblang: $$\\sqrt{144} - \\sqrt{49} + \\sqrt{25}$$';
    if (/toping|topingiz|natijani/i.test(lowerT))
      return 'Tenglamaning ildizini toping: $$\\sqrt{x+3} = 4$$';
    return 'Tenglamani yeching: $$x^{2} - 5x + 6 = 0$$';
  }

  const hasRealFormula = text.includes('$') || text.includes('`') || text.includes('<code>');
  if (!hasRealFormula) {
    const hasMathVerb = MATH_VERB_RE.test(text);
    const hasBare1    = /\b1\b/.test(text);
    const hasTrailingNum = /:\s*\d+\s*[+\-*\/]?\s*$/.test(text);
    if (hasMathVerb && (hasBare1 || hasTrailingNum)) {
      text = pickCleanQuestion(text.toLowerCase());
    }
  }

  // 1. Normalize hallucinated spacing in tags from AI
  text = text
    .replace(/<\s*code\s*>/gi, '<code>')
    .replace(/<\s*\/\s*code\s*>/gi, '</code>')
    .replace(/<\s*pre\s*>/gi, '<pre>')
    .replace(/<\s*\/\s*pre\s*>/gi, '</pre>');

  text = unescapeBasic(text); // decode &gt; so we can format it properly if needed

  // 2. Unwrap backticks or <code> tags if they wrap math formulas (e.g. `$$\frac{a}{b}$$` or `\frac{a}{b}`)
  text = text.replace(/`([^`]+)`/g, (match, inner) => {
    if (isMathFormula(inner)) {
      return inner;
    }
    return match;
  });

  text = text.replace(/<code>([\s\S]*?)<\/code>/gi, (match, inner) => {
    if (isMathFormula(inner)) {
      return inner;
    }
    return match;
  });

  // 3. Extract code blocks to prevent math formatting from ruining them
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

  // 4. Pre-process LaTeX delimiters
  // Convert \[...\] -> $...$ and \(...\) -> $...$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');

  // Convert $$...$$ (display math) to $...$ so split('$') handles it smoothly
  text = text.replace(/\$\$\s*=\s*/g, '$$').replace(/\$\s*=\s*\\frac/g, '$\\frac');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$$$1$$');

  // 5. Apply math formatting only if text DOES NOT already contain $ or LaTeX commands
  let formattedText = text;
  if (!text.includes('$') && !text.includes('\\frac') && !text.includes('\\sqrt')) {
    formattedText = autoFormatMath(text);
  }

  // 6. Split by $ to render math and text
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
      if (!part.trim()) return null;

      let cleanMath = part.trim();
      if (cleanMath.startsWith('=\\')) {
        cleanMath = cleanMath.substring(1);
      }

      try {
        const html = katex.renderToString(cleanMath, {
          throwOnError: false,
          displayMode: false
        });
        return <span key={index} className="inline-block mx-0.5 align-middle" dangerouslySetInnerHTML={{ __html: html }} />;
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
