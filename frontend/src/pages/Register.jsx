import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const APPROVAL_COLOR = { pending: 'var(--amber)', cleared: 'var(--green)', rejected: 'var(--red)' };

const STATE_COLOR = {
  submitted: 'var(--green)',
  'due-soon': 'var(--amber)',
  overdue: 'var(--red)',
  pending: 'var(--muted)',
};
const SEV_COLOR = {
  critical: 'var(--red)', severe: 'var(--red)', high: '#fb923c', significant: '#fb923c',
  medium: 'var(--amber)', low: '#93c5fd', none: 'var(--muted)',
};

export default function Register() {
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState('vulnerabilities');
  const [vulns, setVulns] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [productFilter, setProductFilter] = useState('');

  function reload() {
    api.listVulnerabilities().then((d) => setVulns(d.vulnerabilities)).catch((e) => setError(e.message));
    api.listIncidents().then((d) => setIncidents(d.incidents)).catch((e) => setError(e.message));
  }
  useEffect(() => {
    api.registerMeta().then(setMeta).catch((e) => setError(e.message));
    reload();
  }, []);

  if (!meta) return <div className="center spinner">Loading…</div>;

  const isVuln = tab === 'vulnerabilities';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function add() {
    setError('');
    try {
      if (isVuln) await api.createVulnerability(form);
      else await api.createIncident(form);
      setForm({});
      setShowForm(false);
      reload();
    } catch (e) { setError(e.message); }
  }
  async function remove(id) {
    if (!confirm('Delete this entry?')) return;
    if (isVuln) await api.deleteVulnerability(id); else await api.deleteIncident(id);
    reload();
  }
  async function markStage(item, stageId) {
    const submissions = { ...(item.submissions || {}), [stageId]: new Date().toISOString() };
    if (isVuln) await api.updateVulnerability(item.id, { submissions });
    else await api.updateIncident(item.id, { submissions });
    reload();
  }

  const allItems = isVuln ? vulns : incidents;
  const products = [...new Set([...vulns, ...incidents].map((x) => x.product).filter(Boolean))];
  const items = productFilter ? allItems.filter((x) => x.product === productFilter) : allItems;

  return (
    <div className="container wide">
      <h1>Vulnerability &amp; incident register</h1>
      <p className="muted">
        Track vulnerabilities and incidents. For actively-exploited vulnerabilities and severe
        incidents, the CRA Article 14 reporting deadlines (24h / 72h / final report) are calculated
        for you and shown below.
      </p>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className={`btn ${isVuln ? '' : 'secondary'}`} onClick={() => { setTab('vulnerabilities'); setShowForm(false); }}>
          Vulnerabilities ({vulns.length})
        </button>
        <button className={`btn ${!isVuln ? '' : 'secondary'}`} onClick={() => { setTab('incidents'); setShowForm(false); }}>
          Incidents ({incidents.length})
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => { setForm({}); setShowForm((s) => !s); }}>
          {showForm ? 'Cancel' : `+ Add ${isVuln ? 'vulnerability' : 'incident'}`}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card">
          <h2>New {isVuln ? 'vulnerability' : 'incident'}</h2>
          <label>Title *</label>
          <input type="text" value={form.title || ''} onChange={set('title')} />
          <label>Product</label>
          <input type="text" value={form.product || ''} onChange={set('product')} />
          <label>Description</label>
          <input type="text" value={form.description || ''} onChange={set('description')} />
          {isVuln ? (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}><label>CVE</label><input type="text" value={form.cve || ''} onChange={set('cve')} /></div>
                <div style={{ flex: 1, minWidth: 120 }}><label>CVSS (0–10)</label><input type="text" value={form.cvss || ''} onChange={set('cvss')} /></div>
              </div>
              <label>Status</label>
              <select value={form.status || 'open'} onChange={set('status')} className="cps-select">
                {meta.vulnerabilityStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label>Actively exploited?</label>
              <select value={form.activelyExploited || 'no'} onChange={set('activelyExploited')} className="cps-select">
                <option value="no">No</option><option value="yes">Yes</option>
              </select>
            </>
          ) : (
            <>
              <label>Severity</label>
              <select value={form.severity || 'low'} onChange={set('severity')} className="cps-select">
                {meta.incidentSeverities.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label>Status</label>
              <select value={form.status || 'open'} onChange={set('status')} className="cps-select">
                {meta.incidentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
          <label>Date you became aware (starts the reporting clock)</label>
          <input type="datetime-local" value={form.awareDate ? form.awareDate.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, awareDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
          <div className="btn-row">
            <button className="btn" onClick={add} disabled={!form.title}>Save</button>
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label className="small">Filter by product</label>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="cps-select" style={{ maxWidth: 280 }}>
            <option value="">All products</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {items.length === 0 && <div className="card"><p className="muted">No entries yet.</p></div>}

      {/* Vulnerabilities: compact rows linking to the detail/report page */}
      {isVuln && items.map((it) => (
        <div className="list-item" key={it.id}>
          <div className="grow">
            <Link to={`/register/vulnerabilities/${it.id}`} style={{ fontWeight: 600 }}>{it.title}</Link>
            <div className="muted small">
              {it.product}{it.cve ? ` · ${it.cve}` : ''}{it.cvss ? ` · CVSS ${it.cvss}` : ''} · {it.status}
            </div>
          </div>
          {it.severity && <span className="badge" style={{ background: '#1e293b', color: SEV_COLOR[it.severity] || 'var(--text)' }}>{it.severity}</span>}
          {it.reporting?.required && (
            <span className="badge" style={{ background: '#1e293b', color: STATE_COLOR[it.reporting.overall === 'overdue' ? 'overdue' : it.reporting.overall === 'complete' ? 'submitted' : 'due-soon'] }}>
              report {it.reporting.overall}
            </span>
          )}
          {it.approval && <span className="badge" style={{ background: '#1e293b', color: APPROVAL_COLOR[it.approval.state] }}>{it.approval.state === 'cleared' ? '✓ approved' : `${it.approval.approved}/${it.approval.required}`}</span>}
          <Link className="btn secondary" style={{ padding: '4px 10px' }} to={`/register/vulnerabilities/${it.id}`}>Open</Link>
          <button className="btn danger" style={{ padding: '4px 10px' }} onClick={() => remove(it.id)}>Delete</button>
        </div>
      ))}

      {/* Incidents: keep the inline reporting timeline */}
      {!isVuln && items.map((it) => (
        <div className="card" key={it.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong style={{ flex: 1 }}>{it.title}</strong>
            {it.severity && <span className="badge" style={{ background: '#1e293b', color: SEV_COLOR[it.severity] || 'var(--text)' }}>{it.severity}</span>}
            <span className="muted small">{it.status}</span>
            <button className="btn danger" style={{ padding: '4px 10px' }} onClick={() => remove(it.id)}>Delete</button>
          </div>
          {it.product && <div className="muted small">Product: {it.product}</div>}
          {it.description && <p className="small" style={{ margin: '6px 0' }}>{it.description}</p>}

          {it.reporting?.required ? (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div className="small" style={{ marginBottom: 6 }}>
                <strong>CRA reporting</strong> — <span style={{ color: it.reporting.overall === 'overdue' ? 'var(--red)' : it.reporting.overall === 'complete' ? 'var(--green)' : 'var(--amber)' }}>{it.reporting.overall}</span>
                <span className="muted"> · {it.reporting.recipients}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {it.reporting.stages.map((st) => (
                  <div key={st.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', minWidth: 150 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{st.label}</div>
                    <div className="small" style={{ color: STATE_COLOR[st.state] }}>{st.state} · {st.remainingText}</div>
                    <div className="muted" style={{ fontSize: 11 }}>due {new Date(st.dueAtIso).toLocaleString()}</div>
                    {st.state !== 'submitted' && (
                      <button className="btn secondary" style={{ padding: '3px 8px', fontSize: 11, marginTop: 4 }} onClick={() => markStage(it, st.id)}>Mark submitted</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="muted small" style={{ marginTop: 8 }}>
              Not in the mandatory-reporting category (only actively-exploited vulnerabilities and severe incidents must be reported).
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
