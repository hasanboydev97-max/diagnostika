import type { ClassAnalysisResult, StudentAnalysis, CurriculumTopicInsight } from './gemini';

/**
 * 20 yillik arxitektor darajasidagi A4 Rasmiy Diagnostika Blankasi Generator.
 * Xususiyatlari:
 * 1. 1-sahifa: Maktab rahbariyati va o'qituvchi uchun umumiy sinf hisoboti va mavzular tahlili.
 * 2. Keyingi sahifalar: HAR BIR O'QUVCHI UCHUN ALOHIDA A4 VARAQ (ota-onasiga pechat qilib berish uchun).
 * 3. Rasmiy muhr va imzo bloklari (O'qituvchi, Metodist, Ota-ona).
 * 4. Chop etishda (Ctrl+P / Save as PDF) 100% tiniq vektorli chiqadi.
 */
export function openClassReportPrintWindow(analysisResult: ClassAnalysisResult, test: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Iltimos, brauzeringizda qalqib chiquvchi oynalarga (pop-up) ruxsat bering.");
    return;
  }

  const studentA4Sheets = (analysisResult.studentAnalyses || []).map((st: StudentAnalysis, idx: number) => {
    const levelBadgeClass = st.level === 'yuqori' ? 'badge-high' : st.level === 'yaxshi' ? 'badge-good' : st.level === "o'rta" ? 'badge-mid' : 'badge-low';
    return `
      <div class="a4-sheet student-sheet">
        <div class="official-header">
          <div class="school-brand">
            <div class="school-logo">HB</div>
            <div>
              <h2>MAKTAB / O'QUV MARKAZI DIAGNOSTIKASI</h2>
              <p class="subtitle">O'quvchining Shaxsiy Diagnostika va Rivojlanish Varaqasi (Ota-onalar uchun)</p>
            </div>
          </div>
          <div class="test-meta">
            <div class="doc-code">BLANKA № ${String(idx + 1).padStart(2, '0')} / ${st.name.substring(0, 3).toUpperCase()}</div>
            <div class="date-text">${new Date().toLocaleDateString('uz-UZ')}</div>
          </div>
        </div>

        <div class="student-profile-bar">
          <div class="student-main">
            <div class="avatar-box">${st.name.charAt(0).toUpperCase()}</div>
            <div>
              <h1 class="student-name">${st.name}</h1>
              <div class="test-title-sub">Imtihon: <strong>${test?.title || 'Diagnostika'}</strong> • Fan: ${test?.subject || 'Umumiy'}</div>
            </div>
          </div>
          <div class="score-display">
            <div class="score-num">${st.scorePercent}%</div>
            <div class="score-badge ${levelBadgeClass}">${st.level.toUpperCase()} NATIJA</div>
            <div class="score-raw">${st.scoreRaw} ball</div>
          </div>
        </div>

        ${st.personalityInsight ? `
          <div class="insight-box">
            <strong>👤 Psixologik-Pedagogik Profil:</strong> ${st.personalityInsight}
          </div>
        ` : ''}

        <div class="grid-2">
          <div class="card strengths-card">
            <div class="card-title">✅ O'quvchining Kuchli Tomonlari</div>
            <ul>${(st.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div class="card weaknesses-card">
            <div class="card-title">⚡ Mustahkamlash Kerak Bo'lgan Mavzular</div>
            <ul>${(st.weaknesses || []).map(w => `<li>${w}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="parent-letter-box">
          <div class="parent-letter-title">✉️ Hurmatli Ota-Onaga Maxsus Murojaat</div>
          <p class="parent-letter-text">${st.parentReport || ''}</p>
        </div>

        <div class="roadmap-box">
          <div class="roadmap-header">🗺️ 3 Bosqichli Shaxsiy Rivojlanish Yo'l Xaritasi</div>
          <div class="roadmap-steps-grid">
            ${(st.roadmap || []).map((step, sIdx) => `
              <div class="roadmap-col step-col-${sIdx}">
                <div class="step-top">
                  <span class="step-num">${step.phase}</span>
                  <span class="step-dur">${step.duration}</span>
                </div>
                <div class="step-goal">${step.focus}</div>
                <div class="step-actions">
                  <strong>Vazifalar:</strong>
                  <ul>${(step.actions || []).map(a => `<li>${a}</li>`).join('')}</ul>
                </div>
                <div class="step-ptip">
                  <strong>👨‍👩‍👧 Ota-onaga maslahat:</strong> ${step.parentTip}
                </div>
                <div class="step-target">
                  <strong>🎯 Kutilayotgan natija:</strong> ${step.expectedOutcome}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="official-footer">
          <div class="sign-block">
            <div class="sign-line"></div>
            <div class="sign-label">Fan o'qituvchisi (F.I.Sh va imzo)</div>
          </div>
          <div class="sign-block">
            <div class="sign-line"></div>
            <div class="sign-label">Maktab ma'muriyati / Metodist</div>
          </div>
          <div class="sign-block">
            <div class="sign-line"></div>
            <div class="sign-label">Ota-ona tanishdim (Imzo)</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const fullHtml = `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <title>${test?.title} — Rasmiy AI Diagnostika Xulosasi (PDF Pechat)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      background: #f1f3f5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-actions-bar {
      position: sticky;
      top: 0;
      background: #111;
      color: #fff;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }
    .print-btn {
      background: #10b981;
      color: #fff;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #059669; }
    .close-btn {
      background: #374151;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }
    .a4-container {
      max-width: 210mm;
      margin: 20px auto;
    }
    .a4-sheet {
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      padding: 13mm 15mm 13mm 15mm;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border-radius: 4px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .student-sheet {
      page-break-before: always;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .official-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .school-logo {
      width: 44px;
      height: 44px;
      background: #0f172a;
      color: #fff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 1px;
    }
    .school-brand h2 {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .subtitle {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }
    .test-meta { text-align: right; }
    .doc-code { font-family: monospace; font-size: 11px; font-weight: 700; color: #0f172a; }
    .date-text { font-size: 10px; color: #64748b; margin-top: 2px; }
    .student-profile-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .student-main {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-box {
      width: 44px;
      height: 44px;
      background: #0f172a;
      color: #fff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
    }
    .student-name {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }
    .test-title-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .score-display { text-align: right; }
    .score-num { font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1; }
    .score-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }
    .badge-high { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-good { background: #e0e7ff; color: #4338ca; border: 1px solid #a5b4fc; }
    .badge-mid  { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-low  { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .score-raw { font-size: 9.5px; color: #94a3b8; margin-top: 2px; }
    .insight-box {
      background: #f1f5f9;
      border-left: 4px solid #475569;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.45;
      color: #334155;
      margin-bottom: 10px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .card {
      border-radius: 10px;
      padding: 10px 12px;
    }
    .strengths-card { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .weaknesses-card { background: #fef2f2; border: 1px solid #fecaca; }
    .card-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .strengths-card .card-title { color: #166534; }
    .weaknesses-card .card-title { color: #991b1b; }
    .card ul { padding-left: 14px; font-size: 10.5px; }
    .strengths-card li { color: #14532d; padding: 2px 0; }
    .weaknesses-card li { color: #7f1d1d; padding: 2px 0; }
    .parent-letter-box {
      background: #0f172a;
      color: #fff;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .parent-letter-title {
      font-size: 9.5px;
      font-weight: 900;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .parent-letter-text {
      font-size: 11px;
      line-height: 1.55;
      color: #f8fafc;
    }
    .roadmap-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .roadmap-header {
      font-size: 9.5px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .roadmap-steps-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .roadmap-col {
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px;
      font-size: 9.5px;
      border-top: 3px solid #0f172a;
    }
    .step-col-0 { border-top-color: #3b82f6; }
    .step-col-1 { border-top-color: #f59e0b; }
    .step-col-2 { border-top-color: #10b981; }
    .step-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
    .step-num { font-weight: 900; color: #0f172a; font-size: 9.5px; }
    .step-dur { font-size: 8.5px; color: #64748b; font-weight: 600; }
    .step-goal { font-weight: 700; color: #1e293b; font-size: 10px; margin-bottom: 4px; line-height: 1.25; }
    .step-actions { margin-bottom: 4px; }
    .step-actions ul { padding-left: 10px; font-size: 9px; color: #475569; }
    .step-ptip { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 5px; padding: 4px; margin-bottom: 3px; font-size: 8.5px; color: #78350f; line-height: 1.25; }
    .step-target { background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 5px; padding: 4px; font-size: 8.5px; color: #064e3b; line-height: 1.25; }
    .official-footer {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      margin-top: auto;
    }
    .sign-block { text-align: center; }
    .sign-line { border-bottom: 1px dashed #64748b; height: 20px; margin-bottom: 4px; }
    .sign-label { font-size: 8.5px; color: #475569; font-weight: 600; }

    /* FIRST SHEET: CLASS OVERVIEW & TOPICS */
    .class-summary-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 12px;
    }
    .class-summary-header h1 { font-size: 19px; font-weight: 900; margin-bottom: 3px; }
    .class-stats-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .class-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .class-stat-val { font-size: 20px; font-weight: 900; color: #0f172a; }
    .class-stat-lbl { font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px; }
    .topics-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
    }
    .topics-table th, .topics-table td {
      border: 1px solid #e2e8f0;
      padding: 7px 9px;
      text-align: left;
      vertical-align: top;
    }
    .topics-table th { background: #f1f5f9; font-weight: 800; color: #0f172a; font-size: 9.5px; }

    @media print {
      body { background: #fff; }
      .print-actions-bar { display: none !important; }
      .a4-container { margin: 0; width: 100%; max-width: 100%; }
      .a4-sheet {
        margin: 0;
        padding: 8mm 10mm;
        box-shadow: none;
        border-radius: 0;
        min-height: 280mm;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions-bar">
    <div>
      <strong>🖨️ AI DIAGNOSTIKA VA SINF TAHLILI (RASMIY PECHAT UCHUN)</strong>
      <span style="opacity:0.7; font-size:12px; margin-left: 12px;">Har bir o'quvchi uchun alohida A4 varaq shakllantirildi</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="print-btn" onclick="window.print()">🖨️ Pechat Qilish / PDF Saqlash (Ctrl + P)</button>
      <button class="close-btn" onclick="window.close()">Oynani Yopish</button>
    </div>
  </div>

  <div class="a4-container">
    <!-- 1-SAHIFA: O'QITUVCHI VA RAHBARIYAT UCHUN SINF TAHLILI -->
    <div class="a4-sheet">
      <div>
        <div class="official-header">
          <div class="school-brand">
            <div class="school-logo">HB</div>
            <div>
              <h2>MAKTAB TA'LIM VA DIAGNOSTIKA TIZIMI</h2>
              <p class="subtitle">Umumiy Sinf Ko'rsatkichlari va Metodik Tahlil Hisoboti</p>
            </div>
          </div>
          <div class="test-meta">
            <div class="doc-code">SINF HISOBOTI</div>
            <div class="date-text">${new Date().toLocaleDateString('uz-UZ')}</div>
          </div>
        </div>

        <div class="class-summary-header">
          <h1>📊 ${test?.title} — Sinf Natijalari</h1>
          <p style="font-size: 11px; opacity: 0.8;">Jami ${analysisResult.classOverview.totalStudents} nafar yagona o'quvchi qatnashdi • O'rtacha o'zlashtirish: ${analysisResult.classOverview.averageScore}%</p>
        </div>

        <div class="class-stats-4">
          <div class="class-stat-box"><div class="class-stat-val">${analysisResult.classOverview.totalStudents}</div><div class="class-stat-lbl">Yagona O'quvchi</div></div>
          <div class="class-stat-box"><div class="class-stat-val" style="color:#d97706;">${analysisResult.classOverview.averageScore}%</div><div class="class-stat-lbl">O'rtacha Ball</div></div>
          <div class="class-stat-box"><div class="class-stat-val" style="color:#16a34a;">${analysisResult.classOverview.passCount}</div><div class="class-stat-lbl">O'tganlar (≥60%)</div></div>
          <div class="class-stat-box"><div class="class-stat-val" style="color:#dc2626;">${analysisResult.classOverview.failCount}</div><div class="class-stat-lbl">E'tibor Kerak (&lt;60%)</div></div>
        </div>

        <div class="grid-2">
          <div class="card strengths-card">
            <div class="card-title">✅ Sinf Kuchli Tomonlari</div>
            <ul>${(analysisResult.classOverview.classStrengths || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div class="card weaknesses-card">
            <div class="card-title">⚡ Sinf Zaif Tomonlari (Bo'shliqlar)</div>
            <ul>${(analysisResult.classOverview.classWeaknesses || []).map((w: string) => `<li>${w}</li>`).join('')}</ul>
          </div>
        </div>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:10px 12px; margin-bottom:10px;">
          <div style="font-size:9.5px; font-weight:900; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">🎓 O'qituvchiga Metodik Tavsiyalar</div>
          <ol style="padding-left:14px; font-size:10.5px; color:#1e3a8a;">
            ${(analysisResult.classOverview.teacherRecommendations || []).map((r: string) => `<li style="padding:2px 0;">${r}</li>`).join('')}
          </ol>
        </div>

        ${analysisResult.curriculumTopics?.length > 0 ? `
          <div style="margin-top:6px;">
            <div style="font-size:9.5px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">📚 O'tilgan Mavzular va Ularning Hayotiy Zarurati</div>
            <table class="topics-table">
              <thead>
                <tr>
                  <th style="width:25%;">Mavzu</th>
                  <th style="width:35%;">Nima uchun bolaga kerak?</th>
                  <th style="width:40%;">Real hayot va kasblarda (IT, Moliya)</th>
                </tr>
              </thead>
              <tbody>
                ${analysisResult.curriculumTopics.slice(0, 5).map((t: CurriculumTopicInsight) => `
                  <tr>
                    <td><strong>${t.topic}</strong><br/><span style="font-size:8.5px; color:#64748b;">${t.category || ''}</span></td>
                    <td style="color:#1f2937;">${t.whyItMattersForChild}</td>
                    <td style="color:#1e3a8a;">${t.realWorldApplication}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>

      <div class="official-footer">
        <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Fan o'qituvchisi</div></div>
        <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Metodist / Ilmiy mudir</div></div>
        <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Maktab direktori</div></div>
      </div>
    </div>

    <!-- HAR BIR O'QUVCHI UCHUN SHAXSIY A4 VARAQLAR (OTA-ONAGA BERISH UCHUN) -->
    ${studentA4Sheets}
  </div>

  <script>
    // Avtomatik ravishda print oynasini taklif qilish
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
