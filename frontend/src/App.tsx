import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicPortal from './components/PublicPortal';
import PublicNotifications from './components/PublicNotifications';
import AdminDashboard from './pages/admin/AdminDashboard';
import CardArticlesPage from './pages/CardArticlesPage';
import ApplicationsPage from './pages/intranet/ApplicationsPage';
import AntennesPage from './pages/intranet/AntennesPage';
import LienUtilsPage from './pages/intranet/LienUtilsPage';
import ContactsPage from './pages/intranet/ContactsPage';
import IHMPage from './pages/intranet/IHMPage';
import InterfacesPage from './pages/intranet/InterfacesPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import PdfViewPage from './pages/PdfViewPage';
import PublicPageNavbar from './components/PublicPageNavbar';

const App: React.FC = () => {
  const [user, setUser] = useState<{ username: string; role: 'superadmin' | 'admin' | 'user'; canManageSlides?: boolean; canManagePopup?: boolean; token: string } | null>(null);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser({ ...userData, token });
      } catch (error) {
        console.error('Erreur parsing user:', error);
        localStorage.clear();
      }
    }
  }, []);

  // Fonction déclenchée après login
  const handleLogin = useCallback((loginData: { user: { username: string; role: 'superadmin' | 'admin' | 'user'; canManageSlides?: boolean; canManagePopup?: boolean }; token: string }) => {
    const { user: userData, token } = loginData;
    const userObj = { ...userData, token };
    setUser(userObj);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  // Fonction pour logout
  const handleLogout = useCallback(() => {
  // Effacer TOUTES les données
  localStorage.clear();
  sessionStorage.clear();
  
  // Forcer un rechargement complet
  window.location.href = '/admin/login';
  window.location.reload(); // Optionnel
}, []);

  // Variables dérivées
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PublicPageNavbar />
      <Routes>
        {/* Portail public - Accueil */}
        <Route 
          path="/" 
          element={<PublicPortal onLogin={handleLogin} />} 
        />

        <Route
          path="/notifications"
          element={<PublicNotifications />}
        />

        {/* Page des articles d'une carte spécifique */}
        <Route 
          path="/carte/:cardId" 
          element={<CardArticlesPage />} 
        />

        {/* Visualisation PDF protégé (best-effort) */}
        <Route
          path="/pdf/:id"
          element={<PdfViewPage />}
        />
        
  
        {/* Page des applications */}
        <Route 
          path="/applications" 
          element={<ApplicationsPage />} 
        />

        {/* Page des antennes */}
        <Route
          path="/antennes"
          element={<AntennesPage />}
        />

        {/* Page des liens utils */}
        <Route
          path="/lien-utils"
          element={<LienUtilsPage />}
        />

        {/* Page IHM */}
        <Route
          path="/interfaces"
          element={<InterfacesPage />}
        />
        <Route
          path="/ihm"
          element={<IHMPage />}
        />
<Route
  path="/guide"
  element={
    <iframe
      src="/Guide.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Guide"
    />
  }
/>
<Route
  path="/Annuaire DEM — Ministère de l'Énergie et des mines"
  element={
    <iframe
      src="/annuaire_dem.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Annuaire DEM — Ministère de l'Énergie et des mines"
    />
  }
/>
<Route
  path="/Experts_Miniers_Agréés"
  element={
    <iframe
      src="/Experts_Miniers_Agréés.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Experts Miniers Agréés"
    />
  }
/>
<Route
  path="/Valeurs Marchandes Moyennes des Produits Miniers"
  element={
    <iframe
      src="/valeurs_minieres_2025.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="Valeurs Marchandes Moyennes des Produits Miniers"
    />
  }
/>

        {/* Page des contacts */}
        <Route
          path="/contacts"
          element={<ContactsPage />}
        />

        {/* Page de connexion admin - TOUJOURS accessible */}
        <Route 
          path="/admin/login" 
          element={<AdminLoginPage onLogin={handleLogin} />} 
        />
        
        {/* Dashboard admin (protégé) */}
        <Route 
          path="/admin/*" 
          element={
            isAdmin ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          } 
        />
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
