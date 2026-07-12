import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function TechDoc() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [def, setDef] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState({});
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.techdocFields(), api.getAssessment(id)])
      .then(([d, a]) => {
        setDef(d);
        setAssessment(a.assessment);
        setForm(a.assessment.techdoc?.fields || {});
        if (a.assessment.techdoc?.document) setDoc(a.assessment.techdoc.document);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!def || !assessment) return <div className="center spinner">Loading…</div>;

  const set = (fid) => (e) => setForm({ ...form, [fid]: e.target.value });

  async function generate() {
    setBusy(true); setError('');
    try {
      const { document } = await api.saveTechDoc(id, form);
      setDoc(document);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function printDoc() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(wrap(renderHTML(doc)));
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }
  function downloadHtml() {
    const blob = new Blob([wrap(renderHTML(doc))], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url; a.download = `${(doc.productName || 'product').replace(/\s+/g, '_')}_Technical_Documentation.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="container wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Technical documentation — {assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
      </div>
      <p className="muted">
        CRA Annex VII. Your classification, Annex I self-assessment and Declaration of Conformity are
        pulled in automatically — fill in the remaining sections.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        <div>
          {def.sections.map((sec) => (
            <div className="card" key={sec.id}>
              <h2>{sec.title}</h2>
              {sec.fields.map((fld) => (
                <div key={fld.id}>
                  <label>{fld.label}{fld.required && <span style={{ color: '#fca5a5' }}> *</span>}</label>
                  {fld.type === 'textarea' ? (
                    <textarea rows={3} value={form[fld.id] || ''} onChange={set(fld.id)}
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }} />
                  ) : (
                    <input type={fld.type === 'date' ? 'date' : 'text'} value={form[fld.id] || ''} onChange={set(fld.id)} />
                  )}
                </div>
              ))}
            </div>
          ))}
          {error && <div className="error">{error}</div>}
          <div className="btn-row"><button className="btn" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate document'}</button></div>
        </div>

        <div>
          <div className="card" style={{ position: 'sticky', top: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ margin: 0, flex: 1 }}>Preview</h2>
              {doc && (<><button className="btn secondary" onClick={downloadHtml}>Download</button><button className="btn" onClick={printDoc}>Print / PDF</button></>)}
            </div>
            {!doc && <p className="muted">Fill in the form and click “Generate document”.</p>}
            {doc && !doc.complete && <div className="error">Still required: {doc.missing.join(', ')}</div>}
            {doc && <div style={{ background: 'white', color: '#111', borderRadius: 8, padding: 24, fontSize: 13, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: renderHTML(doc) }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function esc(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function row(l, v) { return v ? `<p style="margin:4px 0"><strong>${esc(l)}:</strong> ${esc(v)}</p>` : ''; }

function renderHTML(d) {
  let h = `<h1 style="font-size:20px;margin:0 0 4px">${esc(d.title)}</h1><p style="color:#555;margin:0 0 12px">${esc(d.productName)}</p>`;
  h += `<h3 style="margin:16px 0 4px">1. General description</h3>`;
  h += row('Intended purpose', d.general.intendedPurpose) + row('Software versions', d.general.softwareVersions) + row('Hardware', d.general.hardwareDescription) + row('User instructions', d.general.userInstructions);
  h += `<h3 style="margin:16px 0 4px">2. Design, development &amp; vulnerability handling</h3>`;
  h += row('Architecture', d.design.architecture) + row('SBOM', d.design.sbom) + row('CVD policy', d.design.cvdPolicy) + row('Reporting contact', d.design.reportingContact) + row('Update mechanism', d.design.updateMechanism);
  h += `<h3 style="margin:16px 0 4px">3. Cybersecurity risk assessment</h3>`;
  h += row('Classification', d.risk.classification) + row('Conformity route', d.risk.conformityRoute);
  if (d.risk.annexIReadiness != null) h += row('Annex I readiness', d.risk.annexIReadiness + '% (' + (d.risk.annexIGaps ?? 0) + ' gaps)');
  h += row('Summary', d.risk.summary);
  h += `<h3 style="margin:16px 0 4px">4. Support period</h3>` + row('End of support', d.support.periodEnd) + row('Details', d.support.info);
  h += `<h3 style="margin:16px 0 4px">5. Standards applied</h3>`;
  h += d.standards?.length ? `<ul>${d.standards.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : `<p style="color:#777;margin:4px 0">None specified.</p>`;
  h += `<h3 style="margin:16px 0 4px">6. Test reports</h3>` + (d.tests ? `<p style="margin:4px 0">${esc(d.tests)}</p>` : `<p style="color:#777;margin:4px 0">None specified.</p>`);
  h += `<h3 style="margin:16px 0 4px">7. EU Declaration of Conformity</h3>`;
  h += d.declaration.present ? row('On file — signed by', `${d.declaration.signatory} (${d.declaration.date})`) : `<p style="color:#777;margin:4px 0">Not yet generated.</p>`;
  h += `<p style="margin:24px 0 0;font-size:11px;color:#777">${esc(d.disclaimer)}</p>`;
  return h;
}
function wrap(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Technical Documentation</title><style>body{font-family:Georgia,serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}h3{border-bottom:1px solid #ddd;padding-bottom:2px}@media print{body{margin:0}}</style></head><body>${inner}</body></html>`;
}
