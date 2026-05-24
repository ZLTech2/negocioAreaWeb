const API_BASE_URL = 'https://springboot-mobile-api-1.onrender.com';

function getToken() {
  return localStorage.getItem('empresa_token');
}

function setToken(token) {
  localStorage.setItem('empresa_token', token);
}

function clearToken() {
  localStorage.removeItem('empresa_token');
  localStorage.removeItem('empresa_nome');
}

// Seguro: usa a função se já foi definida, senão dispara evento
function _redirectToLogin() {
  if (typeof showLoginScreen === 'function') {
    showLoginScreen();
  } else {
    window.dispatchEvent(new CustomEvent('sessionExpired'));
  }
}

async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = { 'Accept': 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token)              headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearToken();
    _redirectToLogin();
    throw new Error('Sessão expirada');
  }

  const text = await response.text();
  if (!text) return null;

  try   { return JSON.parse(text); }
  catch { return text; }
}

async function fetchAnalytics(periodo = 'mes') {
  const token = getToken();
  if (!token) throw new Error('Não autenticado');
  return apiFetch(`/dashboard/analytics?periodo=${periodo}`, { token });
}

async function fetchPerfilEmpresa() {
  const token = getToken();
  return apiFetch('/empresas/me', { token });
}

async function loginEmpresa(email, senha) {
  const data = await apiFetch('/auth/login/empresa', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      senha,
    },
  });
  return data;
}