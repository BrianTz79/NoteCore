const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export const api = {
  auth: {
    register: (b) => request('POST', '/auth/register', b),
    login: (b) => request('POST', '/auth/login', b),
    me: () => request('GET', '/auth/me'),
    updateProfile: (b) => request('PATCH', '/auth/me', b),
  },
  subjects: {
    list: () => request('GET', '/subjects'),
    create: (b) => request('POST', '/subjects', b),
    update: (id, b) => request('PUT', `/subjects/${id}`, b),
    importar: (materias) => request('POST', '/subjects/importar', { materias }),
    deleteAll: () => request('DELETE', '/subjects/all'),
    delete: (id) => request('DELETE', `/subjects/${id}`),
  },
  absences: {
    list: () => request('GET', '/absences'),
    stats: () => request('GET', '/absences/stats'),
    create: (b) => request('POST', '/absences', b),
    justificar: (id) => request('PATCH', `/absences/${id}/justificar`),
    delete: (id) => request('DELETE', `/absences/${id}`),
  },
};

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function requireLogin() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('token')) window.location.href = '/login';
}
