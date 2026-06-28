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
    if (!confirm('Delete this assessment?')) return;
    await api.deleteAssessment(id);
    load();
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ flex: 1 }}>My assessments</h1>
        <button className="btn" onClick={() => navigate('/')}>New assessment</button>
      </div>
      {error && <div className="error">{error}</div>}
      {items === null && !error && <p className="muted">Loading…</p>}
      {items?.length === 0 && (
        <div className="card"><p className="muted">No saved assessments yet. Run the classifier and save one.</p></div>
      )}
      {items?.map((a) => (
        <div className="list-item" key={a.id}>
          <div className="grow">
            <Link to={`/assessments/${a.id}`} style={{ fontWeight: 600 }}>{a.productName}</Link>
            <div className="muted small">
              {a.inScope ? a.tierLabel : 'Out of scope'}
              {a.readiness !== null && ` · Annex I readiness ${a.readiness}%`}
              {' · updated '}{new Date(a.updatedAt).toLocaleString()}
            </div>
          </div>
          <span className={`badge ${a.inScope ? a.tier : 'out'}`}>
            {a.inScope ? a.tier.replace('important-', 'Imp. ').replace('-', ' ') : 'Out'}
          </span>
          <button className="btn danger" onClick={() => remove(a.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
