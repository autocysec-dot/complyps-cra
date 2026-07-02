import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const TIER_LABEL = {
  default: 'Default', 'important-class-i': 'Important I', 'important-class-ii': 'Important II', critical: 'Critical',
};
const STATE_COLOR = { overdue: 'var(--red)', 'due-soon': 'var(--amber)', pending: 'var(--muted)', submitted: 'var(--green)' };

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!data) return <div className="center spinner">Loading…</div>;

  const { summary, reporting, products, keyDates } = data;
  const readinessColor = summary.avgReadiness == null ? 'var(--muted)'
    : summary.avgReadiness >= 80 ? 'var(--green)' : summary.avgReadiness >= 50 ? 'var(--amber)' : 'var(--red)';
  const cov = summary.overallCoverage;
  const covColor = cov == null ? 'var(--muted)' : cov >= 80 ? 'var(--green)' : cov >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="container wide">
      <h1>Compliance overview</h1>
      <p className="muted">Your CRA posture across all products, with open reporting deadlines.</p>

      {/* top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 8 }}>
        <Stat label="Overall coverage" value={cov == null ? '—' : `${cov}%`} color={covColor} sub="across all products" />
        <Stat label="Products" value={summary.totalProducts} sub={`${summary.inScopeCount} in scope · ${summary.outOfScopeCount} out`} />
        <Stat label="Avg Annex I readiness" value={summary.avgReadiness == null ? '—' : `${summary.avgReadiness}%`} color={readinessColor} />
        <Stat label="Reporting overdue" value={reporting.overdue} color={reporting.overdue ? 'var(--red)' : 'var(--green)'} sub={`${reporting.dueSoon} due soon`} />
        <Stat label="Open vulns / incidents" value={`${reporting.openVulnerabilities} / ${reporting.openIncidents}`} />
        <Stat label="Support periods" value={summary.support.expired + summary.support.endingSoon === 0 ? 'OK' : `${summary.support.expired + summary.support.endingSoon}`}
          color={summary.support.expired ? 'var(--red)' : summary.support.endingSoon ? 'var(--amber)' : 'var(--green)'}
          sub={`${summary.support.expired} expired · ${summary.support.endingSoon} ending soon · ${summary.support.notSet} not set`} />
      </div>

      {/* scope mix + docs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
        <div className="card">
          <h2>Risk classes (in scope)</h2>
          {Object.keys(summary.byTier).length === 0 && <p className="muted">No in-scope products yet.</p>}
          {Object.entries(summary.byTier).map(([tier, n]) => (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${tier}`}>{TIER_LABEL[tier] || tier}</span>
              <span className="muted small">{n} product{n > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Documentation</h2>
          <DocBar label="Self-assessments" done={summary.docs.selfAssessments} total={summary.docs.total} />
          <DocBar label="SBOMs" done={summary.docs.sboms} total={summary.docs.total} />
          <DocBar label="Declarations of Conformity" done={summary.docs.declarations} total={summary.docs.total} />
          <DocBar label="Technical documentation" done={summary.docs.techdocs} total={summary.docs.total} />
        </div>
      </div>

      {/* company-wide items (done once, apply to all products) */}
      <div className="card">
        <h2>Company-wide</h2>
        <p className="muted small">Set up once for your whole company — counts toward every product's coverage.</p>
        <div className="list-item">
          <div className="grow">
            <strong>Coordinated vulnerability disclosure (CVD) policy</strong>
            <div className="muted small">{summary.cvdPolicy ? 'In place — applies to all products' : 'Not set yet'}</div>
          </div>
          <span className="badge" style={{ background: '#1e293b', color: summary.cvdPolicy ? 'var(--green)' : 'var(--amber)' }}>
            {summary.cvdPolicy ? '✓ done' : 'to do'}
          </span>
          <Link className="btn" to="/cvd-policy">{summary.cvdPolicy ? 'View / edit' : 'Create now'}</Link>
        </div>
      </div>

      {/* reporting attention */}
      <div className="card">
        <h2>Reporting needing attention</h2>
        {reporting.attention.length === 0 && <p className="muted">Nothing outstanding. 🎉</p>}
        {reporting.attention.map((a) => (
          <div key={a.id} className="list-item">
            <div className="grow">
              <strong>{a.title}</strong> <span className="muted small">({a.kind}{a.product ? ` · ${a.product}` : ''})</span>
              <div className="small" style={{ color: STATE_COLOR[a.nextState] }}>
                {a.nextStage}: {a.remainingText}{a.nextDueIso ? ` · due ${new Date(a.nextDueIso).toLocaleString()}` : ''}
              </div>
            </div>
            <Link className="btn secondary" to="/register">Open register</Link>
          </div>
        ))}
      </div>

      {/* products table */}
      <div className="card">
        <h2>Products</h2>
        {products.length === 0 && <p className="muted">No products yet. <Link to="/">Run the classifier</Link>.</p>}
        {products.map((p) => (
          <div key={p.id} className="list-item">
            <div className="grow">
              <Link to={`/assessments/${p.id}`} style={{ fontWeight: 600 }}>{p.productName}</Link>
              <div className="muted small">
                {p.inScope ? (p.tierLabel || 'In scope') : 'Out of scope'}
                {p.readiness != null && ` · readiness ${p.readiness}%`}
                {p.support?.status && p.support.status !== 'not-set' && (
                  <span style={{ color: STATE_COLOR[p.support.status === 'expired' ? 'overdue' : p.support.status === 'ending-soon' ? 'due-soon' : 'submitted'] }}>
                    {' · support '}{p.support.status}
                  </span>
                )}
              </div>
            </div>
            <DocDots p={p} />
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Key CRA dates</h2>
        <div className="dates">
          <div className="date-pill"><strong>Entered into force</strong>{keyDates.entryIntoForce}</div>
          <div className="date-pill"><strong>Reporting obligations</strong>{keyDates.reportingObligationsApply}</div>
          <div className="date-pill"><strong>Main obligations</strong>{keyDates.mainObligationsApply}</div>
        </div>
      </div>

      <InsightsStrip />
    </div>
  );
}

const INSIGHTS = [
  { tag: 'Foundations', title: 'What is the EU Cyber Resilience Act?', href: '../blog/what-is-the-cra.html' },
  { tag: 'Scope', title: 'Is my product in scope of the CRA?', href: '../blog/is-my-product-in-scope.html' },
  { tag: 'Timeline', title: 'CRA timeline: the key dates', href: '../blog/cra-timeline-key-dates.html' },
  { tag: 'Requirements', title: 'Annex I: the essential requirements', href: '../blog/annex-i-essential-requirements.html' },
];

function InsightsStrip() {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ margin: 0 }}>CRA Insights from our experts</h2>
        <a href="../blog/" target="_blank" rel="noopener" className="small" style={{ fontWeight: 600 }}>All articles →</a>
      </div>
      <p className="muted small" style={{ marginTop: 4 }}>Short, practical reads to sharpen your CRA know-how — written by the ComplyPS team.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
        {INSIGHTS.map((a) => (
          <a key={a.href} href={a.href} target="_blank" rel="noopener"
             className="insight-card"
             style={{ display: 'block', padding: 14, border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none' }}>
            <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: 11 }}>{a.tag}</span>
            <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--text)' }}>{a.title}</div>
            <div className="small" style={{ marginTop: 6, color: 'var(--primary)', fontWeight: 600 }}>Read →</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="muted small">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function DocBar({ label, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="small" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span className="muted">{done}/{total}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function DocDots({ p }) {
  const dot = (ok, title) => (
    <span title={title} style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: ok ? 'var(--green)' : 'var(--border)' }} />
  );
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {dot(p.hasSelfAssessment, 'Self-assessment')}
      {dot(p.hasDeclaration, 'Declaration')}
      {dot(p.hasTechdoc, 'Technical documentation')}
    </div>
  );
}
