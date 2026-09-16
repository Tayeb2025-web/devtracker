import axios from 'axios';
import { API_BASE } from '../constants';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devtracker-auth-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const sessionApi = {
  getAll: (params) => api.get('/sessions', { params }),
  create: (data) => api.post('/sessions', data),
  delete: (id) => api.delete(`/sessions/${id}`),
};

export const technologyApi = {
  getAll: () => api.get('/technologies'),
  create: (data) => api.post('/technologies', data),
  update: (id, data) => api.put(`/technologies/${id}`, data),
  delete: (id) => api.delete(`/technologies/${id}`),
};

export const projectApi = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

export const categoryApi = {
  getAll: () => api.get('/technology-categories'),
  create: (data) => api.post('/technology-categories', data),
  update: (id, data) => api.put(`/technology-categories/${id}`, data),
  move: (id, direction) => api.post(`/technology-categories/${id}/move`, { direction }),
  delete: (id) => api.delete(`/technology-categories/${id}`),
};

export const goalApi = {
  get: () => api.get('/goals'),
  update: (target_hours) => api.put('/goals', { target_hours }),
};

export const statsApi = {
  get: () => api.get('/stats'),
  getCalendar: (year) => api.get('/calendar', { params: { year } }),
};

export const achievementApi = {
  getAll: () => api.get('/achievements'),
};

export const challengeApi = {
  getAll: () => api.get('/challenges'),
  create: (data) => api.post('/challenges', data),
  delete: (id) => api.delete(`/challenges/${id}`),
};

export const noteApi = {
  getAll: () => api.get('/notes'),
  getByDate: (date) => api.get(`/notes/${date}`),
  save: (date, data) => api.put(`/notes/${date}`, data),
};

export const userApi = {
  getProfile: () => api.get('/user'),
  updateSettings: (data) => api.put('/user/settings', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar: () => api.delete('/user/avatar'),
};

export const socialApi = {
  discover: (params) => api.get('/social/discover', { params }),
  getProfile: (id) => api.get(`/social/profiles/${id}`),
  follow: (id) => api.post(`/social/profiles/${id}/follow`),
  unfollow: (id) => api.delete(`/social/profiles/${id}/follow`),
  getLeague: () => api.get('/social/league'),
  getLeagueMessages: (params) => api.get('/social/league/messages', { params }),
  sendLeagueMessage: (body) => api.post('/social/league/messages', { body }),
  getConversations: () => api.get('/social/conversations'),
  createConversation: (recipientId) => api.post('/social/conversations', { recipientId }),
  getDirectMessages: (id, params) => api.get(`/social/conversations/${id}/messages`, { params }),
  sendDirectMessage: (id, body) => api.post(`/social/conversations/${id}/messages`, { body }),
  presenceHeartbeat: (data) => api.post('/social/presence/heartbeat', data),
  getLiveActivities: () => api.get('/social/live-activities'),
};

export const exportApi = {
  export: (format) => api.get('/export', { params: { format } }),
  import: (data) => api.post('/import', data),
};

export const adminApi = {
  getOverview: () => api.get('/admin/stats/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
