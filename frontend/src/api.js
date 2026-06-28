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
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  passwordPolicy: () => request('/api/auth/password-policy'),
  me: () => request('/api/auth/me', { auth: true }),

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

  // Vulnerability & incident register (all reporting logic computed server-side)
  registerMeta: () => request('/api/register/meta'),
  listVulnerabilities: () => request('/api/register/vulnerabilities', { auth: true }),
  createVulnerability: (body) => request('/api/register/vulnerabilities', { method: 'POST', body, auth: true }),
  updateVulnerability: (id, body) => request(`/api/register/vulnerabilities/${id}`, { method: 'PUT', body, auth: true }),
  deleteVulnerability: (id) => request(`/api/register/vulnerabilities/${id}`, { method: 'DELETE', auth: true }),
  listIncidents: () => request('/api/register/incidents', { auth: true }),
  createIncident: (body) => request('/api/register/incidents', { method: 'POST', body, auth: true }),
  updateIncident: (id, body) => request(`/api/register/incidents/${id}`, { method: 'PUT', body, auth: true }),
  deleteIncident: (id) => request(`/api/register/incidents/${id}`, { method: 'DELETE', auth: true }),

  listAssessments: () => request('/api/assessments', { auth: true }),
  getAssessment: (id) => request(`/api/assessments/${id}`, { auth: true }),
  saveAssessment: (payload) => request('/api/assessments', { method: 'POST', body: payload, auth: true }),
  updateAssessment: (id, payload) =>
    request(`/api/assessments/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteAssessment: (id) => request(`/api/assessments/${id}`, { method: 'DELETE', auth: true }),
};
