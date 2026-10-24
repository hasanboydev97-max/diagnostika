import QRCode from 'qrcode';

interface CertificateData {
  resultId: string;
  studentName: string;
  testTitle: string;
  score: number;
  totalScore: number;
  grade?: string;
  date?: string;
  schoolName?: string;
}

/**
 * Professional A4 Landscape Certificate Generator
 * Uses window.open with a high-resolution printable layout or direct PDF generation.
 * This provides 100% vector sharpness, custom typography, gold foil effects,
 * and a verifiable scannable QR code.
 */
export async function generateCertificatePrintWindow(data: CertificateData): Promise<void> {
  const percentage = data.totalScore > 0 ? Math.round((data.score / data.totalScore) * 100) : data.score;
  const verifyUrl = `https://bmdiagnostika.vercel.app/summary/${data.resultId}`;

  // Generate QR Code as Data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Iltimos, brauzeringizda qalqib chiquvchi oynalarga (pop-up) ruxsat bering.');
    return;
  }

  const formattedDate = data.date
    ? new Date(data.date).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });

  const certificateHtml = `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Sertifikat - ${data.studentName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cert-container {
      width: 297mm;
      height: 210mm;
      padding: 12mm;
      background: #ffffff;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    /* Outer Elegant Border */
    .outer-border {
      position: absolute;
      inset: 8mm;
      border: 3px double #b45309;
      pointer-events: none;
    }
    .inner-border {
      position: absolute;
      inset: 10mm;
      border: 1px solid #d97706;
      pointer-events: none;
    }
    /* Corner Ornaments */
    .corner {
      position: absolute;
      width: 28px;
      height: 28px;
      border-color: #b45309;
    }
    .corner-tl { top: 7mm; left: 7mm; border-top: 4px solid #b45309; border-left: 4px solid #b45309; }
    .corner-tr { top: 7mm; right: 7mm; border-top: 4px solid #b45309; border-right: 4px solid #b45309; }
    .corner-bl { bottom: 7mm; left: 7mm; border-bottom: 4px solid #b45309; border-left: 4px solid #b45309; }
    .corner-br { bottom: 7mm; right: 7mm; border-bottom: 4px solid #b45309; border-right: 4px solid #b45309; }

    /* Content Layout */
    .content {
      position: relative;
      z-index: 2;
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6mm 14mm;
    }

    .header-logo {
      font-size: 14px;
      font-family: Arial, sans-serif;
      font-weight: 800;
      letter-spacing: 3px;
      color: #78350f;
      text-transform: uppercase;
    }
    .cert-title {
      font-size: 42px;
      font-weight: 900;
      color: #1e293b;
      letter-spacing: 6px;
      text-transform: uppercase;
      margin-top: 4px;
      background: linear-gradient(135deg, #1e293b 0%, #b45309 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cert-subtitle {
      font-size: 14px;
      font-style: italic;
      color: #64748b;
      letter-spacing: 1px;
    }

    .present-to {
      font-size: 15px;
      font-family: Arial, sans-serif;
      color: #475569;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .student-name {
      font-size: 38px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid #f59e0b;
      display: inline-block;
      padding: 2px 30px;
      margin: 6px auto;
      font-family: 'Georgia', serif;
    }

    .cert-description {
      font-size: 16px;
      color: #334155;
      max-width: 680px;
      margin: 8px auto;
      line-height: 1.6;
    }
    .highlight {
      font-weight: bold;
      color: #b45309;
    }

    .badge-container {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 6px 20px;
      border-radius: 9999px;
      margin: 4px auto;
    }
    .badge-score {
      font-size: 20px;
      font-weight: 800;
      color: #92400e;
      font-family: Arial, sans-serif;
    }

    /* Footer with QR and Signatures */
    .cert-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      font-family: Arial, sans-serif;
    }
    .footer-left {
      text-align: left;
    }
    .footer-center {
      text-align: center;
    }
    .footer-right {
      text-align: right;
    }
    .qr-img {
      width: 72px;
      height: 72px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 2px;
      background: white;
    }
    .cert-id {
      font-size: 10px;
      font-family: monospace;
      color: #64748b;
      margin-top: 3px;
    }
    .sig-line {
      width: 140px;
      height: 1px;
      background: #94a3b8;
      margin-bottom: 4px;
    }
    .sig-title {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }

    /* Print toolbar */
    .toolbar {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 10px;
      z-index: 100;
    }
    .btn {
      padding: 10px 18px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: Arial, sans-serif;
    }
    .btn:hover {
      background: #334155;
    }
    @media print {
      body {
        background: transparent;
      }
      .toolbar {
        display: none;
      }
      .cert-container {
        box-shadow: none;
        width: 100%;
        height: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Sertifikatni Chop Etish / PDF saqlash</button>
  </div>

  <div class="cert-container">
    <div class="outer-border"></div>
    <div class="inner-border"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="content">
      <div>
        <div class="header-logo">${data.schoolName ? data.schoolName.toUpperCase() : 'HB DIAGNOSTIKA & MONITORING'}</div>
        <h1 class="cert-title">SERTIFIKAT</h1>
        <div class="cert-subtitle">A'lo natija va bilim darajasini tasdiqlovchi rasmiy hujjat</div>
      </div>

      <div>
        <div class="present-to">Ushbu sertifikat bilan taqdirlanadi:</div>
        <div class="student-name">${data.studentName}</div>
        <p class="cert-description">
          <span class="highlight">"${data.testTitle || 'Diagnostika Imtihoni'}"</span> bo'yicha o'tkazilgan bilim sinovida 
          yuqori natija ko'rsatib, o'zlashtirish darajasini namunali yakunladi.
        </p>

        <div class="badge-container">
          <span>🏆 Ko'rsatkich:</span>
          <span class="badge-score">${data.score} / ${data.totalScore} (${percentage}%)</span>
        </div>
      </div>

      <div class="cert-footer">
        <div class="footer-left">
          <div class="sig-line"></div>
          <div class="sig-title">Fan O'qituvchisi</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Imzo va tasdiq</div>
        </div>

        <div class="footer-center">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" class="qr-img" />` : ''}
          <div class="cert-id">ID: ${data.resultId}</div>
          <div style="font-size: 9px; color: #94a3b8;">Haqiqiyligini tekshirish uchun skaner qiling</div>
        </div>

        <div class="footer-right">
          <div style="font-size: 12px; font-weight: 600; color: #1e293b;">${formattedDate}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Berilgan sana</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(certificateHtml);
  printWindow.document.close();
}
