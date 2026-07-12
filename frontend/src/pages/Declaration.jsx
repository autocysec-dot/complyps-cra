import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Declaration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [def, setDef] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [form, setForm] = useState({});
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.declarationFields(), api.getAssessment(id)])
      .then(([d, a]) => {
        setDef(d);
        setAssessment(a.assessment);
        const saved = a.assessment.declaration?.fields || {};
        // pre-fill from saved fields, default productName from the assessment
        setForm({ productName: a.assessment.productName, ...saved });
        if (a.assessment.declaration?.document) setDoc(a.assessment.declaration.document);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!def || !assessment) return <div className="center spinner">Loading…</div>;

  const set = (fid) => (e) => setForm({ ...form, [fid]: e.target.value });

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const { document } = await api.saveDeclaration(id, form);
      setDoc(document);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadHtml() {
    const html = wrapDocument(renderDeclarationHTML(doc));
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${(doc.product.name || 'product').replace(/\s+/g, '_')}_EU_Declaration_of_Conformity.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printDoc() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(wrapDocument(renderDeclarationHTML(doc)));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="container wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ flex: 1 }}>Declaration of Conformity — {assessment.productName}</h1>
        <button className="btn secondary" onClick={() => navigate(`/assessments/${id}`)}>Back</button>
      </div>
      <p className="muted">
        Fill in the details below to generate an EU Declaration of Conformity (CRA Annex V). Product
        classification and the conformity route are pulled in automatically from this assessment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        {/* ---- form ---- */}
        <div>
          {def.sections.map((sec) => (
            <div className="card" key={sec.id}>
              <h2>{sec.title}</h2>
              {sec.fields.map((fld) => (
                <div key={fld.id}>
                  <label>{fld.label}{fld.required && <span style={{ color: '#fca5a5' }}> *</span>}</label>
                  {fld.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={form[fld.id] || ''}
                      onChange={set(fld.id)}
                      style={{ width: '100%', padding: '10px 12px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}
                    />
                  ) : (
                    <input type={fld.type === 'date' ? 'date' : 'text'} value={form[fld.id] || ''} onChange={set(fld.id)} />
                  )}
                </div>
              ))}
            </div>
          ))}
          {error && <div className="error">{error}</div>}
          <div className="btn-row">
            <button className="btn" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate declaration'}</button>
          </div>
        </div>

        {/* ---- preview ---- */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ margin: 0, flex: 1 }}>Preview</h2>
              {doc && (
                <>
                  <button className="btn secondary" onClick={downloadHtml}>Download</button>
                  <button className="btn" onClick={printDoc}>Print / PDF</button>
                </>
              )}
            </div>
            {!doc && <p className="muted">Fill in the form and click “Generate declaration” to preview.</p>}
            {doc && !doc.complete && (
              <div className="error">Still required: {doc.missing.join(', ')}</div>
            )}
            {doc && (
              <div
                style={{ background: 'white', color: '#111', borderRadius: 8, padding: 24, fontSize: 13, lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: renderDeclarationHTML(doc) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- shared renderer: builds the declaration HTML (used for preview + export) ----
function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function row(label, value) {
  if (!value) return '';
  return `<p style="margin:4px 0"><strong>${esc(label)}:</strong> ${esc(value)}</p>`;
}

function renderDeclarationHTML(doc) {
  const p = doc.product, m = doc.manufacturer;
  let html = '';
  html += `<h1 style="font-size:20px;margin:0 0 4px">${esc(doc.title)}</h1>`;
  if (doc.number) html += `<p style="margin:0 0 12px;color:#555">No. ${esc(doc.number)}</p>`;

  html += `<h3 style="margin:16px 0 4px">1. Product</h3>`;
  html += row('Name', p.name) + row('Model / type', p.model) + row('Version', p.version) +
    row('Identifiers', p.identifiers) + row('Description', p.description);

  html += `<h3 style="margin:16px 0 4px">2. Manufacturer</h3>`;
  html += row('Name', m.name) + row('Address', m.address) + row('Contact', m.contact);
  if (doc.authorisedRep) {
    html += `<h3 style="margin:16px 0 4px">Authorised representative</h3>`;
    html += row('Name', doc.authorisedRep.name) + row('Address', doc.authorisedRep.address);
  }

  html += `<h3 style="margin:16px 0 4px">3. Responsibility</h3><p style="margin:4px 0">${esc(doc.responsibilityStatement)}</p>`;
  html += `<h3 style="margin:16px 0 4px">4. Conformity</h3><p style="margin:4px 0">${esc(doc.conformityStatement)}</p>`;
  if (doc.otherLegislation?.length) {
    html += `<p style="margin:4px 0"><strong>Other legislation:</strong></p><ul>${doc.otherLegislation.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
  }

  html += `<h3 style="margin:16px 0 4px">5. Standards &amp; references</h3>`;
  html += doc.standards?.length
    ? `<ul>${doc.standards.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    : `<p style="margin:4px 0;color:#777">None specified.</p>`;

  if (doc.classification?.conformityRoute) {
    html += `<h3 style="margin:16px 0 4px">6. Conformity assessment</h3>`;
    html += row('Classification', doc.classification.tierLabel);
    html += row('Procedure', doc.classification.conformityRoute);
  }
  if (doc.notifiedBody) {
    html += row('Notified body', doc.notifiedBody.name) + row('Notified body number', doc.notifiedBody.number) + row('Certificate', doc.notifiedBody.certificate);
  }

  html += `<h3 style="margin:16px 0 4px">7. Signed for and on behalf of the manufacturer</h3>`;
  html += row('Place of issue', doc.signoff.placeOfIssue) + row('Date of issue', doc.signoff.dateOfIssue) +
    row('Name', doc.signoff.signatoryName) + row('Function', doc.signoff.signatoryFunction);
  html += `<p style="margin:28px 0 4px">Signature:</p><div style="border-bottom:1px solid #999;width:240px;height:1px"></div>`;

  html += `<p style="margin:24px 0 0;font-size:11px;color:#777">${esc(doc.disclaimer)}</p>`;
  return html;
}

function wrapDocument(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>EU Declaration of Conformity</title>
<style>body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}h3{border-bottom:1px solid #ddd;padding-bottom:2px}@media print{body{margin:0}}</style>
</head><body>${inner}</body></html>`;
}
