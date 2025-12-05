import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
};

// Contest API
export const contestAPI = {
    create: (contestData) => api.post('/contests/create', contestData),
    enroll: (code) => api.post(`/contests/enroll/${code}`),
    enrollById: (contestId) => api.post(`/contests/enroll-by-id/${contestId}`),
    getByCode: (code) => api.get(`/contests/${code}`),
    getEnrolled: () => api.get('/contests/my/enrolled'),
    getCreated: () => api.get('/contests/my/created'),
    getPublicContests: () => api.get('/contests/public/all'),
};

// Sync API
export const syncAPI = {
    syncSubmissions: (contestId) => api.post(`/sync/${contestId}`),
    syncAll: (contestId) => api.post(`/sync/sync-all/${contestId}`),
    getLeaderboard: (contestId) => api.get(`/sync/leaderboard/${contestId}`),
};

// Problems API
export const problemsAPI = {
    search: (params) => api.get('/problems/search', { params }),
    getBySlug: (slug) => api.get(`/problems/${slug}`),
};

// Profile API
export const profileAPI = {
    getLeetCodeStats: () => api.get('/profile/leetcode-stats'),
    getPlatformStats: () => api.get('/profile/platform-stats'),
    getContestHistory: () => api.get('/profile/contest-history'),
    getStats: () => api.get('/profile/stats'),
};

// Bot API
export const botAPI = {
    chat: (message, conversationHistory = []) => api.post('/bot/chat', { message, conversationHistory }),
    analyze: () => api.get('/bot/analyze'),
    roast: (severity = 'medium') => api.get(`/bot/roast?severity=${severity}`),
    getSuggestions: () => api.get('/bot/suggestions'),
};

export default api;
