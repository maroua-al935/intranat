import api from './index';

const authAPI = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/login', credentials),

  // LDAP (ou fallback local) pour accès portail / cartes protégées
  portalLogin: (credentials: { username: string; password: string }) =>
    api.post('/portal/login', credentials),
  
  register: (userData: any) => 
    api.post('/auth/register', userData),
  
  refresh: (refreshToken: string) => 
    api.post('/auth/refresh', { refreshToken }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getProfile: () => 
    api.get('/auth/profile'),
  
  updateProfile: (data: any) => 
    api.put('/auth/profile', data),
};

export default authAPI;
