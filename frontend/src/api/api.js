const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
  return data;
}

// Auth
export const login = (mobile_no, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ mobile_no, password }) });

export const signup = (data) =>
  request('/auth/signup', { method: 'POST', body: JSON.stringify(data) });

export const verifyToken = () => request('/auth/verify');

// Shop
export const getProfile = () => request('/shop/profile');
export const updateProfile = (data) =>
  request('/shop/profile', { method: 'PUT', body: JSON.stringify(data) });
export const getStatistics = () => request('/shop/statistics');

// Recommendations
export const getClaimedRecommendations = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/shop/claimed-recommendations${qs ? '?' + qs : ''}`);
};

export const getRecommendation = (id) => request(`/recommendations/${id}`);

export const claimRecommendation = (id, data) =>
  request(`/recommendations/${id}/claim`, { method: 'POST', body: JSON.stringify(data) });

export const searchRecommendations = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/recommendations/search${qs ? '?' + qs : ''}`);
};
