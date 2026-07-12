import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { useAuth } from '../auth.jsx';

const PRIVACY_URL = '../../privacy.html';

// Demo access is gated: a visitor requests it (name + email + consent), an admin
// approves and sends them a link with ?key=... which unlocks the read-only demo.
export default function Demo() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const key = params.get('key');

  const [state, setState] = useState(key ? 'entering' : 'form');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', consent: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api.demoLogin(key)
      .then((d) => { if (cancelled) return; setToken(d.token); setUser(d.user); navigate('/overview', { replace: true }); })
      .catch((e) => { if (cancelled) return; setError(e.message); setState('form'); });
    return () => { cancelled = true; };
  }, [key]);

  const set = (k) => (e) => setForm({ ...form, [k]: k === 'consent' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.consent) { setError('Please agree to the privacy policy to continue.'); return; }
    setBusy(true);
    try { await api.requestDemo(form); setState('done'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (state === 'entering') return <div className="center spinner">Entering the live demo…</div>;

  if (state === 'done') {
    return (
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h1>Demo request received</h1>
          <p className="muted">
            Thanks! We'll review your request and email a private demo link to <strong>{form.email}</strong>.
            The demo is a read-only tour of the tool with sample data.
          </p>
          <div className="btn-row"><Link className="btn" to="/">Try the classifier meanwhile</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>Request a live demo</h1>
        <p className="muted small">
          The live demo is a guided, read-only tour with example data. Tell us who you are and we'll
          send you a private access link. It takes a moment to approve.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <label>Your name *</label>
          <input type="text" value={form.name} onChange={set('name')} required />
          <label>Work email *</label>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          <label>Company</label>
          <input type="text" value={form.company} onChange={set('company')} />
          <label>Anything you'd like to see?</label>
          <textarea rows={2} value={form.message} onChange={set('message')} />

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 400, marginTop: 14 }}>
            <input type="checkbox" required checked={form.consent} onChange={set('consent')} style={{ width: 'auto', marginTop: 3 }} />
            <span className="small">
              I agree that ComplyPS may store my name and email to respond to this request, as described in
              the <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy Policy</a>.
            </span>
          </label>

          <div className="btn-row">
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Request demo access'}</button>
            <Link className="btn secondary" to="/login">Customer log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
