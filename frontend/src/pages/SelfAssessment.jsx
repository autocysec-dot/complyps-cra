import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const SCORE = { met: 1, partial: 0.5, 'not-met': 0 };

export default function SelfAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [responses, setResponses] = useState({});
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.annex1(), api.getAssessment(id)])
      .then(([cat, d]) => {
        setCatalog(cat);
        setAssessment(d.assessment);
        setResponses(d.assessment.selfAssessment?.responses || {});
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // live readiness, mirroring the backend formula
  const live = useMemo(() => {
    if (!catalog) return { readiness: null, considered: 0, gaps: 0 };
    let considered = 0, earned = 0, gaps = 0;
    for (const sec of catalog.sections) {
      for (const r of sec.requirements) {
        const st = responses[r.id]?.status;
        if (!st || st === 'na') continue;
        considered++;
        earned += SCORE[st] ?? 0;
        if (st === 'not-met' || st === 'partial') gaps++;
      }
    }
    return { readiness: considered ? Math.round((earned / considered) * 100) : null, considered, gaps };
  }, [responses, catalog]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!catalog || !assessment) return <div className="center spinner">Loading…</div>;

  function setStatus(reqId, status) {
    setResponses((p) => ({ ...p, [reqId]: { ...p[reqId], status } }));
  }
  function setNote(reqId, note) {
    setResponses((p) => ({ ...p, [reqId]: { ...p[reqId], note } }));
  }

  async function save() {
    setBusy(true);
    setSaveMsg('');
    try {
      await api.saveSelfAssessment(id, responses);
      setSaveMsg('✅ Saved.');
    } catch (e) {
      setSaveMsg('❌ ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const readinessColor =
    live.readiness === null ? 'var(--muted)'
      : live.readiness >= 80 ? 'var(--green)'
      : live.readiness >= 50 ? 'var(--amber)'
      : 'var(--red)';

  return (
    <div className="container wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Annex I self-assessment — {assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
      </div>
      <p className="muted">
        Rate each essential requirement and vulnerability-handling duty. "Not applicable" items are
        excluded from the score. Your readiness updates live; click Save to store it.
      </p>

      <div className="card" style={{ position: 'sticky', top: 64, zIndex: 5, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div>
          <div className="muted small">Readiness</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: readinessColor }}>
            {live.readiness === null ? '—' : `${live.readiness}%`}
          </div>
        </div>
        <div className="muted small">
          {live.considered} requirement(s) assessed · {live.gaps} gap(s)
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {saveMsg && <span className={saveMsg.startsWith('✅') ? 'small' : 'small error'} style={{ margin: 0 }}>{saveMsg}</span>}
      </div>

      {catalog.sections.map((sec) => (
        <div className="card" key={sec.title}>
          <h2>{sec.title}</h2>
          <p className="muted small">{sec.intro}</p>
          {sec.requirements.map((req) => {
            const cur = responses[req.id] || {};
            return (
              <div key={req.id} style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong style={{ color: '#93c5fd' }}>{req.id}</strong> · {req.label}
                </div>
                {(req.help || req.example) && (
                  <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10, margin: '0 0 10px' }}>
                    {req.help && <div className="muted small" style={{ lineHeight: 1.5 }}>{req.help}</div>}
                    {req.example && (
                      <div className="small" style={{ color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--text)' }}>Example:</strong> {req.example}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {catalog.statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn ${cur.status === opt.value ? '' : 'secondary'}`}
                      style={{ padding: '6px 12px', fontSize: 13 }}
                      onClick={() => setStatus(req.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Evidence / notes (optional)"
                  value={cur.note || ''}
                  onChange={(e) => setNote(req.id, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      ))}

      <div className="btn-row">
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save self-assessment'}</button>
      </div>
    </div>
  );
}
