import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function CvdPolicy() {
  const [def, setDef] = useState(null);
  const [form, setForm] = useState({});
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.cvdFields(), api.getCvdPolicy()])
      .then(([d, p]) => {
        setDef(d);
        if (p.policy?.fields) setForm(p.policy.fields);
        if (p.policy?.document) setDoc(p.policy.document);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!def) return <div className="center spinner">Loading…</div>;

  const set = (fid) => (e) => setForm({ ...form, [fid]: e.target.value });

  async function generate() {
    setBusy(true); setError('');
    try { const { document } = await api.saveCvdPolicy(form); setDoc(document); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function printDoc() {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(wrap(renderHTML(doc))); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="container wide">
      <h1>Coordinated Vulnerability Disclosure policy</h1>
      <p className="muted">
        The CRA (Annex I, Part II) requires a CVD policy and a reporting contact. Generate a policy
        document and a machine-readable <code>security.txt</code> (RFC 9116) to publish at
        <code> /.well-known/security.txt</code>.
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
                  ) : fld.type === 'select' ? (
                    <select value={form[fld.id] || fld.options[0]} onChange={set(fld.id)} className="cps-select">
                      {fld.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={fld.type === 'date' ? 'date' : fld.type === 'number' ? 'number' : 'text'} value={form[fld.id] || ''} onChange={set(fld.id)} />
                  )}
                </div>
              ))}
            </div>
          ))}
          {error && <div className="error">{error}</div>}
          <div className="btn-row"><button className="btn" onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate policy'}</button></div>
        </div>

        <div>
          <div className="card" style={{ position: 'sticky', top: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, flex: 1 }}>Preview</h2>
              {doc && (<>
                <button className="btn secondary" onClick={() => download('security.txt', doc.securityTxt, 'text/plain')}>security.txt</button>
                <button className="btn secondary" onClick={() => download('CVD_Policy.html', wrap(renderHTML(doc)), 'text/html')}>Download</button>
                <button className="btn" onClick={printDoc}>Print / PDF</button>
              </>)}
            </div>
            {!doc && <p className="muted">Fill in the form and click “Generate policy”.</p>}
            {doc && !doc.complete && <div className="error">Still required: {doc.missing.join(', ')}</div>}
            {doc && <div style={{ background: 'white', color: '#111', borderRadius: 8, padding: 24, fontSize: 13, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: renderHTML(doc) }} />}
            {doc && (
              <div style={{ marginTop: 14 }}>
                <div className="small muted">security.txt</div>
                <pre style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{doc.securityTxt}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function esc(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function renderHTML(d) {
  let h = `<h1 style="font-size:20px;margin:0 0 4px">${esc(d.title)}</h1><p style="color:#555;margin:0 0 12px">${esc(d.orgName)}</p>`;
  for (const s of d.sections) {
    h += `<h3 style="margin:16px 0 4px">${esc(s.heading)}</h3>`;
    h += `<p style="margin:4px 0;white-space:pre-wrap">${esc(s.body)}</p>`;
  }
  h += `<p style="margin:24px 0 0;font-size:11px;color:#777">${esc(d.disclaimer)}</p>`;
  return h;
}
function wrap(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>CVD Policy</title><style>body{font-family:Georgia,serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}h3{border-bottom:1px solid #ddd;padding-bottom:2px}</style></head><body>${inner}</body></html>`;
}
