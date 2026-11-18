// Daily Updates PDF builder (Phase 3) — Tesco Structures branded, green theme.
// jsPDF is bundled (code-split) so it loads on first use and never depends on a CDN.
// Site photos are fetched through the same token URL the app already uses and embedded.
import { photoUrl, fmtDate, fmtDateTime } from './api.js';

let jsPDFPromise = null;

// Load jsPDF from the bundled npm package (code-split, so it only downloads on first use).
function loadJsPDF() {
  if (!jsPDFPromise) {
    jsPDFPromise = import('jspdf')
      .then((mod) => mod.jsPDF || (mod.default && mod.default.jsPDF) || mod.default)
      .catch(() => { jsPDFPromise = null; throw new Error('Could not start the PDF engine. Please reload the page and try again.'); });
  }
  return jsPDFPromise;
}

// Fetch an image (photo or the logo) and return { dataUrl, w, h, fmt } or null (never throws).
async function fetchImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(blob); });
    if (!dataUrl) return null;
    const dim = await new Promise((r) => { const im = new Image(); im.onload = () => r({ w: im.width, h: im.height }); im.onerror = () => r(null); im.src = dataUrl; });
    if (!dim) return null;
    const fmt = /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG';
    return { dataUrl, w: dim.w, h: dim.h, fmt };
  } catch { return null; }
}

const ROWS = [
  ['todayProgress', "Today's Work Progress"],
  ['workCompleted', 'Work Completed'],
  ['tomorrowPlan', "Tomorrow's Plan"],
  ['materialRequired', 'Material Required'],
  ['issues', 'Issues / Challenges'],
  ['remarks', 'Remarks'],
];

// ---- Tesco Structures brand palette (green) ----
const GREEN = [108, 190, 44];    // #6CBE2C  bright brand green (logo)
const GREEN_D = [47, 107, 18];   // #2F6B12  deep green (bands / headings)
const GREEN_L = [238, 247, 230]; // #EEF7E6  light green tint (cards)
const INK = [31, 41, 55];        // #1F2937
const MUTED = [100, 116, 139];   // #64748B
const LINE = [222, 231, 210];    // soft green-grey rule

let LOGO = undefined; // cached logo image (fetched once per session)

// Build and download a branded Daily Updates PDF for a project.
export async function downloadDailyUpdatesPdf(project, reports, { filename } = {}) {
  const JsPDF = await loadJsPDF();
  if (LOGO === undefined) LOGO = await fetchImage('/tescologo2.png'); // Tesco Structures wordmark
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = PW - M * 2;
  let y = M;

  const ensure = (need) => { if (y + need > PH - 54) { doc.addPage(); y = M; } };
  const para = (str, opts = {}) => {
    const { size = 10, color = INK, bold = false, gap = 6, indent = 0 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(str == null ? '' : str), CW - indent);
    for (const ln of lines) { ensure(size + gap); doc.text(ln, M + indent, y + size); y += size + gap; }
  };

  const sorted = [...reports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)) || String(a.createdAt).localeCompare(String(b.createdAt)));
  const dates = sorted.map((r) => (r.reportDate || '').slice(0, 10)).filter(Boolean);
  const period = dates.length ? (dates[0] === dates[dates.length - 1] ? fmtDate(dates[0]) : `${fmtDate(dates[0])}  →  ${fmtDate(dates[dates.length - 1])}`) : '—';
  const preparedBy = [...new Set(sorted.map((r) => r.engineerName).filter(Boolean))].join(', ') || '—';
  const location = project.location || (sorted.find((r) => r.siteLocation) || {}).siteLocation || '';

  // ---------- Header: logo + title ----------
  if (LOGO) {
    const lw = 150, lh = Math.min(lw * (LOGO.h / LOGO.w), 48);
    try { doc.addImage(LOGO.dataUrl, LOGO.fmt, M, y, lw, lh); } catch { /* ignore */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...GREEN_D);
    doc.text('DAILY PROGRESS REPORT', PW - M, y + 14, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text('Execution Management', PW - M, y + 28, { align: 'right' });
    doc.text(`Generated ${fmtDateTime(new Date().toISOString())}`, PW - M, y + 40, { align: 'right' });
    y += Math.max(lh, 42) + 10;
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...GREEN_D);
    doc.text('TESCO STRUCTURES', M, y + 16);
    doc.setFontSize(11); doc.text('DAILY PROGRESS REPORT', PW - M, y + 16, { align: 'right' });
    y += 34;
  }
  // Green brand rule
  doc.setDrawColor(...GREEN); doc.setLineWidth(2); doc.line(M, y, PW - M, y); doc.setLineWidth(1);
  y += 14;

  // ---------- Project info card ----------
  const infoRows = [
    ['Client', project.client || '—'],
    ['Location', location || '—'],
    ['Handover Ref', project.handoverRef || '—'],
    ['Reporting Period', period],
    ['Total Updates', String(reports.length)],
    ['Prepared By', preparedBy],
  ];
  const cardPadX = 18, cardTop = y;
  const titleH = 30, rowH = 19, cols = 2, rowsPerCol = Math.ceil(infoRows.length / cols);
  const cardH = titleH + rowsPerCol * rowH + 14;
  doc.setFillColor(...GREEN_L); doc.setDrawColor(...LINE);
  doc.roundedRect(M, cardTop, CW, cardH, 4, 4, 'FD');
  doc.setFillColor(...GREEN_D); doc.rect(M, cardTop, 4, cardH, 'F'); // deep-green accent spine
  // Project name
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...GREEN_D);
  doc.text(String(project.name || 'Project'), M + cardPadX, cardTop + 20);
  // Info grid — generous label column so values never crowd the labels
  const colW = (CW - cardPadX * 2) / cols;
  const labelW = 118;
  doc.setFontSize(9);
  infoRows.forEach((pair, i) => {
    const c = Math.floor(i / rowsPerCol), rr = i % rowsPerCol;
    const x = M + cardPadX + c * colW;
    const ry = cardTop + titleH + rr * rowH + 4;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...MUTED);
    doc.text(pair[0].toUpperCase(), x, ry);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(String(pair[1]), colW - labelW - 6)[0] || '—', x + labelW, ry);
  });
  y = cardTop + cardH + 22;

  // ---------- Section heading ----------
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...GREEN_D);
  doc.text('SITE PROGRESS UPDATES', M, y); y += 8;
  doc.setDrawColor(...LINE); doc.line(M, y, PW - M, y); y += 16;

  // ---------- Each daily update ----------
  for (const r of sorted) {
    ensure(64);
    const bandY = y;
    doc.setFillColor(...GREEN_L); doc.setDrawColor(...LINE);
    doc.roundedRect(M, bandY, CW, 26, 3, 3, 'FD');
    doc.setFillColor(...GREEN); doc.rect(M, bandY, 4, 26, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...GREEN_D);
    doc.text(fmtDate(r.reportDate), M + 12, bandY + 17);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    const metaRight = [r.engineerName, r.projectStatus, (r.progressPercent != null ? r.progressPercent + '% complete' : null)].filter(Boolean).join('   ·   ');
    doc.text(metaRight, PW - M - 10, bandY + 17, { align: 'right' });
    y = bandY + 36;

    let any = false;
    for (const [k, label] of ROWS) {
      const v = r[k];
      if (!v) continue;
      any = true;
      para(label.toUpperCase(), { size: 8.5, color: GREEN_D, bold: true, gap: 3 });
      let val = String(v);
      if (k === 'materialRequired' && r.materialStatus) val += `   [${r.materialStatus}]`;
      para(val, { size: 10, gap: 5, indent: 2 });
      y += 6;
    }
    if (!any) para('No written details recorded for this update.', { size: 10, color: MUTED });

    // Photos (2 per row)
    const photos = r.photos || [];
    if (photos.length) {
      y += 4;
      para(`SITE PHOTOS (${photos.length})`, { size: 8.5, color: GREEN_D, bold: true, gap: 5 });
      const imgs = [];
      for (const p of photos) { const im = await fetchImage(photoUrl(r.id, p.id)); if (im) imgs.push(im); }
      const gap = 10, colsP = 2;
      const cellW = (CW - gap * (colsP - 1)) / colsP;
      let col = 0, rowTop = y, rowH2 = 0;
      for (const im of imgs) {
        const h = Math.min(cellW * (im.h / im.w), 150);
        if (col === 0) { ensure(h + gap); rowTop = y; rowH2 = 0; }
        const x = M + col * (cellW + gap);
        doc.setDrawColor(...LINE); doc.rect(x, rowTop, cellW, h);
        try { doc.addImage(im.dataUrl, im.fmt, x, rowTop, cellW, h); } catch { /* skip */ }
        rowH2 = Math.max(rowH2, h);
        col++;
        if (col === colsP) { y = rowTop + rowH2 + gap; col = 0; }
      }
      if (col !== 0) y = rowTop + rowH2 + gap;
    }
    y += 12;
    ensure(1);
    doc.setDrawColor(...LINE); doc.line(M, y, PW - M, y); y += 14;
  }

  // ---------- Footer on every page ----------
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GREEN); doc.setLineWidth(1.5); doc.line(M, PH - 32, PW - M, PH - 32); doc.setLineWidth(1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GREEN_D);
    doc.text('TESCO STRUCTURES', M, PH - 18);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
    doc.text('Execution Management · Confidential', M + 112, PH - 18);
    doc.text(`Page ${i} of ${n}`, PW - M, PH - 18, { align: 'right' });
  }

  const name = filename || `${(project.name || 'project').replace(/[^\w.-]+/g, '_')}_daily_updates.pdf`;
  doc.save(name);
}
