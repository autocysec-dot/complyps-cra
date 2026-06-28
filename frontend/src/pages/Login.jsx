import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/assessments');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
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
          <input type="email" value={form.email} onChange={set('email')} required />
          <label>Password</label>
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
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
