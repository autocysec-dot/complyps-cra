// API client. The backend runs on the user's laptop; the base URL is
// configurable so the same static build (hosted on GitHub Pages) can point at
// localhost. Users can override it from the Settings screen (stored locally).

const DEFAULT_API = 'http://localhost:4000';

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
  let res;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      `Cannot reach the backend at ${getApiBase()}. Is it running on your laptop? (npm start in the backend folder)`
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request('/api/health'),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me', { auth: true }),

  questionnaire: () => request('/api/assessments/questionnaire'),
  classify: (answers) => request('/api/assessments/classify', { method: 'POST', body: { answers } }),
  annex1: () => request('/api/assessments/annex1'),
  saveSelfAssessment: (id, responses) =>
    request(`/api/assessments/${id}/self-assessment`, { method: 'PUT', body: { responses }, auth: true }),

  listAssessments: () => request('/api/assessments', { auth: true }),
  getAssessment: (id) => request(`/api/assessments/${id}`, { auth: true }),
  saveAssessment: (payload) => request('/api/assessments', { method: 'POST', body: payload, auth: true }),
  updateAssessment: (id, payload) =>
    request(`/api/assessments/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteAssessment: (id) => request(`/api/assessments/${id}`, { method: 'DELETE', auth: true }),
};
