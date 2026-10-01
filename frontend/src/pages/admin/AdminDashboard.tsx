import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Edit, Grid, Settings, Users, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import AdminArticleList from './AdminArticleList';
import AdminCardManager from './AdminCardManager';
import AdminSlideManager from './AdminSlideManager';
import AdminTrashManager from './AdminTrashManager';
import AdminPopupManger from './AdminPopupManger';
import AdminUserManager from './AdminUserManager';
import 'bootstrap/dist/css/bootstrap.min.css';

const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'slides' | 'cards' | 'articles' | 'popup' | 'users' | 'trash'>('dashboard');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const userContext = (() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();
  const userRole = userContext.role || 'admin';
  const isSuperadmin = userRole === 'superadmin';
  const canManageSlides = isSuperadmin || !!userContext.canManageSlides;
  const canManagePopup = isSuperadmin || !!userContext.canManagePopup;

  const getButtonStyle = (isActive: boolean) => ({
    textAlign: 'left' as const,
    backgroundColor: isActive ? '#7a2b3a' : 'transparent',
    color: isActive ? 'white' : '#212529',
    transition: 'all 0.2s ease',
    borderLeft: isActive ? '4px solid #5a1b2a' : '4px solid transparent',
  });

  // Fonction pour vérifier l'authentification - version memoized pour éviter les re-renders
  const checkAuth = useCallback((): boolean => {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!token || !user) {
      setIsAuthenticated(false);
      return false;
    }
    
    try {
      const userObj = JSON.parse(user);
      if (userObj.role !== 'admin' && userObj.role !== 'superadmin') {
        setIsAuthenticated(false);
        return false;
      }
      // Ne mettre à jour l'état que s'il a changé
      if (isAuthenticated !== true) {
        setIsAuthenticated(true);
      }
      return true;
    } catch {
      setIsAuthenticated(false);
      return false;
    }
  }, [isAuthenticated]);

  // Vérifier l'authentification au chargement - UNE SEULE FOIS
  useEffect(() => {
    const verifyAuth = () => {
      const authResult = checkAuth();
      if (!authResult) {
        // Utiliser un timeout pour éviter l'appel pendant le rendu
        setTimeout(() => {
          onLogout();
        }, 100);
      }
    };
    
    verifyAuth();
  }, [checkAuth, onLogout]);

  // Gérer les erreurs de déconnexion
  const handleTabChange = useCallback((tab: 'dashboard' | 'slides' | 'cards' | 'articles' | 'popup' | 'users' | 'trash') => {
    setGlobalError(null);
    if (tab === 'slides' && !canManageSlides) {
      setGlobalError('Permission insuffisante pour gérer les slides.');
      return;
    }
    if (tab === 'popup' && !canManagePopup) {
      setGlobalError('Permission insuffisante pour gérer le pop-up.');
      return;
    }
    if ((tab === 'users' || tab === 'trash') && !isSuperadmin) {
      setGlobalError('Accès réservé au superadmin.');
      return;
    }
    
    // Vérifier l'authentification avant de changer d'onglet
    if (!checkAuth()) {
      // Utiliser un timeout pour éviter l'appel pendant le rendu
      setTimeout(() => {
        onLogout();
      }, 100);
      return;
    }
    
    setIsLoading(true);
    setActiveTab(tab);
    
    // Simuler un chargement pour les composants lourds
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, [checkAuth, onLogout, isSuperadmin, canManagePopup, canManageSlides]);



  // Fonction pour gérer les erreurs des composants enfants
  const handleChildError = useCallback((error: string) => {
    if (error.includes('401') || error.includes('authentification') || error.includes('token')) {
      onLogout();
    } else {
      setGlobalError(error);
    }
  }, [onLogout]);

  // Nettoyer l'erreur après un délai
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => {
        setGlobalError(null);
      }, 5001);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  const renderContent = () => {
    // Si non authentifié, afficher un message de chargement
    if (isAuthenticated === false) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Redirection...</span>
          </div>
          <p className="ms-3">Redirection vers la page de connexion...</p>
        </div>
      );
    }

    // Si l'authentification est encore en cours de vérification
    if (isAuthenticated === null) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Vérification...</span>
          </div>
          <p className="ms-3">Vérification de l'authentification...</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-4 bg-white rounded shadow-sm">
            <h2 className="h2 fw-bold mb-4">Tableau de Bord Administrateur</h2>
            {globalError && (
              <div className="alert alert-danger d-flex align-items-center mb-4">
                <AlertCircle className="me-2" />
                {globalError}
              </div>
            )}
            <div className="row g-4">
              {canManageSlides && (
              <div className="col-md-4">
                <div className="p-4 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }}>
                  <h3 className="h5 fw-semibold text-dark mb-2">Gestion des Slides</h3>
                  <p className="small text-secondary mb-3">Configurez le carousel d'accueil</p>
                  <button
                    onClick={() => handleTabChange('slides')}
                    className="btn btn-link p-0 text-decoration-none fw-medium"
                    style={{ color: '#7a2b3a' }}
                  >
                    Gérer les slides →
                  </button>
                </div>
              </div>
              )}
              <div className="col-md-4">
                <div className="p-4 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }}>
                  <h3 className="h5 fw-semibold text-dark mb-2">Gestion des Cartes</h3>
                  <p className="small text-secondary mb-3">Créez et organisez les sections</p>
                  <button
                    onClick={() => handleTabChange('cards')}
                    className="btn btn-link p-0 text-decoration-none fw-medium"
                    style={{ color: '#7a2b3a' }}
                  >
                    Gérer les cartes →
                  </button>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-4 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }}>
                  <h3 className="h5 fw-semibold text-dark mb-2">Gestion des Articles</h3>
                  <p className="small text-secondary mb-3">Publiez et modifiez les contenus</p>
                  <button
                    onClick={() => handleTabChange('articles')}
                    className="btn btn-link p-0 text-decoration-none fw-medium"
                    style={{ color: '#7a2b3a' }}
                  >
                    Gérer les articles →
                  </button>
                </div>
              </div>
              {canManagePopup && (
              <div className="col-md-4">
                <div className="p-4 rounded border" style={{ backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }}>
                  <h3 className="h5 fw-semibold text-dark mb-2">Pop-up portail public</h3>
                  <p className="small text-secondary mb-3">Configurer l'affichage du pop-up d'accueil</p>
                  <button
                    onClick={() => handleTabChange('popup')}
                    className="btn btn-link p-0 text-decoration-none fw-medium"
                    style={{ color: '#7a2b3a' }}
                  >
                    Gérer le pop-up →
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        );
      case 'slides':
        return canManageSlides ? <AdminSlideManager onError={handleChildError} /> : (
          <div className="alert alert-warning">Permission insuffisante pour gérer les slides.</div>
        );
      case 'cards':
        return <AdminCardManager onError={handleChildError} />;
      case 'articles':
        return <AdminArticleList onError={handleChildError} />;
      case 'popup':
        return canManagePopup ? <AdminPopupManger onError={handleChildError} /> : (
          <div className="alert alert-warning">Permission insuffisante pour gérer le pop-up.</div>
        );
      case 'users':
        return isSuperadmin ? <AdminUserManager onError={handleChildError} /> : (
          <div className="alert alert-warning">Accès réservé au superadmin.</div>
        );
      case 'trash':
        return isSuperadmin ? <AdminTrashManager onError={handleChildError} /> : (
          <div className="alert alert-warning">Accès réservé au superadmin.</div>
        );
      default:
        return null;
    }
  };

  // Si non authentifié ou en cours de vérification
  if (isAuthenticated !== true) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">{isAuthenticated === false ? 'Redirection...' : 'Vérification...'}</span>
          </div>
          <p>{isAuthenticated === false ? 'Redirection vers la page de connexion...' : 'Vérification de l\'authentification...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex vh-100 bg-light admin-dashboard-layout">
      {/* Sidebar */}
      <aside className="d-flex flex-column bg-white text-dark" style={{ 
        width: '250px',
        borderRight: '1px solid #e9ecef',
        minHeight: '100vh'
      }}>
        <div className="p-4 border-bottom" style={{ borderColor: '#e9ecef' }}>
          <h1 className="h4 fw-bold mb-1" style={{ color: '#7a2b3a' }}>ANAM Admin</h1>
          <p className="small text-secondary mb-0">Panneau d'administration</p>
        </div>

        <nav className="p-3 flex-grow-1">
          <div className="d-flex flex-column gap-2">
            <button
              onClick={() => handleTabChange('dashboard')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'dashboard')}
              disabled={isLoading}
            >
              <Grid size={20} />
              <span>Dashboard</span>
            </button>

            {canManageSlides && <button
              onClick={() => handleTabChange('slides')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'slides')}
              disabled={isLoading}
            >
              <ImageIcon size={20} />
              <span>Slides Carousel</span>
            </button>}

            <button
              onClick={() => handleTabChange('cards')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'cards')}
              disabled={isLoading}
            >
              <Plus size={20} />
              <span>Gestion des Cartes</span>
            </button>

            <button
              onClick={() => handleTabChange('articles')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'articles')}
              disabled={isLoading}
            >
              <FileText size={20} />
              <span>Articles</span>
            </button>

            {canManagePopup && <button
              onClick={() => handleTabChange('popup')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'popup')}
              disabled={isLoading}
            >
              <Edit size={20} />
              <span>Pop-up</span>
            </button>}

            {isSuperadmin && <button
              onClick={() => handleTabChange('users')}
              className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
              style={getButtonStyle(activeTab === 'users')}
              disabled={isLoading}
            >
              <Users size={20} />
              <span>Utilisateurs</span>
            </button>}
            {isSuperadmin && <button
  onClick={() => handleTabChange('trash')}
  className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0"
  style={getButtonStyle(activeTab === 'trash')}
  disabled={isLoading}
>
  <Trash2 size={20} />
  <span>Corbeille</span>
</button>}
            <div className="mt-auto pt-4">
              <button
                onClick={() => {
                  // Nettoyer le localStorage
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('refreshToken');
                  localStorage.removeItem('username');
                  localStorage.removeItem('role');
                  
                  // Rediriger
                  setTimeout(() => {
                    onLogout();
                  }, 100);
                }}
                className="btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0 text-dark"
                style={{ 
                  textAlign: 'left' as const,
                  borderTop: '1px solid #e9ecef',
                  backgroundColor: 'transparent',
                  color: '#212529',
                }}
                disabled={isLoading}
              >
                <Settings size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-grow-1 overflow-auto">
        <header className="bg-white border-bottom px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="h4 fw-semibold mb-0" style={{ color: '#7a2b3a' }}>
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'slides' && 'Gestion des Slides Carousel'}
              {activeTab === 'cards' && 'Gestion des Cartes'}
              {activeTab === 'articles' && 'Gestion des Articles'}
              {activeTab === 'popup' && 'Gestion du Pop-up'}
              {activeTab === 'users' && 'Gestion des Utilisateurs'}
              {activeTab === 'trash' && 'Gestion de la Corbeille'}

            </h2>
            <div className="small text-muted">
              Connecté en tant que {(() => {
                try {
                  const u = localStorage.getItem('user') || sessionStorage.getItem('user');
                  const role = u ? JSON.parse(u).role : 'admin';
                  return role;
                } catch {
                  return 'admin';
                }
              })()}
            </div>
          </div>
        </header>
        
        <main className="p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
