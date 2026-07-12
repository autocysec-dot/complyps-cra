import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const STATUS = {
  active: { label: 'Active', color: 'var(--green)' },
  'ending-soon': { label: 'Ending soon', color: 'var(--amber)' },
  expired: { label: 'Expired', color: 'var(--red)' },
  'not-set': { label: 'Not set', color: 'var(--muted)' },
};

export default function SupportPeriod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState({ start: '', end: '', channels: '', notes: '' });
  const [support, setSupport] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.getAssessment(id)
      .then((d) => {
        setAssessment(d.assessment);
        const sp = d.assessment.supportPeriod;
        if (sp) setForm({ start: sp.start || '', end: sp.end || '', channels: sp.channels || '', notes: sp.notes || '' });
        if (d.assessment.support && d.assessment.support.status !== 'not-set') setSupport(d.assessment.support);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!assessment) return <div className="center spinner">Loading…</div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setError(''); setSaved('');
    try {
      const { support } = await api.saveSupport(id, form);
      setSupport(support);
      setSaved('Saved.');
    } catch (e) { setError(e.message); }
  }

  const st = support ? STATUS[support.status] : null;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Support period — {assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
      </div>
      <p className="muted">
        Define how long you will provide security updates. The CRA expects the support period to
        reflect how long the product is expected to be in use.
      </p>

      <div className="card">
        {support && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span className="badge" style={{ background: '#1e293b', color: st.color }}>{st.label}</span>
            {support.daysRemaining != null && (
              <span className="muted small">{support.daysRemaining >= 0 ? `${support.daysRemaining} days remaining` : `${Math.abs(support.daysRemaining)} days past end`}</span>
            )}
          </div>
        )}
        <label>Support start date</label>
        <input type="date" value={form.start} onChange={set('start')} />
        <label>Support end date</label>
        <input type="date" value={form.end} onChange={set('end')} />
        <label>Update channels (how updates are delivered)</label>
        <input type="text" value={form.channels} onChange={set('channels')} placeholder="e.g. automatic OTA, downloads portal" />
        <label>Notes</label>
        <input type="text" value={form.notes} onChange={set('notes')} />
        <div className="btn-row">
          <button className="btn" onClick={save}>Save</button>
        </div>
        {saved && <div className="success">{saved}</div>}
        <p className="muted small" style={{ marginTop: 10 }}>
          Guidance: for many products at least five years is expected unless a shorter lifetime is justified.
        </p>
      </div>
    </div>
  );
}
