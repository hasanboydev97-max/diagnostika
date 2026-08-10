import { mml2omml } from 'mathml2omml';
import katex from 'katex';
import { Document, Packer, Paragraph, TextRun, Math, MathRun, ImportedXmlComponent } from 'docx';

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

async function test() {
  const omml = latexToOmml("x^2 + y^2 = z^2");
  
  const p1 = new Paragraph({
    children: [
      new TextRun("Here is inline math: "),
      new Math({
        children: [new MathRun(omml)]
      })
    ]
  });

  const p2 = new Paragraph({
    children: [
      new TextRun("Here is another try: "),
      new ImportedXmlComponent(omml)
    ]
  });

  const doc = new Document({
    sections: [{ children: [p1, p2] }]
  });

  // Packer.toBuffer doesn't output raw xml text, but Packer.toCompiler outputs something we can inspect?
  // Let's just catch what gets output.
  const xml = await Packer.toCompiler(doc);
  console.log("Document XML keys:", Object.keys(xml));
  // Not sure if toCompiler returns xml strings directly.
}

test();
