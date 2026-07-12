import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const TYPES = ['library', 'framework', 'application', 'operating-system', 'firmware', 'device', 'file'];
const blank = { name: '', version: '', type: 'library', supplier: '', license: '', purl: '' };
const SEV_COLOR = { CRITICAL: 'var(--red)', HIGH: '#fb923c', MEDIUM: 'var(--amber)', LOW: '#93c5fd' };

export default function Sbom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [assessment, setAssessment] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scan, setScan] = useState(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [added, setAdded] = useState(new Set());
  const [syft, setSyft] = useState(null);
  const [genBusy, setGenBusy] = useState(false);
  const genRef = useRef(null);

  function loadFromAssessment(a) {
    setAssessment(a);
    setRows(a.sbom?.components?.length ? a.sbom.components : [{ ...blank }]);
    setSummary(a.sbom?.summary || null);
    setScan(a.sbom?.scan || null);
    setStale(Boolean(a.sbomScanStale));
  }
  useEffect(() => {
    api.getAssessment(id).then((d) => loadFromAssessment(d.assessment)).catch((e) => setError(e.message));
    api.sbomTools(id).then((t) => setSyft(t.syft)).catch(() => setSyft(false));
  }, [id]);

  if (error && !assessment) return <div className="container"><div className="error">{error}</div></div>;
  if (!assessment) return <div className="center spinner">Loading…</div>;

  const setCell = (i, k) => (e) => { const n = rows.slice(); n[i] = { ...n[i], [k]: e.target.value }; setRows(n); };
  const addRow = () => setRows([...rows, { ...blank }]);
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  async function save() {
    setError(''); setMsg('');
    try {
      const { sbom } = await api.saveSbom(id, rows);
      setSummary(sbom.summary);
      setRows(sbom.components.length ? sbom.components : [{ ...blank }]);
      setMsg(`Saved — ${sbom.summary.count} component(s).`);
    } catch (e) { setError(e.message); }
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setError(''); setMsg('');
      try {
        const { format, sbom } = await api.importSbom(id, String(reader.result));
        setRows(sbom.components.length ? sbom.components : [{ ...blank }]);
        setSummary(sbom.summary);
        setMsg(`Imported ${sbom.summary.count} component(s) from ${format}. Now scan for vulnerabilities.`);
      } catch (e) { setError(e.message); }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  }

  function onGenerate(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setError(''); setMsg(''); setGenBusy(true);
      try {
        const b64 = String(reader.result).split(',')[1];
        const { sbom, discovered, added } = await api.generateSbom(id, { name: file.name, contentBase64: b64 });
        setRows(sbom.components.length ? sbom.components : [{ ...blank }]);
        setSummary(sbom.summary);
        setMsg(`Generated an SBOM from ${file.name} — found ${discovered} component(s), added ${added} new. Review below, then scan for vulnerabilities.`);
      } catch (e) { setError(e.message); }
      finally { setGenBusy(false); if (genRef.current) genRef.current.value = ''; }
    };
    reader.readAsDataURL(file);
  }

  async function runScan() {
    setScanning(true); setError(''); setMsg('');
    try {
      await save(); // ensure latest components are saved first
      const { scan } = await api.scanSbom(id);
      setScan(scan);
      setStale(false);
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  }

  async function addToRegister(comp, v) {
    try {
      await api.createVulnerability({
        title: `${v.id} — ${comp.name}${comp.version ? ' ' + comp.version : ''}`,
        product: assessment.productName,
        cve: v.id,
        cvss: v.score ?? '',
        severity: (v.severity || '').toLowerCase(),
        activelyExploited: v.exploited ? 'yes' : 'no',
        status: 'open',
        awareDate: new Date().toISOString(),
        description: v.description,
      });
      setAdded((s) => new Set(s).add(v.id));
    } catch (e) { setError(e.message); }
  }

  async function exportJson() {
    await save();
    const doc = await api.exportSbom(id);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url; a.download = `${assessment.productName.replace(/\s+/g, '_')}_sbom_cyclonedx.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="container wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>SBOM &amp; vulnerabilities — {assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
      </div>
      <p className="muted">
        Build your Software Bill of Materials — <strong>generate one from your code/build</strong>,
        import an existing SBOM, or enter components by hand — then scan it against a local CVE
        database. Actively-exploited vulnerabilities (CISA KEV) are flagged for CRA reporting.
      </p>

      {/* SBOM sources */}
      <div className="card">
        <h2 style={{ fontSize: 16 }}>Build your SBOM</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginTop: 8 }}>
          {/* 1) generate from code/build */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <strong>🛠 Generate from code / build</strong>
            <p className="muted small" style={{ margin: '6px 0 10px' }}>
              Upload a zip of your project (source + lock files) or a build artifact (.jar/.tar/image tarball).
              A local scanner (Syft) discovers the components automatically.
            </p>
            <input ref={genRef} type="file" accept=".zip,.jar,.war,.ear,.tar,.tgz,.gz,.whl,.gem,.apk,.deb,.rpm" onChange={onGenerate} style={{ display: 'none' }} />
            <button className="btn" disabled={genBusy || syft === false} onClick={() => genRef.current?.click()}>
              {genBusy ? 'Generating…' : 'Generate SBOM'}
            </button>
            {syft === false && <div className="muted small" style={{ marginTop: 6, color: 'var(--amber)' }}>Syft not installed — run <code>install-sbom.cmd</code> in the backend folder to enable this.</div>}
          </div>
          {/* 2) import existing */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <strong>⬆ Import an existing SBOM</strong>
            <p className="muted small" style={{ margin: '6px 0 10px' }}>Already have one? Import a CycloneDX or SPDX JSON file.</p>
            <input ref={fileRef} type="file" accept=".json,.cdx,application/json" onChange={onFile} style={{ display: 'none' }} />
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>Import SBOM file</button>
          </div>
          {/* 3) manual */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <strong>✎ Enter manually</strong>
            <p className="muted small" style={{ margin: '6px 0 10px' }}>Add components by hand in the table below, and export as CycloneDX any time.</p>
            <button className="btn secondary" onClick={addRow}>+ Add component</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {summary && <div className="muted small">{summary.count} component(s){summary.missingVersion ? ` · ${summary.missingVersion} missing version` : ''}</div>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={runScan} disabled={scanning}>
            {scanning ? 'Scanning…' : '🔍 Scan for vulnerabilities'}
          </button>
        </div>
      </div>
      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}
      {genBusy && <div className="card muted">Generating an SBOM with Syft (local) — this usually takes a few seconds…</div>}
      {scanning && <div className="card muted">Scanning against the local CVE database (Grype) + CISA KEV — this can take up to a minute…</div>}

      {/* scan results */}
      {scan && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, flex: 1 }}>Vulnerabilities</h2>
            <span className="muted small">
              Scanned {new Date(scan.scannedAt).toLocaleString()} · {scan.source}
              {stale && <span style={{ color: 'var(--amber)' }}> · stale, rescan recommended</span>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '10px 0' }}>
            <Stat label="Vulnerabilities" value={scan.summary.vulnerabilities} />
            <Stat label="Actively exploited" value={scan.summary.exploited} color={scan.summary.exploited ? 'var(--red)' : 'var(--green)'} />
            <Stat label="Reportable (CRA)" value={scan.summary.reportable} color={scan.summary.reportable ? 'var(--red)' : 'var(--green)'} />
            <Stat label="Critical / High" value={`${scan.summary.critical} / ${scan.summary.high}`} />
          </div>
          {scan.truncated && <div className="muted small" style={{ color: 'var(--amber)' }}>Only the first {scan.componentsScanned} of {scan.componentsTotal} components were scanned (rate limit). Add an NVD API key to scan more.</div>}
          {scan.engine === 'nvd' && !scan.usedApiKey && <div className="muted small">Tip: install the local Grype scanner (or add an NVD API key) for faster, offline scans.</div>}

          {scan.findings.filter((f) => f.vulnerabilities.length).length === 0 && (
            <p className="muted" style={{ marginTop: 10 }}>No known CVEs matched the scanned components. 🎉</p>
          )}
          {scan.findings.filter((f) => f.vulnerabilities.length).map((f) => (
            <div key={f.component.name + f.component.version} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
              <strong>{f.component.name} {f.component.version}</strong> <span className="muted small">— {f.vulnerabilities.length} CVE(s)</span>
              {f.vulnerabilities.map((v) => (
                <div key={v.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, margin: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <a href={v.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{v.id}</a>
                    {v.severity && <span className="badge" style={{ background: '#1e293b', color: SEV_COLOR[(v.severity || '').toUpperCase()] || 'var(--text)' }}>{v.severity}{v.score != null ? ` ${v.score}` : ''}</span>}
                    {v.exploited && <span className="badge" style={{ background: '#450a0a', color: '#fca5a5' }}>⚠ Actively exploited</span>}
                    <div style={{ flex: 1 }} />
                    <button
                      className={`btn ${added.has(v.id) ? 'secondary' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={added.has(v.id)}
                      onClick={() => addToRegister(f.component, v)}
                    >
                      {added.has(v.id) ? '✓ In register' : 'Add to register'}
                    </button>
                  </div>
                  {v.description && <p className="small" style={{ margin: '6px 0' }}>{v.description}</p>}
                  {v.fixedIn && <p className="small" style={{ margin: '2px 0', color: 'var(--green)' }}>Fixed in: {v.fixedIn}</p>}
                  <p className="small" style={{ margin: 0, color: v.reportable ? '#fca5a5' : 'var(--muted)' }}>
                    <strong>Recommended:</strong> {v.action}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* component table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2 style={{ fontSize: 16 }}>Components</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
              <th style={{ padding: 6 }}>Name *</th><th style={{ padding: 6 }}>Version</th><th style={{ padding: 6 }}>Type</th>
              <th style={{ padding: 6 }}>Supplier</th><th style={{ padding: 6 }}>Licence</th><th style={{ padding: 6 }}>PURL</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: 4 }}><input value={r.name} onChange={setCell(i, 'name')} style={cell} /></td>
                <td style={{ padding: 4 }}><input value={r.version} onChange={setCell(i, 'version')} style={cell} /></td>
                <td style={{ padding: 4 }}>
                  <select value={r.type} onChange={setCell(i, 'type')} className="cps-select" style={{ padding: 6 }}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ padding: 4 }}><input value={r.supplier} onChange={setCell(i, 'supplier')} style={cell} /></td>
                <td style={{ padding: 4 }}><input value={r.license} onChange={setCell(i, 'license')} style={cell} /></td>
                <td style={{ padding: 4 }}><input value={r.purl} onChange={setCell(i, 'purl')} style={cell} /></td>
                <td style={{ padding: 4 }}><button className="btn danger" style={{ padding: '4px 8px' }} onClick={() => removeRow(i)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="btn-row">
          <button className="btn secondary" onClick={addRow}>+ Add component</button>
          <button className="btn" onClick={save}>Save SBOM</button>
          <button className="btn secondary" onClick={exportJson}>Export CycloneDX</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="muted small">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

const cell = { width: '100%', padding: '6px 8px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
