import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

export const habitApi = {
  getAll: (userId) => api.get(`/habits/${userId}`),
  create: (habitData) => api.post('/habits', habitData),
  update: (id, habitData) => api.put(`/habits/${id}`, habitData),
  delete: (id) => api.delete(`/habits/${id}`),
  toggleCompletion: (id, date, value) => api.post(`/habits/${id}/toggle`, { date, value })
};

export const userApi = {
  getProfile: (firebaseId) => api.get(`/users/${firebaseId}`),
  updateProfile: (profileData) => api.post('/users/profile', profileData),
  deleteUser: (firebaseId) => api.delete(`/users/${firebaseId}`)
};

export const noteApi = {
  getAll: (userId) => api.get(`/notes/${userId}`),
  getByDate: (userId, date) => api.get(`/notes/${userId}/${date}`),
  save: (userId, date, content) => api.post('/notes', { userId, date, content }),
  delete: (userId, date) => api.delete(`/notes/${userId}/${date}`)
};

export const moodApi = {
  getByDate: (userId, date) => api.get(`/moods/${userId}/${date}`),
  save: (userId, date, score) => api.post('/moods', { userId, date, score })
};

export const adminApi = {
  getAllUsers: () => api.get('/admin/users'),
  getUserHabits: (uid) => api.get(`/admin/user-habits/${uid}`),
  deleteUser: (uid) => api.delete(`/admin/user/${uid}`)
};

export default api;
