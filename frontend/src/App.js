import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
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
const App = () => {
    const [user, setUser] = useState(null);
    // Vérifier l'authentification au chargement
    useEffect(() => {
        const token = localStorage.getItem('accessToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('accessToken') ||
            sessionStorage.getItem('token');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (token && userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser({ ...userData, token });
            }
            catch (error) {
                console.error('Erreur parsing user:', error);
                localStorage.clear();
            }
        }
    }, []);
    // Fonction déclenchée après login
    const handleLogin = useCallback((loginData) => {
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
    return (_jsxs(Router, { future: { v7_startTransition: true, v7_relativeSplatPath: true }, children: [_jsx(PublicPageNavbar, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(PublicPortal, { onLogin: handleLogin }) }), _jsx(Route, { path: "/notifications", element: _jsx(PublicNotifications, {}) }), _jsx(Route, { path: "/carte/:cardId", element: _jsx(CardArticlesPage, {}) }), _jsx(Route, { path: "/pdf/:id", element: _jsx(PdfViewPage, {}) }), _jsx(Route, { path: "/applications", element: _jsx(ApplicationsPage, {}) }), _jsx(Route, { path: "/antennes", element: _jsx(AntennesPage, {}) }), _jsx(Route, { path: "/lien-utils", element: _jsx(LienUtilsPage, {}) }), _jsx(Route, { path: "/interfaces", element: _jsx(InterfacesPage, {}) }), _jsx(Route, { path: "/ihm", element: _jsx(IHMPage, {}) }), _jsx(Route, { path: "/guide", element: _jsx("iframe", { src: "/Guide.html", style: { width: '100%', height: '100vh', border: 'none' }, title: "Guide" }) }), _jsx(Route, { path: "/Annuaire DEM \u2014 Minist\u00E8re de l'\u00C9nergie et des mines", element: _jsx("iframe", { src: "/annuaire_dem.html", style: { width: '100%', height: '100vh', border: 'none' }, title: "Annuaire DEM \u2014 Minist\u00E8re de l'\u00C9nergie et des mines" }) }), _jsx(Route, { path: "/Experts_Miniers_Agr\u00E9\u00E9s", element: _jsx("iframe", { src: "/Experts_Miniers_Agr\u00E9\u00E9s.html", style: { width: '100%', height: '100vh', border: 'none' }, title: "Experts Miniers Agr\u00E9\u00E9s" }) }), _jsx(Route, { path: "/Valeurs Marchandes Moyennes des Produits Miniers", element: _jsx("iframe", { src: "/valeurs_minieres_2025.html", style: { width: '100%', height: '100vh', border: 'none' }, title: "Valeurs Marchandes Moyennes des Produits Miniers" }) }), _jsx(Route, { path: "/contacts", element: _jsx(ContactsPage, {}) }), _jsx(Route, { path: "/admin/login", element: _jsx(AdminLoginPage, { onLogin: handleLogin }) }), _jsx(Route, { path: "/admin/*", element: isAdmin ? (_jsx(AdminDashboard, { onLogout: handleLogout })) : (_jsx(Navigate, { to: "/admin/login", replace: true })) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) })] })] }));
};
export default App;
