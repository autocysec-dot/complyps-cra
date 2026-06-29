import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.listAssessments().then((d) => setItems(d.assessments)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function remove(id) {
    if (!confirm('Delete this product and all its compliance data?')) return;
    await api.deleteAssessment(id);
    load();
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ flex: 1 }}>Products</h1>
        <button className="btn" onClick={() => navigate('/')}>+ New product</button>
      </div>
      <p className="muted small">Each product follows its own step-by-step CRA compliance journey.</p>
      {error && <div className="error">{error}</div>}
      {items === null && !error && <p className="muted">Loading…</p>}
      {items?.length === 0 && (
        <div className="card">
          <p className="muted">No products yet.</p>
          <div className="btn-row"><button className="btn" onClick={() => navigate('/')}>Start your first product</button></div>
        </div>
      )}
      {items?.map((a) => (
        <div className="list-item" key={a.id}>
          <div className="grow">
            <Link to={`/assessments/${a.id}`} style={{ fontWeight: 600 }}>{a.productName}</Link>
            <div className="muted small">
              {a.inScope ? a.tierLabel : 'Out of scope'}
              {a.readiness !== null && ` · Annex I ${a.readiness}%`}
            </div>
            {a.inScope && a.progress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, maxWidth: 320 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${a.progress.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                </div>
                <span className="muted" style={{ fontSize: 11 }}>{a.progress.done}/{a.progress.total}</span>
              </div>
            )}
          </div>
          {a.inScope && a.tier && (
            <span className={`badge ${a.tier}`}>{a.tier.replace('important-class-', 'Class ').replace('default', 'Default').replace('critical', 'Critical')}</span>
          )}
          <button className="btn danger" onClick={() => remove(a.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
