import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function RequestAccess() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.requestAccess(form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="card">
          <h1>Request received</h1>
          <p className="muted">
            Thanks — your access request has been sent to our team. We'll review it and set up your
            account, then email you at <strong>{form.email}</strong> with your login details.
          </p>
          <div className="btn-row">
            <Link className="btn" to="/">Back to the classifier</Link>
            <Link className="btn secondary" to="/login">Go to log in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="card">
        <h1>Request access</h1>
        <p className="muted small">
          Accounts are created by our team — there's no self-service sign-up. Tell us a little about
          you and we'll set up your account and email your login details.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Your name *</label>
          <input type="text" value={form.name} onChange={set('name')} required />

          <label>Work email *</label>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />

          <label>Company</label>
          <input type="text" value={form.company} onChange={set('company')} />

          <label>Anything you'd like us to know?</label>
          <textarea rows={3} value={form.message} onChange={set('message')} />

          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Request access'}
            </button>
            <Link className="btn secondary" to="/login">Have an account? Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
