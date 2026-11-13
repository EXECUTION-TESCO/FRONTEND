import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { photoUrl } from '../api.js';

export default function PhotoGrid({ report, small }) {
  const [idx, setIdx] = useState(-1);
  const photos = report.photos || [];
  if (!photos.length) return <div className="muted small">No photos uploaded</div>;
  const cur = photos[idx];
  return (
    <>
      <div className={`photo-grid ${small ? 'small' : ''}`}>
        {photos.map((p, i) => (
          <button key={p.id} className="thumb" onClick={() => setIdx(i)}>
            <img src={photoUrl(report.id, p.id)} alt={`Site photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {cur && (
        <div className="lightbox" onClick={() => setIdx(-1)}>
          <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
            <span>{report.projectName} · {idx + 1} / {photos.length}</span>
            <div>
              <a className="icon-btn light" href={photoUrl(report.id, cur.id, true)} title="Download"><Download size={20} /></a>
              <button className="icon-btn light" onClick={() => setIdx(-1)} title="Close"><X size={22} /></button>
            </div>
          </div>
          {photos.length > 1 && <button className="lb-nav left" onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + photos.length) % photos.length); }}><ChevronLeft size={30} /></button>}
          <img src={photoUrl(report.id, cur.id)} alt="" onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && <button className="lb-nav right" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % photos.length); }}><ChevronRight size={30} /></button>}
        </div>
      )}
    </>
  );
}

export function DownloadAll({ report }) {
  if (!report.photos?.length) return null;
  const all = () => report.photos.forEach((p, i) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = photoUrl(report.id, p.id, true);
    a.click();
  }, i * 400));
  return <button className="btn ghost sm" onClick={all}><Download size={16} /> Download all ({report.photos.length})</button>;
}
