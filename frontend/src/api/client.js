import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_KEY = 'meridian.hms.session';

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

let refreshing = null;

async function refreshAccessToken() {
  const session = readSession();
  if (!session?.refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: session.refreshToken });
  const next = { ...session, accessToken: data.data.accessToken };
  writeSession(next);
  return next.accessToken;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    const isPublicAuth = ['/auth/login', '/auth/register', '/auth/refresh'].includes(original.url);
    if (!isPublicAuth && status === 401 && !original._retry && code !== 'REFRESH_INVALID' && readSession()?.refreshToken) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshAccessToken().finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return client(original);
      } catch {
        writeSession(null);
        onUnauthorized();
      }
    }

    const apiError = error.response?.data?.error;
    const normalised = new Error(apiError?.message || error.message || 'Request failed');
    normalised.code = apiError?.code;
    normalised.details = apiError?.details;
    normalised.status = status;
    return Promise.reject(normalised);
  }
);

/** Unwraps the { success, data, meta } envelope. */
export async function request(config) {
  const res = await client(config);
  return { data: res.data?.data, meta: res.data?.meta };
}

export const http = {
  get: (url, params) => request({ method: 'get', url, params }),
  post: (url, data) => request({ method: 'post', url, data }),
  patch: (url, data) => request({ method: 'patch', url, data }),
  delete: (url) => request({ method: 'delete', url }),
};

export function downloadInvoicePdf(id, filename = 'invoice.pdf') {
  return client.get(`/billing/invoice/${id}/pdf`, { responseType: 'blob' }).then((res) => {
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  });
}

export default client;
