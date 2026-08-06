import { mml2omml } from 'mathml2omml';
import katex from 'katex';
import JSZip from 'jszip';
import fs from 'fs';

function latexToOmml(latex) {
  try {
    const mathml = katex.renderToString(latex.trim(), { output: 'mathml', displayMode: false, throwOnError: false });
    const mathMatch = mathml.match(/<math[\s\S]*?<\/math>/);
    if (!mathMatch) return null;
    let mathStr = mathMatch[0].replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
    let omml = mml2omml(mathStr);
    // Strip namespace declarations — they conflict with parent document namespaces
    omml = omml.replace(/\s+xmlns:[a-zA-Z0-9]+=["'][^"']*["']/g, '');
    return omml;
  } catch (e) {
    console.log('latexToOmml error:', e.message);
    return null;
  }
}

const omml1 = latexToOmml('x^2 + y^2 = z^2');
console.log('OMML (no xmlns):', omml1.substring(0, 200));

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeRun(text, bold) {
  const rPr = bold ? '<w:rPr><w:b/><w:bCs/></w:rPr>' : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function buildXmlParagraphs(content, bold = false) {
  const paragraphs = [];
  if (!content) { paragraphs.push('<w:p><w:r><w:t></w:t></w:r></w:p>'); return paragraphs; }
  const parts = content.split('$');
  let currentRuns = [];
  const flush = () => { if(currentRuns.length) { paragraphs.push(`<w:p>${currentRuns.join('')}</w:p>`); currentRuns=[]; } };
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      part.split('\n').forEach((line, li, arr) => {
        if (line) currentRuns.push(makeRun(line, bold));
        if (li < arr.length - 1) flush();
      });
    } else {
      const omml = latexToOmml(part);
      if (omml) { flush(); paragraphs.push(`<w:p>${omml}</w:p>`); }
      else currentRuns.push(makeRun(`$${part}$`, bold));
    }
  });
  flush();
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
body.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Matematika Testi</w:t></w:r></w:p>`);
body.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);

body.push(...buildXmlParagraphs('1. Agar $x^2 + y^2 = 25$ va $x = 3$ bo\'lsa, $y = ?$', true));
body.push(...buildXmlParagraphs('A) 4'));
body.push(...buildXmlParagraphs('B) $\\frac{1}{2}$'));
body.push(...buildXmlParagraphs('C) $\\sqrt{16}$'));
body.push(...buildXmlParagraphs('D) 5'));
body.push(`<w:p><w:r><w:t></w:t></w:r></w:p>`);
body.push(...buildXmlParagraphs('2. Oddiy matn savol?', true));
body.push(...buildXmlParagraphs('A) Birinchi'));
body.push(...buildXmlParagraphs('B) Ikkinchi'));
body.push(...buildXmlParagraphs('C) Uchinchi'));
body.push(...buildXmlParagraphs('D) To\'rtinchi'));

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
fs.writeFileSync('test_ns_stripped.docx', buf);
console.log('Written test_ns_stripped.docx, size:', buf.length);
console.log('\ndocXml snippet:', docXml.substring(0, 500));
