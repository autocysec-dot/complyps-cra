import { useEffect, useState } from 'react';
import { api } from '../api.js';

// In-app user guide. Login-only: the content is fetched from the backend at
// view time and never shipped in this static build, so it can't be reached
// without a valid session. No download link — it's for reading in the tool.
export default function Help() {
  const [state, setState] = useState({ loading: true, error: '', html: '', updatedAt: '' });

  useEffect(() => {
    let alive = true;
    api.helpUserGuide()
      .then((d) => { if (alive) setState({ loading: false, error: '', html: d.html, updatedAt: d.updatedAt }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message, html: '', updatedAt: '' }); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1>Help &amp; user guide</h1>
      <p className="muted">How to use ComplyCRA, step by step.</p>

      {state.loading && <div className="center spinner">Loading…</div>}
      {state.error && <div className="error">{state.error}</div>}

      {!state.loading && !state.error && (
        <div className="card">
          <div className="help-content" dangerouslySetInnerHTML={{ __html: state.html }} />
          {state.updatedAt && (
            <p className="muted small" style={{ marginTop: 16 }}>
              Last updated {new Date(state.updatedAt).toLocaleDateString()}. Need more help? Email complyps@outlook.com.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
