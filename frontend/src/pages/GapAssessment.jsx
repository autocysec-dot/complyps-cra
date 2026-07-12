import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, isDemoUser } from '../api.js';

const STATUS_META = {
  met: { label: 'Met', color: 'var(--green)', bg: '#dcfce7' },
  partial: { label: 'Partial', color: '#b45309', bg: '#fef3c7' },
  gap: { label: 'Gap', color: '#b91c1c', bg: '#fee2e2' },
  unknown: { label: 'No evidence', color: '#475569', bg: '#e2e8f0' },
};

export default function GapAssessment() {
  const { id } = useParams();
  const [ai, setAi] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('product');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const fileRef = useRef();
  const poll = useRef();

  async function downloadPdf() {
    setError(''); setPdfBusy(true);
    try {
      const blob = await api.gapReportPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'CRA_gap_report.pdf'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { setError(e.message); }
    finally { setPdfBusy(false); }
  }

  const loadEvidence = () => api.listEvidence(id).then((d) => setEvidence(d.evidence)).catch(() => {});
  const loadData = () => api.getGap(id).then((d) => {
    setData(d);
    const active = d.job && (d.job.status === 'running' || d.job.status === 'queued');
    if (active && !poll.current) startPolling();
    if (!active && poll.current) stopPolling();
  }).catch((e) => setError(e.message));

  useEffect(() => {
    api.gapAiStatus().then(setAi).catch(() => setAi({ available: false }));
    loadEvidence();
    loadData();
    return stopPolling;
  }, [id]);

  function startPolling() { poll.current = setInterval(loadData, 2500); }
  function stopPolling() { if (poll.current) { clearInterval(poll.current); poll.current = null; } }

  const readAsBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  async function onFile(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError(''); setBusy(true);
    const failures = [];
    // Upload sequentially so each one's extraction error is reported clearly.
    for (const file of files) {
      try {
        const b64 = await readAsBase64(file);
        await api.uploadEvidence(id, { name: file.name, mime: file.type, contentBase64: b64, scope });
      } catch (err) {
        failures.push(`${file.name}: ${err.message}`);
      }
    }
    await loadEvidence();
    if (failures.length) setError('Some files could not be added — ' + failures.join('; '));
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function removeEvidence(eid) {
    setError('');
    try { await api.deleteEvidence(id, eid); loadEvidence(); } catch (err) { setError(err.message); }
  }

  async function run() {
    setError('');
    try {
      await api.runGap(id);
      loadData(); startPolling();
    } catch (err) { setError(err.message); }
  }

  const report = data?.report;
  const job = data?.job;
  const running = job?.status === 'running';
  const queued = job?.status === 'queued';
  const active = running || queued;

  return (
    <div className="container wide">
      <Link to={`/assessments/${id}`} className="muted small">← Back to product</Link>
      <h1>Gap assessment &amp; compliance report</h1>
      <p className="muted">Upload your policies, technical docs and evidence. A local AI checks them against the CRA and reports what's covered and what's missing — all processed on your own machine.</p>

      {error && <div className="error">{error}</div>}

      {/* AI status */}
      {ai && !ai.available && (
        <div className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
          <strong>⚙️ Local AI not detected.</strong>
          <p className="muted small" style={{ marginTop: 6 }}>
            The gap analysis runs on a small AI model on your own machine (private, offline). To enable it, run{' '}
            <code>install-ai.cmd</code> in the backend folder once (installs Ollama + a model), then reload this page.
          </p>
        </div>
      )}
      {ai && ai.available && !ai.hasModel && (
        <div className="card" style={{ borderLeft: '4px solid var(--amber)' }}>
          <strong>Model not installed.</strong>
          <p className="muted small" style={{ marginTop: 6 }}>Ollama is running, but the model is missing. Run <code>ollama pull {ai.model}</code>, then reload.</p>
        </div>
      )}

      {/* Evidence */}
      <div className="card">
        <h2>Evidence documents</h2>
        <p className="muted small">Accepted: PDF, Word (.docx), text/Markdown — you can select several files at once. Company-wide docs (e.g. your CVD policy) apply to every product.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '10px 0' }}>
          <label className="small">Applies to:</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="product">This product</option>
            <option value="company">Company-wide</option>
          </select>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown" onChange={onFile} disabled={busy} />
          {busy && <span className="muted small">Uploading…</span>}
        </div>
        {evidence.length === 0 && <p className="muted">No documents yet.</p>}
        {evidence.map((e) => (
          <div key={e.id} className="list-item">
            <div className="grow">
              <strong>{e.name}</strong> <span className="muted small">{e.kind} · {e.chars.toLocaleString()} chars · {e.scope === 'company' ? 'company-wide' : 'this product'}</span>
            </div>
            <button className="btn secondary" onClick={() => removeEvidence(e.id)}>Remove</button>
          </div>
        ))}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={run} disabled={active || evidence.length === 0 || !(ai?.available && ai?.hasModel)}>
            {running ? 'Analysing…' : queued ? 'Queued…' : report ? 'Re-run analysis' : 'Run gap analysis'}
          </button>
          {report && !isDemoUser() && <button className="btn secondary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? 'Preparing…' : 'Download PDF report'}</button>}
        </div>
        {queued && (
          <div style={{ marginTop: 12 }} className="small">
            ⏳ Waiting in the analysis queue{job.position > 0 ? ` — position ${job.position}` : ''}. The AI runs one report at a time; yours will start automatically.
          </div>
        )}
        {running && job?.progress && (
          <div style={{ marginTop: 12 }}>
            <div className="small muted">Checking requirement {job.progress.done}/{job.progress.total}: {job.progress.current}</div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginTop: 4 }}>
              <div style={{ width: `${job.progress.total ? (job.progress.done / job.progress.total) * 100 : 0}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width .3s' }} />
            </div>
          </div>
        )}
        {job?.status === 'error' && <div className="error" style={{ marginTop: 10 }}>Analysis failed: {job.error}</div>}
      </div>

      {report && <Report report={report} />}
    </div>
  );
}

function Report({ report }) {
  const covColor = report.coverage >= 80 ? 'var(--green)' : report.coverage >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <>
      <div className="card">
        <h2>Compliance summary</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: covColor }}>{report.coverage}%</div>
            <div className="muted small">estimated coverage</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Pill n={report.counts.met} label="Met" color="var(--green)" />
            <Pill n={report.counts.partial} label="Partial" color="#b45309" />
            <Pill n={report.counts.gap} label="Gaps" color="#b91c1c" />
            <Pill n={report.counts.unknown} label="No evidence" color="#475569" />
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Generated {new Date(report.generatedAt).toLocaleString()} · {report.totalRequirements} requirements checked · AI-assisted, review before relying on it. Not legal advice.</p>
      </div>

      <div className="card">
        <h2>Coverage by area</h2>
        {Object.entries(report.byCategory).map(([k, c]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <div className="small" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{c.label}</span><span className="muted">{c.met}/{c.total} met · {c.coverage}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 4 }}>
              <div style={{ width: `${c.coverage}%`, height: '100%', background: c.coverage >= 80 ? 'var(--green)' : c.coverage >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      {report.topRecommendations?.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg,#eff6ff,#fff)' }}>
          <h2>Top recommendations</h2>
          <ol style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            {report.topRecommendations.map((r, i) => <li key={i}><strong>{r.title}:</strong> {r.recommendation}</li>)}
          </ol>
        </div>
      )}

      <div className="card">
        <h2>Requirement-by-requirement</h2>
        {report.results.map((r) => {
          const m = STATUS_META[r.status] || STATUS_META.unknown;
          return (
            <div key={r.id} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                  <strong>{r.title}</strong>
                </div>
                {r.rationale && <div className="small" style={{ marginTop: 4 }}>{r.rationale}</div>}
                {r.evidence && r.evidence !== 'none' && <div className="muted small" style={{ marginTop: 4 }}>Evidence: “{r.evidence}”</div>}
                {r.recommendation && <div className="small" style={{ marginTop: 4, color: 'var(--primary)' }}>→ {r.recommendation}</div>}
                {r.sources?.length > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Source: {r.sources.join(', ')}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Pill({ n, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{n}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}
