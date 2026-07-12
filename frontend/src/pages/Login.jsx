import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/overview');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="card">
        <h1>Log in</h1>
        <p className="muted small">
          Log in to save your work and revisit past reports. Accounts are created by an
          administrator — you don't sign up yourself. The CRA classifier works without an account;
          logging in is what lets you save.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              required
              autoComplete="current-password"
              style={{ paddingRight: 64 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="btn secondary"
              style={{ position: 'absolute', right: 4, top: 4, padding: '6px 10px', fontSize: 12 }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Log in'}
            </button>
          </div>
        </form>
        <hr style={{ margin: '18px 0', border: 0, borderTop: '1px solid var(--border)' }} />
        <p className="muted small" style={{ margin: 0 }}>
          Don't have an account? <Link to="/request-access">Request access</Link> and an
          administrator will set one up for you.
        </p>
      </div>
    </div>
  );
}
