import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

// Client-side mirror of the backend password rules (also fetched from the API
// so the displayed checklist always matches what the server enforces).
const CLIENT_RULES = [
  { id: 'length', label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { id: 'lower', label: 'A lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'An uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'A number (0–9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'A special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState(CLIENT_RULES);

  // Pull the authoritative rule labels from the backend (best-effort).
  useEffect(() => {
    api.passwordPolicy()
      .then((p) => {
        if (p?.rules?.length) {
          const byId = Object.fromEntries(CLIENT_RULES.map((r) => [r.id, r.test]));
          setPolicy(p.rules.map((r) => ({ ...r, test: byId[r.id] || (() => true) })));
        }
      })
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const checks = useMemo(
    () => policy.map((r) => ({ ...r, ok: r.test(form.password) })),
    [policy, form.password]
  );
  const allOk = checks.every((c) => c.ok);
  const confirmOk = form.password.length > 0 && form.password === form.confirm;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (!allOk) { setError('Please meet all the password requirements below.'); return; }
      if (!confirmOk) { setError('Passwords do not match.'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
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
        <h1>{mode === 'login' ? 'Log in' : 'Create an account'}</h1>
        <p className="muted small">
          Accounts let you save and revisit assessments. The classifier itself works without logging in.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>Name</label>
              <input type="text" value={form.name} onChange={set('name')} required />
            </>
          )}
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

          {mode === 'register' && (
            <>
              <ul className="clean small" style={{ marginTop: 10, listStyle: 'none', paddingLeft: 0 }}>
                {checks.map((c) => (
                  <li key={c.id} style={{ color: c.ok ? 'var(--green)' : 'var(--muted)' }}>
                    {c.ok ? '✓' : '○'} {c.label}
                  </li>
                ))}
              </ul>

              <label>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.confirm}
                onChange={set('confirm')}
                required
                autoComplete="new-password"
              />
              {form.confirm.length > 0 && (
                <div className="small" style={{ color: confirmOk ? 'var(--green)' : '#fca5a5', marginTop: 6 }}>
                  {confirmOk ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </>
          )}

          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Need an account?' : 'Have an account?'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
