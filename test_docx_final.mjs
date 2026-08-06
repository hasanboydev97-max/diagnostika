import { mml2omml } from 'mathml2omml';
import katex from 'katex';
import JSZip from 'jszip';
import fs from 'fs';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isTextWord(word) {
  const cleanWord = word.replace(/^[.,!?:;()]+|[.,!?:;()]+$/g, '');
  if (cleanWord.length < 2) return false;
  for (let i = 0; i < cleanWord.length; i++) {
    const c = cleanWord[i];
    if ("0123456789+*/=<>|[]{}^_-\\".includes(c)) return false;
  }
  return /^[a-zA-Z'oEʻgEʻ]+$/i.test(cleanWord);
}

function autoFormatMath(text) {
  if (!text) return text;
  let normalized = text.replace(/\$/g, '');
  const tokens = normalized.split(/(\s+)/);
  let result = "";
  let inMath = false;
  let mathBuffer = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.trim() === '') {
      if (inMath) mathBuffer += token;
      else result += token;
      continue;
    }
    if (isTextWord(token)) {
      if (inMath) {
        let trimmed = mathBuffer.trimRight();
        let spaces = mathBuffer.substring(trimmed.length);
        result += `$${trimmed}$${spaces}`;
        inMath = false;
        mathBuffer = "";
      }
      result += token;
    } else {
      if (!inMath) inMath = true;
      mathBuffer += token;
    }
  }
  if (inMath) {
    let trimmed = mathBuffer.trimRight();
    let spaces = mathBuffer.substring(trimmed.length);
    if (trimmed.length > 0) result += `$${trimmed}$${spaces}`;
  }
  return result;
}

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    return mml2omml(mathStr);
  } catch (e) {
    return null;
  }
}

function buildXmlParagraphs(content, bold = false) {
  const paragraphs = [];
  const makeRun = (text, isBold) => {
    const rPr = isBold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  };

  if (!content) {
    paragraphs.push('<w:p><w:r><w:t></w:t></w:r></w:p>');
    return paragraphs;
  }

  const formattedContent = autoFormatMath(content);
  const parts = formattedContent.split('$');
  let currentRuns = [];

  const flushParagraph = () => {
    paragraphs.push(`<w:p>${currentRuns.join('')}</w:p>`);
    currentRuns = [];
  };

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      const lines = part.split('\n');
      lines.forEach((line, lineIndex) => {
        if (line) currentRuns.push(makeRun(line, bold));
        if (lineIndex < lines.length - 1) flushParagraph();
      });
    } else {
      const omml = latexToOmml(part);
      if (omml) {
        if (currentRuns.length > 0) flushParagraph();
        paragraphs.push(`<w:p>${omml}</w:p>`);
      } else {
        currentRuns.push(makeRun(`$${part}$`, bold));
      }
    }
  });

  if (currentRuns.length > 0) flushParagraph();
  return paragraphs;
}

function buildDocxXml(title, subject, questions) {
  const NS = [
    'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
    'xmlns:o="urn:schemas-microsoft-com:office:office"',
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
    'xmlns:v="urn:schemas-microsoft-com:vml"',
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
    'xmlns:w10="urn:schemas-microsoft-com:office:word"',
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"',
    'mc:Ignorable="w14 w15"'
  ].join(' ');

  const bodyParts = [];
  bodyParts.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`);
  bodyParts.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml('Fan: ' + subject)}</w:t></w:r></w:p>`);
  bodyParts.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);

  questions.forEach((q, index) => {
    const qText = `${index + 1}. ${q.questionText}`;
    bodyParts.push(...buildXmlParagraphs(qText, true));
    bodyParts.push(...buildXmlParagraphs(`A) ${q.options[0]}`, false));
    bodyParts.push(...buildXmlParagraphs(`B) ${q.options[1]}`, false));
    bodyParts.push(...buildXmlParagraphs(`C) ${q.options[2]}`, false));
    bodyParts.push(...buildXmlParagraphs(`D) ${q.options[3]}`, false));
    bodyParts.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);
  });

  bodyParts.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Kalit javoblar</w:t></w:r></w:p>`);
  questions.forEach((q, index) => {
    bodyParts.push(...buildXmlParagraphs(`${index + 1}. ${q.correctOption}`, true));
  });

  const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${bodyParts.join('')}${sectPr}</w:body></w:document>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
          xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
          mc:Ignorable="w14">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;
}

async function buildDocxBuffer(title, subject, questions) {
  const zip = new JSZip();

  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('word/document.xml', buildDocxXml(title, subject, questions));
  zip.file('word/styles.xml', buildStylesXml());

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Test
const testQuestions = [
  {
    questionText: 'Pifagor teoremasi: $x^2 + y^2 = z^2$ — bu qaysi geometrik shakl uchun?',
    options: ['Aylana', 'To\'g\'ri burchakli uchburchak', 'Kvadrat', 'Parallelogramm'],
    correctOption: 'B'
  },
  {
    questionText: 'Agar $\\frac{a+b}{2} = 5$ bo\'lsa, $a+b = ?$',
    options: ['5', '10', '$\\sqrt{5}$', '25'],
    correctOption: 'B'
  },
  {
    questionText: '$\\sqrt{144} = ?$',
    options: ['11', '12', '13', '14'],
    correctOption: 'B'
  }
];

const buf = await buildDocxBuffer('3-Chorak imtihon', 'Matematika', testQuestions);
fs.writeFileSync('test_final_valid.docx', buf);
console.log('SUCCESS! Written test_final_valid.docx, size:', buf.length);
