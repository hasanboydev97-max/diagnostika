// Full simulation of buildDocxBuffer as it runs on the server
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType, ImportedXmlComponent } from 'docx';
import katex from 'katex';
import * as mml2ommlModule from 'mathml2omml';
const { mml2omml } = mml2ommlModule;

function cleanMathForText(text) {
  if (!text) return '';
  let str = String(text);
  str = str
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\$/g, '')
    .replace(/\\/g, '');
  return str.trim();
}

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    let omml = mml2omml(mathStr);
    return omml;
  } catch (e) {
    console.error('latexToOmml error:', e.message);
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
      if (cleanMath.startsWith('=\\')) cleanMath = cleanMath.substring(1);

      const omml = latexToOmml(cleanMath);
      if (omml) {
        const parsed = ImportedXmlComponent.fromXmlString(omml);
        if (parsed && parsed.root && parsed.root.length > 0) {
          children.push(parsed.root[0]);
        }
      } else {
        children.push(new TextRun({ text: `$${part}$`, ...options }));
      }
    }
  });
  return children;
}

async function buildDocxBuffer(title, subject, questions) {
  const children = [
    new Paragraph({
      text: title || 'Test',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Fan: ${subject || ''}`, italic: true, size: 24 })],
      alignment: AlignmentType.CENTER,
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
            new TextRun({ text: `    ${letter}) `, bold: true, size: 22 }),
            ...buildDocxChildren(opt || '', { size: 22 })
          ],
          spacing: { after: 80 }
        })
      );
    });
  });

  children.push(
    new Paragraph({
      text: 'Kalit Javoblar:',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    })
  );

  const answerRuns = (questions || []).map((q, index) => {
    const correctIdx = (q.options || []).findIndex(o => o === q.correctOption);
    const letter = correctIdx >= 0 ? optionLetters[correctIdx] : (q.correctOption || '?');
    return new TextRun({ text: `${index + 1}.${letter}   `, bold: true, size: 22 });
  });

  children.push(new Paragraph({ children: answerRuns, spacing: { after: 200 } }));

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return await Packer.toBuffer(doc);
}

// Simulate real server data
const questions = [
  {
    questionText: "Hisoblang: $$\\sqrt{81} - \\sqrt{25}$$",
    options: ["$4$", "$2$", "$6$", "$8$"],
    correctOption: "$4$"
  },
  {
    questionText: "Tenglamani yeching: $$x^2 - 5x + 6 = 0$$",
    options: ["$x_1=2, x_2=3$", "$x_1=1, x_2=5$", "$x_1=-2, x_2=-3$", "$x_1=2, x_2=-3$"],
    correctOption: "$x_1=2, x_2=3$"
  },
  {
    questionText: "Tarix: O'zbekiston mustaqilligini qaysi yilda qo'lga kiritdi?",
    options: ["1991", "1992", "1990", "1993"],
    correctOption: "1991"
  }
];

try {
  const buf = await buildDocxBuffer('Namuna Test', 'Matematika', questions);
  import('fs').then(fs => {
    fs.writeFileSync('test_server_sim.docx', buf);
    console.log('SUCCESS! Written test_server_sim.docx, size:', buf.length);
  });
} catch (e) {
  console.error('DOCX ERROR:', e.message);
  console.error(e.stack);
}
