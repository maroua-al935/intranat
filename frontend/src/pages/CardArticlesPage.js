import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Search, Grid, List, Filter, Globe, ChevronRight, LogOut } from 'lucide-react';
import { cardsAPI, articlesAPI, authAPI, clearPortalAuthData } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CardArticlesPage.css';
const toRgba = (hex, alpha) => {
    const fallback = `rgba(122, 43, 58, ${alpha})`;
    if (!hex)
        return fallback;
    let value = hex.trim().replace('#', '');
    if (value.length === 3) {
        value = value.split('').map(char => char + char).join('');
    }
    if (value.length !== 6 || /[^0-9a-f]/i.test(value))
        return fallback;
    const num = parseInt(value, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const resolveFileUrl = (url) => {
    const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
    if (!url)
        return '';
    if (url.startsWith('http'))
        return url;
    if (url.startsWith('/'))
        return `${backendUrl}${url}`;
    return `${backendUrl}/${url}`;
};
const getStoredRole = () => {
    const readRole = (raw) => {
        if (!raw)
            return '';
        try {
            const obj = JSON.parse(raw);
            return String(obj?.role || '');
        }
        catch {
            return '';
        }
    };
    const portalRole = readRole(sessionStorage.getItem('portalUser')) ||
        readRole(localStorage.getItem('portalUser'));
    const adminRole = readRole(sessionStorage.getItem('user')) ||
        readRole(localStorage.getItem('user'));
    return portalRole || adminRole || '';
};
const AntennaIcon = ({ size = 24 }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("line", { x1: "8", y1: "3", x2: "12", y2: "7" }), _jsx("line", { x1: "16", y1: "3", x2: "12", y2: "7" }), _jsx("line", { x1: "12", y1: "7", x2: "12", y2: "9" }), _jsx("rect", { x: "3", y: "9", width: "18", height: "10", rx: "2" }), _jsx("line", { x1: "9", y1: "21", x2: "15", y2: "21" })] }));
const getFileTypeLabel = (url) => {
    if (!url)
        return '';
    const clean = url.split('?')[0].split('#')[0];
    const ext = clean.split('.').pop()?.toLowerCase();
    if (!ext || ext === clean)
        return '';
    if (['pdf'].includes(ext))
        return 'PDF';
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext))
        return 'Word';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
        return 'Excel';
    if (['ppt', 'pptx', 'odp'].includes(ext))
        return 'PowerPoint';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic'].includes(ext))
        return 'Image';
    if (['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'wmv', 'flv', '3gp', 'mpeg', 'mpg', 'ogv'].includes(ext))
        return 'Vidéo';
    return ext.toUpperCase();
};
const CardArticlesPage = () => {
    const { cardId } = useParams();
    const navigate = useNavigate();
    const [card, setCard] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTitles, setExpandedTitles] = useState({});
    const [showPortalLogin, setShowPortalLogin] = useState(false);
    const [portalUsername, setPortalUsername] = useState('');
    const [portalPassword, setPortalPassword] = useState('');
    const [portalRemember, setPortalRemember] = useState(false);
    const [portalError, setPortalError] = useState('');
    const [portalLoading, setPortalLoading] = useState(false);
    const [hasPortalToken, setHasPortalToken] = useState(() => {
        return !!(sessionStorage.getItem('portalAccessToken') || localStorage.getItem('portalAccessToken'));
    });
    const isSuperadmin = getStoredRole() === 'superadmin';
    const isItOnlyCard = /(^|\s)(it|informatique)(\s|$)/i.test(card?.title || '') || /informatique/i.test(card?.category || '');
    const recentBaseColor = card?.color || '#7a2b3a';
    const recentVars = {
        ['--recent-color']: recentBaseColor,
        ['--recent-color-strong']: toRgba(recentBaseColor, 0.35),
        ['--recent-color-soft']: toRgba(recentBaseColor, 0.12),
        ['--recent-pulse-color']: toRgba(recentBaseColor, 0.4)
    };
    useEffect(() => {
        if (cardId)
            fetchCardAndArticles(cardId);
    }, [cardId]);
    const toggleTitleExpansion = (articleId, e) => {
        e.stopPropagation(); // Empêche la navigation vers l'article
        setExpandedTitles(prev => ({
            ...prev,
            [articleId]: !prev[articleId]
        }));
    };
    const shouldShowSeeMore = (title) => {
        // Si le titre fait plus de 100 caractères, on montre le bouton "Voir plus"
        return title.length > 100;
    };
    const RECENT_HOURS = 48;
    const isRecentArticle = (article) => {
        const rawDate = article.createdAt || article.date;
        if (!rawDate)
            return false;
        const ts = new Date(rawDate).getTime();
        if (Number.isNaN(ts))
            return false;
        const diffMs = Date.now() - ts;
        const recentWindow = RECENT_HOURS * 60 * 60 * 1000;
        return diffMs >= 0 && diffMs <= recentWindow;
    };
    const openPdf = (article) => {
        if (article.pdfProtected) {
            if (!isSuperadmin) {
                window.alert('PDF protege: acces reserve au superadmin.');
                return;
            }
            window.open(`/pdf/${article._id}`, '_blank', 'noopener,noreferrer');
            return;
        }
        const pdfUrl = resolveFileUrl(article.pdfUrl);
        if (pdfUrl)
            window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    };
    const fetchCardAndArticles = async (id) => {
        try {
            setLoading(true);
            setPortalError('');
            const cardResponse = await cardsAPI.getById(id);
            const nextCard = cardResponse.data || null;
            setCard(nextCard);
            try {
                const articlesResponse = await articlesAPI.getAll({ cardId: id });
                setArticles(articlesResponse.data || []);
                setShowPortalLogin(false);
                if (nextCard?.redirectUrl) {
                    const targetUrl = String(nextCard.redirectUrl).trim();
                    if (targetUrl) {
                        window.location.replace(targetUrl);
                        return;
                    }
                }
            }
            catch (err) {
                if (nextCard?.requiresLdapLogin && err?.response?.status === 401) {
                    setArticles([]);
                    setHasPortalToken(false);
                    setShowPortalLogin(true);
                }
                else if (nextCard?.requiresLdapLogin && err?.response?.status === 403) {
                    setArticles([]);
                    setHasPortalToken(true);
                    setPortalError(err?.response?.data?.error || 'Accès interdit');
                    setShowPortalLogin(true);
                }
                else {
                    throw err;
                }
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            setCard(null);
            setArticles([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePortalLogin = async (e) => {
        e.preventDefault();
        setPortalError('');
        setPortalLoading(true);
        try {
            const response = await authAPI.portalLogin({
                username: portalUsername,
                password: portalPassword
            });
            const { token, user } = response.data || {};
            if (!token) {
                throw new Error('Token manquant');
            }
            if (portalRemember) {
                localStorage.setItem('portalAccessToken', token);
                localStorage.setItem('portalUser', JSON.stringify(user || { username: portalUsername, role: 'user' }));
                sessionStorage.removeItem('portalAccessToken');
                sessionStorage.removeItem('portalUser');
            }
            else {
                sessionStorage.setItem('portalAccessToken', token);
                sessionStorage.setItem('portalUser', JSON.stringify(user || { username: portalUsername, role: 'user' }));
                localStorage.removeItem('portalAccessToken');
                localStorage.removeItem('portalUser');
            }
            setHasPortalToken(true);
            setShowPortalLogin(false);
            if (cardId) {
                await fetchCardAndArticles(cardId);
            }
        }
        catch (error) {
            if (error?.response?.status === 401) {
                setPortalError('Identifiants incorrects');
            }
            else if (error?.response?.status === 403) {
                setPortalError(error?.response?.data?.error || 'Acces interdit');
            }
            else {
                setPortalError(error?.response?.data?.error || error?.message || 'Erreur de connexion');
            }
        }
        finally {
            setPortalLoading(false);
        }
    };
    const handlePortalLogout = () => {
        clearPortalAuthData();
        setHasPortalToken(false);
        setPortalError('');
        setPortalPassword('');
        setArticles([]);
        setShowPortalLogin(true);
    };
    const filteredArticles = articles.filter(a => {
        const q = searchQuery.toLowerCase();
        const contentValue = typeof a.content === 'string' ? a.content : '';
        return (a.title.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            contentValue.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q));
    });
    const handleBack = () => navigate(-1);
    if (loading) {
        return (_jsx("div", { className: "min-vh-100 d-flex align-items-center justify-content-center bg-gradient-light", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "spinner-border text-primary", style: { width: '3rem', height: '3rem' } }), _jsx("p", { className: "mt-3 text-muted fs-5", children: "Chargement des articles..." })] }) }));
    }
    if (!card) {
        return (_jsx("div", { className: "min-vh-100 d-flex align-items-center justify-content-center bg-gradient-light", children: _jsxs("div", { className: "text-center p-5 bg-white rounded-4 shadow-lg", children: [_jsx("h3", { className: "fw-bold mb-4 text-danger", children: "Carte introuvable" }), _jsx("p", { className: "text-muted mb-4", children: "La carte que vous recherchez n'existe pas ou a \u00E9t\u00E9 supprim\u00E9e." }), _jsxs("p", { className: "small text-muted mb-4", children: ["ID: ", cardId] }), _jsxs("button", { onClick: handleBack, className: "btn btn-primary btn-lg px-4 py-3 rounded-pill d-flex align-items-center mx-auto", style: {
                            background: 'linear-gradient(135deg, #7a2b3a, #9a3b4a)',
                            border: 'none',
                            transition: 'transform 0.3s ease'
                        }, onMouseEnter: e => e.currentTarget.style.transform = 'translateY(-2px)', onMouseLeave: e => e.currentTarget.style.transform = 'translateY(0)', children: [_jsx(ArrowLeft, { className: "me-2" }), " Retour \u00E0 l'accueil"] })] }) }));
    }
    return (_jsxs("div", { className: "min-vh-100 d-flex flex-column bg-light", children: [showPortalLogin && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(12, 12, 12, 0.55)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }, children: _jsxs("div", { className: "bg-white rounded-4 shadow-lg p-4", style: { width: 'min(520px, 96vw)' }, children: [_jsxs("div", { className: "d-flex align-items-center gap-3 mb-3", children: [_jsx("img", { src: "/full_logo.png", alt: "ANAM", style: { height: '3rem' } }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold", children: "Connexion requise" }), _jsx("div", { className: "text-muted small", children: isItOnlyCard ? (_jsxs(_Fragment, { children: ["Acc\u00E8s r\u00E9serv\u00E9 au service informatique. Merci de vous connecter pour acc\u00E9der \u00E0 :", ' ', _jsx("span", { className: "fw-semibold", children: card?.title })] })) : (_jsxs(_Fragment, { children: ["Merci de vous connecter pour acc\u00E9der \u00E0 : ", _jsx("span", { className: "fw-semibold", children: card?.title })] })) })] })] }), _jsxs("form", { onSubmit: handlePortalLogin, children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label fw-semibold", children: "Identifiant" }), _jsx("input", { type: "text", className: "form-control", value: portalUsername, onChange: (e) => setPortalUsername(e.target.value), autoComplete: "username", required: true, disabled: portalLoading })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label fw-semibold", children: "Mot de passe" }), _jsx("input", { type: "password", className: "form-control", value: portalPassword, onChange: (e) => setPortalPassword(e.target.value), autoComplete: "current-password", required: true, disabled: portalLoading })] }), _jsxs("div", { className: "form-check mb-3", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "portalRemember", checked: portalRemember, onChange: (e) => setPortalRemember(e.target.checked), disabled: portalLoading }), _jsx("label", { className: "form-check-label", htmlFor: "portalRemember", children: "Se souvenir de moi" })] }), portalError && (_jsx("div", { className: "alert alert-danger py-2", role: "alert", children: _jsx("small", { children: portalError }) })), _jsxs("div", { className: "d-flex gap-2 justify-content-end", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: handleBack, disabled: portalLoading, children: "Retour" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: portalLoading, children: portalLoading ? 'Connexion...' : 'Se connecter' })] })] })] }) })), _jsxs("main", { className: "container-lg pt-4 pb-9", children: [_jsx("div", { className: "card border-0 mb-4 animate-fade-in mx-auto", style: {
                            backgroundColor: card.color || '#f5f5f5',
                            background: `linear-gradient(135deg, ${card.color || '#7a2b3a'} 0%, ${card.color ? card.color + 'cc' : '#9a3b4a'} 100%)`,
                            borderRadius: '15px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            width: '100%'
                        }, children: _jsxs("div", { className: "card-body p-7", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("button", { onClick: handleBack, className: "btn btn-outline-light d-flex align-items-center px-3 py-1 rounded-pill border-1", style: {
                                                transition: 'all 0.3s ease',
                                                fontSize: '0.9rem'
                                            }, onMouseEnter: e => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                                            }, onMouseLeave: e => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }, children: [_jsx(ArrowLeft, { className: "me-2", size: 18 }), " Retour"] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsxs("div", { className: "btn-group", children: [_jsxs("button", { onClick: () => setViewMode('grid'), className: `btn btn-sm px-3 py-1 ${viewMode === 'grid' ? 'btn-light text-dark' : 'btn-outline-light'}`, style: { fontSize: '0.85rem' }, children: [_jsx(Grid, { size: 16, className: "me-1" }), " Grille"] }), _jsxs("button", { onClick: () => setViewMode('list'), className: `btn btn-sm px-3 py-1 ${viewMode === 'list' ? 'btn-light text-dark' : 'btn-outline-light'}`, style: { fontSize: '0.85rem' }, children: [_jsx(List, { size: 16, className: "me-1" }), " Liste"] })] }), card.requiresLdapLogin && hasPortalToken && !showPortalLogin && (_jsxs("button", { type: "button", className: "btn btn-sm btn-outline-light px-3 py-1 d-flex align-items-center", style: { fontSize: '0.85rem' }, onClick: handlePortalLogout, title: "D\u00E9connexion", children: [_jsx(LogOut, { size: 16, className: "me-1" }), "D\u00E9connexion"] }))] })] }), _jsx("h1", { className: "fw-bold text-white mb-2", style: { fontSize: '1.8rem' }, children: card.title }), _jsx("p", { className: "text-white-75 mb-0", style: { opacity: 0.9, fontSize: '1rem' }, children: card.description })] }) }), _jsx("div", { className: "mb-4 mx-auto", style: { maxWidth: '600px', width: '100%' }, children: _jsx("div", { className: "position-relative", children: _jsxs("div", { className: "d-flex align-items-center border rounded-3 px-3 py-2 bg-white shadow-sm", children: [_jsx(Search, { size: 18, className: "text-muted me-3" }), _jsx("input", { type: "text", className: "border-0 flex-grow-1", placeholder: "Rechercher", value: searchQuery, onChange: e => setSearchQuery(e.target.value), style: {
                                            outline: 'none',
                                            fontSize: '0.9rem',
                                            background: 'transparent'
                                        } }), searchQuery && (_jsx("button", { onClick: () => setSearchQuery(''), className: "btn btn-link p-0 ms-2", style: { minWidth: '24px' }, children: _jsx("small", { className: "text-muted", children: "\u2715" }) }))] }) }) }), filteredArticles.length === 0 ? (_jsx("div", { className: "card shadow-lg border-0 animate-fade-in", children: _jsxs("div", { className: "card-body text-center py-6", children: [_jsx(Filter, { className: "text-secondary mb-4", size: 25 }), _jsx("h3", { className: "fw-bold mb-3", children: "Aucun r\u00E9sultat trouv\u00E9" }), _jsx("p", { className: "text-muted fs-5 mb-4", children: searchQuery
                                        ? "Essayez avec d'autres mots-clés ou vérifiez l'orthographe."
                                        : "Aucun article disponible pour cette carte." }), searchQuery && (_jsx("button", { onClick: () => setSearchQuery(''), className: "btn btn-outline-primary px-4 py-2 rounded-pill", children: "R\u00E9initialiser la recherche" }))] }) })) : viewMode === 'grid' ? (_jsx("div", { className: "row g-4", children: filteredArticles.map((a, index) => {
                            const isRecent = isRecentArticle(a);
                            return (_jsxs("div", { className: `col-12 col-md-6 col-lg-4 animate-fade-in ${isRecent ? 'recent-card-wrapper' : ''}`, style: { animationDelay: `${index * 0.1}s`, ...recentVars }, children: [isRecent && (_jsx("span", { className: "recent-badge", children: "Nouveau" })), _jsx(ArticleCard, { article: a, onRead: () => openPdf(a), cardColor: card.color, className: `h-100 shadow-hover ${isRecent ? 'recent-article' : ''}` })] }, a._id));
                        }) })) : (_jsx("div", { className: "card shadow-lg border-0 overflow-hidden animate-fade-in", children: _jsx("div", { className: "list-group list-group-flush", children: filteredArticles.map((a, index) => {
                                const isRecent = isRecentArticle(a);
                                return (_jsx("div", { className: `list-group-item p-0 border-0 ${isRecent ? 'recent-list-item' : ''}`, style: {
                                        animationDelay: `${index * 0.05}s`,
                                        borderBottom: '1px solid rgba(0,0,0,0.05) !important',
                                        ...recentVars
                                    }, children: _jsxs("div", { className: "p-4 hover-lift d-flex justify-content-between align-items-center", style: {
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer'
                                        }, onClick: () => openPdf(a), onMouseEnter: e => {
                                            e.currentTarget.style.backgroundColor = 'rgba(122, 43, 58, 0.02)';
                                            e.currentTarget.style.transform = 'translateX(10px)';
                                        }, onMouseLeave: e => {
                                            e.currentTarget.style.backgroundColor = '';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                        }, children: [_jsxs("div", { className: "flex-grow-1", children: [_jsxs("div", { className: "d-flex align-items-center gap-3 mb-2", children: [_jsx("h5", { className: "fw-bold mb-0 text-dark", style: {
                                                                    lineHeight: '1.4',
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: expandedTitles[a._id] ? 'none' : 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    minHeight: '2.8em',
                                                                    flex: 1
                                                                }, title: a.title, children: a.title }), _jsx("span", { className: "badge rounded-pill px-3 py-2", style: {
                                                                    backgroundColor: `${card.color}20`,
                                                                    color: card.color || '#7a2b3a',
                                                                    flexShrink: 0
                                                                }, children: a.category }), isRecent && (_jsx("span", { className: "badge rounded-pill px-3 py-2 recent-badge-inline", children: "Nouveau" }))] }), shouldShowSeeMore(a.title) && (_jsx("button", { onClick: (e) => toggleTitleExpansion(a._id, e), className: "btn btn-link p-0 text-primary text-decoration-none d-flex align-items-center gap-1 mb-2", style: { fontSize: '0.85rem' }, children: expandedTitles[a._id] ? (_jsxs(_Fragment, { children: ["Voir moins", _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "18 15 12 9 6 15" }) })] })) : (_jsxs(_Fragment, { children: ["Voir plus", _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "6 9 12 15 18 9" }) })] })) })), _jsx("p", { className: "text-muted mb-3", style: {
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            lineHeight: '1.5'
                                                        }, children: a.description || 'Aucune description disponible' }), _jsxs("div", { className: "d-flex gap-4 text-muted small", children: [_jsxs("span", { className: "d-flex align-items-center", children: [_jsx(Calendar, { size: 16, className: "me-2" }), new Date(a.date).toLocaleDateString('fr-FR', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric'
                                                                    })] }), a.pdfUrl && (_jsxs("span", { className: "d-flex align-items-center", children: [_jsx(FileText, { size: 16, className: "me-2" }), getFileTypeLabel(a.pdfUrl) || 'Fichier'] }))] })] }), _jsx(ChevronRight, { className: "text-primary ms-3", size: 24 })] }) }, a._id));
                            }) }) }))] }), _jsx("footer", { className: "site-footer", children: _jsx("div", { className: "wide-container", children: _jsxs("div", { className: "footer-content", children: [_jsxs("div", { className: "footer-section", children: [_jsx("div", { className: "footer-logo", children: _jsx(Globe, { size: 18 }) }), _jsx("span", { className: "footer-website", children: _jsx("a", { href: "https://www.anam.gov.dz", target: "_blank", rel: "noopener noreferrer", className: "footer-link", children: "www.anam.gov.dz" }) })] }), _jsxs("div", { className: "footer-copyright", children: ["\u00A9 ", new Date().getFullYear(), " Agence Nationale des Activit\u00E9s Mini\u00E8res. Tous droits r\u00E9serv\u00E9s."] }), _jsxs("div", { className: "footer-links", children: [_jsx("a", { href: "#", className: "footer-link", children: "Mentions l\u00E9gales" }), _jsx("a", { href: "#", className: "footer-link", children: "Confidentialit\u00E9" })] })] }) }) }), _jsx("style", { children: `
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
        
        .hover-effect {
          transition: all 0.3s ease;
        }
        
        .hover-effect:hover {
          background: rgba(122, 43, 58, 0.1);
          transform: translateY(-2px);
        }
        
        .shadow-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .shadow-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.15) !important;
        }

        .recent-card-wrapper {
          position: relative;
        }

        .recent-article {
          box-shadow: 0 0 0 2px var(--recent-color-strong), 0 10px 20px var(--recent-color-soft) !important;
          animation: recentPulse 2.2s ease-in-out 2;
        }

        .recent-badge {
          position: absolute;
          top: 12px;
          right: 16px;
          background: var(--recent-color);
          color: #ffffff;
          font-size: 0.72rem;
          padding: 4px 10px;
          border-radius: 999px;
          letter-spacing: 0.3px;
          box-shadow: 0 6px 14px var(--recent-color-strong);
          animation: badgePop 0.6s ease-out;
          z-index: 2;
        }

        .recent-badge-inline {
          background: var(--recent-color);
          color: #ffffff;
          font-size: 0.7rem;
        }

        .recent-list-item .hover-lift {
          box-shadow: inset 4px 0 0 var(--recent-color);
          background: linear-gradient(90deg, var(--recent-color-soft), rgba(255, 255, 255, 0) 45%);
          animation: recentPulse 2.2s ease-in-out 2;
        }

        
        .logo-hover:hover {
          transform: scale(1.05);
        }
        
        .hover-lift {
          transition: all 0.3s ease;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes recentPulse {
          0% {
            box-shadow: 0 0 0 0 var(--recent-pulse-color);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(0, 0, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
          }
        }

        @keyframes badgePop {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        
        .bg-gradient-light {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .pt-6 {
          padding-top: 5rem !important;
        }
        
        .mt-6 {
          margin-top: 5rem !important;
        }
        
        /* Correction pour les éléments flex */
        .flex-1 {
          flex: 1;
        }
        
        .flex-shrink-0 {
          flex-shrink: 0;
        }
      ` })] }));
};
export default CardArticlesPage;
