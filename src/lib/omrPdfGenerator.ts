import { jsPDF } from 'jspdf';

export interface OMRSheetOptions {
  schoolName?: string;
  testTitle: string;
  subject?: string;
  questionCount: number;
  optionsCount?: number; // 3, 4, 5 (Default: 4)
  variant?: string;
}

/**
 * Generates a Clean, Minimalist, Ultra-Professional A4 OMR Answer Sheet PDF.
 * Designed with modern aesthetic principles: ample whitespace, elegant typography,
 * high-precision computer-vision optical markers, and simple intuitive layout.
 */
export function generateOMRPdf(options: OMRSheetOptions): jsPDF {
  const {
    schoolName = 'MAKTAB DIAGNOSTIKA VA MONITORING MARKAZI',
    testTitle = 'Choraklik Imtihon Testi',
    subject = 'Umumiy Fan',
    questionCount = 30,
    optionsCount = 4,
    variant = 'A'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // 1. Sleek High-Precision Corner Alignment Markers (6mm solid squares)
  const markerSize = 6;
  doc.setFillColor(17, 24, 39); // Neutral 900
  doc.rect(margin, margin, markerSize, markerSize, 'F');
  doc.rect(pageWidth - margin - markerSize, margin, markerSize, markerSize, 'F');
  doc.rect(margin, pageHeight - margin - markerSize, markerSize, markerSize, 'F');
  doc.rect(pageWidth - margin - markerSize, pageHeight - margin - markerSize, markerSize, markerSize, 'F');

  // Subtle outer framing guide line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.rect(margin + 1, margin + 1, contentWidth - 2, pageHeight - (margin * 2) - 2);

  // 2. HEADER SECTION (Clean, Minimalist, Elegant)
  const headerY = margin + 6;

  // School name (small uppercase tracking)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, headerY + 2, { align: 'center' });

  // Main Test Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(testTitle, pageWidth / 2, headerY + 9, { align: 'center' });

  // Test Subtitle metadata (Subject, Question Count, Date)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Fan: ${subject}   •   Savollar soni: ${questionCount} ta   •   Sana: ___ . ___ . 20___`, pageWidth / 2, headerY + 15, { align: 'center' });

  // Variant Badge (Top Right)
  const varBoxWidth = 24;
  const varBoxHeight = 15;
  const varBoxX = pageWidth - margin - varBoxWidth - 3;
  const varBoxY = headerY;
  
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(varBoxX, varBoxY, varBoxWidth, varBoxHeight, 2, 2, 'FD');
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("VARIANT", varBoxX + varBoxWidth / 2, varBoxY + 4.5, { align: 'center' });
  
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(variant, varBoxX + varBoxWidth / 2, varBoxY + 11.5, { align: 'center' });

  // 3. STUDENT INFORMATION CARD (Spacious & Clean)
  const infoY = headerY + 20;
  const infoHeight = 25;
  
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 3, infoY, contentWidth - 6, infoHeight, 2, 2, 'FD');

  // Student details fields
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text("O'quvchining F.I.Sh:", margin + 8, infoY + 7);
  
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(margin + 44, infoY + 7.5, margin + contentWidth - 12, infoY + 7.5);

  doc.text("Sinf:", margin + 8, infoY + 15);
  doc.line(margin + 17, infoY + 15.5, margin + 42, infoY + 15.5);

  doc.text("Guruh / Xona:", margin + 48, infoY + 15);
  doc.line(margin + 72, infoY + 15.5, margin + 100, infoY + 15.5);

  doc.text("Imzo:", margin + 106, infoY + 15);
  doc.line(margin + 116, infoY + 15.5, margin + contentWidth - 12, infoY + 15.5);

  // Clean Instruction Line
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text("Ko'rsatma: Faqat bitta to'g'ri javobni qora ruchkada to'liq bo'yang:   (  ", margin + 8, infoY + 21.5);
  
  // Filled circle sample
  doc.setFillColor(15, 23, 42);
  doc.circle(margin + 93.5, infoY + 20.8, 1.4, 'F');
  doc.text(") To'g'ri        (  x  ) Noto'g'ri        (  /  ) Noto'g'ri", margin + 96, infoY + 21.5);

  // 4. QUESTION BUBBLE MATRIX (Spacious, Breathable, Pure Typography)
  const gridStartY = infoY + infoHeight + 6;
  const gridAvailableHeight = pageHeight - margin - gridStartY - 10;

  // Determine optimal column count based on question count
  let columns = 3;
  if (questionCount <= 15) columns = 1;
  else if (questionCount <= 25) columns = 2;
  else if (questionCount > 60) columns = 4;

  const rowsPerCol = Math.ceil(questionCount / columns);
  const colGap = 8;
  const colWidth = (contentWidth - 6 - ((columns - 1) * colGap)) / columns;
  const rowHeight = Math.min(8.8, (gridAvailableHeight - 12) / rowsPerCol);
  const labels = ['A', 'B', 'C', 'D', 'E'];

  for (let colIdx = 0; colIdx < columns; colIdx++) {
    const colStartX = margin + 3 + (colIdx * (colWidth + colGap));
    const startQ = colIdx * rowsPerCol + 1;
    const endQ = Math.min(questionCount, (colIdx + 1) * rowsPerCol);

    if (startQ > questionCount) continue;

    // Minimalist Column Card Container
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(colStartX, gridStartY, colWidth, gridAvailableHeight, 2, 2, 'FD');

    // Column Header Text (No heavy solid black boxes!)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`SAVOLLAR  ${startQ} – ${endQ}`, colStartX + colWidth / 2, gridStartY + 6, { align: 'center' });

    // Subtle header divider
    doc.setDrawColor(226, 232, 240);
    doc.line(colStartX + 4, gridStartY + 8, colStartX + colWidth - 4, gridStartY + 8);

    // Render questions in this column
    const questionsStartY = gridStartY + 12;

    for (let r = 0; r < rowsPerCol; r++) {
      const qNum = startQ + r;
      if (qNum > questionCount) break;

      const rowY = questionsStartY + (r * rowHeight);

      // Question Number Index
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const qNumStr = qNum < 10 ? `0${qNum}` : `${qNum}`;
      doc.text(`${qNumStr}.`, colStartX + 4, rowY + 1);

      // Bubbles
      const bubbleAreaWidth = colWidth - 14;
      const bubbleSpacing = bubbleAreaWidth / optionsCount;
      const bubbleRadius = 2.4;

      for (let opt = 0; opt < optionsCount; opt++) {
        const bubbleX = colStartX + 14 + (opt * bubbleSpacing) + (bubbleSpacing / 2);

        // Thin elegant circular border
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.25);
        doc.circle(bubbleX, rowY, bubbleRadius, 'S');

        // Crisp centered option letter
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(labels[opt], bubbleX - 1.1, rowY + 0.9);
      }

      // Soft divider line every 5 questions for visual rhythm
      if (qNum % 5 === 0 && qNum !== endQ) {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(colStartX + 4, rowY + (rowHeight / 2), colStartX + colWidth - 4, rowY + (rowHeight / 2));
      }
    }
  }

  // 5. FOOTER (Minimalist Clean Line)
  const footerY = pageHeight - margin - 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text("HB DIAGNOSTIKA • OPTIK JAVOBLAR VARAQASI • STANDART A4", pageWidth / 2, footerY, { align: 'center' });

  return doc;
}
