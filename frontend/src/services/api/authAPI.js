import api from './index';
const authAPI = {
    login: (credentials) => api.post('/login', credentials),
    // LDAP (ou fallback local) pour accès portail / cartes protégées
    portalLogin: (credentials) => api.post('/portal/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
};
export default authAPI;
