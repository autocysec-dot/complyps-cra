// API client. The backend runs on the user's laptop; the base URL is
// configurable so the same static build (hosted on GitHub Pages) can point at
// localhost. Users can override it from the Settings screen (stored locally).

// Default backend URL. Set at runtime by public/config.js (window.CRA_API_BASE)
// so it can be changed without rebuilding; falls back to localhost for local dev.
const DEFAULT_API =
  (typeof window !== 'undefined' && window.CRA_API_BASE) || 'http://localhost:4000';

export function getApiBase() {
  return localStorage.getItem('cra_api_base') || DEFAULT_API;
}
export function setApiBase(url) {
  localStorage.setItem('cra_api_base', url.replace(/\/$/, ''));
}

export function getToken() {
  return localStorage.getItem('cra_token') || null;
}

// Role read straight from the JWT payload (no network). Used to hide download/
// export affordances for the read-only demo account.
export function currentRole() {
  const t = getToken();
  if (!t) return null;
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role || 'user'; }
  catch { return null; }
}
export function isDemoUser() {
  return currentRole() === 'demo';
}
export function setToken(token) {
  if (token) localStorage.setItem('cra_token', token);
  else localStorage.removeItem('cra_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  // Retry transient network failures (the tunnel occasionally blips for a
  // second or two). Only retries connection errors, never HTTP error responses.
  const maxAttempts = 3;
  let res;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(`${getApiBase()}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 700)); // 0.7s, then 1.4s
      }
    }
  }
  if (lastErr) {
    throw new Error('The CRA service is temporarily unavailable. Please try again in a moment.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/api/health'),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  demoLogin: (key) => request('/api/auth/demo-login', { method: 'POST', body: { key } }),
  requestDemo: (payload) => request('/api/demo-request', { method: 'POST', body: payload }),
  passwordPolicy: () => request('/api/auth/password-policy'),
  authConfig: () => request('/api/auth/config'),
  me: () => request('/api/auth/me', { auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, auth: true }),

  // Public forms (no login): request an account, or book a demo.
  requestAccess: (payload) => request('/api/access-request', { method: 'POST', body: payload }),
  bookDemo: (payload) => request('/api/demo-request', { method: 'POST', body: payload }),

  // Admin (role: 'admin' only)
  adminListUsers: () => request('/api/admin/users', { auth: true }),
  adminCreateUser: (payload) => request('/api/admin/users', { method: 'POST', body: payload, auth: true }),
  adminDeleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE', auth: true }),
  adminResetPassword: (id) => request(`/api/admin/users/${id}/reset-password`, { method: 'POST', auth: true }),
  adminListAccessRequests: () => request('/api/admin/access-requests', { auth: true }),
  adminSetAccessRequestStatus: (id, status) => request(`/api/admin/access-requests/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  adminDeleteAccessRequest: (id) => request(`/api/admin/access-requests/${id}`, { method: 'DELETE', auth: true }),
  adminApproveAccessRequest: (id) => request(`/api/admin/access-requests/${id}/approve`, { method: 'POST', auth: true }),
  adminListDemoRequests: () => request('/api/admin/demo-requests', { auth: true }),
  adminApproveDemoRequest: (id) => request(`/api/admin/demo-requests/${id}/approve`, { method: 'POST', auth: true }),
  adminSetDemoRequestStatus: (id, status) => request(`/api/admin/demo-requests/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  adminDeleteDemoRequest: (id) => request(`/api/admin/demo-requests/${id}`, { method: 'DELETE', auth: true }),

  questionnaire: () => request('/api/assessments/questionnaire'),
  classify: (answers) => request('/api/assessments/classify', { method: 'POST', body: { answers } }),
  annex1: () => request('/api/assessments/annex1'),
  saveSelfAssessment: (id, responses) =>
    request(`/api/assessments/${id}/self-assessment`, { method: 'PUT', body: { responses }, auth: true }),
  declarationFields: () => request('/api/assessments/declaration/fields'),
  saveDeclaration: (id, fields) =>
    request(`/api/assessments/${id}/declaration`, { method: 'PUT', body: { fields }, auth: true }),
  techdocFields: () => request('/api/assessments/techdoc/fields'),
  saveTechDoc: (id, fields) =>
    request(`/api/assessments/${id}/techdoc`, { method: 'PUT', body: { fields }, auth: true }),
  saveSbom: (id, components) =>
    request(`/api/assessments/${id}/sbom`, { method: 'PUT', body: { components }, auth: true }),
  exportSbom: (id) => request(`/api/assessments/${id}/sbom/export`, { auth: true }),
  importSbom: (id, content) => request(`/api/assessments/${id}/sbom/import`, { method: 'POST', body: { content }, auth: true }),
  sbomTools: (id) => request(`/api/assessments/${id}/sbom/tools`, { auth: true }),
  generateSbom: (id, payload) => request(`/api/assessments/${id}/sbom/generate`, { method: 'POST', body: payload, auth: true }),
  scanSbom: (id) => request(`/api/assessments/${id}/sbom/scan`, { method: 'POST', auth: true }),
  saveSupport: (id, body) => request(`/api/assessments/${id}/support`, { method: 'PUT', body, auth: true }),
  getPackage: (id) => request(`/api/assessments/${id}/package`, { auth: true }),

  // Vulnerability & incident register (all reporting logic computed server-side)
  registerMeta: () => request('/api/register/meta'),
  listVulnerabilities: () => request('/api/register/vulnerabilities', { auth: true }),
  createVulnerability: (body) => request('/api/register/vulnerabilities', { method: 'POST', body, auth: true }),
  updateVulnerability: (id, body) => request(`/api/register/vulnerabilities/${id}`, { method: 'PUT', body, auth: true }),
  deleteVulnerability: (id) => request(`/api/register/vulnerabilities/${id}`, { method: 'DELETE', auth: true }),
  getVulnerability: (id) => request(`/api/register/vulnerabilities/${id}`, { auth: true }),
  reportStages: (kind) => request('/api/register/report/stages' + (kind ? `?kind=${kind}` : '')),
  // generic (kind = 'vulnerability' | 'incident')
  getRegisterItem: (kind, id) => request(`/api/register/${kind === 'incident' ? 'incidents' : 'vulnerabilities'}/${id}`, { auth: true }),
  updateRegisterItem: (kind, id, body) => request(`/api/register/${kind === 'incident' ? 'incidents' : 'vulnerabilities'}/${id}`, { method: 'PUT', body, auth: true }),
  addItemApproval: (kind, id, body) => request(`/api/register/${kind === 'incident' ? 'incidents' : 'vulnerabilities'}/${id}/approvals`, { method: 'POST', body, auth: true }),
  deleteItemApproval: (kind, id, aid) => request(`/api/register/${kind === 'incident' ? 'incidents' : 'vulnerabilities'}/${id}/approvals/${aid}`, { method: 'DELETE', auth: true }),
  buildItemReport: (kind, id, stage, fields) => request(`/api/register/${kind === 'incident' ? 'incidents' : 'vulnerabilities'}/${id}/report/${stage}`, { method: 'PUT', body: { fields }, auth: true }),
  addApproval: (id, body) => request(`/api/register/vulnerabilities/${id}/approvals`, { method: 'POST', body, auth: true }),
  deleteApproval: (id, aid) => request(`/api/register/vulnerabilities/${id}/approvals/${aid}`, { method: 'DELETE', auth: true }),
  buildVulnReport: (id, stage, fields) => request(`/api/register/vulnerabilities/${id}/report/${stage}`, { method: 'PUT', body: { fields }, auth: true }),
  listIncidents: () => request('/api/register/incidents', { auth: true }),
  createIncident: (body) => request('/api/register/incidents', { method: 'POST', body, auth: true }),
  updateIncident: (id, body) => request(`/api/register/incidents/${id}`, { method: 'PUT', body, auth: true }),
  deleteIncident: (id) => request(`/api/register/incidents/${id}`, { method: 'DELETE', auth: true }),

  // Gap assessment (local-AI document analysis)
  gapAiStatus: () => request('/api/gap/ai', { auth: true }),
  listEvidence: (id) => request(`/api/gap/${id}/evidence`, { auth: true }),
  uploadEvidence: (id, payload) => request(`/api/gap/${id}/evidence`, { method: 'POST', body: payload, auth: true }),
  deleteEvidence: (id, eid) => request(`/api/gap/${id}/evidence/${eid}`, { method: 'DELETE', auth: true }),
  runGap: (id) => request(`/api/gap/${id}/run`, { method: 'POST', auth: true }),
  getGap: (id) => request(`/api/gap/${id}`, { auth: true }),
  gapReportPdf: async (id) => {
    const res = await fetch(`${getApiBase()}/api/gap/${id}/report.pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Could not generate the PDF.'); }
    return res.blob();
  },

  // In-app help (login only). Content is served from the private backend,
  // never bundled into this static site.
  helpUserGuide: () => request('/api/help/user-guide', { auth: true }),

  dashboard: () => request('/api/dashboard', { auth: true }),
  cvdFields: () => request('/api/cvd/fields'),
  getCvdPolicy: () => request('/api/cvd', { auth: true }),
  saveCvdPolicy: (fields) => request('/api/cvd', { method: 'PUT', body: { fields }, auth: true }),
  listAssessments: () => request('/api/assessments', { auth: true }),
  getAssessment: (id) => request(`/api/assessments/${id}`, { auth: true }),
  saveAssessment: (payload) => request('/api/assessments', { method: 'POST', body: payload, auth: true }),
  updateAssessment: (id, payload) =>
    request(`/api/assessments/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteAssessment: (id) => request(`/api/assessments/${id}`, { method: 'DELETE', auth: true }),
};
