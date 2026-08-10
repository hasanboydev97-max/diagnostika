import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType, ImportedXmlComponent } from 'docx';
import katex from 'katex';
import { mml2omml } from 'mathml2omml';
import fs from 'fs';

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    let omml = mml2omml(mathStr);
    return omml;
  } catch (e) {
    return null;
  }
}

function buildDocxChildren(content, options = {}) {
  if (!content) return [new TextRun('')];
  
  let text = String(content)
    .replace(/<\s*code\s*>/gi, '`')
    .replace(/<\s*\/\s*code\s*>/gi, '`')
    .replace(/<[^>]*>/g, '');
    
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
        children.push(new ImportedXmlComponent(omml));
      } else {
        children.push(new TextRun({ text: `$${part}$`, ...options }));
      }
    }
  });
  return children;
}

async function run() {
  const qText = "Hisoblang: $$\\sqrt{81}$$ va yana $\\frac{1}{2}$ qismi.";
  
  const children = [];
  children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `1. `, bold: true, size: 24 }),
          ...buildDocxChildren(qText, { bold: true, size: 24 })
        ],
        spacing: { before: 240, after: 120 }
      })
  );

  const doc = new Document({
    sections: [{
      children
    }]
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('test_final_omml.docx', buf);
  console.log('SUCCESS! File saved.');
}

run();
