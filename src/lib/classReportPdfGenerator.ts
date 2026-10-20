import type { ClassAnalysisResult, StudentAnalysis, CurriculumTopicInsight } from './gemini';

/**
 * ====================================================================
 *  SENIOR-LEVEL A4 DIAGNOSTIC REPORT GENERATOR  v3.0
 * ====================================================================
 */
export function openClassReportPrintWindow(
  analysisResult: ClassAnalysisResult,
  test: any
): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Iltimos, brauzeringizda qalqib chiquvchi oynalarga (pop-up) ruxsat bering.');
    return;
  }

  /* ─────────────── helpers ─────────────── */
  const todayFull  = new Date().toLocaleDateString('uz-UZ', { year:'numeric', month:'long', day:'numeric' });
  const todayShort = new Date().toLocaleDateString('uz-UZ');

  const LEVELS: Record<string, { bg:string; border:string; text:string; badge:string; label:string }> = {
    yuqori:  { bg:'#f0fdf4', border:'#4ade80', text:'#166534', badge:'#dcfce7', label:"A'LO"   },
    yaxshi:  { bg:'#eff6ff', border:'#60a5fa', text:'#1d4ed8', badge:'#dbeafe', label:'YAXSHI' },
    "o'rta": { bg:'#fffbeb', border:'#fbbf24', text:'#92400e', badge:'#fef3c7', label:"O'RTA"  },
    past:    { bg:'#fff1f2', border:'#fb7185', text:'#9f1239', badge:'#fee2e2', label:'PAST'   },
  };
  const getLevel = (l: string) => LEVELS[l] ?? LEVELS['past'];

  const rankIcon = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  /* mini SVG gauge (decorative arc) */
  const gauge = (pct: number, color: string) => {
    const r = 36; const cx = 44; const cy = 44;
    const circ = 2 * Math.PI * r;
    const dash  = (pct / 100) * circ * 0.75;
    const gap   = circ - dash;
    const rot   = -225;
    return `<svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="7"
        stroke-dasharray="${circ * 0.75} ${circ * 0.25}" stroke-dashoffset="0"
        stroke-linecap="round" transform="rotate(${rot} ${cx} ${cy})"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="${dash} ${gap + circ * 0.25}" stroke-dashoffset="0"
        stroke-linecap="round" transform="rotate(${rot} ${cx} ${cy})"/>
      <text x="${cx}" y="${cy - 2}" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="15" font-weight="800" fill="#0f172a">${pct}%</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="7" font-weight="600" fill="#94a3b8">BALL</text>
    </svg>`;
  };

  /* topic mastery bar row */
  const topicBar = (label: string, pct: number) => {
    const c = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
    const bg = pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#fffbeb' : '#fff1f2';
    return `
    <div class="tm-row">
      <span class="tm-label">${label}</span>
      <div class="tm-bar-bg" style="background:${bg};">
        <div class="tm-bar-fill" style="width:${pct}%;background:${c};"></div>
      </div>
      <span class="tm-pct" style="color:${c};">${pct}%</span>
    </div>`;
  };

  /* roadmap step card */
  const roadmapStepColors = ['#6366f1','#f59e0b','#10b981'];
  const stepCard = (step: any, si: number) => {
    const col = roadmapStepColors[si] ?? '#94a3b8';
    return `
    <div class="rm-card" style="border-top:3px solid ${col};">
      <div class="rm-head">
        <span class="rm-num" style="color:${col};">${step.phase}</span>
        <span class="rm-dur">${step.duration}</span>
      </div>
      <div class="rm-focus">${step.focus}</div>
      <div class="rm-label">Vazifalar:</div>
      <ul class="rm-list">
        ${(step.actions || []).map((a: string) => `<li>${a}</li>`).join('')}
      </ul>
      <div class="rm-chip rm-parent">
        <span>👨‍👩‍👧</span><span>${step.parentTip}</span>
      </div>
      <div class="rm-chip rm-outcome">
        <span>🎯</span><span>${step.expectedOutcome}</span>
      </div>
    </div>`;
  };

  /* sorted students for leaderboard */
  const sorted = [...(analysisResult.studentAnalyses || [])]
    .sort((a, b) => b.scorePercent - a.scorePercent);

  /* ─────────────── CLASS OVERVIEW PAGE ─────────────── */
  const ov = analysisResult.classOverview;

  const classPage = `
  <div class="a4-sheet">

    <!-- HEADER -->
    <header class="doc-hdr">
      <div class="hdr-brand">
        <div class="hdr-logo">HB</div>
        <div>
          <div class="hdr-title">MAKTAB TA'LIM VA DIAGNOSTIKA TIZIMI</div>
          <div class="hdr-sub">Umumiy Sinf Ko'rsatkichlari va Metodik Tahlil Hisoboti</div>
        </div>
      </div>
      <div class="hdr-right">
        <div class="hdr-code">SINF HISOBOTI</div>
        <div class="hdr-date">${todayFull}</div>
      </div>
    </header>

    <!-- HERO -->
    <div class="class-hero">
      <div class="hero-left">
        <div class="hero-eyebrow">📊 AI Sinf Tahlili</div>
        <h1 class="hero-h1">${test?.title ?? 'Sinf Diagnostikasi'}</h1>
        <div class="hero-meta">
          <span>${todayFull}</span>
          <span class="hero-dot">·</span>
          <span>${test?.subject ?? 'Umumiy Fan'}</span>
          <span class="hero-dot">·</span>
          <span>Jami ${ov.totalStudents} o'quvchi</span>
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat-item">
          <div class="hero-stat-val">${ov.averageScore}<span class="hero-stat-unit">%</span></div>
          <div class="hero-stat-lbl">O'rtacha ball</div>
        </div>
        <div class="hero-sep"></div>
        <div class="hero-stat-item">
          <div class="hero-stat-val green">${ov.passCount}</div>
          <div class="hero-stat-lbl">O'tdi (≥60%)</div>
        </div>
        <div class="hero-sep"></div>
        <div class="hero-stat-item">
          <div class="hero-stat-val red">${ov.failCount}</div>
          <div class="hero-stat-lbl">Diqqat kerak</div>
        </div>
      </div>
    </div>

    <!-- LEADERBOARD TABLE -->
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">🏆 O'quvchilar Natijalari Reytingi</div>
        <div class="section-badge">${(analysisResult.studentAnalyses || []).length} nafar</div>
      </div>
      <table class="lb-table">
        <thead>
          <tr>
            <th style="width:5%;">#</th>
            <th style="width:32%;">O'quvchi ismi</th>
            <th style="width:13%;text-align:center;">Ball</th>
            <th style="width:11%;text-align:center;">Daraja</th>
            <th style="width:39%;">Ko'rsatkich</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((st, i) => {
            const lv = getLevel(st.level);
            const pct = st.scorePercent;
            const barColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
            const barBg    = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef3c7' : '#fee2e2';
            return `<tr class="${i % 2 === 0 ? 'tr-even' : ''}">
              <td class="rank-cell">${rankIcon(i)}</td>
              <td class="name-cell">
                <div class="name-avatar" style="background:${lv.text};">${st.name.charAt(0)}</div>
                <span>${st.name}</span>
              </td>
              <td style="text-align:center;">
                <strong style="color:${lv.text};font-size:12px;">${pct}%</strong>
                <div style="color:#94a3b8;font-size:8px;">${st.scoreRaw} ball</div>
              </td>
              <td style="text-align:center;">
                <span class="lb-badge" style="background:${lv.badge};color:${lv.text};border:1px solid ${lv.border};">
                  ${lv.label}
                </span>
              </td>
              <td>
                <div class="lb-bar-wrap">
                  <div class="lb-bar-bg" style="background:${barBg};">
                    <div class="lb-bar-fill" style="width:${pct}%;background:${barColor};"></div>
                  </div>
                  <span class="lb-pct" style="color:${barColor};">${pct}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- STRENGTHS / WEAKNESSES -->
    <div class="two-col">
      <div class="sw-card green-card">
        <div class="sw-title">✅ Sinf Kuchli Tomonlari</div>
        <ul class="sw-list">
          ${(ov.classStrengths || []).map((s: string) => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      <div class="sw-card red-card">
        <div class="sw-title">⚡ Sinf Zaif Tomonlari</div>
        <ul class="sw-list">
          ${(ov.classWeaknesses || []).map((w: string) => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- RECOMMENDATIONS -->
    <div class="rec-card">
      <div class="rec-title">🎓 O'qituvchiga Metodik Tavsiyalar</div>
      <ol class="rec-list">
        ${(ov.teacherRecommendations || []).map((r: string) => `<li>${r}</li>`).join('')}
      </ol>
    </div>

    <!-- TOPICS TABLE -->
    ${(analysisResult.curriculumTopics?.length ?? 0) > 0 ? `
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">📚 O'tilgan Mavzular va Ularning Hayotiy Zarurati</div>
      </div>
      <table class="topics-tbl">
        <thead>
          <tr>
            <th style="width:24%;">Mavzu</th>
            <th style="width:36%;">Nima uchun bolaga kerak?</th>
            <th style="width:40%;">Real hayot va kasblarda</th>
          </tr>
        </thead>
        <tbody>
          ${(analysisResult.curriculumTopics || []).slice(0, 5).map((t: CurriculumTopicInsight) => `
          <tr>
            <td><strong>${t.topic}</strong><br/><span class="tbl-sub">${t.category ?? ''}</span></td>
            <td>${t.whyItMattersForChild}</td>
            <td>${t.realWorldApplication}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <footer class="sig-footer">
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Fan o'qituvchisi</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Metodist / Ilmiy mudir</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Maktab direktori</div></div>
    </footer>
  </div>`;

  /* ─────────────── PER-STUDENT PAGES ─────────────── */
  const studentPages = (analysisResult.studentAnalyses || [])
    .map((st: StudentAnalysis, idx: number) => {
      const pct   = st.scorePercent;
      const lv    = getLevel(st.level);
      const gColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
      const rank  = sorted.findIndex(s => s.name === st.name) + 1;

      /* subject mastery bars — approximate from scoreRaw vs total */
      const hasMastery = (st as any).subjectMastery && Object.keys((st as any).subjectMastery).length > 0;
      const masteryHtml = hasMastery
        ? Object.entries((st as any).subjectMastery as Record<string, number>)
            .map(([k, v]) => topicBar(k, v))
            .join('')
        : '';

      return `
  <div class="a4-sheet student-sheet">

    <!-- HEADER -->
    <header class="doc-hdr">
      <div class="hdr-brand">
        <div class="hdr-logo">HB</div>
        <div>
          <div class="hdr-title">MAKTAB TA'LIM VA DIAGNOSTIKA TIZIMI</div>
          <div class="hdr-sub">O'quvchining Shaxsiy Diagnostika va Rivojlanish Varaqasi · Ota-onalar uchun</div>
        </div>
      </div>
      <div class="hdr-right">
        <div class="hdr-code">BLANKA №&nbsp;${String(idx + 1).padStart(2, '0')}&nbsp;/&nbsp;${st.name.substring(0, 3).toUpperCase()}</div>
        <div class="hdr-date">${todayShort}</div>
      </div>
    </header>

    <!-- STUDENT HERO -->
    <div class="st-hero" style="background:${lv.bg};border:1.5px solid ${lv.border};">
      <div class="st-hero-left">
        <div class="st-avatar" style="background:${gColor};">
          ${st.name.charAt(0).toUpperCase()}
        </div>
        <div class="st-info">
          <div class="st-name">${st.name}</div>
          <div class="st-meta">
            <span>📖 ${test?.title ?? 'Diagnostika'}</span>
            <span>·</span>
            <span>📚 ${test?.subject ?? 'Umumiy Fan'}</span>
            <span>·</span>
            <span>📅 ${todayShort}</span>
          </div>
          <div class="st-rank-row">
            <span class="rank-pill" style="background:${lv.badge};color:${lv.text};border:1px solid ${lv.border};">
              ${rankIcon(rank - 1)}&nbsp; Sinfda ${rank}-o'rin
            </span>
            <span class="level-pill" style="background:${lv.text};color:#fff;">
              ${lv.label}
            </span>
          </div>
        </div>
      </div>
      <div class="st-gauge">
        ${gauge(pct, gColor)}
        <div class="gauge-raw">${st.scoreRaw} ball</div>
      </div>
    </div>

    <!-- PERSONALITY INSIGHT -->
    ${st.personalityInsight ? `
    <div class="insight-bar">
      <span class="insight-icon">🧠</span>
      <div>
        <div class="insight-title">Psixologik-Pedagogik Profil</div>
        <div class="insight-text">${st.personalityInsight}</div>
      </div>
    </div>` : ''}

    <!-- STRENGTHS & WEAKNESSES -->
    <div class="two-col">
      <div class="sw-card green-card">
        <div class="sw-title">✅ Kuchli Tomonlar</div>
        <ul class="sw-list">
          ${(st.strengths || []).map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      <div class="sw-card red-card">
        <div class="sw-title">⚡ Mustahkamlash Kerak</div>
        <ul class="sw-list">
          ${(st.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- MASTERY BARS (if available) -->
    ${masteryHtml ? `
    <div class="mastery-wrap">
      <div class="mastery-title">📊 Fan bo'yicha o'zlashtirish darajasi</div>
      ${masteryHtml}
    </div>` : ''}

    <!-- PARENT LETTER -->
    <div class="parent-card">
      <div class="parent-badge">✉️ &nbsp;Hurmatli Ota-Onaga Maxsus Murojaat</div>
      <p class="parent-body">${st.parentReport ?? ''}</p>
    </div>

    <!-- ROADMAP -->
    <div class="roadmap-wrap">
      <div class="roadmap-hdr">
        <div class="roadmap-title">🗺️ &nbsp;3 Bosqichli Shaxsiy Rivojlanish Yo'l Xaritasi</div>
        <div class="roadmap-sub">Maqsadli o'quv rejasi · Har bosqich 2–4 hafta</div>
      </div>
      <div class="rm-grid">
        ${(st.roadmap || []).map((step, si) => stepCard(step, si)).join('')}
      </div>
    </div>

    <!-- PROGRESS SCALE -->
    <div class="scale-wrap">
      <div class="scale-labels">
        <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
      </div>
      <div class="scale-bar">
        <div class="scale-marker" style="left:${Math.min(97, Math.max(2, pct))}%;"></div>
      </div>
      <div class="scale-zones">
        <span style="color:#ef4444;">Sayoz (0–35)</span>
        <span style="color:#f59e0b;">Zaif (35–60)</span>
        <span style="color:#84cc16;">O'rta (60–75)</span>
        <span style="color:#22c55e;">Yaxshi (75–90)</span>
        <span style="color:#15803d;">A'lo (90–100)</span>
      </div>
    </div>

    <!-- SIGNATURE FOOTER -->
    <footer class="sig-footer">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-lbl">Fan o'qituvchisi (F.I.Sh va imzo)</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-lbl">Maktab ma'muriyati / Metodist</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-lbl">Ota-ona tanishdim (Imzo)</div>
      </div>
    </footer>

    <!-- PAGE NUMBER WATERMARK -->
    <div class="page-num">${idx + 2}</div>
  </div>`;
    })
    .join('');

  /* ─────────────── CSS ─────────────── */
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=Playfair+Display:wght@700;800;900&display=swap');
@page{size:A4 portrait;margin:10mm 12mm;}
*{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:'Inter',system-ui,sans-serif;
  font-size:10.5px;line-height:1.5;color:#111;
  background:#e8eaed;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}

/* ── TOP ACTION BAR ── */
.topbar{
  position:sticky;top:0;z-index:1000;
  background:linear-gradient(90deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);
  padding:11px 28px;
  display:flex;justify-content:space-between;align-items:center;
  box-shadow:0 2px 20px rgba(0,0,0,.35);
}
.tb-left{display:flex;align-items:center;gap:12px;}
.tb-logo{
  width:36px;height:36px;border-radius:9px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:900;color:#fff;letter-spacing:.5px;flex-shrink:0;
}
.tb-info{color:#fff;}
.tb-title{font-size:12.5px;font-weight:700;}
.tb-sub{font-size:9.5px;opacity:.5;margin-top:1px;}
.tb-actions{display:flex;gap:8px;}
.btn-pdf{
  background:linear-gradient(135deg,#10b981,#059669);color:#fff;
  border:none;padding:9px 20px;border-radius:9px;
  font-family:'Inter',sans-serif;font-size:11.5px;font-weight:800;
  cursor:pointer;display:flex;align-items:center;gap:7px;
  box-shadow:0 4px 14px rgba(16,185,129,.4);transition:transform .15s;
}
.btn-pdf:hover{transform:translateY(-1px);}
.btn-close{
  background:rgba(255,255,255,.08);color:#fff;
  border:1px solid rgba(255,255,255,.15);
  padding:8px 15px;border-radius:8px;
  font-family:'Inter',sans-serif;font-size:11px;font-weight:600;
  cursor:pointer;transition:background .15s;
}
.btn-close:hover{background:rgba(255,255,255,.15);}
kbd{
  background:rgba(255,255,255,.15);border-radius:5px;
  padding:1px 7px;font-size:10px;font-family:monospace;
}

/* ── A4 WRAPPER ── */
.a4-wrap{max-width:210mm;margin:24px auto 40px;}
.a4-sheet{
  background:#fff;width:210mm;min-height:297mm;
  padding:11mm 13mm 10mm;margin-bottom:18px;
  box-shadow:0 4px 28px rgba(0,0,0,.1);border-radius:3px;
  position:relative;display:flex;flex-direction:column;gap:8px;
}
.student-sheet{page-break-before:always;break-before:page;page-break-inside:avoid;break-inside:avoid;}

/* ── DOC HEADER ── */
.doc-hdr{
  display:flex;justify-content:space-between;align-items:center;
  border-bottom:2.5px solid #0f172a;padding-bottom:9px;
}
.hdr-brand{display:flex;align-items:center;gap:11px;}
.hdr-logo{
  width:42px;height:42px;border-radius:10px;
  background:#0f172a;color:#fff;font-weight:900;font-size:15px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.hdr-title{font-size:11.5px;font-weight:800;letter-spacing:.3px;color:#0f172a;}
.hdr-sub{font-size:8.5px;color:#64748b;font-weight:500;margin-top:2px;}
.hdr-right{text-align:right;}
.hdr-code{font-family:'Courier New',monospace;font-size:10px;font-weight:700;color:#0f172a;}
.hdr-date{font-size:8.5px;color:#64748b;margin-top:2px;}

/* ── CLASS HERO ── */
.class-hero{
  background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0c2340 100%);
  border-radius:14px;padding:18px 22px;color:#fff;
  display:flex;justify-content:space-between;align-items:center;gap:16px;
}
.hero-left{flex:1;}
.hero-eyebrow{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.6;margin-bottom:5px;}
.hero-h1{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;font-weight:800;line-height:1.2;margin-bottom:7px;
}
.hero-meta{font-size:9.5px;opacity:.65;display:flex;gap:7px;flex-wrap:wrap;}
.hero-dot{opacity:.4;}
.hero-stats{display:flex;align-items:center;gap:12px;flex-shrink:0;}
.hero-stat-item{text-align:center;}
.hero-stat-val{font-size:26px;font-weight:900;line-height:1;color:#fff;}
.hero-stat-val.green{color:#4ade80;}
.hero-stat-val.red{color:#f87171;}
.hero-stat-unit{font-size:14px;font-weight:700;}
.hero-stat-lbl{font-size:8px;opacity:.6;margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
.hero-sep{width:1px;height:36px;background:rgba(255,255,255,.2);}

/* ── SECTION WRAPPER ── */
.section{}
.section-hdr{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
.section-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#0f172a;}
.section-badge{
  background:#0f172a;color:#fff;font-size:8px;font-weight:800;
  padding:2px 8px;border-radius:999px;
}

/* ── LEADERBOARD TABLE ── */
.lb-table{width:100%;border-collapse:collapse;font-size:9.5px;}
.lb-table th{
  background:#f8fafc;border-bottom:2px solid #e2e8f0;
  font-size:8.5px;font-weight:800;text-transform:uppercase;
  letter-spacing:.5px;color:#64748b;padding:7px 9px;
}
.lb-table td{padding:6px 9px;vertical-align:middle;}
.tr-even td{background:#fafafa;}
.lb-table tbody tr:hover td{background:#f1f5f9;}
.rank-cell{font-size:11px;text-align:center;width:36px;}
.name-cell{display:flex;align-items:center;gap:7px;font-weight:600;color:#0f172a;}
.name-avatar{
  width:24px;height:24px;border-radius:7px;flex-shrink:0;
  color:#fff;font-size:11px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
}
.lb-badge{
  font-size:8px;font-weight:800;padding:2px 8px;
  border-radius:999px;letter-spacing:.4px;white-space:nowrap;
}
.lb-bar-wrap{display:flex;align-items:center;gap:7px;}
.lb-bar-bg{flex:1;height:8px;border-radius:999px;overflow:hidden;}
.lb-bar-fill{height:100%;border-radius:999px;}
.lb-pct{font-size:9px;font-weight:800;white-space:nowrap;min-width:30px;text-align:right;}

/* ── STRENGTHS / WEAKNESSES ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sw-card{border-radius:12px;padding:10px 13px;}
.green-card{background:#f0fdf4;border:1.5px solid #bbf7d0;}
.red-card{background:#fff1f2;border:1.5px solid #fecdd3;}
.sw-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
.green-card .sw-title{color:#166534;}
.red-card .sw-title{color:#9f1239;}
.sw-list{padding-left:14px;list-style:disc;}
.sw-list li{font-size:10px;padding:2.5px 0;line-height:1.4;}
.green-card .sw-list li{color:#14532d;}
.red-card .sw-list li{color:#881337;}

/* ── RECOMMENDATIONS ── */
.rec-card{background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:10px 13px;}
.rec-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#1e40af;margin-bottom:6px;}
.rec-list{padding-left:15px;color:#1e3a8a;}
.rec-list li{font-size:10px;padding:2.5px 0;line-height:1.4;}

/* ── TOPICS TABLE ── */
.topics-tbl{width:100%;border-collapse:collapse;font-size:9.5px;}
.topics-tbl th{
  background:#f1f5f9;border:1px solid #e2e8f0;
  font-size:8.5px;font-weight:800;text-transform:uppercase;
  letter-spacing:.4px;color:#0f172a;padding:7px 10px;
}
.topics-tbl td{border:1px solid #e2e8f0;padding:7px 10px;vertical-align:top;color:#1e293b;}
.tbl-sub{font-size:8px;color:#94a3b8;display:block;margin-top:1px;}

/* ── STUDENT HERO ── */
.st-hero{
  border-radius:14px;padding:14px 16px;
  display:flex;justify-content:space-between;align-items:center;gap:12px;
}
.st-hero-left{display:flex;align-items:center;gap:12px;flex:1;}
.st-avatar{
  width:52px;height:52px;border-radius:14px;
  color:#fff;font-size:22px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.15);
}
.st-info{}
.st-name{font-size:19px;font-weight:800;color:#0f172a;line-height:1.15;margin-bottom:3px;}
.st-meta{font-size:9px;color:#64748b;display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px;}
.st-rank-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.rank-pill{
  font-size:8.5px;font-weight:800;padding:3px 10px;
  border-radius:999px;display:inline-flex;align-items:center;gap:4px;
}
.level-pill{
  font-size:8px;font-weight:900;padding:3px 10px;
  border-radius:999px;letter-spacing:.5px;
}
.st-gauge{text-align:center;flex-shrink:0;}
.gauge-raw{font-size:8.5px;color:#94a3b8;font-weight:600;margin-top:2px;}

/* ── INSIGHT BAR ── */
.insight-bar{
  background:#f8fafc;border-left:4px solid #6366f1;
  border-radius:8px;padding:9px 12px;
  display:flex;gap:9px;align-items:flex-start;
}
.insight-icon{font-size:14px;flex-shrink:0;margin-top:1px;}
.insight-title{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#4338ca;margin-bottom:2px;}
.insight-text{font-size:10px;color:#334155;line-height:1.45;}

/* ── MASTERY BARS ── */
.mastery-wrap{border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 13px;}
.mastery-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#0f172a;margin-bottom:7px;}
.tm-row{display:flex;align-items:center;gap:7px;margin-bottom:5px;}
.tm-label{font-size:9px;font-weight:600;color:#374151;width:80px;flex-shrink:0;}
.tm-bar-bg{flex:1;height:8px;border-radius:999px;overflow:hidden;}
.tm-bar-fill{height:100%;border-radius:999px;}
.tm-pct{font-size:9px;font-weight:800;min-width:28px;text-align:right;}

/* ── PARENT LETTER ── */
.parent-card{
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
  border-radius:12px;padding:13px 15px;
}
.parent-badge{font-size:8.5px;font-weight:900;color:#fbbf24;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
.parent-body{font-size:10.5px;line-height:1.6;color:#f1f5f9;}

/* ── ROADMAP ── */
.roadmap-wrap{border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 13px;}
.roadmap-hdr{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.roadmap-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#0f172a;}
.roadmap-sub{font-size:8px;color:#94a3b8;font-weight:500;}
.rm-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.rm-card{
  background:#f8fafc;border-radius:9px;padding:9px 10px;
  border:1.5px solid #f1f5f9;border-top-width:3px;
  display:flex;flex-direction:column;gap:4px;
}
.rm-head{display:flex;justify-content:space-between;align-items:center;}
.rm-num{font-size:9.5px;font-weight:900;}
.rm-dur{font-size:7.5px;color:#64748b;font-weight:700;background:#e2e8f0;padding:1px 6px;border-radius:999px;}
.rm-focus{font-size:10px;font-weight:700;color:#1e293b;line-height:1.3;}
.rm-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;}
.rm-list{padding-left:11px;list-style:disc;color:#475569;}
.rm-list li{font-size:9px;padding:1px 0;line-height:1.35;}
.rm-chip{
  border-radius:6px;padding:5px 7px;
  font-size:8.5px;line-height:1.3;
  display:flex;gap:5px;align-items:flex-start;
}
.rm-parent{background:#fffbeb;border:1px solid #fde68a;color:#78350f;}
.rm-outcome{background:#ecfdf5;border:1px solid #d1fae5;color:#064e3b;}

/* ── PROGRESS SCALE ── */
.scale-wrap{margin-top:2px;}
.scale-labels{display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;font-weight:600;padding:0 1px;margin-bottom:3px;}
.scale-bar{
  height:10px;border-radius:999px;position:relative;
  background:linear-gradient(90deg,#ef4444 0%,#f97316 20%,#eab308 40%,#84cc16 65%,#22c55e 85%,#15803d 100%);
  box-shadow:inset 0 2px 4px rgba(0,0,0,.1);
}
.scale-marker{
  position:absolute;top:50%;transform:translate(-50%,-50%);
  width:14px;height:14px;background:#fff;border-radius:50%;
  border:2.5px solid #0f172a;box-shadow:0 1px 4px rgba(0,0,0,.25);
}
.scale-zones{display:flex;justify-content:space-between;font-size:7.5px;font-weight:700;margin-top:3px;padding:0 1px;}

/* ── SIGNATURE FOOTER ── */
.sig-footer{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;
  padding-top:10px;border-top:1.5px solid #e2e8f0;margin-top:auto;
}
.sig-block{text-align:center;}
.sig-line{border-bottom:1.5px dashed #94a3b8;height:22px;margin-bottom:4px;}
.sig-lbl{font-size:8px;color:#475569;font-weight:600;line-height:1.3;}

/* ── PAGE NUMBER ── */
.page-num{
  position:absolute;bottom:8mm;right:13mm;
  font-size:8px;color:#cbd5e1;font-weight:600;
}

/* ── PRINT OVERRIDES ── */
@media print{
  body{background:#fff!important;}
  .topbar{display:none!important;}
  .a4-wrap{margin:0!important;max-width:100%!important;width:100%!important;}
  .a4-sheet{
    margin:0!important;padding:8mm 10mm!important;
    box-shadow:none!important;border-radius:0!important;
    min-height:280mm!important;
  }
}`;

  /* ─────────────── FULL HTML ─────────────── */
  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${test?.title ?? 'Diagnostika'} — AI Sinf Xulosasi</title>
<style>${css}</style>
</head>
<body>

<!-- ACTION BAR -->
<div class="topbar">
  <div class="tb-left">
    <div class="tb-logo">HB</div>
    <div class="tb-info">
      <div class="tb-title">🖨️ AI Diagnostika va Sinf Tahlili — Rasmiy Pechat Uchun</div>
      <div class="tb-sub">
        Jami ${(analysisResult.studentAnalyses || []).length} nafar o'quvchi &nbsp;·&nbsp;
        Har biri uchun alohida A4 varaq tayyorlandi
      </div>
    </div>
  </div>
  <div class="tb-actions">
    <button class="btn-pdf" onclick="window.print()">
      🖨️ &nbsp;Pechat / PDF Saqlash &nbsp;<kbd>Ctrl + P</kbd>
    </button>
    <button class="btn-close" onclick="window.close()">✕ Yopish</button>
  </div>
</div>

<div class="a4-wrap">
  ${classPage}
  ${studentPages}
</div>

<script>
window.addEventListener('load',function(){setTimeout(function(){window.print();},700);});
</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
