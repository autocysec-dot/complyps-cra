import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Account() {
  const { user, isDemo } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setOk(false);
    if (form.next !== form.confirm) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await api.changePassword(form.current, form.next);
      setOk(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1>Your account</h1>
      <p className="muted">{user?.name} · {user?.email} · {user?.role || 'user'}</p>

      <div className="card">
        <h2>Change password</h2>
        {isDemo ? (
          <p className="muted">The demo account is read-only, so its password can't be changed here.</p>
        ) : (
          <>
            {error && <div className="error">{error}</div>}
            {ok && <div className="small" style={{ color: 'var(--green)' }}>✓ Password changed.</div>}
            <form onSubmit={submit}>
              <label>Current password</label>
              <input type="password" value={form.current} onChange={set('current')} required autoComplete="current-password" />
              <label>New password</label>
              <input type="password" value={form.next} onChange={set('next')} required autoComplete="new-password" />
              <label>Confirm new password</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
              <div className="btn-row"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
            </form>
            <p className="muted small" style={{ marginTop: 8 }}>
              Must be at least 10 characters with upper &amp; lower case, a number and a special character.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
