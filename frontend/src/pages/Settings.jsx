import { useState } from 'react';
import { api, getApiBase, setApiBase } from '../api.js';

export default function Settings() {
  const [url, setUrl] = useState(getApiBase());
  const [status, setStatus] = useState('');

  function saveUrl() {
    setApiBase(url);
    setStatus('Saved. Testing connection…');
    testConnection();
  }

  async function testConnection() {
    try {
      await api.health();
      setStatus('✅ Connected to the backend successfully.');
    } catch (e) {
      setStatus('❌ ' + e.message);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <h1>Settings</h1>
        <label>Backend URL</label>
        <div className="help">
          Where your laptop backend is running. Default is <code>http://localhost:4000</code>.
        </div>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="btn-row">
          <button className="btn" onClick={saveUrl}>Save &amp; test</button>
          <button className="btn secondary" onClick={testConnection}>Test connection</button>
        </div>
        {status && <div className={status.startsWith('✅') ? 'success' : status.startsWith('❌') ? 'error' : 'muted'}>{status}</div>}
      </div>
      <div className="card">
        <h2>How this works</h2>
        <p className="small muted">
          This page (the frontend) can be hosted anywhere, including GitHub Pages. All compliance
          logic and your data live in the backend running on your own laptop. The browser allows this
          page to talk to <code>localhost</code> as a special exception, so it works on your machine.
          Other people on other computers would need their own backend or a tunnel to yours.
        </p>
      </div>
    </div>
  );
}
