import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authAPI } from '../../services/api';
import './AdminLoginPage.css';
const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // Ajout important
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
};
const AdminLoginPage = ({ onLogin }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Appel à l'API réelle
            const response = await authAPI.login({
                username, // Votre backend attend "username"
                password
            });
            const { token, user } = response.data;
            // Vérifier que l'utilisateur est admin ou superadmin
            if (user.role !== 'admin' && user.role !== 'superadmin') {
                setError('Accès réservé aux administrateurs');
                return;
            }
            // Appeler la fonction onLogin du parent (App.tsx)
            onLogin({ user, token });
            // Stocker les données selon rememberMe
            if (rememberMe) {
                localStorage.setItem('accessToken', token);
                localStorage.setItem('user', JSON.stringify(user));
                // Stocker aussi refreshToken si disponible
                if (response.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.refreshToken);
                }
            }
            else {
                sessionStorage.setItem('accessToken', token);
                sessionStorage.setItem('user', JSON.stringify(user));
                if (response.data.refreshToken) {
                    sessionStorage.setItem('refreshToken', response.data.refreshToken);
                }
            }
            // Rediriger vers le dashboard admin
            navigate('/admin');
        }
        catch (error) {
            console.error('Erreur de connexion:', error);
            // Gérer les erreurs spécifiques
            if (error.response?.status === 401) {
                setError('Identifiants incorrects');
            }
            else if (error.response?.status === 404) {
                setError('Utilisateur non trouvé');
            }
            else if (error.message?.includes('Network Error')) {
                setError('Impossible de se connecter au serveur. Vérifiez votre connexion.');
            }
            else {
                setError(error.response?.data?.error || 'Une erreur est survenue');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    // Vérifier si l'utilisateur est déjà connecté
    useEffect(() => {
        const checkExistingAuth = () => {
            let token = localStorage.getItem('accessToken');
            let userData = localStorage.getItem('user');
            if (!token) {
                token = sessionStorage.getItem('accessToken');
                userData = sessionStorage.getItem('user');
            }
            // Ajouter une vérification d'expiration basique
            if (token && userData) {
                try {
                    const user = JSON.parse(userData);
                    // Vérifier l'expiration du token (si vous stockez l'expiration)
                    const tokenExpiry = localStorage.getItem('tokenExpiry');
                    if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
                        clearAuthData();
                        return;
                    }
                    if (user.role === 'admin' || user.role === 'superadmin') {
                        onLogin({ user, token });
                        navigate('/admin');
                    }
                    else {
                        navigate('/');
                    }
                }
                catch (error) {
                    console.error('Erreur lors du parsing des données:', error);
                    clearAuthData();
                }
            }
        };
        checkExistingAuth();
    }, [onLogin, navigate]);
    return (_jsxs("div", { className: "admin-login-page", children: [_jsx("header", { className: "admin-login-header", children: _jsxs("div", { className: "container", children: [_jsxs(Link, { to: "/", className: "back-to-portal", children: [_jsx(ArrowLeft, { size: 18 }), "Retour au mes Applications"] }), _jsx("div", { className: "header-logo", children: _jsx("img", { src: "/full_logo.png", alt: "ANAM Logo", className: "logo" }) })] }) }), _jsx("main", { className: "admin-login-main", children: _jsx("div", { className: "container", children: _jsx("div", { className: "login-card-container", children: _jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-card-header", children: [_jsx("div", { className: "login-icon", children: _jsx(Lock, { size: 32 }) }), _jsx("h2", { children: "Connexion Admin" }), _jsx("p", { className: "login-subtitle", children: "Acc\u00E8s r\u00E9serv\u00E9 aux administrateurs ANAM" })] }), _jsxs("form", { onSubmit: handleLoginSubmit, className: "login-form", children: [_jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", children: [_jsx(UserIcon, { size: 16 }), "Identifiant administrateur"] }), _jsx("input", { type: "text", className: "form-control", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Votre identifiant ANAM", required: true, disabled: isLoading, autoComplete: "username" })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { className: "form-label", children: [_jsx(Lock, { size: 16 }), "Mot de passe"] }), _jsxs("div", { className: "password-input-group", children: [_jsx("input", { type: showPassword ? 'text' : 'password', className: "form-control", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Votre mot de passe", required: true, disabled: isLoading, autoComplete: "current-password" }), _jsx("button", { type: "button", className: "password-toggle", onClick: () => setShowPassword(!showPassword), disabled: isLoading, children: showPassword ? _jsx(EyeOff, { size: 18 }) : _jsx(Eye, { size: 18 }) })] })] }), _jsxs("div", { className: "form-options", children: [_jsxs("label", { className: "checkbox-label", children: [_jsx("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), disabled: isLoading }), _jsx("span", { children: "Se souvenir de moi" })] }), _jsx(Link, { to: "/forgot-password", className: "forgot-password", children: "Mot de passe oubli\u00E9 ?" })] }), error && (_jsx("div", { className: "alert alert-danger", children: _jsx("small", { children: error }) })), _jsx("button", { type: "submit", className: "login-button", disabled: isLoading || !username || !password, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "spinner", size: 18 }), "Connexion en cours..."] })) : (_jsxs(_Fragment, { children: [_jsx(LogIn, { size: 18 }), "Se connecter"] })) })] })] }) }) }) })] }));
};
export default AdminLoginPage;
