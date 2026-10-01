import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PublicNotifications.css';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const PublicNotifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/public/notifications`);
                if (!response.ok)
                    throw new Error(`Erreur ${response.status}`);
                const data = await response.json();
                setNotifications(Array.isArray(data) ? data : []);
            }
            catch (loadError) {
                console.error('Erreur de chargement des notifications :', loadError);
                setError('Impossible de charger les notifications pour le moment.');
            }
            finally {
                setLoading(false);
            }
        };
        loadNotifications();
    }, []);
    const formatDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return 'Date indisponible';
        return date.toLocaleString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };
    return (_jsx("main", { className: "public-notifications-page", children: _jsxs("div", { className: "public-notifications-container", children: [_jsxs("button", { className: "public-notifications-back", type: "button", onClick: () => navigate('/'), children: [_jsx(ArrowLeft, { size: 18 }), " Retour au portail"] }), _jsxs("header", { className: "public-notifications-heading", children: [_jsx("span", { className: "public-notifications-heading-icon", children: _jsx(Bell, { size: 22 }) }), _jsxs("div", { children: [_jsx("p", { children: "PORTAIL ANAM" }), _jsx("h1", { children: "Toutes les notifications" }), _jsx("span", { children: "Les derni\u00E8res actualit\u00E9s et mises \u00E0 jour publi\u00E9es." })] })] }), loading ? (_jsx("div", { className: "public-notifications-state", role: "status", children: "Chargement des notifications\u2026" })) : error ? (_jsx("div", { className: "public-notifications-state is-error", role: "alert", children: error })) : notifications.length === 0 ? (_jsxs("div", { className: "public-notifications-state", children: [_jsx(Bell, { size: 30 }), _jsx("p", { children: "Aucune notification disponible." })] })) : (_jsx("section", { className: "public-notifications-list", "aria-label": "Liste des notifications", children: notifications.map((notification) => {
                        const item = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "public-notification-topline", children: [_jsx("span", { className: "public-notification-category", children: notification.category || 'Général' }), _jsxs("span", { className: "public-notification-date", children: [_jsx(Clock, { size: 14 }), " ", formatDate(notification.date)] })] }), _jsx("h2", { children: notification.title }), notification.content && _jsx("p", { children: notification.content }), notification.cardTitle && _jsxs("span", { className: "public-notification-card", children: ["Section : ", notification.cardTitle] }), notification.cardId && _jsxs("span", { className: "public-notification-open", children: ["Voir la section ", _jsx(ArrowUpRight, { size: 16 })] })] }));
                        return notification.cardId ? (_jsx("button", { type: "button", className: "public-notification-card-item is-link", onClick: () => navigate(`/carte/${notification.cardId}`), children: item }, notification._id)) : (_jsx("article", { className: "public-notification-card-item", children: item }, notification._id));
                    }) }))] }) }));
};
export default PublicNotifications;
