import { jsPDF } from 'jspdf';

export interface OMRSheetOptions {
  schoolName?: string;
  testTitle: string;
  subject?: string;
  questionCount: number;
  optionsCount?: number; // 3, 4, 5 (Default: 4)
  includeStudentIdGrid?: boolean; // 6-digit bubble matrix
  themeColor?: 'monochrome' | 'navy' | 'indigo';
  variant?: string;
}

/**
 * Generates an Ultra-Professional Cambridge/SAT/DTM-grade OMR Answer Sheet PDF.
 */
export function generateOMRPdf(options: OMRSheetOptions): jsPDF {
  const {
    schoolName = 'MAKTAB DIAGNOSTIKA VA MONITORING MARKAZI',
    testTitle = 'Choraklik Yakuniy Imtihon Testi',
    subject = 'Umumiy Fanlar',
    questionCount = 30,
    optionsCount = 4,
    includeStudentIdGrid = true,
    variant = 'A'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  // 1. Solid Black Corner Fiducial Alignment Markers (Crucial for Optical Tracking)
  const markerSize = 8;
  doc.setFillColor(15, 23, 42); // Deep solid black
  doc.rect(margin, margin, markerSize, markerSize, 'F');
  doc.rect(pageWidth - margin - markerSize, margin, markerSize, markerSize, 'F');
  doc.rect(margin, pageHeight - margin - markerSize, markerSize, markerSize, 'F');
  doc.rect(pageWidth - margin - markerSize, pageHeight - margin - markerSize, markerSize, markerSize, 'F');

  // 2. Optical Timing Tracks along Left and Right margins
  for (let y = 30; y < pageHeight - 30; y += 8) {
    doc.rect(margin + 1, y, 1.8, 3.5, 'F');
    doc.rect(pageWidth - margin - 2.8, y, 1.8, 3.5, 'F');
  }

  // 3. TOP HEADER BAR
  const headerY = margin + 2;
  
  // Left Badge / Seal
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(margin + 12, headerY, 28, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("HB DIAGNOSTIKA", margin + 26, headerY + 6, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text("OMR SHEET v2.5", margin + 26, headerY + 11, { align: 'center' });
  doc.text("OPTICAL FORM", margin + 26, headerY + 15, { align: 'center' });

  // Center Main Title & School
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), pageWidth / 2 + 5, headerY + 5, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(testTitle, pageWidth / 2 + 5, headerY + 11, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fan: ${subject}  |  Savollar soni: ${questionCount} ta  |  Sana: ___/___/20__`, pageWidth / 2 + 5, headerY + 16, { align: 'center' });

  // Right Side: Variant & Barcode Box
  const variantX = pageWidth - margin - 38;
  doc.rect(variantX, headerY, 26, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("VARIANT", variantX + 13, headerY + 5, { align: 'center' });
  doc.setFontSize(13);
  doc.text(variant, variantX + 13, headerY + 11, { align: 'center' });
  
  // Decorative Barcode Lines
  const barcodeY = headerY + 13;
  const barWidths = [0.4, 0.8, 0.3, 0.6, 0.4, 0.9, 0.3, 0.5, 0.7, 0.4, 0.8, 0.3];
  let curBarX = variantX + 3;
  barWidths.forEach(bw => {
    doc.rect(curBarX, barcodeY, bw, 3.5, 'F');
    curBarX += bw + 1.1;
  });

  // 4. STUDENT INFO & ID GRID SECTION (Y: 34 to 76)
  const infoY = headerY + 22;
  const infoHeight = includeStudentIdGrid ? 40 : 26;

  if (includeStudentIdGrid) {
    // Left Box: Student Name & Metadata (Width: 110mm)
    const leftWidth = 112;
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin + 12, infoY, leftWidth, infoHeight);

    // Section Title
    doc.setFillColor(241, 245, 249);
    doc.rect(margin + 12.2, infoY + 0.2, leftWidth - 0.4, 5.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("1. O'QUVCHI MA'LUMOTLARI (KATTA HARFLARDA YOZING)", margin + 15, infoY + 4);

    // Name Letter Boxes (18 boxes)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text("F.I.Sh:", margin + 15, infoY + 10);
    const boxStartX = margin + 25;
    const boxY = infoY + 6.5;
    const boxSize = 4.5;
    for (let b = 0; b < 18; b++) {
      doc.setDrawColor(148, 163, 184);
      doc.rect(boxStartX + (b * 4.7), boxY, boxSize, 5);
    }

    // Class, Date, Signatures
    doc.setFontSize(7.5);
    doc.text("Sinf: ______________     Guruh: _________     Xona: _______", margin + 15, infoY + 17);
    doc.text("O'quvchi Imzosi: ____________________     Sana: ___/___/20__", margin + 15, infoY + 23);

    // Mini How-To-Fill Diagram
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 15, infoY + 27, leftWidth - 6, 10.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + 15, infoY + 27, leftWidth - 6, 10.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text("KO'RSATMA:", margin + 17, infoY + 31);
    
    doc.setFont('helvetica', 'normal');
    doc.text("To'g'ri bo'yash:", margin + 35, infoY + 31);
    doc.setFillColor(15, 23, 42);
    doc.circle(margin + 55, infoY + 30.5, 1.8, 'F');
    doc.text("(To'liq qoraytiring)", margin + 59, infoY + 31);

    doc.text("Noto'g'ri:", margin + 35, infoY + 35.5);
    doc.circle(margin + 49, infoY + 35, 1.8, 'S');
    doc.text("x", margin + 48, infoY + 35.7);
    doc.circle(margin + 56, infoY + 35, 1.8, 'S');
    doc.text("v", margin + 55, infoY + 35.7);
    doc.circle(margin + 63, infoY + 35, 1.8, 'S');
    doc.text("/", margin + 62, infoY + 35.7);
    doc.text("(Belgi qo'ymang)", margin + 69, infoY + 35.5);

    // Right Box: 6-Digit Student ID Bubble Matrix (Width: 54mm)
    const rightX = margin + 12 + leftWidth + 4;
    const rightWidth = contentWidth - leftWidth - 28; // ~50mm
    doc.setDrawColor(148, 163, 184);
    doc.rect(rightX, infoY, rightWidth, infoHeight);

    // Section Title
    doc.setFillColor(241, 245, 249);
    doc.rect(rightX + 0.2, infoY + 0.2, rightWidth - 0.4, 5.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text("2. O'QUVCHI ID RAQAMI", rightX + rightWidth / 2, infoY + 4, { align: 'center' });

    // 6 Columns for ID Digits (0 - 9)
    const idDigitsCount = 6;
    const idStartY = infoY + 8;

    // Header boxes for handwriting the ID digits
    for (let c = 0; c < idDigitsCount; c++) {
      const cx = rightX + 4 + (c * 7.5);
      doc.setDrawColor(100, 116, 139);
      doc.rect(cx, idStartY, 6, 4.5);
    }

    // Digits Matrix 0 to 9
    const bubbleStartY = idStartY + 6.5;
    for (let digit = 0; digit <= 9; digit++) {
      const dy = bubbleStartY + (digit * 2.5);
      for (let c = 0; c < idDigitsCount; c++) {
        const cx = rightX + 7 + (c * 7.5);
        doc.setDrawColor(148, 163, 184);
        doc.circle(cx, dy, 1.05, 'S');
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(digit.toString(), cx - 0.45, dy + 0.5);
      }
    }
  } else {
    // Simplified student info banner
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin + 12, infoY, contentWidth - 24, infoHeight);
    doc.setFontSize(8.5);
    doc.text("O'quvchining F.I.Sh: __________________________________________________   Sinf: ________   Sana: ___/___/20__", margin + 16, infoY + 9);
    doc.text("Ko'rsatma: To'g'ri javob variantini to'liq qora yoki to'q ko'k ruchkada bo'yang. Bir nechta belgilangan javob bekor qilinadi.", margin + 16, infoY + 18);
  }

  // 5. ANSWER BUBBLE GRID SECTION (Dynamic Columns)
  const gridStartY = infoY + infoHeight + 4;
  const gridHeight = pageHeight - margin - gridStartY - 14;

  let columns = 3;
  if (questionCount > 60) columns = 4;
  else if (questionCount <= 20) columns = 2;

  const rowsPerCol = Math.ceil(questionCount / columns);
  const colGap = 4;
  const availableColWidth = (contentWidth - 24 - ((columns - 1) * colGap)) / columns;
  const labels = ['A', 'B', 'C', 'D', 'E'];

  // Calculate dynamic vertical row spacing
  const maxRowHeight = Math.min(6.2, (gridHeight - 10) / rowsPerCol);

  for (let colIdx = 0; colIdx < columns; colIdx++) {
    const colStartX = margin + 12 + (colIdx * (availableColWidth + colGap));
    const startQ = colIdx * rowsPerCol + 1;
    const endQ = Math.min(questionCount, (colIdx + 1) * rowsPerCol);

    if (startQ > questionCount) continue;

    // Column Container Box
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(colStartX, gridStartY, availableColWidth, gridHeight);

    // Column Header
    doc.setFillColor(30, 41, 59); // Dark slate banner
    doc.rect(colStartX + 0.1, gridStartY + 0.1, availableColWidth - 0.2, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`SAVOLLAR: ${startQ} - ${endQ}`, colStartX + availableColWidth / 2, gridStartY + 3.8, { align: 'center' });
    doc.setTextColor(15, 23, 42); // Reset text color

    // Draw Questions in this column
    for (let r = 0; r < rowsPerCol; r++) {
      const qNum = startQ + r;
      if (qNum > questionCount) break;

      const rowY = gridStartY + 7.5 + (r * maxRowHeight);

      // Subtle alternate shading every 5 questions for visual tracking
      if (Math.floor((qNum - 1) / 5) % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(colStartX + 0.2, rowY - 2.2, availableColWidth - 0.4, maxRowHeight, 'F');
      }

      // Question Number Badge
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      const qNumStr = qNum < 10 ? `0${qNum}` : `${qNum}`;
      doc.text(`${qNumStr}.`, colStartX + 2, rowY + 0.8);

      // Bubbles
      const bubbleSpacing = Math.min(8.5, (availableColWidth - 12) / optionsCount);
      const bubbleRadius = maxRowHeight > 5.5 ? 1.8 : 1.5;

      for (let opt = 0; opt < optionsCount; opt++) {
        const bubbleX = colStartX + 10 + (opt * bubbleSpacing);

        // Crisp Circle
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.25);
        doc.circle(bubbleX, rowY, bubbleRadius, 'S');

        // Centered Letter inside bubble
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(labels[opt], bubbleX - 0.8, rowY + 0.7);
      }
    }
  }

  // 6. FOOTER SECURITY & VERIFICATION BAR
  const footerY = pageHeight - margin - 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text("HB Diagnostika OMR Optical Recognition System • Barcha huquqlar himoyalangan • Varaqani buklamang va ifloslantirmang", pageWidth / 2, footerY, { align: 'center' });

  return doc;
}
