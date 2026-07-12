import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Package() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPackage(id).then((d) => setPkg(d.package)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!pkg) return <div className="center spinner">Loading…</div>;

  function printDoc() {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(wrap(renderHTML(pkg))); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }
  function download(kind) {
    let content, name, type;
    if (kind === 'json') { content = JSON.stringify(pkg, null, 2); name = 'compliance_package.json'; type = 'application/json'; }
    else { content = wrap(renderHTML(pkg)); name = 'compliance_package.html'; type = 'text/html'; }
    name = `${(pkg.product.name || 'product').replace(/\s+/g, '_')}_${name}`;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  const c = pkg.completeness;
  const color = c.percent >= 80 ? 'var(--green)' : c.percent >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="container wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ flex: 1 }}>Compliance package — {pkg.product.name}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
        <button className="btn secondary" onClick={() => download('json')}>JSON</button>
        <button className="btn secondary" onClick={() => download('html')}>Download</button>
        <button className="btn" onClick={printDoc}>Print / PDF</button>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="muted small">Completeness</div>
          <div style={{ fontSize: 34, fontWeight: 800, color }}>{c.percent}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          {c.checklist.map((it, i) => (
            <div key={i} className="small" style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
              <span style={{ color: it.done ? 'var(--green)' : 'var(--muted)' }}>{it.done ? '✓' : '○'}</span>
              <span style={{ flex: 1 }}>{it.item}</span>
              <span className="muted">{it.detail || ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: 'white', color: '#111' }} dangerouslySetInnerHTML={{ __html: renderHTML(pkg) }} />
    </div>
  );
}

function esc(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function ul(arr, map = (x) => x) { return arr?.length ? `<ul>${arr.map((x) => `<li>${esc(map(x))}</li>`).join('')}</ul>` : '<p style="color:#777">None.</p>'; }

function renderHTML(p) {
  let h = `<h1 style="font-size:20px;margin:0 0 2px">${esc(p.title)}</h1>`;
  h += `<p style="color:#555;margin:0 0 4px">${esc(p.product.name)} · generated ${new Date(p.generatedAt).toLocaleString()}</p>`;
  h += `<p style="margin:0 0 12px"><strong>Completeness:</strong> ${p.completeness.percent}% (${p.completeness.done}/${p.completeness.total})</p>`;

  h += `<h3 style="margin:16px 0 4px">1. Classification</h3>`;
  h += `<p style="margin:4px 0"><strong>${esc(p.classification.tierLabel || (p.inScope ? 'In scope' : 'Out of scope'))}</strong></p>`;
  if (p.classification.matchedCategories?.length) h += ul(p.classification.matchedCategories, (c) => c.label);
  if (p.classification.conformityRoutes?.length) { h += `<p style="margin:8px 0 2px"><em>Conformity routes:</em></p>` + ul(p.classification.conformityRoutes); }

  h += `<h3 style="margin:16px 0 4px">2. Annex I self-assessment</h3>`;
  h += p.selfAssessment ? `<p style="margin:4px 0">Readiness <strong>${p.selfAssessment.readiness}%</strong>, ${p.selfAssessment.gaps.length} gap(s).</p>` + (p.selfAssessment.gaps.length ? ul(p.selfAssessment.gaps, (g) => `${g.id} (${g.status})${g.note ? ' — ' + g.note : ''}`) : '') : '<p style="color:#777">Not started.</p>';

  h += `<h3 style="margin:16px 0 4px">3. SBOM</h3>`;
  h += p.sbom?.components?.length ? `<p style="margin:4px 0">${p.sbom.summary.count} component(s).</p>` + ul(p.sbom.components, (c) => `${c.name}${c.version ? ' ' + c.version : ''}${c.license ? ' — ' + c.license : ''}`) : '<p style="color:#777">None.</p>';

  h += `<h3 style="margin:16px 0 4px">4. EU Declaration of Conformity</h3>`;
  h += p.declaration ? `<p style="margin:4px 0">${p.declaration.complete ? 'Complete' : 'Incomplete'} — ${esc(p.declaration.signoff?.signatoryName || '')} ${esc(p.declaration.signoff?.dateOfIssue || '')}</p>` : '<p style="color:#777">Not generated.</p>';

  h += `<h3 style="margin:16px 0 4px">5. Technical documentation (Annex VII)</h3>`;
  h += p.techdoc ? `<p style="margin:4px 0">${p.techdoc.complete ? 'Complete' : 'Incomplete'} — intended purpose: ${esc(p.techdoc.general?.intendedPurpose || '')}</p>` : '<p style="color:#777">Not generated.</p>';

  h += `<h3 style="margin:16px 0 4px">6. Support period</h3>`;
  h += p.support.status !== 'not-set' ? `<p style="margin:4px 0">${esc(p.support.status)}${p.support.endDate ? ' · ends ' + esc(p.support.endDate) : ''}</p>` : '<p style="color:#777">Not set.</p>';

  h += `<p style="margin:24px 0 0;font-size:11px;color:#777">${esc(p.disclaimer)}</p>`;
  return h;
}
function wrap(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>CRA Compliance Package</title><style>body{font-family:Georgia,serif;color:#111;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.5}h3{border-bottom:1px solid #ddd;padding-bottom:2px}ul{margin:4px 0}</style></head><body>${inner}</body></html>`;
}
