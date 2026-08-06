import { mml2omml } from 'mathml2omml';
import katex from 'katex';

function escapeXml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    let omml = mml2omml(mathStr);
    omml = omml.replace(/\s+xmlns:[a-zA-Z0-9]+=["'][^"']*["']/g, '');
    return omml;
  } catch (e) {
    return null;
  }
}

function buildXmlParagraphs(content, bold = false, heading = null, align = null) {
  const paragraphs = [];

  const makePara = (innerXml, extraPPr = '') => {
    let pPr = '';
    if (heading || align || extraPPr) {
      pPr = '<w:pPr>';
      if (heading === 1) pPr += '<w:pStyle w:val="Heading1"/>';
      else if (heading === 2) pPr += '<w:pStyle w:val="Heading2"/>';
      if (align) pPr += `<w:jc w:val="${align}"/>`;
      pPr += extraPPr + '</w:pPr>';
    }
    return `<w:p>${pPr}${innerXml}</w:p>`;
  };

  const makeRun = (text, isBold) => {
    const rPr = isBold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  };

  if (!content) {
    paragraphs.push(makePara(''));
    return paragraphs;
  }

  const formattedContent = autoFormatMath(content);
  console.log('Original content:', content);
  console.log('Formatted content:', formattedContent);
  const parts = formattedContent.split('$');
  let currentRuns = [];

  const flushParagraph = () => {
    paragraphs.push(makePara(currentRuns.join('')));
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
        currentRuns.push(omml);
      } else {
        currentRuns.push(makeRun(`$${part}$`, bold));
      }
    }
  });

  if (currentRuns.length > 0) flushParagraph();
  return paragraphs;
}

const NS = [
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
  'mc:Ignorable="w14"'
].join(' ');

const body = [];
body.push(...buildXmlParagraphs('1. Pifagor teoremasi: x^2 + y^2 = z^2', true));
body.push(...buildXmlParagraphs('A) 4'));
body.push(...buildXmlParagraphs('B) \\frac{1}{2}'));

const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>`;
const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body.join('')}${sectPr}</w:body></w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`;

import JSZip from 'jszip';
import fs from 'fs';

async function build() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file('word/document.xml', docXml);
  zip.file('word/styles.xml', stylesXml);

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('test_format_final.docx', buf);
  console.log('Written test_format_final.docx, size:', buf.length);
}

build();
