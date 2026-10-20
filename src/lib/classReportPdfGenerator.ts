import type { ClassAnalysisResult, StudentAnalysis, CurriculumTopicInsight } from './gemini';

/**
 * ====================================================================
 *  SENIOR-LEVEL A4 DIAGNOSTIC REPORT GENERATOR
 *  ─────────────────────────────────────────────────────────────────
 *  Architecture:
 *   - Page 1   : Professional class overview (teacher / admin report)
 *   - Page 2…N : Individual student A4 sheets (for parents)
 *
 *  Print Pipeline:
 *   window.open → document.write → Ctrl+P / "Save as PDF" (browser)
 *   • @page rule locks to A4 Portrait
 *   • -webkit-print-color-adjust: exact preserves all colours
 *   • No canvas / jsPDF — pure vector HTML, pixel-perfect on paper
 * ====================================================================
 */
export function openClassReportPrintWindow(
  analysisResult: ClassAnalysisResult,
  test: any
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Iltimos, brauzeringizda qalqib chiquvchi oynalarga (pop-up) ruxsat bering.');
    return;
  }

  /* ── helpers ── */
  const today = new Date().toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const shortDate = new Date().toLocaleDateString('uz-UZ');

  const levelMeta = (level: string): { cls: string; label: string } => {
    const map: Record<string, { cls: string; label: string }> = {
      yuqori:   { cls: 'badge-high',    label: 'A\'LO'       },
      yaxshi:   { cls: 'badge-good',    label: 'YAXSHI'      },
      "o'rta":  { cls: 'badge-mid',     label: 'O\'RTA'      },
      past:     { cls: 'badge-low',     label: 'PAST'        },
    };
    return map[level] ?? { cls: 'badge-low', label: level.toUpperCase() };
  };

  const scoreColor = (pct: number) =>
    pct >= 80 ? '#15803d' : pct >= 60 ? '#d97706' : '#dc2626';

  const progressBar = (pct: number) => {
    const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
    const bg    = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef3c7' : '#fee2e2';
    return `
      <div class="pb-wrapper">
        <div class="pb-track" style="background:${bg};">
          <div class="pb-fill" style="width:${Math.min(100, pct)}%;background:${color};"></div>
        </div>
        <span class="pb-label" style="color:${color};">${pct}%</span>
      </div>`;
  };

  /* ── per-student A4 pages ── */
  const studentPages = (analysisResult.studentAnalyses || [])
    .map((st: StudentAnalysis, idx: number) => {
      const { cls: badgeCls, label: badgeLabel } = levelMeta(st.level);
      const pct = st.scorePercent;
      const bgAccent = pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#fffbeb' : '#fef2f2';
      const borderAccent = pct >= 80 ? '#86efac' : pct >= 60 ? '#fde68a' : '#fca5a5';
      const accentColor  = pct >= 80 ? '#15803d' : pct >= 60 ? '#b45309' : '#b91c1c';

      const roadmapStepColors = ['#3b82f6', '#f59e0b', '#10b981'];

      return `
      <div class="a4-sheet student-sheet">

        <!-- ▌ Header ▐ -->
        <header class="doc-header">
          <div class="brand-row">
            <div class="brand-logo">HB</div>
            <div>
              <div class="brand-name">MAKTAB TA'LIM VA DIAGNOSTIKA TIZIMI</div>
              <div class="brand-sub">O'quvchining Shaxsiy Diagnostika va Rivojlanish Varaqasi · Ota-onalar uchun</div>
            </div>
          </div>
          <div class="doc-meta">
            <div class="doc-code">BLANKA №&nbsp;${String(idx + 1).padStart(2, '0')}&nbsp;/&nbsp;${st.name.substring(0, 3).toUpperCase()}</div>
            <div class="doc-date">${shortDate}</div>
          </div>
        </header>

        <!-- ▌ Student hero bar ▐ -->
        <div class="student-hero" style="background:${bgAccent};border:1.5px solid ${borderAccent};">
          <div class="student-hero-left">
            <div class="avatar" style="background:${accentColor};">${st.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="student-name">${st.name}</div>
              <div class="student-sub">Imtihon: <strong>${test?.title || 'Diagnostika'}</strong> &nbsp;·&nbsp; Fan: ${test?.subject || 'Umumiy'}</div>
            </div>
          </div>
          <div class="score-cluster">
            <div class="score-big" style="color:${accentColor};">${pct}<span class="score-pct-sign">%</span></div>
            <div class="badge ${badgeCls}">${badgeLabel}</div>
            <div class="score-raw-label">${st.scoreRaw}&nbsp;ball</div>
          </div>
        </div>

        ${st.personalityInsight ? `
        <div class="insight-strip">
          <span class="insight-icon">👤</span>
          <span><strong>Psixologik-Pedagogik Profil:</strong>&nbsp;${st.personalityInsight}</span>
        </div>` : ''}

        <!-- ▌ Strengths / Weaknesses ▐ -->
        <div class="two-col">
          <div class="card card-green">
            <div class="card-heading" style="color:#166534;">✅ Kuchli Tomonlar</div>
            <ul class="card-list">
              ${(st.strengths || []).map(s => `<li style="color:#14532d;">${s}</li>`).join('')}
            </ul>
          </div>
          <div class="card card-red">
            <div class="card-heading" style="color:#991b1b;">⚡ Mustahkamlash Kerak</div>
            <ul class="card-list">
              ${(st.weaknesses || []).map(w => `<li style="color:#7f1d1d;">${w}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- ▌ Parent letter ▐ -->
        <div class="parent-letter">
          <div class="parent-letter-badge">✉️&nbsp; Hurmatli Ota-Onaga Maxsus Murojaat</div>
          <p class="parent-letter-body">${st.parentReport || ''}</p>
        </div>

        <!-- ▌ 3-Step Roadmap ▐ -->
        <div class="roadmap-wrap">
          <div class="roadmap-title">🗺️&nbsp; 3 Bosqichli Shaxsiy Rivojlanish Yo'l Xaritasi</div>
          <div class="roadmap-grid">
            ${(st.roadmap || []).map((step, si) => `
            <div class="roadmap-card" style="border-top:3px solid ${roadmapStepColors[si] ?? '#94a3b8'};">
              <div class="rc-head">
                <span class="rc-phase">${step.phase}</span>
                <span class="rc-dur">${step.duration}</span>
              </div>
              <div class="rc-focus">${step.focus}</div>
              <div class="rc-section-label">Vazifalar:</div>
              <ul class="rc-actions">
                ${(step.actions || []).map(a => `<li>${a}</li>`).join('')}
              </ul>
              <div class="rc-tip">
                <span class="rc-tip-icon">👨‍👩‍👧</span>
                <span>${step.parentTip}</span>
              </div>
              <div class="rc-outcome">
                <span class="rc-tip-icon">🎯</span>
                <span>${step.expectedOutcome}</span>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- ▌ Signature footer ▐ -->
        <footer class="sig-footer">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Fan o'qituvchisi (F.I.Sh va imzo)</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Maktab ma'muriyati / Metodist</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Ota-ona tanishdim (Imzo)</div>
          </div>
        </footer>
      </div>`;
    })
    .join('');

  /* ── class overview — page 1 ── */
  const ov = analysisResult.classOverview;
  const topicsHtml = (analysisResult.curriculumTopics || []).slice(0, 5).map(
    (t: CurriculumTopicInsight) => `
    <tr>
      <td><strong>${t.topic}</strong><br/><span class="tbl-sub">${t.category || ''}</span></td>
      <td>${t.whyItMattersForChild}</td>
      <td>${t.realWorldApplication}</td>
    </tr>`
  ).join('');

  /* ── full HTML document ── */
  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8"/>
<title>${test?.title ?? 'Diagnostika'} — AI Sinf Xulosasi</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

<style>
/* ============================================================
   BASE RESET
   ============================================================ */
*{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  font-size:10.5px;
  line-height:1.5;
  color:#111;
  background:#f0f2f5;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}

/* ============================================================
   TOP ACTION BAR (hidden on print)
   ============================================================ */
.topbar{
  position:sticky;top:0;z-index:999;
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
  padding:12px 28px;
  display:flex;justify-content:space-between;align-items:center;
  box-shadow:0 4px 24px rgba(0,0,0,.28);
}
.topbar-left{display:flex;align-items:center;gap:14px;}
.topbar-logo{
  width:38px;height:38px;border-radius:10px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:900;color:#fff;letter-spacing:.5px;
}
.topbar-info{color:#fff;}
.topbar-title{font-size:13px;font-weight:700;letter-spacing:.2px;}
.topbar-sub{font-size:10px;opacity:.55;margin-top:1px;}
.topbar-actions{display:flex;gap:10px;align-items:center;}
.btn-print{
  background:linear-gradient(135deg,#10b981,#059669);
  color:#fff;border:none;
  padding:9px 20px;border-radius:10px;
  font-weight:800;font-size:11.5px;
  cursor:pointer;letter-spacing:.4px;
  display:flex;align-items:center;gap:7px;
  transition:transform .15s,box-shadow .15s;
  box-shadow:0 4px 14px rgba(16,185,129,.35);
}
.btn-print:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,.45);}
.btn-close{
  background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.15);
  padding:8px 16px;border-radius:9px;font-size:11px;cursor:pointer;
  font-weight:600;transition:background .15s;
}
.btn-close:hover{background:rgba(255,255,255,.18);}

/* ============================================================
   A4 CONTAINER
   ============================================================ */
.a4-wrap{max-width:210mm;margin:28px auto 40px;}

@page{size:A4 portrait;margin:11mm 13mm;}

.a4-sheet{
  background:#fff;
  width:210mm;
  min-height:297mm;
  padding:12mm 14mm 12mm 14mm;
  margin-bottom:20px;
  box-shadow:0 6px 32px rgba(0,0,0,.09);
  border-radius:3px;
  position:relative;
  display:flex;flex-direction:column;gap:9px;
}
.student-sheet{
  page-break-before:always;
  break-before:page;
  page-break-after:always;
  break-after:page;
  page-break-inside:avoid;
  break-inside:avoid;
}

/* ============================================================
   DOCUMENT HEADER
   ============================================================ */
.doc-header{
  display:flex;justify-content:space-between;align-items:center;
  border-bottom:2.5px solid #0f172a;
  padding-bottom:9px;margin-bottom:2px;
}
.brand-row{display:flex;align-items:center;gap:11px;}
.brand-logo{
  width:42px;height:42px;border-radius:10px;
  background:#0f172a;color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:16px;letter-spacing:.5px;
  flex-shrink:0;
}
.brand-name{font-size:12px;font-weight:800;letter-spacing:.3px;color:#0f172a;}
.brand-sub{font-size:9px;color:#64748b;font-weight:500;margin-top:2px;}
.doc-meta{text-align:right;}
.doc-code{font-family:'Courier New',monospace;font-size:10.5px;font-weight:700;color:#0f172a;letter-spacing:.5px;}
.doc-date{font-size:9px;color:#64748b;margin-top:2px;}

/* ============================================================
   CLASS SUMMARY (PAGE 1)
   ============================================================ */
.class-hero{
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f2b5b 100%);
  border-radius:14px;
  padding:18px 22px;
  color:#fff;
}
.class-hero h1{
  font-family:'Playfair Display',Georgia,serif;
  font-size:21px;font-weight:800;
  letter-spacing:-.3px;line-height:1.2;
  margin-bottom:5px;
}
.class-hero-sub{font-size:11px;opacity:.7;font-weight:500;}

.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;}
.stat-card{
  background:#f8fafc;border:1.5px solid #e2e8f0;
  border-radius:12px;padding:10px 12px;text-align:center;
}
.stat-val{font-size:22px;font-weight:900;color:#0f172a;line-height:1.1;}
.stat-lbl{font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-top:3px;}

/* ============================================================
   TWO-COLUMN CARDS
   ============================================================ */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.card{border-radius:12px;padding:10px 13px;}
.card-green{background:#f0fdf4;border:1.5px solid #bbf7d0;}
.card-red{background:#fef2f2;border:1.5px solid #fecaca;}
.card-blue{background:#eff6ff;border:1.5px solid #bfdbfe;}
.card-heading{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
.card-list{padding-left:15px;list-style:disc;}
.card-list li{padding:2.5px 0;font-size:10px;line-height:1.4;}

/* ============================================================
   TEACHER RECOMMENDATIONS
   ============================================================ */
.teacher-rec{
  background:#eff6ff;border:1.5px solid #bfdbfe;
  border-radius:12px;padding:11px 14px;
}
.teacher-rec .card-heading{color:#1e40af;}
.teacher-rec ol{padding-left:16px;color:#1e3a8a;}
.teacher-rec li{font-size:10px;padding:2.5px 0;line-height:1.4;}

/* ============================================================
   TOPICS TABLE
   ============================================================ */
.topics-section{margin-top:2px;}
.section-title{
  font-size:9px;font-weight:900;color:#0f172a;
  text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;
}
.topics-tbl{width:100%;border-collapse:collapse;font-size:9.5px;}
.topics-tbl th{
  background:#f1f5f9;font-weight:800;color:#0f172a;
  font-size:9px;text-transform:uppercase;letter-spacing:.4px;
  border:1px solid #e2e8f0;padding:7px 10px;
}
.topics-tbl td{border:1px solid #e2e8f0;padding:7px 10px;vertical-align:top;color:#1e293b;}
.tbl-sub{font-size:8px;color:#94a3b8;display:block;margin-top:1px;}

/* ============================================================
   STUDENT HERO BAR
   ============================================================ */
.student-hero{
  border-radius:14px;
  padding:13px 16px;
  display:flex;justify-content:space-between;align-items:center;
}
.student-hero-left{display:flex;align-items:center;gap:12px;}
.avatar{
  width:46px;height:46px;border-radius:12px;
  color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;flex-shrink:0;
}
.student-name{font-size:18px;font-weight:800;color:#0f172a;line-height:1.15;}
.student-sub{font-size:10px;color:#64748b;margin-top:2px;}
.score-cluster{text-align:right;}
.score-big{font-size:30px;font-weight:900;line-height:1;}
.score-pct-sign{font-size:16px;font-weight:700;vertical-align:top;margin-top:4px;display:inline-block;}
.score-raw-label{font-size:9px;color:#94a3b8;margin-top:2px;}

/* ── level badges ── */
.badge{
  display:inline-block;font-size:8.5px;font-weight:800;
  padding:3px 10px;border-radius:999px;
  letter-spacing:.5px;margin-top:4px;
}
.badge-high{background:#dcfce7;color:#15803d;border:1px solid #86efac;}
.badge-good{background:#e0e7ff;color:#4338ca;border:1px solid #a5b4fc;}
.badge-mid {background:#fef3c7;color:#b45309;border:1px solid #fde68a;}
.badge-low {background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;}

/* ============================================================
   INSIGHT STRIP
   ============================================================ */
.insight-strip{
  background:#f1f5f9;border-left:4px solid #475569;
  border-radius:7px;padding:8px 12px;
  font-size:10px;color:#334155;line-height:1.45;
  display:flex;gap:8px;align-items:flex-start;
}
.insight-icon{font-size:12px;flex-shrink:0;margin-top:1px;}

/* ============================================================
   PARENT LETTER
   ============================================================ */
.parent-letter{
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
  border-radius:12px;padding:13px 15px;
}
.parent-letter-badge{
  font-size:9px;font-weight:900;color:#f59e0b;
  text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;
}
.parent-letter-body{font-size:10.5px;line-height:1.55;color:#f1f5f9;}

/* ============================================================
   ROADMAP
   ============================================================ */
.roadmap-wrap{
  border:1.5px solid #e2e8f0;border-radius:12px;
  padding:11px 13px;
}
.roadmap-title{
  font-size:9px;font-weight:900;color:#0f172a;
  text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;
}
.roadmap-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.roadmap-card{
  background:#f8fafc;border-radius:9px;
  padding:9px 10px;font-size:9.5px;
  border:1.5px solid #f1f5f9;
  border-top-width:3px;
  display:flex;flex-direction:column;gap:4px;
}
.rc-head{display:flex;justify-content:space-between;align-items:center;}
.rc-phase{font-weight:900;color:#0f172a;font-size:9.5px;}
.rc-dur{font-size:8px;color:#64748b;font-weight:600;}
.rc-focus{font-weight:700;color:#1e293b;font-size:10px;line-height:1.25;}
.rc-section-label{font-weight:700;color:#475569;font-size:8.5px;text-transform:uppercase;letter-spacing:.3px;}
.rc-actions{padding-left:12px;list-style:disc;color:#475569;font-size:9px;}
.rc-actions li{padding:1px 0;}
.rc-tip{
  background:#fffbeb;border:1px solid #fef3c7;
  border-radius:6px;padding:5px 6px;
  font-size:8.5px;color:#78350f;line-height:1.3;
  display:flex;gap:5px;align-items:flex-start;
}
.rc-outcome{
  background:#ecfdf5;border:1px solid #d1fae5;
  border-radius:6px;padding:5px 6px;
  font-size:8.5px;color:#064e3b;line-height:1.3;
  display:flex;gap:5px;align-items:flex-start;
}
.rc-tip-icon{flex-shrink:0;margin-top:1px;}

/* ============================================================
   PROGRESS BAR COMPONENT
   ============================================================ */
.pb-wrapper{display:flex;align-items:center;gap:7px;flex:1;}
.pb-track{flex:1;height:7px;border-radius:999px;overflow:hidden;}
.pb-fill{height:100%;border-radius:999px;transition:width .3s;}
.pb-label{font-size:9px;font-weight:800;white-space:nowrap;min-width:28px;text-align:right;}

/* ============================================================
   SIGNATURE FOOTER
   ============================================================ */
.sig-footer{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px;
  padding-top:11px;border-top:1px solid #cbd5e1;
  margin-top:auto;
}
.sig-block{text-align:center;}
.sig-line{border-bottom:1.5px dashed #94a3b8;height:22px;margin-bottom:4px;}
.sig-label{font-size:8px;color:#475569;font-weight:600;line-height:1.3;}

/* ============================================================
   PRINT OVERRIDES
   ============================================================ */
@media print{
  body{background:#fff!important;}
  .topbar{display:none!important;}
  .a4-wrap{margin:0!important;width:100%!important;max-width:100%!important;}
  .a4-sheet{
    margin:0!important;padding:8mm 10mm!important;
    box-shadow:none!important;border-radius:0!important;
    min-height:280mm!important;
  }
}
</style>
</head>
<body>

<!-- ▌ ACTION BAR (screen only) ▐ -->
<div class="topbar">
  <div class="topbar-left">
    <div class="topbar-logo">HB</div>
    <div class="topbar-info">
      <div class="topbar-title">🖨️ AI Diagnostika va Sinf Tahlili — Rasmiy Pechat Uchun</div>
      <div class="topbar-sub">
        Jami ${(analysisResult.studentAnalyses || []).length} nafar o'quvchi · Har biri uchun alohida A4 varaq tayyorlandi
      </div>
    </div>
  </div>
  <div class="topbar-actions">
    <button class="btn-print" onclick="window.print()">
      🖨️&nbsp; Pechat Qilish / PDF Saqlash &nbsp;<kbd style="background:rgba(255,255,255,.15);border-radius:5px;padding:1px 6px;font-size:10px;">Ctrl + P</kbd>
    </button>
    <button class="btn-close" onclick="window.close()">✕ Yopish</button>
  </div>
</div>

<!-- ▌ PAGES CONTAINER ▐ -->
<div class="a4-wrap">

  <!-- ════════════════════════════════════════════════
       PAGE 1 · CLASS OVERVIEW (TEACHER / ADMIN)
       ════════════════════════════════════════════════ -->
  <div class="a4-sheet">

    <!-- Header -->
    <header class="doc-header">
      <div class="brand-row">
        <div class="brand-logo">HB</div>
        <div>
          <div class="brand-name">MAKTAB TA'LIM VA DIAGNOSTIKA TIZIMI</div>
          <div class="brand-sub">Umumiy Sinf Ko'rsatkichlari va Metodik Tahlil Hisoboti</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-code">SINF HISOBOTI</div>
        <div class="doc-date">${today}</div>
      </div>
    </header>

    <!-- Hero -->
    <div class="class-hero">
      <h1>📊 ${test?.title ?? 'Sinf Diagnostikasi'} — Sinf Natijalari</h1>
      <div class="class-hero-sub">
        Jami <strong>${ov.totalStudents}</strong> nafar o'quvchi qatnashdi &nbsp;·&nbsp;
        O'rtacha o'zlashtirish: <strong>${ov.averageScore}%</strong> &nbsp;·&nbsp; Sana: ${today}
      </div>
    </div>

    <!-- 4 stat cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${ov.totalStudents}</div>
        <div class="stat-lbl">Jami o'quvchi</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#d97706;">${ov.averageScore}%</div>
        <div class="stat-lbl">O'rtacha ball</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#16a34a;">${ov.passCount}</div>
        <div class="stat-lbl">O'tganlar (≥ 60%)</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#dc2626;">${ov.failCount}</div>
        <div class="stat-lbl">E'tibor kerak (&lt; 60%)</div>
      </div>
    </div>

    <!-- Student score distribution mini-table -->
    ${(analysisResult.studentAnalyses || []).length > 0 ? `
    <div>
      <div class="section-title">📋 O'quvchilar Natijalari Jadvali</div>
      <table class="topics-tbl">
        <thead>
          <tr>
            <th style="width:32%;">O'quvchi ismi</th>
            <th style="width:20%;">Ball</th>
            <th style="width:18%;">Daraja</th>
            <th style="width:30%;">Natija ko'rsatkichi</th>
          </tr>
        </thead>
        <tbody>
          ${(analysisResult.studentAnalyses || []).map((st: StudentAnalysis) => {
            const pct = st.scorePercent;
            const { cls, label } = levelMeta(st.level);
            return `<tr>
              <td><strong>${st.name}</strong></td>
              <td><strong style="color:${scoreColor(pct)};">${pct}%</strong> &nbsp;<span style="color:#94a3b8;font-size:9px;">(${st.scoreRaw} ball)</span></td>
              <td><span class="badge ${cls}" style="font-size:8px;">${label}</span></td>
              <td>${progressBar(pct)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Strengths / Weaknesses -->
    <div class="two-col">
      <div class="card card-green">
        <div class="card-heading" style="color:#166534;">✅ Sinf Kuchli Tomonlari</div>
        <ul class="card-list">
          ${(ov.classStrengths || []).map((s: string) => `<li style="color:#14532d;">${s}</li>`).join('')}
        </ul>
      </div>
      <div class="card card-red">
        <div class="card-heading" style="color:#991b1b;">⚡ Sinf Zaif Tomonlari (Bo'shliqlar)</div>
        <ul class="card-list">
          ${(ov.classWeaknesses || []).map((w: string) => `<li style="color:#7f1d1d;">${w}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- Teacher recommendations -->
    <div class="teacher-rec">
      <div class="card-heading" style="color:#1e40af;">🎓 O'qituvchiga Metodik Tavsiyalar</div>
      <ol>
        ${(ov.teacherRecommendations || []).map((r: string) => `<li>${r}</li>`).join('')}
      </ol>
    </div>

    <!-- Topics table -->
    ${(analysisResult.curriculumTopics?.length ?? 0) > 0 ? `
    <div class="topics-section">
      <div class="section-title">📚 O'tilgan Mavzular va Ularning Hayotiy Zarurati</div>
      <table class="topics-tbl">
        <thead>
          <tr>
            <th style="width:25%;">Mavzu</th>
            <th style="width:35%;">Nima uchun bolaga kerak?</th>
            <th style="width:40%;">Real hayot va kasblarda (IT, Moliya)</th>
          </tr>
        </thead>
        <tbody>${topicsHtml}</tbody>
      </table>
    </div>` : ''}

    <!-- Signature footer -->
    <footer class="sig-footer">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Fan o'qituvchisi</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Metodist / Ilmiy mudir</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Maktab direktori</div></div>
    </footer>
  </div>
  <!-- / PAGE 1 -->

  <!-- ════════════════════════════════════════════════
       PAGES 2-N · PER-STUDENT SHEETS
       ════════════════════════════════════════════════ -->
  ${studentPages}

</div><!-- /a4-wrap -->

<script>
  // Auto-launch print dialog after fonts/styles are loaded
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 600);
  });
</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
