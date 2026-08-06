import { mml2omml } from 'mathml2omml';
import katex from 'katex';
import { Document, Packer, Paragraph, TextRun, ImportedXmlComponent } from 'docx';
import fs from 'fs';

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    return mml2omml(mathStr);
  } catch (e) {
    console.log('latexToOmml error:', e.message);
    return null;
  }
}

function buildParagraphs(content, options = {}) {
  if (!content) return [new Paragraph({ children: [new TextRun('')] })];
  const parts = content.split('$');
  let currentParagraphChildren = [];
  const paragraphs = [];

  const flushParagraph = () => {
    if (currentParagraphChildren.length > 0) {
      paragraphs.push(new Paragraph({ children: currentParagraphChildren, spacing: { after: 120 } }));
      currentParagraphChildren = [];
    }
  };

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      const lines = part.split('\n');
      lines.forEach((line, lineIndex) => {
        if (line) currentParagraphChildren.push(new TextRun({ text: line, ...options }));
        if (lineIndex < lines.length - 1) flushParagraph();
      });
    } else {
      const omml = latexToOmml(part);
      if (omml) {
        flushParagraph();
        const mathParaXml = `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${omml}</w:p>`;
        paragraphs.push(new ImportedXmlComponent(mathParaXml));
      } else {
        currentParagraphChildren.push(new TextRun({ text: `$${part}$`, ...options }));
      }
    }
  });
  flushParagraph();
  return paragraphs;
}

const sections = [];

sections.push(new Paragraph({ text: 'Matematika Testi', heading: 'Heading1', alignment: 'center', spacing: { after: 300 } }));

// Question with inline math
const q1 = '1. Pifagor teoremasi qaysi formula: $x^2 + y^2 = z^2$';
sections.push(...buildParagraphs(q1, { bold: true }));
sections.push(...buildParagraphs('A) $\\frac{1}{2}$'));
sections.push(...buildParagraphs('B) $x^2 + y^2 = z^2$'));
sections.push(...buildParagraphs('C) $\\sqrt{x}$'));
sections.push(...buildParagraphs('D) $2+2=5$'));
sections.push(new Paragraph({ text: '', spacing: { after: 300 } }));

const q2 = '2. $\\frac{a+b}{2}$ formulasi nimani hisoblaydi?';
sections.push(...buildParagraphs(q2, { bold: true }));
sections.push(...buildParagraphs('A) Geometrik o\'rta'));
sections.push(...buildParagraphs('B) Arifmetik o\'rta'));
sections.push(...buildParagraphs('C) $a \\times b$'));
sections.push(...buildParagraphs('D) $a - b$'));
sections.push(new Paragraph({ text: '', spacing: { after: 300 } }));

const doc = new Document({ sections: [{ properties: {}, children: sections }] });
const buf = await Packer.toBuffer(doc);
fs.writeFileSync('test_math_final.docx', buf);
console.log('SUCCESS! Written test_math_final.docx');
