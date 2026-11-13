import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Check } from 'lucide-react';

export const canUseLiveCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

// Full-screen live camera (back camera by default). Every shot is handed to onCapture as a JPEG File.
export default function CameraCapture({ onCapture, onClose, onFallback }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [facing, setFacing] = useState('environment');
  const [error, setError] = useState('');
  const [shots, setShots] = useState([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        stream.current?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
        setError('');
      } catch (e) {
        setError(e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access for this site in the browser settings, then try again.' : 'No camera could be opened on this device.');
      }
    })();
    return () => { cancelled = true; };
  }, [facing]);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1800 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    setFlash(true); setTimeout(() => setFlash(false), 120);
    c.toBlob((b) => {
      if (!b) return;
      const file = new File([b], `site-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      setShots((s) => [URL.createObjectURL(b), ...s].slice(0, 3));
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="cam" role="dialog" aria-label="Camera">
      <div className="cam-top">
        <span>Site photo {shots.length ? `· ${shots.length} taken` : ''}</span>
        <button className="icon-btn light" onClick={onClose} aria-label="Close camera"><X size={24} /></button>
      </div>
      {error ? (
        <div className="cam-msg">
          <p>{error}</p>
          {onFallback && <button className="btn primary" onClick={onFallback}>Use phone camera app instead</button>}
        </div>
      ) : (
        <video ref={video} playsInline muted autoPlay />
      )}
      <div className={`cam-flash ${flash ? 'on' : ''}`} />
      <div className="cam-bar">
        <div className="cam-thumbs">{shots.map((u) => <img key={u} src={u} alt="" />)}</div>
        <button className="cam-shoot" onClick={shoot} disabled={!!error} aria-label="Take photo" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} disabled={!!error} title="Switch camera"><RefreshCw size={16} /></button>
          <button className="btn primary sm" onClick={onClose}><Check size={16} /> Done</button>
        </div>
      </div>
    </div>
  );
}
