import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import ResultView from '../components/ResultView.jsx';

export default function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAssessment(id).then((d) => setAssessment(d.assessment)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!assessment) return <div className="center spinner">Loading…</div>;

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ flex: 1 }}>{assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate('/assessments')}>Back</button>
      </div>
      <p className="muted small">
        Created {new Date(assessment.createdAt).toLocaleString()} · last updated{' '}
        {new Date(assessment.updatedAt).toLocaleString()}
      </p>
      <ResultView result={assessment.result} />

      <div className="card">
        <h2>Annex I self-assessment</h2>
        <AnnexReadiness sa={assessment.selfAssessment} />
        <div className="btn-row">
          <Link className="btn" to={`/assessments/${assessment.id}/self-assessment`}>
            {assessment.selfAssessment ? 'Continue self-assessment' : 'Start self-assessment'}
          </Link>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn secondary" onClick={exportJson}>Export as JSON</button>
      </div>
    </div>
  );
}

function AnnexReadiness({ sa }) {
  if (!sa?.score || sa.score.readiness === null) {
    return <p className="muted">Not started yet — assess your product against the essential and vulnerability-handling requirements.</p>;
  }
  const { readiness, considered, gaps } = sa.score;
  const color = readiness >= 80 ? 'var(--green)' : readiness >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ fontSize: 34, fontWeight: 800, color }}>{readiness}%</div>
      <div className="muted small">
        {considered} requirement(s) assessed · {gaps.length} gap(s)
        {gaps.length > 0 && (
          <ul className="clean" style={{ marginTop: 8 }}>
            {gaps.slice(0, 5).map((g) => (
              <li key={g.id}><strong>{g.id}</strong> ({g.status}){g.note ? ` — ${g.note}` : ''}</li>
            ))}
            {gaps.length > 5 && <li>…and {gaps.length - 5} more</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
