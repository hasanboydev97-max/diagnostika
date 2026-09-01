import katex from 'katex';
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType, ImportedXmlComponent, BorderStyle, UnderlineType } from 'docx';
import * as mml2ommlModule from 'mathml2omml';
const { mml2omml } = mml2ommlModule;

export function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  for (let i = 0; i < cleanWord.length; i++) {
    const c = cleanWord[i];
    if ("0123456789+*/=<>|[]{}^_-\\".includes(c)) return false;
  }
  return /^[a-zA-Z'oEʻgEʻ]+$/i.test(cleanWord);
}

export function cleanMathForText(text) {
  if (!text) return '';
  let str = String(text);

  // Convert LaTeX math to readable Unicode symbols for display in PDF
  // (requires a Unicode-capable font — we use DejaVu Sans on the server)
  str = str
    // Handle nested sqrt: \sqrt{...\sqrt{...}...}
    .replace(/\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '\u221a($1)')
    .replace(/\\sqrt/g, '\u221a')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\times/g, '\u00d7')
    .replace(/\\div/g, '\u00f7')
    .replace(/\\pm/g, '\u00b1')
    .replace(/\\leq/g, '\u2264')
    .replace(/\\geq/g, '\u2265')
    .replace(/\\neq/g, '\u2260')
    .replace(/\\approx/g, '\u2248')
    .replace(/\\infty/g, '\u221e')
    .replace(/\\cdot/g, '\u00b7')
    .replace(/\\circ/g, '\u00b0')
    .replace(/\\alpha/g, '\u03b1')
    .replace(/\\beta/g, '\u03b2')
    .replace(/\\gamma/g, '\u03b3')
    .replace(/\\delta/g, '\u03b4')
    .replace(/\\pi/g, '\u03c0')
    .replace(/\\theta/g, '\u03b8')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'ln')
    .replace(/\\sum/g, '\u03a3')
    .replace(/\\int/g, '\u222b')
    .replace(/\^\{([^}]+)\}/g, '\u207f')
    .replace(/\^2/g, '\u00b2')
    .replace(/\^3/g, '\u00b3')
    .replace(/\^\{2\}/g, '\u00b2')
    .replace(/\^\{3\}/g, '\u00b3')
    .replace(/\^{([^}]+)}/g, '^($1)')
    .replace(/_{([^}]+)}/g, '_($1)')
    
    .replace(/\$/g, '')
    .replace(/\\/g, '')
    .replace(/\{|\}/g, '');

  return str.trim();
}

export function latexToOmml(latex) {
  try {
    // Sanitize input: strip any XML-unsafe characters before parsing
    const safeLaTeX = latex.trim()
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
    const mathml = katex.renderToString(safeLaTeX, { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    // Strip annotation tags which can contain LaTeX with unsafe XML characters
    let mathStr = mathMatch[0]
      .replace(/<semantics>([\s\S]*?)<\/semantics>/g, (_, inner) => {
        // Only keep non-annotation children
        return inner.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
      })
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '')
      .replace(/<semantics>/g, '').replace(/<\/semantics>/g, '');
    let omml = mml2omml(mathStr);
    return omml;
  } catch (e) {
    return null;
  }
}

export function buildDocxChildren(content, options = {}) {
  if (!content) return [new TextRun('')];
  
  // Format HTML/AI tags first
  let text = String(content)
    .replace(/<\s*code\s*>/gi, '`')
    .replace(/<\s*\/\s*code\s*>/gi, '`')
    ;
    
  // Normalize $$ to $ for split
  text = text.replace(/\$\$\s*=\s*/g, '$$').replace(/\$\s*=\s*\\frac/g, '$\\frac');
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$$$1$$');

  const parts = text.split('$');
  const children = [];

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      if (part) children.push(new TextRun({ text: part, ...options }));
    } else {
      if (!part.trim()) return;
      
      let cleanMath = part.trim();
      if (cleanMath.startsWith('=\\')) {
        cleanMath = cleanMath.substring(1);
      }

      const omml = latexToOmml(cleanMath);
      if (omml) {
        try {
          const parsed = ImportedXmlComponent.fromXmlString(omml);
          if (parsed && parsed.root && parsed.root.length > 0) {
            children.push(parsed.root[0]);
          } else {
            // Fallback: render as unicode text
            children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
          }
        } catch {
          // XML parse failed — fallback to unicode text
          children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
        }
      } else {
        // latexToOmml returned null — fallback to unicode text
        children.push(new TextRun({ text: cleanMathForText(cleanMath), ...options }));
      }
    }
  });

  return children;
}

export async function buildDocxBuffer(title, subject, questions) {
  const children = [
    // Header Section
    new Paragraph({
      children: [
        new TextRun({ text: "O'quvchi: _______________________________   Sana: ___/___/20__ yil", size: 24, bold: true })
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 }
    }),
    
    // Title
    new Paragraph({
      children: [
        new TextRun({ text: (title || 'Test').toUpperCase(), size: 32, bold: true, color: "1F4E79" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    
    // Subject with bottom border
    new Paragraph({
      children: [
        new TextRun({ text: `Fan: ${subject || ''}`, italic: true, size: 28, bold: true, color: "333333" })
      ],
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { color: "1F4E79", space: 10, style: BorderStyle.SINGLE, size: 12 }
      },
      spacing: { after: 400 }
    })
  ];

  const optionLetters = ['A', 'B', 'C', 'D'];
  (questions || []).forEach((q, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. `, bold: true, size: 24 }),
          ...buildDocxChildren(q.questionText || '', { bold: true, size: 24 })
        ],
        spacing: { before: 240, after: 120 }
      })
    );

    (q.options || []).forEach((opt, oi) => {
      const letter = optionLetters[oi] || `${oi + 1}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `   ${letter}) `, bold: true, size: 24 }),
            ...buildDocxChildren(opt || '', { size: 24 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  });

  // Answer Key Section
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Kalit Javoblar', size: 28, bold: true, color: "1F4E79" })
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { color: "1F4E79", space: 10, style: BorderStyle.SINGLE, size: 12 },
        bottom: { color: "1F4E79", space: 10, style: BorderStyle.SINGLE, size: 12 }
      },
      spacing: { before: 600, after: 300 }
    })
  );

  const answerRuns = (questions || []).map((q, index) => {
    const correctIdx = (q.options || []).findIndex(o => o === q.correctOption);
    const letter = correctIdx >= 0 ? optionLetters[correctIdx] : (q.correctOption || '?');
    return new TextRun({ text: `${index + 1}-${letter}    `, bold: true, size: 24 });
  });

  children.push(
    new Paragraph({
      children: answerRuns,
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 }
    })
  );

  const doc = new Document({
    creator: "Diagnostika AI Platform",
    title: title || 'Test',
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 24 // 12pt
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1000,
            right: 1000,
            bottom: 1000,
            left: 1000,
          },
          borders: {
            pageBorders: {
              display: "allPages",
              left: { style: BorderStyle.DOUBLE, size: 12, color: "1F4E79", space: 24 },
              right: { style: BorderStyle.DOUBLE, size: 12, color: "1F4E79", space: 24 },
              top: { style: BorderStyle.DOUBLE, size: 12, color: "1F4E79", space: 24 },
              bottom: { style: BorderStyle.DOUBLE, size: 12, color: "1F4E79", space: 24 },
            }
          }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

export function sanitizePdfText(text) {
  if (!text) return '';
  let str = String(text);

  // Convert Cyrillic Uzbek/Russian characters to clean Latin equivalents if any exist in string
  const cyrillicToLatinMap = {
    'А':'A', 'а':'a', 'Б':'B', 'б':'b', 'В':'V', 'в':'v', 'Г':'G', 'г':'g', 'Д':'D', 'д':'d',
    'Е':'E', 'е':'e', 'Ё':'Yo', 'ё':'yo', 'Ж':'Zh', 'ж':'zh', 'З':'Z', 'з':'z', 'И':'I', 'и':'i',
    'Й':'Y', 'й':'y', 'К':'K', 'к':'k', 'Л':'L', 'л':'l', 'М':'M', 'м':'m', 'Н':'N', 'н':'n',
    'О':'O', 'о':'o', 'П':'P', 'п':'p', 'Р':'R', 'р':'r', 'С':'S', 'с':'s', 'Т':'T', 'т':'t',
    'У':'U', 'у':'u', 'Ф':'F', 'ф':'f', 'Х':'X', 'х':'x', 'Ц':'Ts', 'ц':'ts', 'Ч':'Ch', 'ч':'ch',
    'Ш':'Sh', 'ш':'sh', 'Щ':'Shch', 'щ':'shch', 'Ъ':'', 'ъ':'', 'Ы':'Y', 'ы':'y', 'Ь':'', 'ь':'',
    'Э':'E', 'э':'e', 'Ю':'Yu', 'ю':'yu', 'Я':'Ya', 'я':'ya', 'Ў':'O\'', 'ў':'o\'', 'Қ':'Q', 'қ':'q',
    'Ғ':'G\'', 'ғ':'g\'', 'Ҳ':'H', 'ҳ':'h'
  };

  str = str.replace(/[А-яЁёЎўҚқҒғҲҳ]/g, m => cyrillicToLatinMap[m] || m);

  // Replace non-WinAnsi typographical quotes/dashes/accents with clean ASCII equivalents
  str = str
    .replace(/[ʻ’'`ʼ]/g, "'")
    .replace(/[“”"]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/\s+/g, ' ');

  return cleanMathForText(str);
}
