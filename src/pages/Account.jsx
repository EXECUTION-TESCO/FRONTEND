import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { api, replaceToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Field, ErrorBox } from '../components/ui.jsx';

export default function Account() {
  const { user, setUser, isHead, logout } = useAuth();

  // ---- Profile (name / designation / contact) ----
  const [p, setP] = useState({ name: user.name || '', designation: user.designation || '', phone: user.phone || '', email: user.email || '' });
  const [pMsg, setPMsg] = useState('');
  const [pErr, setPErr] = useState('');
  const [pBusy, setPBusy] = useState(false);
  const saveProfile = async (e) => {
    e.preventDefault(); setPErr(''); setPMsg('');
    if (!p.name.trim()) { setPErr('Name cannot be empty'); return; }
    setPBusy(true);
    try { const d = await api('/auth/profile', { method: 'PUT', body: p }); setUser(d.user); setPMsg('Profile updated'); }
    catch (ex) { setPErr(ex.message); } finally { setPBusy(false); }
  };

  // ---- Password ----
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try { const d = await api('/auth/change-password', { method: 'POST', body: f }); replaceToken(d.token); if (d.user) setUser(d.user); setMsg('Password changed. Other devices have been logged out.'); setF({ currentPassword: '', newPassword: '' }); }
    catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="narrow">
      <div className="page-head"><h2>My Account</h2></div>

      <div className="panel">
        <div className="eng-top"><div className="avatar">{(user.name || '?')[0]}</div><div><div className="eng-name">{user.name}</div><div className="muted small">@{user.username} · {isHead ? 'Execution Head' : 'Execution Team'}</div></div></div>
      </div>

      <form className="panel" onSubmit={saveProfile}>
        <h3>Profile Details</h3>
        <ErrorBox error={pErr} />
        {pMsg && <div className="alert success">{pMsg}</div>}
        <div className="form-grid">
          <Field label="Full Name *"><input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></Field>
          <Field label="Designation"><input value={p.designation} onChange={(e) => setP({ ...p, designation: e.target.value })} placeholder="e.g. Execution Head" /></Field>
          <Field label="Phone"><input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} inputMode="tel" /></Field>
          <Field label="Email"><input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></Field>
        </div>
        <div className="muted small" style={{ margin: '4px 0 10px' }}>Your username and role can't be changed here.</div>
        <button className="btn primary" disabled={pBusy}><Save size={16} /> {pBusy ? 'Saving…' : 'Save Profile'}</button>
      </form>

      <form className="panel" onSubmit={submit}>
        <h3>Change Password</h3>
        <ErrorBox error={err} />
        {msg && <div className="alert success">{msg}</div>}
        <Field label="Current Password"><input type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></Field>
        <Field label="New Password" hint="Minimum 8 characters"><input type="password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required minLength={8} /></Field>
        <button className="btn primary">Update Password</button>
      </form>

      <button className="btn ghost block mobile-only" onClick={logout}><LogOut size={18} /> Logout</button>
    </div>
  );
}
