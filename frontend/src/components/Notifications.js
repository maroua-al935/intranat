import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import initializeSocket from '../services/socket';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const resolveNotificationId = (data) => {
    return data._id || data.articleId || data.relatedId || data.id || null;
};
const normalizeNotification = (data) => {
    const resolvedId = resolveNotificationId(data);
    const safeId = resolvedId || Math.random().toString(36).slice(2);
    return {
        _id: safeId,
        title: data.title || 'Notification',
        category: data.category || 'General',
        date: data.date || new Date().toISOString(),
        content: data.content,
        type: data.type,
        isRead: data.isRead,
        relatedId: data.relatedId,
        articleId: data.articleId || data.id || data.relatedId || data._id || safeId,
        cardId: data.cardId,
        cardTitle: data.cardTitle
    };
};
const NotificationBell = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPinned, setDropdownPinned] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [readNotifications, setReadNotifications] = useState(new Set()); // ← DÉPLACÉ ICI
    const dropdownRef = useRef(null);
    const bellRef = useRef(null);
    const dropdownCloseTimerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const clearDropdownCloseTimer = () => {
        if (dropdownCloseTimerRef.current) {
            clearTimeout(dropdownCloseTimerRef.current);
            dropdownCloseTimerRef.current = null;
        }
    };
    const scheduleDropdownClose = () => {
        clearDropdownCloseTimer();
        if (dropdownPinned)
            return;
        dropdownCloseTimerRef.current = setTimeout(() => {
            setShowDropdown(false);
            dropdownCloseTimerRef.current = null;
        }, 250);
    };
    const openDropdownPreview = () => {
        clearDropdownCloseTimer();
        if (!dropdownPinned)
            setShowDropdown(true);
    };
    const handleBellClick = () => {
        clearDropdownCloseTimer();
        if (dropdownPinned) {
            setDropdownPinned(false);
            setShowDropdown(false);
            return;
        }
        setDropdownPinned(true);
        setShowDropdown(true);
        if (unreadCount > 0)
            markAllAsRead();
    };
    useLayoutEffect(() => {
        if (!showDropdown || !bellRef.current)
            return;
        const placeDropdown = () => {
            const bell = bellRef.current;
            if (!bell)
                return;
            const rect = bell.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight;
            const width = Math.min(380, viewportWidth - 24);
            const left = Math.max(12, Math.min(rect.right - width, viewportWidth - width - 12));
            const top = rect.bottom + 8;
            const arrowLeft = Math.max(18, Math.min(rect.left + rect.width / 2 - left, width - 18));
            setDropdownStyle({
                top: `${top}px`,
                left: `${left}px`,
                right: 'auto',
                width: `${width}px`,
                maxHeight: `${Math.max(160, viewportHeight - top - 12)}px`,
                '--notification-arrow-left': `${arrowLeft}px`,
            });
        };
        placeDropdown();
        window.addEventListener('resize', placeDropdown);
        document.addEventListener('scroll', placeDropdown, true);
        return () => {
            window.removeEventListener('resize', placeDropdown);
            document.removeEventListener('scroll', placeDropdown, true);
        };
    }, [showDropdown]);
    // Charger les notifications lues depuis localStorage
    useEffect(() => {
        const loadReadNotifications = () => {
            const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');
            return new Set(read);
        };
        setReadNotifications(loadReadNotifications());
    }, []);
    // Gérer le clic en dehors du dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                bellRef.current &&
                !bellRef.current.contains(event.target)) {
                setShowDropdown(false);
                setDropdownPinned(false);
                clearDropdownCloseTimer();
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setShowDropdown(false);
                setDropdownPinned(false);
                clearDropdownCloseTimer();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            clearDropdownCloseTimer();
        };
    }, []);
    // Socket.io et chargement initial
    useEffect(() => {
        const socket = initializeSocket();
        socket.on('connect', () => {
            console.log('🔔 NotificationBell: Socket connecté');
            setIsConnected(true);
        });
        socket.on('new-notification', (data) => {
            console.log('🔔 Nouvelle notification reçue:', data);
            const newNotification = normalizeNotification({
                ...data,
                isRead: false // Nouvelle notification = non lue
            });
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            showToastNotification(newNotification);
        });
        socket.on('disconnect', () => {
            console.log('🔔 NotificationBell: Socket déconnecté');
            setIsConnected(false);
        });
        fetchNotifications();
        return () => {
            socket.off('new-notification');
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);
    // Charger les notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/public/notifications`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'omit'
            });
            if (!response.ok) {
                if (response.status === 401)
                    return;
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            // Fusionner isRead du backend avec localStorage
            const formattedNotifications = data.slice(0, 15).map((notif) => {
                const normalized = normalizeNotification(notif);
                return {
                    ...normalized,
                    // Si c'est dans localStorage, c'est lu
                    isRead: readNotifications.has(normalized._id) || normalized.isRead === true
                };
            });
            // Compter uniquement les notifications non lues
            const unreadNotifications = formattedNotifications.filter((notif) => !notif.isRead);
            setNotifications(formattedNotifications);
            setUnreadCount(unreadNotifications.length);
        }
        catch (error) {
            console.error('❌ Error loading notifications:', error.message);
        }
        finally {
            setLoading(false);
        }
    };
    // Réactualiser fetchNotifications quand readNotifications change
    useEffect(() => {
        if (readNotifications.size > 0) {
            fetchNotifications();
        }
    }, [readNotifications.size]);
    const showToastNotification = (notification) => {
        const newToast = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9)
        };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => {
            removeToast(newToast.id);
        }, 5000);
    };
    const removeToast = (toastId) => {
        setToasts(prev => prev.filter(toast => toast.id !== toastId));
    };
    const markAsRead = (notificationId) => {
        if (!notificationId)
            return;
        // Sauvegarder dans localStorage
        const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        if (!read.includes(notificationId)) {
            read.push(notificationId);
            localStorage.setItem('readNotifications', JSON.stringify(read));
            setReadNotifications(new Set(read));
        }
        setNotifications(prev => prev.map(notif => notif._id === notificationId ? { ...notif, isRead: true } : notif));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };
    const markAllAsRead = () => {
        // Ajouter tous les IDs actuels au localStorage
        const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        const currentIds = notifications.map(notif => notif._id);
        currentIds.forEach(id => {
            if (!read.includes(id)) {
                read.push(id);
            }
        });
        localStorage.setItem('readNotifications', JSON.stringify(read));
        setReadNotifications(new Set(read));
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        setUnreadCount(0);
    };
    const getTargetRoute = (notification) => {
        if (notification.cardId) {
            return `/carte/${notification.cardId}`;
        }
        return null;
    };
    const handleNotificationClick = (notification) => {
        const targetRoute = getTargetRoute(notification);
        const readId = notification._id || notification.articleId || notification.relatedId || notification.cardId;
        markAsRead(readId);
        setShowDropdown(false);
        setDropdownPinned(false);
        clearDropdownCloseTimer();
        console.log('Notification cliquee:', notification);
        if (!targetRoute) {
            console.warn('Aucun cardId pour la redirection.');
            return;
        }
        navigate(targetRoute);
    };
    const extractArticleIdFromContent = (content) => {
        const idPattern = /(?:ID|id|Id):\s*(\w+)|article[:\s]+(\w+)/i;
        const match = content.match(idPattern);
        if (match) {
            return match[1] || match[2] || null;
        }
        const objectIdPattern = /[0-9a-fA-F]{24}/;
        const objectIdMatch = content.match(objectIdPattern);
        if (objectIdMatch) {
            return objectIdMatch[0];
        }
        return null;
    };
    const handleToastClick = (notification) => {
        const targetRoute = getTargetRoute(notification);
        if (!targetRoute)
            return;
        navigate(targetRoute);
    };
    const clearAllNotifications = () => {
        if (window.confirm('Voulez-vous supprimer toutes les notifications ?')) {
            setNotifications([]);
            setUnreadCount(0);
            // Optionnel: vider aussi localStorage
            localStorage.removeItem('readNotifications');
            setReadNotifications(new Set());
        }
    };
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return '📢';
        }
    };
    const getCategoryColor = (category) => {
        const colors = {
            'urgent': '#dc3545',
            'nouveauté': '#28a745',
            'mise à jour': '#17a2b8',
            'sécurité': '#ffc107',
            'information': '#6c757d',
            'article': '#007bff',
        };
        return colors[category.toLowerCase()] || '#007bff';
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'À l\'instant';
        if (diffMins < 60)
            return `Il y a ${diffMins} min`;
        if (diffHours < 24)
            return `Il y a ${diffHours} h`;
        if (diffDays < 7)
            return `Il y a ${diffDays} j`;
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });
    };
    return (_jsxs("div", { className: "notification-bell-container", children: [_jsxs("button", { ref: bellRef, className: `notification-bell-btn ${showDropdown ? 'active' : ''}`, onMouseEnter: openDropdownPreview, onMouseLeave: scheduleDropdownClose, onFocus: openDropdownPreview, onBlur: scheduleDropdownClose, onClick: handleBellClick, title: isConnected ? 'Notifications actives' : 'Notifications', children: [_jsx(Bell, { size: 22 }), unreadCount > 0 && (_jsx("span", { className: "notification-badge", children: unreadCount > 9 ? '9+' : unreadCount })), !isConnected && (_jsx("span", { className: "connection-indicator offline", title: "Hors ligne" }))] }), showDropdown && (_jsxs("div", { ref: dropdownRef, className: "notification-dropdown", style: dropdownStyle, onMouseEnter: clearDropdownCloseTimer, onMouseLeave: scheduleDropdownClose, children: [_jsxs("div", { className: "notification-header", children: [_jsxs("div", { className: "header-content", children: [_jsx("h6", { children: "Notifications" }), _jsx("div", { className: "header-actions", children: notifications.length > 0 && (_jsxs(_Fragment, { children: [_jsx("button", { className: "header-action-btn", onClick: markAllAsRead, title: "Tout marquer comme lu", children: _jsx(Check, { size: 16 }) }), _jsx("button", { className: "header-action-btn", onClick: clearAllNotifications, title: "Effacer toutes les notifications", children: _jsx(X, { size: 16 }) })] })) })] }), loading && (_jsxs("div", { className: "loading-indicator", children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Chargement..." })] }))] }), _jsx("div", { className: "notification-list", children: notifications.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx(Bell, { size: 48, className: "empty-icon" }), _jsx("p", { children: "Aucune notification" }), _jsx("small", { children: "Vous serez notifi\u00E9 des nouvelles activit\u00E9s" })] })) : (notifications.map((notification) => (_jsxs("div", { className: `notification-item ${notification.isRead ? '' : 'unread'}`, onClick: () => handleNotificationClick(notification), title: `Cliquer pour ouvrir la carte (ID: ${notification.cardId || 'inconnu'})`, children: [_jsx("div", { className: "notification-icon", children: getNotificationIcon(notification.type) }), _jsxs("div", { className: "notification-content", children: [_jsxs("div", { className: "notification-header-row", children: [_jsx("strong", { className: "notification-title", children: notification.title }), _jsx("button", { className: "mark-read-btn", onClick: (e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification._id);
                                                    }, title: "Marquer comme lu", children: _jsx(Check, { size: 14 }) })] }), notification.content && (_jsx("p", { className: "notification-preview", children: notification.content.length > 80
                                                ? `${notification.content.substring(0, 80)}...`
                                                : notification.content })), notification.cardTitle && (_jsxs("div", { className: "notification-card-name", children: ["Carte: ", notification.cardTitle] })), _jsxs("div", { className: "notification-footer-row", children: [_jsx("span", { className: "notification-category", style: {
                                                        backgroundColor: getCategoryColor(notification.category),
                                                        color: 'white'
                                                    }, children: notification.category }), _jsxs("div", { className: "notification-time-info", children: [_jsx(Clock, { size: 12 }), _jsx("span", { className: "notification-time", children: formatDate(notification.date) })] })] })] })] }, notification._id)))) }), notifications.length > 0 && (_jsx("div", { className: "notification-footer", children: _jsxs("button", { className: "view-all-link", onClick: () => navigate('/notifications'), children: [_jsx("span", { children: "Voir toutes les notifications" }), _jsx(ExternalLink, { size: 14 })] }) }))] })), _jsx("div", { className: "toast-container", children: toasts.map((toast) => (_jsxs("div", { className: "notification-toast", style: {
                        borderLeftColor: getCategoryColor(toast.category),
                        cursor: 'pointer'
                    }, onClick: () => handleToastClick(toast), title: "Cliquer pour ouvrir", children: [_jsxs("div", { className: "toast-header", children: [_jsx("span", { className: "toast-icon", children: getNotificationIcon(toast.type) }), _jsx("strong", { children: toast.title }), _jsx("button", { className: "toast-close", onClick: (e) => {
                                        e.stopPropagation();
                                        removeToast(toast.id);
                                    }, children: _jsx(X, { size: 16 }) })] }), _jsx("p", { className: "toast-content", children: toast.content }), toast.cardTitle && (_jsxs("p", { className: "toast-card", children: ["Carte: ", toast.cardTitle] })), _jsxs("div", { className: "toast-footer", children: [_jsx("span", { className: "toast-category", style: {
                                        backgroundColor: getCategoryColor(toast.category),
                                        color: 'white'
                                    }, children: toast.category }), _jsx("span", { className: "toast-time", children: formatDate(toast.date) })] })] }, toast.id))) }), _jsx("style", { children: `
        .notification-bell-container {
          position: relative;
        }

        .notification-bell-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          position: relative;
          color: #333;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .notification-bell-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .notification-bell-btn.active {
          background-color: rgba(0, 123, 255, 0.1);
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: #dc3545;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .connection-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid white;
        }

        .connection-indicator.offline {
          background-color: #6c757d;
        }

        .notification-dropdown {
          position: fixed;
          top: 76px;
          left: 12px;
          width: min(380px, calc(100vw - 24px));
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1100;
          max-height: min(500px, calc(100vh - 88px));
          max-height: min(500px, calc(100dvh - 88px));
          display: flex;
          flex-direction: column;
        }

        .notification-dropdown::before {
          position: absolute;
          top: -7px;
          left: var(--notification-arrow-left, 24px);
          width: 14px;
          height: 14px;
          content: '';
          background: #f8f9fa;
          border-top: 1px solid #eee;
          border-left: 1px solid #eee;
          transform: translateX(-50%) rotate(45deg);
        }

        .notification-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h6 {
          margin: 0;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-action-btn {
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .header-action-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          color: #6c757d;
          font-size: 14px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ddd;
          border-radius: 50%;
          border-top-color: #007bff;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .notification-list {
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }

        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f8f9fa;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          gap: 12px;
        }

        .notification-item:hover {
          background-color: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .notification-item.unread {
          background-color: rgba(0, 123, 255, 0.05);
          border-left: 3px solid #007bff;
        }

        .notification-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-content {
          flex: 1;
        }

        .notification-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 4px;
        }

        .notification-title {
          font-size: 14px;
          line-height: 1.4;
          color: #212529;
          margin: 0;
          flex: 1;
        }

        .mark-read-btn {
          opacity: 0;
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .notification-item:hover .mark-read-btn {
          opacity: 1;
        }

        .mark-read-btn:hover {
          background: rgba(0, 123, 255, 0.1);
          color: #007bff;
        }

        .notification-preview {
          font-size: 13px;
          color: #6c757d;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .notification-card-name {
          font-size: 12px;
          color: #6c757d;
          margin: 0 0 8px 0;
        }

        .notification-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .notification-category {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .notification-time-info {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6c757d;
        }

        .debug-info {
          font-size: 10px;
          color: #999;
          margin-top: 4px;
          font-family: monospace;
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          word-break: break-all;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #6c757d;
        }

        .empty-icon {
          opacity: 0.5;
          margin-bottom: 12px;
        }

        .notification-footer {
          padding: 12px 16px;
          border-top: 1px solid #eee;
          background: #f8f9fa;
        }

        .view-all-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #007bff;
          text-decoration: none;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          padding: 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .view-all-link:hover {
          background: rgba(0, 123, 255, 0.1);
        }

        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification-toast {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px 16px;
          width: 300px;
          border-left: 4px solid;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .toast-icon {
          font-size: 16px;
        }

        .toast-header strong {
          flex: 1;
          font-size: 14px;
        }

        .toast-close {
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 2px;
        }

        .toast-content {
          font-size: 13px;
          color: #6c757d;
          margin: 0 0 8px 0;
        }

        .toast-card {
          font-size: 12px;
          color: #6c757d;
          margin: 0 0 8px 0;
        }

        .toast-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }

        .toast-category {
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .toast-time {
          color: #868e96;
        }

        @media (max-width: 576px) {
          .notification-dropdown {
            border-radius: 12px;
            max-height: calc(100vh - 80px);
            max-height: calc(100dvh - 80px);
          }

          .notification-list {
            max-height: none;
            min-height: 0;
          }

          .notification-header,
          .notification-footer {
            padding-right: 12px;
            padding-left: 12px;
          }

          .toast-container {
            right: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            left: 12px;
            align-items: flex-end;
          }

          .notification-toast {
            width: min(300px, 100%);
            max-width: 100%;
          }

          .mark-read-btn {
            opacity: 1;
          }
        }
      ` })] }));
};
export default NotificationBell;
