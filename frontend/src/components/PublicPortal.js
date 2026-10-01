import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, User, Phone, Search, ChevronLeft, ChevronRight, ArrowRight, Globe, ArrowUpRight, ChevronDown, Menu, X, MapPin, PanelsTopLeft, BookOpen, Landmark, Link as LinkIcon } from 'lucide-react';
import { cardsAPI, slidesAPI } from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './PublicPortal.css';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './Notifications';
import AntennesPage from '../pages/intranet/AntennesPage';
import ContactsPage from '../pages/intranet/ContactsPage';
import LienUtilsPage from '../pages/intranet/LienUtilsPage';
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
const POPUP_LAST_SEEN_KEY = 'anam_public_portal_popup_last_seen_v1';
const AntennaIcon = ({ size = 18 }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("line", { x1: "8", y1: "3", x2: "12", y2: "7" }), _jsx("line", { x1: "16", y1: "3", x2: "12", y2: "7" }), _jsx("line", { x1: "12", y1: "7", x2: "12", y2: "9" }), _jsx("rect", { x: "3", y: "9", width: "18", height: "10", rx: "2" }), _jsx("line", { x1: "9", y1: "21", x2: "15", y2: "21" })] }));
const DEFAULT_POPUP_CONFIG = {
    enabled: true,
    mode: 'always',
    intervalHours: 24,
    title: 'Bienvenue sur le portail public',
    message: "Acces rapide aux informations et services essentiels de l'ANAM.",
    bullets: [
        'Rechercher des notes, lois et formulaires.',
        'Explorer les sections par categories.',
        'Acceder a vos applications internes.'
    ],
    primaryLabel: 'Decouvrir',
    linkType: 'none',
    linkUrl: ''
};
const PublicPortal = ({ onLogin }) => {
    const navigate = useNavigate();
    const renderBoldText = (text) => {
        const parts = text.split('**');
        if (parts.length === 1) {
            return text;
        }
        return parts.map((part, index) => index % 2 === 1 ? (_jsx("strong", { children: part }, `bold-${index}`)) : (_jsx(React.Fragment, { children: part }, `text-${index}`)));
    };
    // États pour les données
    const [cards, setCards] = useState([]);
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Tous');
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState('');
    const [showScrollArrow, setShowScrollArrow] = useState(true);
    const [showCategories, setShowCategories] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [navScrolled, setNavScrolled] = useState(() => window.scrollY > 24);
    const [popupConfig, setPopupConfig] = useState(DEFAULT_POPUP_CONFIG);
    const [popupReady, setPopupReady] = useState(false);
    const categoriesRef = useRef(null);
    const navRef = useRef(null);
    const [navMenuOpen, setNavMenuOpen] = useState(false);
    const [navDropdownOpen, setNavDropdownOpen] = useState(null);
    const [activePanel, setActivePanel] = useState(null);
    const [panelPinned, setPanelPinned] = useState(false);
    const panelCloseTimerRef = useRef(null);
    const antennesTriggerRef = useRef(null);
    const contactsTriggerRef = useRef(null);
    const linksTriggerRef = useRef(null);
    const [antennesPanelPosition, setAntennesPanelPosition] = useState({ top: 80, left: 16, arrowLeft: 40 });
    useEffect(() => {
        const updateNavbarOnScroll = () => setNavScrolled(window.scrollY > 24);
        window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
        return () => window.removeEventListener('scroll', updateNavbarOnScroll);
    }, []);
    const clearPanelCloseTimer = () => {
        if (panelCloseTimerRef.current) {
            clearTimeout(panelCloseTimerRef.current);
            panelCloseTimerRef.current = null;
        }
    };
    const updatePanelPosition = (trigger) => {
        const rect = trigger?.getBoundingClientRect();
        if (!rect)
            return;
        const panelWidth = Math.min(900, window.innerWidth - 24);
        const panelHeight = Math.min(720, window.innerHeight - 24);
        const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
        const top = Math.min(rect.bottom + 10, window.innerHeight - panelHeight - 12);
        const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 18), panelWidth - 18);
        setAntennesPanelPosition({ top: Math.max(12, top), left, arrowLeft });
    };
    const previewPanel = (panel, trigger) => {
        if (panelPinned)
            return;
        clearPanelCloseTimer();
        updatePanelPosition(trigger);
        setActivePanel(panel);
    };
    const pinPanel = (panel, trigger) => {
        clearPanelCloseTimer();
        updatePanelPosition(trigger);
        setActivePanel(panel);
        setPanelPinned(true);
        closeNavMenu();
    };
    const schedulePanelClose = () => {
        clearPanelCloseTimer();
        if (panelPinned)
            return;
        panelCloseTimerRef.current = setTimeout(() => {
            setActivePanel(null);
            panelCloseTimerRef.current = null;
        }, 300);
    };
    const closePanel = () => {
        clearPanelCloseTimer();
        setActivePanel(null);
        setPanelPinned(false);
    };
    const closeNavMenu = useCallback(() => {
        setNavMenuOpen(false);
        setNavDropdownOpen(null);
    }, []);
    useEffect(() => {
        if (!activePanel)
            return;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                closePanel();
            }
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [activePanel]);
    const toggleNavMenu = useCallback(() => {
        setNavMenuOpen(prev => {
            const next = !prev;
            if (!next)
                setNavDropdownOpen(null);
            return next;
        });
    }, []);
    const toggleNavDropdown = useCallback((key) => {
        setNavMenuOpen(true);
        setNavDropdownOpen(prev => (prev === key ? null : key));
    }, []);
    useEffect(() => {
        const handlePointerDown = (event) => {
            const target = event.target;
            if (!target)
                return;
            if (navRef.current && !navRef.current.contains(target)) {
                closeNavMenu();
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeNavMenu();
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeNavMenu]);
    // Helper function pour les URLs d'images
    const getImageUrl = (url) => {
        if (!url)
            return '';
        if (url.startsWith('http'))
            return url;
        if (url.startsWith('/'))
            return `${BACKEND_URL}${url}`;
        return `${BACKEND_URL}/${url}`;
    };
    const getLinkUrl = (url) => {
        if (!url)
            return '';
        if (url.startsWith('http'))
            return url;
        if (url.startsWith('/'))
            return `${BACKEND_URL}${url}`;
        return `${BACKEND_URL}/${url}`;
    };
    const normalizePopupConfig = (config) => {
        const merged = { ...DEFAULT_POPUP_CONFIG, ...config };
        merged.enabled = merged.enabled !== false;
        merged.mode = merged.mode === 'always' ? 'always' : 'interval';
        const interval = Number(merged.intervalHours);
        merged.intervalHours = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_POPUP_CONFIG.intervalHours;
        merged.title = typeof merged.title === 'string' ? merged.title.trim() : DEFAULT_POPUP_CONFIG.title;
        merged.message = typeof merged.message === 'string' ? merged.message.trim() : DEFAULT_POPUP_CONFIG.message;
        merged.primaryLabel = merged.primaryLabel && merged.primaryLabel.trim()
            ? merged.primaryLabel.trim()
            : DEFAULT_POPUP_CONFIG.primaryLabel;
        if (!Array.isArray(merged.bullets)) {
            merged.bullets = DEFAULT_POPUP_CONFIG.bullets;
        }
        else {
            merged.bullets = merged.bullets
                .map(item => String(item).trim())
                .filter(Boolean)
                .slice(0, 6);
        }
        if (!['none', 'url', 'pdf'].includes(merged.linkType)) {
            merged.linkType = DEFAULT_POPUP_CONFIG.linkType;
        }
        merged.linkUrl = typeof merged.linkUrl === 'string' ? merged.linkUrl.trim() : '';
        return merged;
    };
    const closeWelcome = useCallback(() => {
        localStorage.setItem(POPUP_LAST_SEEN_KEY, String(Date.now()));
        setShowWelcome(false);
    }, []);
    const shouldShowPopup = useCallback((config) => {
        const lastSeenRaw = localStorage.getItem(POPUP_LAST_SEEN_KEY);
        const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : NaN;
        if (!Number.isFinite(lastSeen)) {
            return true; // Jamais vu sur ce navigateur
        }
        if (config.mode === 'interval') {
            const hoursSinceLast = (Date.now() - lastSeen) / (1000 * 60 * 60);
            return hoursSinceLast >= config.intervalHours;
        }
        // Mode "always" => seulement une fois par navigateur
        return false;
    }, []);
    useEffect(() => {
        const loadPopupConfig = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/public/popup-config`);
                if (response.ok) {
                    const data = await response.json();
                    setPopupConfig(normalizePopupConfig(data));
                }
            }
            catch (error) {
                console.error('Erreur chargement popup:', error);
            }
            finally {
                setPopupReady(true);
            }
        };
        loadPopupConfig();
    }, []);
    useEffect(() => {
        if (!popupReady) {
            return;
        }
        if (!popupConfig.enabled) {
            setShowWelcome(false);
            return;
        }
        const displayPopup = shouldShowPopup(popupConfig);
        setShowWelcome(displayPopup);
    }, [popupReady, popupConfig, shouldShowPopup]);
    useEffect(() => {
        if (!showWelcome) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeWelcome();
            }
        };
        const previousOverflow = document.body.style.overflow;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [showWelcome, closeWelcome]);
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            setCurrentTime(timeString);
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);
    // Effet pour le slider automatique
    useEffect(() => {
        if (slides.length > 0) {
            const interval = setInterval(() => {
                setCurrentSlideIndex(prev => (prev === slides.length - 1 ? 0 : prev + 1));
            }, 6000);
            return () => clearInterval(interval);
        }
    }, [slides]);
    // Effet pour gérer l'affichage de la flèche
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            const viewportHeight = window.innerHeight;
            // Cacher la flèche quand l'utilisateur a scrollé d'au moins la hauteur de la fenêtre
            if (scrollPosition > viewportHeight / 2) {
                setShowScrollArrow(false);
            }
            else {
                setShowScrollArrow(true);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    // Charger les données au chargement
    useEffect(() => {
        fetchData();
    }, []);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
                setShowCategories(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const fetchData = async () => {
        try {
            setLoading(true);
            const [cardsResponse, slidesResponse] = await Promise.all([
                cardsAPI.getAll(),
                slidesAPI.getAll()
            ]);
            const activeCards = cardsResponse.data.filter((card) => card.isActive);
            setCards(activeCards);
            setSlides(slidesResponse.data);
        }
        catch (error) {
            console.error('Erreur chargement données:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCardClick = (card) => {
        navigate(`/carte/${card._id}`);
    };
    const handlePortalSearch = (e) => {
        setSearchQuery(e.target.value);
    };
    const handleSlideClick = (slide) => {
        if (slide.link) {
            window.open(slide.link, '_blank');
        }
    };
    // Filtrage des cartes
    const categories = ['Tous', ...Array.from(new Set(cards.map(card => card.category).filter(Boolean)))];
    const filteredCards = cards.filter(card => (activeCategory === 'Tous' || card.category === activeCategory) &&
        card.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const nextSlide = () => {
        if (slides.length > 0) {
            setCurrentSlideIndex(prev => (prev === slides.length - 1 ? 0 : prev + 1));
        }
    };
    const prevSlide = () => {
        if (slides.length > 0) {
            setCurrentSlideIndex(prev => (prev === 0 ? slides.length - 1 : prev - 1));
        }
    };
    const scrollToContent = () => {
        const sliderElement = document.querySelector('.slider-section');
        if (sliderElement) {
            const sliderHeight = sliderElement.clientHeight;
            window.scrollTo({
                top: sliderHeight + 150, // Scroll jusqu'après le slider + marge
                behavior: 'smooth'
            });
            setShowScrollArrow(false);
        }
    };
    const handleWelcomePrimary = () => {
        const hasLink = popupConfig.linkType !== 'none' && !!popupConfig.linkUrl.trim();
        if (hasLink) {
            const resolvedUrl = getLinkUrl(popupConfig.linkUrl.trim());
            closeWelcome();
            window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        closeWelcome();
        setTimeout(() => {
            scrollToContent();
        }, 150);
    };
    return (_jsxs("div", { className: "bg-light public-portal", children: [showWelcome && (_jsx("div", { className: "anam-popup-overlay", onClick: closeWelcome, children: _jsxs("div", { className: "anam-popup-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "welcome-title", "aria-describedby": "welcome-desc", onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "anam-popup-close", onClick: closeWelcome, "aria-label": "Fermer", children: _jsx(X, { size: 18 }) }), _jsx("div", { className: "anam-popup-badge", children: "Bienvenue" }), _jsx("h2", { id: "welcome-title", className: "anam-popup-title", dir: "auto", children: popupConfig.title }), _jsx("p", { id: "welcome-desc", className: "anam-popup-text", dir: "auto", children: renderBoldText(popupConfig.message) }), _jsx("ul", { className: "anam-popup-list", dir: "auto", children: popupConfig.bullets.map((item, index) => (_jsx("li", { dir: "auto", children: item }, `popup-bullet-${index}`))) }), _jsxs("div", { className: "anam-popup-actions", children: [_jsx("button", { type: "button", className: "anam-popup-secondary", onClick: closeWelcome, children: "Fermer" }), popupConfig.linkType !== 'none' && (_jsx("button", { type: "button", className: "anam-popup-primary", onClick: handleWelcomePrimary, children: popupConfig.primaryLabel }))] })] }) })), _jsx("nav", { className: `navbar navbar-expand-lg sticky-top bg-white shadow-sm force-full-width${navScrolled ? ' is-scrolled' : ''}`, children: _jsx("div", { className: "wide-container", children: _jsxs("div", { className: "navbar-content", children: [_jsx("div", { className: "logo-container", children: _jsx("a", { className: "navbar-brand", href: "#", children: _jsx("img", { src: "/full_logo.png", alt: "Logo ANAM", className: "navbar-logo" }) }) }), _jsxs("div", { className: "nav-right", ref: navRef, children: [_jsx("button", { type: "button", className: "nav-toggle", onClick: toggleNavMenu, "aria-label": navMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu', "aria-expanded": navMenuOpen, children: navMenuOpen ? _jsx(X, { size: 18 }) : _jsx(Menu, { size: 18 }) }), _jsxs("div", { className: `nav-menu ${navMenuOpen ? 'is-open' : ''}`, children: [_jsx(NotificationBell, {}), _jsx("button", { ref: antennesTriggerRef, type: "button", className: "nav-link nav-icon-link antennes-nav-trigger", onMouseEnter: () => previewPanel('antennes', antennesTriggerRef.current), onMouseLeave: schedulePanelClose, onFocus: () => previewPanel('antennes', antennesTriggerRef.current), onBlur: schedulePanelClose, onClick: () => pinPanel('antennes', antennesTriggerRef.current), "aria-expanded": activePanel === 'antennes', title: "Antennes", "aria-label": "Afficher les antennes dans un panneau", children: _jsx(MapPin, { size: 20, strokeWidth: 1.8 }) }), _jsx("button", { ref: contactsTriggerRef, type: "button", className: "nav-link nav-icon-link antennes-nav-trigger", onMouseEnter: () => previewPanel('contacts', contactsTriggerRef.current), onMouseLeave: schedulePanelClose, onFocus: () => previewPanel('contacts', contactsTriggerRef.current), onBlur: schedulePanelClose, onClick: () => pinPanel('contacts', contactsTriggerRef.current), "aria-expanded": activePanel === 'contacts', title: "Contacts", "aria-label": "Afficher les contacts dans un panneau", children: _jsx(Phone, { size: 20, strokeWidth: 1.8 }) }), _jsx(Link, { to: "/ihm", className: "nav-link nav-icon-link", onClick: closeNavMenu, title: "IHM", "aria-label": "IHM", children: _jsx(PanelsTopLeft, { size: 20, strokeWidth: 1.8 }) }), _jsx(Link, { to: "/guide", className: "nav-link nav-icon-link", onClick: closeNavMenu, title: "S\u00E9curit\u00E9 Mini\u00E8re - \u00C9dition 2026", "aria-label": "S\u00E9curit\u00E9 Mini\u00E8re - \u00C9dition 2026", children: _jsx(BookOpen, { size: 20, strokeWidth: 1.8 }) }), _jsxs("div", { className: `custom-dropdown ${navDropdownOpen === 'ministere' ? 'open' : ''}`, children: [_jsxs("button", { type: "button", className: "nav-link nav-icon-link custom-dropdown-toggle", onClick: () => toggleNavDropdown('ministere'), "aria-haspopup": "menu", "aria-expanded": navDropdownOpen === 'ministere', title: "Minist\u00E8re", "aria-label": "Minist\u00E8re", children: [_jsx(Landmark, { size: 20, strokeWidth: 1.8 }), _jsx(ChevronDown, { size: 12 })] }), _jsxs("div", { className: "custom-dropdown-content", children: [_jsx(Link, { to: "/Annuaire DEM \u2014 Minist\u00E8re de l'\u00C9nergie et des mines", className: "custom-dropdown-item", onClick: closeNavMenu, children: "Annuaire DEM \u2014 Minist\u00E8re de l'\u00C9nergie et des mines" }), _jsx(Link, { to: "/Valeurs Marchandes Moyennes des Produits Miniers", className: "custom-dropdown-item", onClick: closeNavMenu, children: "Valeurs Marchandes Moyennes des Produits Miniers" }), _jsx(Link, { to: "/Experts_Miniers_Agr\u00E9\u00E9s", className: "custom-dropdown-item", onClick: closeNavMenu, children: "Liste des Experts Miniers Agr\u00E9\u00E9s" })] })] }), _jsx("button", { ref: linksTriggerRef, type: "button", className: "nav-link nav-icon-link antennes-nav-trigger", onMouseEnter: () => previewPanel('links', linksTriggerRef.current), onMouseLeave: schedulePanelClose, onFocus: () => previewPanel('links', linksTriggerRef.current), onBlur: schedulePanelClose, onClick: () => pinPanel('links', linksTriggerRef.current), "aria-expanded": activePanel === 'links', title: "Liens utiles", "aria-label": "Afficher les liens utiles dans un panneau", children: _jsx(LinkIcon, { size: 20, strokeWidth: 1.8 }) }), _jsxs("div", { className: `custom-dropdown ${navDropdownOpen === 'tv' ? 'open' : ''}`, children: [_jsxs("button", { type: "button", className: "nav-link nav-icon-link custom-dropdown-toggle", onClick: () => toggleNavDropdown('tv'), "aria-haspopup": "menu", "aria-expanded": navDropdownOpen === 'tv', title: "Cha\u00EEnes TV", "aria-label": "Cha\u00EEnes TV", children: [_jsx(AntennaIcon, { size: 20 }), _jsx(ChevronDown, { size: 12 })] }), _jsxs("div", { className: "custom-dropdown-content align-right", style: { minWidth: '150px' }, children: [_jsxs("a", { href: "http://10.16.220.204:8080/hls/scene1/scene1.m3u8", className: "custom-dropdown-item d-flex align-items-center", target: "_blank", rel: "noopener noreferrer", style: { gap: '8px' }, onClick: closeNavMenu, children: [_jsx(AntennaIcon, { size: 16 }), " TV1"] }), _jsxs("a", { href: "http://10.16.220.204:8080/hls/scene2/scene2.m3u8", className: "custom-dropdown-item d-flex align-items-center", target: "_blank", rel: "noopener noreferrer", style: { gap: '8px' }, onClick: closeNavMenu, children: [_jsx(AntennaIcon, { size: 16 }), " TV2"] })] })] }), _jsx(Link, { to: "/interfaces", className: "nav-link nav-icon-link", onClick: closeNavMenu, title: "Interfaces", "aria-label": "Interfaces", children: _jsx(Layers, { size: 20, strokeWidth: 1.8 }) }), _jsx("div", { className: "login-container", children: _jsxs(Link, { to: "/applications", className: "btn login-btn", onClick: closeNavMenu, children: [_jsx(User, { size: 18 }), _jsx("span", { children: "Mes applications" })] }) }), _jsxs("div", { className: "time-display", children: [_jsx("span", { className: "time-icon", children: "\uD83D\uDD50" }), _jsx("span", { className: "time-text", children: currentTime })] })] })] })] }) }) }), activePanel && (_jsx("div", { className: `antennes-panel-backdrop ${panelPinned ? 'is-pinned' : 'is-preview'}`, onClick: panelPinned ? closePanel : undefined, children: _jsxs("section", { className: "antennes-panel", style: {
                        top: antennesPanelPosition.top,
                        left: antennesPanelPosition.left,
                        '--antennes-arrow-left': `${antennesPanelPosition.arrowLeft}px`
                    }, role: "dialog", "aria-modal": "true", "aria-label": activePanel === 'links' ? 'Liens utiles' : activePanel === 'contacts' ? 'Annuaire des contacts' : 'Liste des antennes', onMouseEnter: clearPanelCloseTimer, onMouseLeave: schedulePanelClose, onClick: event => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "antennes-panel-close", onClick: () => {
                                closePanel();
                            }, "aria-label": "Fermer le panneau", children: _jsx(X, { size: 18 }) }), _jsx("div", { className: "antennes-panel-body", children: activePanel === 'links' ? (_jsx(LienUtilsPage, { onClose: closePanel })) : activePanel === 'contacts' ? (_jsx(ContactsPage, { onClose: closePanel })) : (_jsx(AntennesPage, { onClose: closePanel })) })] }) })), _jsxs("div", { className: "portal-main", children: [showScrollArrow && (_jsx("button", { className: "scroll-down-arrow", onClick: scrollToContent, "aria-label": "Voir le contenu", style: {
                            right: '40px', // Position à droite
                            left: 'auto', // Enlève le left: 50%
                            transform: 'none' // Enlève le translateX
                        }, children: _jsx(ChevronDown, { size: 32 }) })), _jsx("section", { className: "slider-section", children: _jsxs("div", { className: "wide-container", children: [slides.length > 0 ? (_jsxs("div", { className: "slider-container", children: [_jsx("div", { className: "slider-track", style: { transform: `translateX(-${currentSlideIndex * 100}%)` }, children: slides.map((slide) => (_jsxs("div", { className: "slide-item", onClick: () => handleSlideClick(slide), children: [_jsx("img", { src: getImageUrl(slide.imageUrl), alt: slide.title, className: "slide-image" }), _jsx("div", { className: "slide-overlay" }), _jsxs("div", { className: "slide-content", children: [_jsx("h1", { className: "slide-title", children: slide.title }), slide.subtitle?.trim() && _jsx("p", { className: "slide-subtitle", children: slide.subtitle }), slide.buttonText && slide.link && (_jsx("button", { className: "slide-button", children: slide.buttonText }))] })] }, slide._id))) }), _jsx("div", { className: "slide-indicators", children: slides.map((_, idx) => (_jsx("button", { onClick: (e) => {
                                                    e.stopPropagation();
                                                    setCurrentSlideIndex(idx);
                                                }, className: `slide-indicator ${idx === currentSlideIndex ? 'active' : ''}` }, idx))) }), _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                prevSlide();
                                            }, className: "slide-nav-btn prev", children: _jsx(ChevronLeft, { size: 18 }) }), _jsx("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                nextSlide();
                                            }, className: "slide-nav-btn next", children: _jsx(ChevronRight, { size: 18 }) })] })) : (_jsx("div", { className: "slider-placeholder", children: _jsx("div", { className: "placeholder-content", children: _jsx("h1", { children: "Agence Nationale des Activit\u00E9s Mini\u00E8res" }) }) })), _jsx("div", { className: "search-container", children: _jsxs("div", { className: "search-group", children: [_jsx("span", { className: "search-icon", children: _jsx(Search, { size: 20 }) }), _jsx("input", { type: "text", placeholder: "Rechercher une note, un formulaire, une loi...", className: "search-input", value: searchQuery, onChange: handlePortalSearch }), _jsx("button", { className: "search-button", children: _jsx(ArrowRight, { size: 20 }) })] }) })] }) }), _jsx("main", { className: "main-content", id: "main-content", children: _jsxs("div", { className: "wide-container", children: [_jsxs("div", { className: "category-controls", ref: categoriesRef, children: [_jsxs("button", { type: "button", className: `category-toggle ${showCategories ? 'active' : ''}`, onClick: () => setShowCategories(prev => !prev), children: [_jsx(Menu, { size: 18 }), _jsx("span", { children: "Cat\u00E9gories" })] }), showCategories && (_jsx("div", { className: "category-dropdown", children: _jsx("div", { className: "category-filters", children: categories.map(cat => (_jsx("button", { onClick: () => {
                                                        setActiveCategory(cat);
                                                        setShowCategories(false);
                                                    }, className: `category-btn ${activeCategory === cat ? 'active' : ''}`, children: cat }, cat))) }) }))] }), loading ? (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "loading-text", children: "Chargement des sections..." })] })) : filteredCards.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("p", { className: "empty-text", children: "Aucune section trouv\u00E9e" }), searchQuery && (_jsx("p", { className: "empty-subtext", children: "Essayez avec d'autres mots-cl\u00E9s" }))] })) : (_jsx("div", { className: "cards-grid-container", children: _jsx("div", { className: "cards-grid", children: filteredCards.map(card => (_jsx("div", { onClick: () => handleCardClick(card), className: "card-item", children: _jsxs("div", { className: "card-wrapper", children: [card.imageUrl && (_jsx("div", { className: "card-image-container", children: _jsx("img", { src: getImageUrl(card.imageUrl), alt: card.title, className: "card-image", onError: (e) => {
                                                                e.target.style.display = 'none';
                                                            } }) })), _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: card.title }), card.description && (_jsx("p", { className: "card-text", children: card.description })), _jsxs("div", { className: "card-footer", children: [_jsx("span", { className: "card-category", children: card.category }), _jsxs("div", { className: "card-cta", children: [_jsx("span", { children: "Voir" }), _jsx(ArrowUpRight, { size: 16 })] })] })] })] }) }, card._id))) }) }))] }) })] }), _jsx("footer", { className: "site-footer", children: _jsx("div", { className: "wide-container", children: _jsxs("div", { className: "footer-content", children: [_jsxs("div", { className: "footer-section", children: [_jsx("div", { className: "footer-logo", children: _jsx(Globe, { size: 18 }) }), _jsx("span", { className: "footer-website", children: _jsx("a", { href: "https://www.anam.gov.dz", target: "_blank", rel: "noopener noreferrer", className: "footer-link", children: "www.anam.gov.dz" }) })] }), _jsxs("div", { className: "footer-copyright", children: ["\u00A9 ", new Date().getFullYear(), " Agence Nationale des Activit\u00E9s Mini\u00E8res. Tous droits r\u00E9serv\u00E9s."] }), _jsxs("div", { className: "footer-links", children: [_jsx("a", { href: "#", className: "footer-link", children: "Mentions l\u00E9gales" }), _jsx("a", { href: "#", className: "footer-link", children: "Confidentialit\u00E9" })] })] }) }) }), _jsx("style", { children: `
        .scroll-down-arrow {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 50%;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          animation: bounce 2s infinite;
        }
        
        .scroll-down-arrow:hover {
          background-color: var(--primary-dark);
          transform: translateX(-50%) scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-10px);
          }
          60% {
            transform: translateX(-50%) translateY(-5px);
          }
        }
        
        /* Masquer la flèche sur mobile quand le clavier est ouvert */
        @media (max-width: 768px) {
          .scroll-down-arrow {
            bottom: 20px;
            width: 48px;
            height: 48px;
          }
        }
      ` })] }));
};
export default PublicPortal;
