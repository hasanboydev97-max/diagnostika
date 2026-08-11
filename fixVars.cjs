const fs = require('fs');
let text = fs.readFileSync('server/controllers/onlineTestController.js', 'utf8');

text = text.replace('res.setHeader(\'Content-Disposition\', "attachment; filename="$(${encodeURIComponent(test.title || \'Test\')}.docx)");', 'res.setHeader(\'Content-Disposition\', `attachment; filename="${encodeURIComponent(test.title || \'Test\')}.docx"`);');

text = text.replace('csvContent += "$(${r.studentName || \'\'})",$(${r.score || 0}),$(${r.totalScore || 0}),$(${percent}%),$(${dateStr})\\n;', 'csvContent += `"${r.studentName || \'\'}","${r.score || 0}","${r.totalScore || 0}","${percent}%","${dateStr}"\\n`;');

text = text.replace('res.setHeader(\'Content-Disposition\', "attachment; filename="$(${encodeURIComponent(test.title || \'Test\')}_Natijalar.csv)");', 'res.setHeader(\'Content-Disposition\', `attachment; filename="${encodeURIComponent(test.title || \'Test\')}_Natijalar.csv"`);');

text = text.replace('doc.font(regularFont).fontSize(12).text(Fan: $(${sanitizePdfText(test.subject || \'\')}), { align: \'center\' });', 'doc.font(regularFont).fontSize(12).text(`Fan: ${sanitizePdfText(test.subject || \'\')}`, { align: \'center\' });');

text = text.replace('const qText = $(i + 1). $(${sanitizePdfText(q.questionText || \'\')});', 'const qText = `${i + 1}. ${sanitizePdfText(q.questionText || \'\')}`;');

text = text.replace('const letterLabel = optionLetters[oi] || $(oi + 1);', 'const letterLabel = optionLetters[oi] || `${oi + 1}`;');

text = text.replace('const optText =    $(${letterLabel}) $(${sanitizePdfText(opt || \'\')});', 'const optText = `   ${letterLabel}) ${sanitizePdfText(opt || \'\')}`;');

text = text.replace('return $(i + 1). $(${letter});', 'return `${i + 1}. ${letter}`;');

text = text.replace('res.setHeader(\'Content-Disposition\', "attachment; filename="$(${encodeURIComponent(test.title)}.pdf)");', 'res.setHeader(\'Content-Disposition\', `attachment; filename="${encodeURIComponent(test.title)}.pdf"`);');

fs.writeFileSync('server/controllers/onlineTestController.js', text);
console.log('Fixed controller');
