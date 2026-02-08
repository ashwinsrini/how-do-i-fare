const BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error || body?.message || response.statusText;
    const error = new Error(message);
    if (body?.needsVerification) error.needsVerification = true;
    throw error;
  }
  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  return response.json();
}

export async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
}

export async function post(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function put(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function del(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
}
