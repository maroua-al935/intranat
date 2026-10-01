import axios from 'axios';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000, // 10 secondes
});

// Flag pour éviter multiples refresh simultanés
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedRequestsQueue = [];
};

// Gestion améliorée du refresh token
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

// Interceptor request : ajoute l'access token (sauf pour refresh)
api.interceptors.request.use(config => {
  const isAdminPath = window.location?.pathname?.startsWith('/admin');

  const adminToken =
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken');

  const portalToken =
    sessionStorage.getItem('portalAccessToken') ||
    localStorage.getItem('portalAccessToken');

  // In admin space, always use admin token.
  // Outside admin, prefer portal token (card login) to avoid clobbering admin sessions.
  const tokenToUse = isAdminPath ? adminToken : (portalToken || adminToken);

  if (tokenToUse && config.url !== '/auth/refresh') {
    config.headers.Authorization = `Bearer ${tokenToUse}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor response : gère 401 et autres erreurs
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Gestion des timeouts
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout: Le serveur met trop de temps à répondre');
      return Promise.reject({
        ...error,
        message: 'La requête a expiré. Veuillez réessayer.',
      });
    }

    // Gestion des erreurs réseau
    if (!error.response) {
      console.error('Erreur réseau:', error.message);
      return Promise.reject({
        ...error,
        message: 'Problème de connexion au serveur. Vérifiez votre connexion internet.',
      });
    }

    // Gestion du refresh token pour les erreurs 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh') {
        // Si c'est la requête de refresh qui échoue, déconnecter l'utilisateur
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/admin/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Si un refresh est déjà en cours, ajouter la requête à la queue
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ 
            resolve: (token: string | null) => {
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(api(originalRequest));
              } else {
                reject(error);
              }
            }, 
            reject 
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // Pas de refresh token : rediriger immédiatement depuis l'espace admin.
          if (
            window.location?.pathname?.startsWith('/admin') &&
            window.location.pathname !== '/admin/login'
          ) {
            clearAuthData();
            window.location.replace('/admin/login');
          }
          return Promise.reject(error);
        }

        // Appel au endpoint de refresh
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/refresh`,
          { refreshToken },
          { 
            headers: { 
              'Content-Type': 'application/json',
              Authorization: undefined 
            },
            timeout: 10000
          }
        );

        const newAccessToken = response.data.accessToken;
        
        // Stocker le nouveau token
        localStorage.setItem('accessToken', newAccessToken);
        
        // Mettre à jour le token dans les headers
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        // Traiter les requêtes en attente
        processQueue(null, newAccessToken);
        onRefreshed(newAccessToken);
        
        // Retenter la requête originale
        return api(originalRequest);
        
      } catch (refreshError: any) {
        // En cas d'erreur lors du refresh, déconnecter l'utilisateur
        console.error('Erreur lors du refresh token:', refreshError);
        
        // Nettoyer toutes les données d'authentification
        localStorage.clear();
        sessionStorage.clear();
        
        // Rediriger vers la page de login uniquement pour l'espace admin
        if (window.location?.pathname?.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
        
        // Rejeter toutes les requêtes en attente
        processQueue(refreshError, null);
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Gestion d'autres erreurs HTTP
    switch (error.response?.status) {
      case 403:
        error.message = 'Accès interdit. Vous n\'avez pas les permissions nécessaires.';
        break;
      case 404:
        error.message = 'Ressource non trouvée.';
        break;
      case 500:
        error.message = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
        break;
      case 502:
      case 503:
      case 504:
        error.message = 'Service temporairement indisponible. Veuillez réessayer.';
        break;
    }

    return Promise.reject(error);
  }
);

// Fonctions utilitaires pour gérer l'authentification
export const clearAuthData = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
};

// Auth portail (cartes protégées) : ne doit pas effacer la session admin.
export const clearPortalAuthData = () => {
  localStorage.removeItem('portalAccessToken');
  localStorage.removeItem('portalUser');
  sessionStorage.removeItem('portalAccessToken');
  sessionStorage.removeItem('portalUser');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('accessToken', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const setRefreshToken = (token: string) => {
  localStorage.setItem('refreshToken', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

export default api;
