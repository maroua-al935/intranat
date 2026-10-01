import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Edit, Grid, Settings, Users, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import AdminArticleList from './AdminArticleList';
import AdminCardManager from './AdminCardManager';
import AdminSlideManager from './AdminSlideManager';
import AdminTrashManager from './AdminTrashManager';
import AdminPopupManger from './AdminPopupManger';
import AdminUserManager from './AdminUserManager';
import 'bootstrap/dist/css/bootstrap.min.css';
const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [globalError, setGlobalError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const userContext = (() => {
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            return raw ? JSON.parse(raw) : {};
        }
        catch {
            return {};
        }
    })();
    const userRole = userContext.role || 'admin';
    const isSuperadmin = userRole === 'superadmin';
    const canManageSlides = isSuperadmin || !!userContext.canManageSlides;
    const canManagePopup = isSuperadmin || !!userContext.canManagePopup;
    const getButtonStyle = (isActive) => ({
        textAlign: 'left',
        backgroundColor: isActive ? '#7a2b3a' : 'transparent',
        color: isActive ? 'white' : '#212529',
        transition: 'all 0.2s ease',
        borderLeft: isActive ? '4px solid #5a1b2a' : '4px solid transparent',
    });
    // Fonction pour vérifier l'authentification - version memoized pour éviter les re-renders
    const checkAuth = useCallback(() => {
        const token = localStorage.getItem('accessToken') ||
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
        }
        catch {
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
    const handleTabChange = useCallback((tab) => {
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
    const handleChildError = useCallback((error) => {
        if (error.includes('401') || error.includes('authentification') || error.includes('token')) {
            onLogout();
        }
        else {
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
            return (_jsxs("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '300px' }, children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Redirection..." }) }), _jsx("p", { className: "ms-3", children: "Redirection vers la page de connexion..." })] }));
        }
        // Si l'authentification est encore en cours de vérification
        if (isAuthenticated === null) {
            return (_jsxs("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '300px' }, children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "V\u00E9rification..." }) }), _jsx("p", { className: "ms-3", children: "V\u00E9rification de l'authentification..." })] }));
        }
        if (isLoading) {
            return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '300px' }, children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }) }));
        }
        switch (activeTab) {
            case 'dashboard':
                return (_jsxs("div", { className: "p-4 bg-white rounded shadow-sm", children: [_jsx("h2", { className: "h2 fw-bold mb-4", children: "Tableau de Bord Administrateur" }), globalError && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center mb-4", children: [_jsx(AlertCircle, { className: "me-2" }), globalError] })), _jsxs("div", { className: "row g-4", children: [canManageSlides && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-4 rounded border", style: { backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }, children: [_jsx("h3", { className: "h5 fw-semibold text-dark mb-2", children: "Gestion des Slides" }), _jsx("p", { className: "small text-secondary mb-3", children: "Configurez le carousel d'accueil" }), _jsx("button", { onClick: () => handleTabChange('slides'), className: "btn btn-link p-0 text-decoration-none fw-medium", style: { color: '#7a2b3a' }, children: "G\u00E9rer les slides \u2192" })] }) })), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-4 rounded border", style: { backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }, children: [_jsx("h3", { className: "h5 fw-semibold text-dark mb-2", children: "Gestion des Cartes" }), _jsx("p", { className: "small text-secondary mb-3", children: "Cr\u00E9ez et organisez les sections" }), _jsx("button", { onClick: () => handleTabChange('cards'), className: "btn btn-link p-0 text-decoration-none fw-medium", style: { color: '#7a2b3a' }, children: "G\u00E9rer les cartes \u2192" })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-4 rounded border", style: { backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }, children: [_jsx("h3", { className: "h5 fw-semibold text-dark mb-2", children: "Gestion des Articles" }), _jsx("p", { className: "small text-secondary mb-3", children: "Publiez et modifiez les contenus" }), _jsx("button", { onClick: () => handleTabChange('articles'), className: "btn btn-link p-0 text-decoration-none fw-medium", style: { color: '#7a2b3a' }, children: "G\u00E9rer les articles \u2192" })] }) }), canManagePopup && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-4 rounded border", style: { backgroundColor: '#f8f9fa', borderColor: '#dee2e6' }, children: [_jsx("h3", { className: "h5 fw-semibold text-dark mb-2", children: "Pop-up portail public" }), _jsx("p", { className: "small text-secondary mb-3", children: "Configurer l'affichage du pop-up d'accueil" }), _jsx("button", { onClick: () => handleTabChange('popup'), className: "btn btn-link p-0 text-decoration-none fw-medium", style: { color: '#7a2b3a' }, children: "G\u00E9rer le pop-up \u2192" })] }) }))] })] }));
            case 'slides':
                return canManageSlides ? _jsx(AdminSlideManager, { onError: handleChildError }) : (_jsx("div", { className: "alert alert-warning", children: "Permission insuffisante pour g\u00E9rer les slides." }));
            case 'cards':
                return _jsx(AdminCardManager, { onError: handleChildError });
            case 'articles':
                return _jsx(AdminArticleList, { onError: handleChildError });
            case 'popup':
                return canManagePopup ? _jsx(AdminPopupManger, { onError: handleChildError }) : (_jsx("div", { className: "alert alert-warning", children: "Permission insuffisante pour g\u00E9rer le pop-up." }));
            case 'users':
                return isSuperadmin ? _jsx(AdminUserManager, { onError: handleChildError }) : (_jsx("div", { className: "alert alert-warning", children: "Acc\u00E8s r\u00E9serv\u00E9 au superadmin." }));
            case 'trash':
                return isSuperadmin ? _jsx(AdminTrashManager, { onError: handleChildError }) : (_jsx("div", { className: "alert alert-warning", children: "Acc\u00E8s r\u00E9serv\u00E9 au superadmin." }));
            default:
                return null;
        }
    };
    // Si non authentifié ou en cours de vérification
    if (isAuthenticated !== true) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center vh-100", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "spinner-border text-primary mb-3", role: "status", children: _jsx("span", { className: "visually-hidden", children: isAuthenticated === false ? 'Redirection...' : 'Vérification...' }) }), _jsx("p", { children: isAuthenticated === false ? 'Redirection vers la page de connexion...' : 'Vérification de l\'authentification...' })] }) }));
    }
    return (_jsxs("div", { className: "d-flex vh-100 bg-light admin-dashboard-layout", children: [_jsxs("aside", { className: "d-flex flex-column bg-white text-dark", style: {
                    width: '250px',
                    borderRight: '1px solid #e9ecef',
                    minHeight: '100vh'
                }, children: [_jsxs("div", { className: "p-4 border-bottom", style: { borderColor: '#e9ecef' }, children: [_jsx("h1", { className: "h4 fw-bold mb-1", style: { color: '#7a2b3a' }, children: "ANAM Admin" }), _jsx("p", { className: "small text-secondary mb-0", children: "Panneau d'administration" })] }), _jsx("nav", { className: "p-3 flex-grow-1", children: _jsxs("div", { className: "d-flex flex-column gap-2", children: [_jsxs("button", { onClick: () => handleTabChange('dashboard'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'dashboard'), disabled: isLoading, children: [_jsx(Grid, { size: 20 }), _jsx("span", { children: "Dashboard" })] }), canManageSlides && _jsxs("button", { onClick: () => handleTabChange('slides'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'slides'), disabled: isLoading, children: [_jsx(ImageIcon, { size: 20 }), _jsx("span", { children: "Slides Carousel" })] }), _jsxs("button", { onClick: () => handleTabChange('cards'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'cards'), disabled: isLoading, children: [_jsx(Plus, { size: 20 }), _jsx("span", { children: "Gestion des Cartes" })] }), _jsxs("button", { onClick: () => handleTabChange('articles'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'articles'), disabled: isLoading, children: [_jsx(FileText, { size: 20 }), _jsx("span", { children: "Articles" })] }), canManagePopup && _jsxs("button", { onClick: () => handleTabChange('popup'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'popup'), disabled: isLoading, children: [_jsx(Edit, { size: 20 }), _jsx("span", { children: "Pop-up" })] }), isSuperadmin && _jsxs("button", { onClick: () => handleTabChange('users'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'users'), disabled: isLoading, children: [_jsx(Users, { size: 20 }), _jsx("span", { children: "Utilisateurs" })] }), isSuperadmin && _jsxs("button", { onClick: () => handleTabChange('trash'), className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0", style: getButtonStyle(activeTab === 'trash'), disabled: isLoading, children: [_jsx(Trash2, { size: 20 }), _jsx("span", { children: "Corbeille" })] }), _jsx("div", { className: "mt-auto pt-4", children: _jsxs("button", { onClick: () => {
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
                                        }, className: "btn d-flex align-items-center gap-3 w-100 p-3 rounded border-0 text-dark", style: {
                                            textAlign: 'left',
                                            borderTop: '1px solid #e9ecef',
                                            backgroundColor: 'transparent',
                                            color: '#212529',
                                        }, disabled: isLoading, children: [_jsx(Settings, { size: 20 }), _jsx("span", { children: "D\u00E9connexion" })] }) })] }) })] }), _jsxs("div", { className: "flex-grow-1 overflow-auto", children: [_jsx("header", { className: "bg-white border-bottom px-4 py-3", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("h2", { className: "h4 fw-semibold mb-0", style: { color: '#7a2b3a' }, children: [activeTab === 'dashboard' && 'Dashboard', activeTab === 'slides' && 'Gestion des Slides Carousel', activeTab === 'cards' && 'Gestion des Cartes', activeTab === 'articles' && 'Gestion des Articles', activeTab === 'popup' && 'Gestion du Pop-up', activeTab === 'users' && 'Gestion des Utilisateurs', activeTab === 'trash' && 'Gestion de la Corbeille'] }), _jsxs("div", { className: "small text-muted", children: ["Connect\u00E9 en tant que ", (() => {
                                            try {
                                                const u = localStorage.getItem('user') || sessionStorage.getItem('user');
                                                const role = u ? JSON.parse(u).role : 'admin';
                                                return role;
                                            }
                                            catch {
                                                return 'admin';
                                            }
                                        })()] })] }) }), _jsx("main", { className: "p-4", children: renderContent() })] })] }));
};
export default AdminDashboard;
