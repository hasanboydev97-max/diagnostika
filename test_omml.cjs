const { Document, Packer, Paragraph, TextRun, ImportedXmlComponent } = require('docx');
const fs = require('fs');
const katex = require('katex');

async function test() {
  const m = await import('mathml2omml');
  const mml2omml = m.mml2omml;
  const mathml = katex.renderToString('\\sqrt{x+5}=3', { output: 'mathml', displayMode: false });
  const mathMatch = mathml.match(/<math.*<\/math>/);
  const mathOnly = mathMatch ? mathMatch[0] : '';
  const omml = mml2omml(mathOnly);
  
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new TextRun("Here is an equation: "),
            new ImportedXmlComponent(omml)
          ]
        })
      ]
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('test_equation.docx', buffer);
  console.log('Saved test_equation.docx');
}
test().catch(console.error);
