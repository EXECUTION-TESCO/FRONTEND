import { useState } from 'react';
import { api, replaceToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox } from '../components/ui.jsx';

export default function ForceChangePassword() {
  const { user, setUser, logout } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.newPassword !== f.confirm) return setErr('New passwords do not match');
    try { const d = await api('/auth/change-password', { method: 'POST', body: f }); replaceToken(d.token); setUser(d.user); }
    catch (ex) { setErr(ex.message); }
  };
  return (
    <div className="auth center-only">
      <section className="auth-card">
        <img className="auth-card-logo show" src="/tescologo2.png" alt="Tesco Structures" />
        <h2>Set your own password</h2>
        <p className="muted">Hi {user.name}, please replace the temporary password given by the Execution Head.</p>
        <form onSubmit={submit}>
          <ErrorBox error={err} />
          <label className="field"><span className="label">Temporary Password</span><input type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required /></label>
          <label className="field"><span className="label">New Password</span><input type="password" minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required /></label>
          <label className="field"><span className="label">Confirm New Password</span><input type="password" minLength={8} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></label>
          <button className="btn primary block lg">Save & Continue</button>
          <button type="button" className="btn ghost block" onClick={logout}>Logout</button>
        </form>
      </section>
    </div>
  );
}
