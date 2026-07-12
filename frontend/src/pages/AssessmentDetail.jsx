import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, isDemoUser } from '../api.js';
import ResultView from '../components/ResultView.jsx';

const STATUS = {
  done: { color: 'var(--green)', label: 'Done' },
  'in-progress': { color: 'var(--amber)', label: 'In progress' },
  todo: { color: 'var(--muted)', label: 'To do' },
};

export default function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let timer;
    let cancelled = false;
    const load = () => api.getAssessment(id).then((d) => {
      if (cancelled) return;
      setAssessment(d.assessment);
      // Keep refreshing while the AI gap assessment is running/queued, so the
      // step flips to "Done" automatically when it finishes.
      const gapStep = d.assessment?.journey?.steps?.find((s) => s.id === 'gap');
      if (gapStep?.status === 'in-progress') timer = setTimeout(load, 3000);
    }).catch((e) => !cancelled && setError(e.message));
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!assessment) return <div className="center spinner">Loading…</div>;

  const journey = assessment.journey;

  function exportJson() {
    const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessment.productName.replace(/\s+/g, '_')}_CRA_assessment.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ flex: 1, margin: 0 }}>{assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate('/assessments')}>← Projects</button>
      </div>
      <p className="muted small">
        {assessment.result?.tierLabel || (assessment.result?.inScope === false ? 'Out of scope' : '')}
        {' · updated '}{new Date(assessment.updatedAt).toLocaleString()}
      </p>

      {/* progress */}
      {journey && journey.inScope && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="muted small">Compliance journey</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{journey.progress.percent}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
              <div style={{ width: `${journey.progress.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width .3s' }} />
            </div>
            <div className="muted small" style={{ marginTop: 4 }}>{journey.progress.done} of {journey.progress.total} steps complete</div>
          </div>
        </div>
      )}

      {/* stepper */}
      {journey ? (
        <div className="stepper">
          {journey.steps.map((s, i) => {
            const st = STATUS[s.status] || STATUS.todo;
            const isLast = i === journey.steps.length - 1;
            return (
              <div className="step" key={s.id}>
                <div className="step-rail">
                  <div className="step-dot" style={{ borderColor: st.color, color: st.color }}>
                    {s.status === 'done' ? '✓' : s.n}
                  </div>
                  {!isLast && <div className="step-line" />}
                </div>
                <div className="step-body card" style={s.id === 'package' ? { borderColor: 'var(--primary)' } : undefined}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ flex: 1 }}>{s.title}</strong>
                    {s.companyLevel && <span className="badge" style={{ background: '#1e293b', color: '#93c5fd' }}>company-wide</span>}
                    <span className="badge" style={{ background: '#1e293b', color: st.color }}>{st.label}</span>
                  </div>
                  <div className="muted small" style={{ margin: '4px 0 10px' }}>{s.detail}</div>
                  {s.path ? (
                    <Link className={`btn ${s.status === 'done' ? 'secondary' : ''}`} to={s.path} style={{ padding: '6px 14px' }}>
                      {s.actionLabel}
                    </Link>
                  ) : s.route ? (
                    <Link className={`btn ${s.status === 'done' ? 'secondary' : ''}`} to={`/assessments/${id}/${s.route}`} style={{ padding: '6px 14px' }}>
                      {s.actionLabel}
                    </Link>
                  ) : (
                    <button className="btn secondary" style={{ padding: '6px 14px' }} onClick={() => setShowResult((v) => !v)}>
                      {showResult ? 'Hide details' : s.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><p className="muted">The guided step view appears once your local backend restarts — this happens automatically the next time you log in to this PC.</p></div>
      )}

      {/* classification details (toggled from step 1) */}
      {showResult && <ResultView result={assessment.result} />}

      {/* org-level / ongoing */}
      <div className="card">
        <h2 style={{ fontSize: 16 }}>Company-wide &amp; ongoing</h2>
        <p className="muted small">These apply across all your products, not just this one:</p>
        <div className="btn-row">
          <Link className="btn secondary" to="/register">Vulnerability &amp; incident register</Link>
          <Link className="btn secondary" to="/cvd-policy">CVD policy</Link>
        </div>
      </div>

      {!isDemoUser() && (
        <div className="btn-row">
          <button className="btn secondary" onClick={exportJson}>Export raw data (JSON)</button>
        </div>
      )}
    </div>
  );
}
