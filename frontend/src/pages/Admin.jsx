import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  return (
    <div className="container wide">
      <h1>Admin</h1>
      <p className="muted">Create accounts and review incoming requests. Signed in as {user?.email}.</p>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <TabBtn id="users" tab={tab} setTab={setTab}>Users</TabBtn>
        <TabBtn id="access" tab={tab} setTab={setTab}>Access requests</TabBtn>
        <TabBtn id="demo" tab={tab} setTab={setTab}>Demo requests</TabBtn>
      </div>
      {tab === 'users' && <UsersTab currentUserId={user?.id} />}
      {tab === 'access' && <AccessTab />}
      {tab === 'demo' && <DemoTab />}
    </div>
  );
}

function TabBtn({ id, tab, setTab, children }) {
  return (
    <button className={`btn ${tab === id ? '' : 'secondary'}`} onClick={() => setTab(id)}>{children}</button>
  );
}

function Credential({ email, password }) {
  return (
    <div className="card" style={{ background: '#0f172a', color: '#e2e8f0' }}>
      <strong>Account created — share these credentials securely (shown once):</strong>
      <div className="small" style={{ marginTop: 8, fontFamily: 'monospace' }}>
        <div>email: {email}</div>
        <div>password: {password}</div>
      </div>
      <p className="small" style={{ marginTop: 8, opacity: 0.8 }}>
        Copy this now — it won't be shown again. Ask the user to change it after first login.
      </p>
    </div>
  );
}

function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.adminListUsers().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError(''); setCreated(null); setBusy(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.password.trim()) payload.password = form.password.trim();
      const d = await api.adminCreateUser(payload);
      setCreated({ email: d.user.email, password: d.generatedPassword || form.password.trim() });
      setForm({ name: '', email: '', password: '', role: 'user' });
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function remove(id) {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    setError('');
    try { await api.adminDeleteUser(id); load(); } catch (err) { setError(err.message); }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <h2>Create an account</h2>
        <p className="muted small">Leave the password blank to auto-generate a strong one.</p>
        <form onSubmit={create}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
            <div><label>Password (optional)</label><input value={form.password} onChange={set('password')} placeholder="auto-generate if blank" /></div>
            <div><label>Role</label>
              <select value={form.role} onChange={set('role')}>
                <option value="user">User (full tool access)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="btn-row"><button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></div>
        </form>
        {created && <Credential email={created.email} password={created.password} />}
      </div>

      <div className="card">
        <h2>Accounts</h2>
        {!users && <p className="muted">Loading…</p>}
        {users && users.length === 0 && <p className="muted">No accounts yet.</p>}
        {users && users.map((u) => (
          <div key={u.id} className="list-item">
            <div className="grow">
              <strong>{u.name}</strong> <span className="muted small">{u.email}</span>
              <div className="muted small">{u.role === 'admin' ? 'Admin' : 'User'} · created {new Date(u.createdAt).toLocaleDateString()}</div>
            </div>
            <span className="badge" style={{ background: '#1e293b', color: u.role === 'admin' ? 'var(--amber)' : 'var(--green)' }}>{u.role}</span>
            {u.id !== currentUserId && <button className="btn secondary" onClick={() => remove(u.id)}>Delete</button>}
          </div>
        ))}
      </div>
    </>
  );
}

function RequestList({ load, listFn, onApprove, statusFn, deleteFn, kindLabel }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const refresh = () => listFn().then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  async function approve(id) {
    setError(''); setCreated(null);
    try { const d = await onApprove(id); setCreated({ email: d.user.email, password: d.generatedPassword }); refresh(); }
    catch (err) { setError(err.message); }
  }
  async function mark(id, status) { setError(''); try { await statusFn(id, status); refresh(); } catch (e) { setError(e.message); } }
  async function del(id) { if (!confirm('Delete this request?')) return; setError(''); try { await deleteFn(id); refresh(); } catch (e) { setError(e.message); } }

  return (
    <div className="card">
      {error && <div className="error">{error}</div>}
      {created && <Credential email={created.email} password={created.password} />}
      {!items && <p className="muted">Loading…</p>}
      {items && items.length === 0 && <p className="muted">No {kindLabel} yet.</p>}
      {items && items.map((it) => (
        <div key={it.id} className="list-item">
          <div className="grow">
            <strong>{it.name}</strong> <a href={`mailto:${it.email}`} className="small">{it.email}</a>
            {it.status !== 'new' && <span className="badge" style={{ marginLeft: 8, background: '#1e293b', color: 'var(--muted)' }}>{it.status}</span>}
            <div className="muted small">
              {it.company ? `${it.company} · ` : ''}{new Date(it.createdAt).toLocaleString()}
            </div>
            {it.message && <div className="small" style={{ marginTop: 4 }}>{it.message}</div>}
          </div>
          {onApprove && <button className="btn" onClick={() => approve(it.id)}>Approve → create</button>}
          {it.status === 'new'
            ? <button className="btn secondary" onClick={() => mark(it.id, 'handled')}>Mark handled</button>
            : <button className="btn secondary" onClick={() => mark(it.id, 'new')}>Reopen</button>}
          <button className="btn secondary" onClick={() => del(it.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

function AccessTab() {
  return (
    <>
      <p className="muted small">People asking for an account. "Approve → create" makes an account and shows a one-time password to share.</p>
      <RequestList
        kindLabel="access requests"
        listFn={api.adminListAccessRequests}
        onApprove={api.adminApproveAccessRequest}
        statusFn={api.adminSetAccessRequestStatus}
        deleteFn={api.adminDeleteAccessRequest}
      />
    </>
  );
}

function DemoTab() {
  return (
    <>
      <p className="muted small">Demo requests from the website. Reply by email, then mark handled.</p>
      <RequestList
        kindLabel="demo requests"
        listFn={api.adminListDemoRequests}
        onApprove={null}
        statusFn={api.adminSetDemoRequestStatus}
        deleteFn={api.adminDeleteDemoRequest}
      />
    </>
  );
}
