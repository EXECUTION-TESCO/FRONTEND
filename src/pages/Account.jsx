import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api, replaceToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Field, ErrorBox } from '../components/ui.jsx';

export default function Account() {
  const { user, isHead, logout } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try { const d = await api('/auth/change-password', { method: 'POST', body: f }); replaceToken(d.token); setMsg('Password changed. Other devices have been logged out.'); setF({ currentPassword: '', newPassword: '' }); }
    catch (ex) { setErr(ex.message); }
  };
  return (
    <div className="narrow">
      <div className="page-head"><h2>My Account</h2></div>
      <div className="panel">
        <div className="eng-top"><div className="avatar">{user.name[0]}</div><div><div className="eng-name">{user.name}</div><div className="muted small">@{user.username} · {isHead ? 'Execution Head' : 'Execution Team'}</div></div></div>
      </div>
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
