// Daily Updates PDF builder (Phase 3).
// Lazy-loads jsPDF from a CDN the first time it's needed, so no build dependency is added.
// Site photos are fetched through the same token URL the app already uses and embedded.
import { photoUrl, fmtDate, fmtDateTime } from './api.js';

const JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
let jsPDFPromise = null;

function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPDFPromise) {
    jsPDFPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_SRC;
      s.async = true;
      s.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF engine failed to initialise')));
      s.onerror = () => { jsPDFPromise = null; reject(new Error('Could not load the PDF engine — check your internet connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  return jsPDFPromise;
}

// Fetch one photo and return { dataUrl, w, h, fmt } or null on any failure (never throws).
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

const NAVY = [30, 27, 75];      // #1e1b4b
const ACCENT = [79, 70, 229];   // #4f46e5
const MUTED = [100, 116, 139];  // #64748b
const LINE = [226, 232, 240];   // #e2e8f0

// Build and download a Daily Updates PDF for a project.
// reports: array of report objects (as returned by the API). Sorted oldest→newest in the PDF.
export async function downloadDailyUpdatesPdf(project, reports, { filename } = {}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 40;                       // page margin
  const CW = PW - M * 2;              // content width
  let y = M;

  const footer = () => {
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text('Tesco Structures — Project Daily Updates', M, PH - 18);
      doc.text(`Page ${i} of ${n}`, PW - M, PH - 18, { align: 'right' });
    }
  };
  const ensure = (need) => { if (y + need > PH - M) { doc.addPage(); y = M; } };
  const text = (str, opts = {}) => {
    const { size = 10, color = [15, 23, 42], bold = false, gap = 4, indent = 0 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(str), CW - indent);
    for (const ln of lines) { ensure(size + gap); doc.text(ln, M + indent, y + size); y += size + gap; }
  };

  // ---- Cover header ----
  doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 86, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(project.name || 'Project', M, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(210, 214, 240);
  const sub = [project.client, project.location].filter(Boolean).join('  ·  ');
  if (sub) doc.text(sub, M, 58);
  doc.text(`Daily Updates${project.handoverRef ? '  ·  ' + project.handoverRef : ''}  ·  ${reports.length} update(s)`, M, 73);
  y = 104;
  doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(`Generated ${fmtDateTime(new Date().toISOString())}`, M, y); y += 18;

  const sorted = [...reports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)) || String(a.createdAt).localeCompare(String(b.createdAt)));

  for (const r of sorted) {
    ensure(60);
    // Date band
    doc.setFillColor(238, 242, 255); doc.setDrawColor(...LINE);
    const bandY = y;
    doc.roundedRect(M, bandY, CW, 24, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY);
    doc.text(fmtDate(r.reportDate), M + 8, bandY + 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    const metaRight = [r.engineerName, r.projectStatus, (r.progressPercent != null ? r.progressPercent + '%' : null)].filter(Boolean).join('  ·  ');
    doc.text(metaRight, PW - M - 8, bandY + 16, { align: 'right' });
    y = bandY + 34;

    let any = false;
    for (const [k, label] of ROWS) {
      const v = r[k];
      if (!v) continue;
      any = true;
      text(label, { size: 9, color: ACCENT, bold: true, gap: 2 });
      let val = String(v);
      if (k === 'materialRequired' && r.materialStatus) val += `  [${r.materialStatus}]`;
      text(val, { size: 10, gap: 4, indent: 2 });
      y += 2;
    }
    if (!any) text('No written details for this update.', { size: 10, color: MUTED });

    // Photos (2 per row)
    const photos = r.photos || [];
    if (photos.length) {
      y += 4;
      text(`Site Photos (${photos.length})`, { size: 9, color: ACCENT, bold: true, gap: 4 });
      const imgs = [];
      for (const p of photos) { const im = await fetchImage(photoUrl(r.id, p.id)); if (im) imgs.push(im); }
      const gap = 10, cols = 2;
      const cellW = (CW - gap * (cols - 1)) / cols;
      let col = 0, rowH = 0, rowTop = y;
      for (const im of imgs) {
        const h = Math.min(cellW * (im.h / im.w), 150);
        if (col === 0) { ensure(h + gap); rowTop = y; rowH = 0; }
        const x = M + col * (cellW + gap);
        try { doc.addImage(im.dataUrl, im.fmt, x, rowTop, cellW, h); } catch { /* skip bad image */ }
        rowH = Math.max(rowH, h);
        col++;
        if (col === cols) { y = rowTop + rowH + gap; col = 0; }
      }
      if (col !== 0) y = rowTop + rowH + gap;
    }
    y += 10;
    ensure(1);
    doc.setDrawColor(...LINE); doc.line(M, y, PW - M, y); y += 12;
  }

  footer();
  const name = filename || `${(project.name || 'project').replace(/[^\w.-]+/g, '_')}_daily_updates.pdf`;
  doc.save(name);
}
