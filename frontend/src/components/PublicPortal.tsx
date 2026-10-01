import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  User, Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Globe,
  ArrowUpRight,
  LogIn,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Mail,
  PanelsTopLeft,
  BookOpen,
  Landmark,
  Link as LinkIcon,
  LayoutGrid
} from 'lucide-react';
import { authAPI, cardsAPI, slidesAPI } from '../services/api';
import { Card, Slide } from '../types';
import 'bootstrap/dist/css/bootstrap.min.css';
import './PublicPortal.css';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './Notifications';
import AntennesPage from '../pages/intranet/AntennesPage';
import ContactsPage from '../pages/intranet/ContactsPage';
import LienUtilsPage from '../pages/intranet/LienUtilsPage';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';
const POPUP_LAST_SEEN_KEY = 'anam_public_portal_popup_last_seen_v1';

interface PublicPortalProps {
  onLogin: (loginData: { user: { username: string; role: 'admin' | 'user' }; token: string }) => void;
}

interface PopupConfig {
  enabled: boolean;
  mode: 'always' | 'interval';
  intervalHours: number;
  title: string;
  message: string;
  bullets: string[];
  primaryLabel: string;
  linkType: 'none' | 'url' | 'pdf';
  linkUrl: string;
}

const AntennaIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="8" y1="3" x2="12" y2="7" />
    <line x1="16" y1="3" x2="12" y2="7" />
    <line x1="12" y1="7" x2="12" y2="9" />
    <rect x="3" y="9" width="18" height="10" rx="2" />
    <line x1="9" y1="21" x2="15" y2="21" />
  </svg>
);

const DEFAULT_POPUP_CONFIG: PopupConfig = {
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

const PublicPortal: React.FC<PublicPortalProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const renderBoldText = (text: string) => {
    const parts = text.split('**');
    if (parts.length === 1) {
      return text;
    }
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={`bold-${index}`}>{part}</strong>
      ) : (
        <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
      )
    );
  };
  
  // États pour les données
  const [cards, setCards] = useState<Card[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showScrollArrow, setShowScrollArrow] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [navScrolled, setNavScrolled] = useState(() => window.scrollY > 24);
  const [popupConfig, setPopupConfig] = useState<PopupConfig>(DEFAULT_POPUP_CONFIG);
  const [popupReady, setPopupReady] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState<'ministere' | 'tv' | null>(null);
  const [activePanel, setActivePanel] = useState<'antennes' | 'contacts' | 'links' | null>(null);
  const [panelPinned, setPanelPinned] = useState(false);
  const panelCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const antennesTriggerRef = useRef<HTMLButtonElement>(null);
  const contactsTriggerRef = useRef<HTMLButtonElement>(null);
  const linksTriggerRef = useRef<HTMLButtonElement>(null);
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

  const updatePanelPosition = (trigger: HTMLButtonElement | null) => {
    const rect = trigger?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = Math.min(900, window.innerWidth - 24);
    const panelHeight = Math.min(720, window.innerHeight - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
    const top = Math.min(rect.bottom + 10, window.innerHeight - panelHeight - 12);
    const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 18), panelWidth - 18);
    setAntennesPanelPosition({ top: Math.max(12, top), left, arrowLeft });
  };

  const previewPanel = (panel: 'antennes' | 'contacts' | 'links', trigger: HTMLButtonElement | null) => {
    if (panelPinned) return;
    clearPanelCloseTimer();
    updatePanelPosition(trigger);
    setActivePanel(panel);
  };

  const pinPanel = (panel: 'antennes' | 'contacts' | 'links', trigger: HTMLButtonElement | null) => {
    clearPanelCloseTimer();
    updatePanelPosition(trigger);
    setActivePanel(panel);
    setPanelPinned(true);
    closeNavMenu();
  };

  const schedulePanelClose = () => {
    clearPanelCloseTimer();
    if (panelPinned) return;
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
    if (!activePanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
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
      if (!next) setNavDropdownOpen(null);
      return next;
    });
  }, []);

  const toggleNavDropdown = useCallback((key: 'ministere' | 'tv') => {
    setNavMenuOpen(true);
    setNavDropdownOpen(prev => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (navRef.current && !navRef.current.contains(target)) {
        closeNavMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
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
  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
    return `${BACKEND_URL}/${url}`;
  };

  const getLinkUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
    return `${BACKEND_URL}/${url}`;
  };

  const normalizePopupConfig = (config: Partial<PopupConfig>): PopupConfig => {
    const merged = { ...DEFAULT_POPUP_CONFIG, ...config } as PopupConfig;

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
    } else {
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

  const shouldShowPopup = useCallback((config: PopupConfig): boolean => {
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
      } catch (error) {
        console.error('Erreur chargement popup:', error);
      } finally {
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

    const handleKeyDown = (event: KeyboardEvent) => {
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
      } else {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
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
      
      const activeCards = cardsResponse.data.filter((card: Card) => card.isActive);
      setCards(activeCards);
      setSlides(slidesResponse.data);
    } catch (error: any) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCardClick = (card: Card) => {
    navigate(`/carte/${card._id}`);
  };

  const handlePortalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSlideClick = (slide: Slide) => {
    if (slide.link) {
      window.open(slide.link, '_blank');
    }
  };

  // Filtrage des cartes
  const categories = ['Tous', ...Array.from(new Set(cards.map(card => card.category).filter(Boolean)))];
  const filteredCards = cards.filter(card => 
    (activeCategory === 'Tous' || card.category === activeCategory) &&
    card.title.toLowerCase().includes(searchQuery.toLowerCase())
  );


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

  

  return (
    <div className="bg-light public-portal">
      {showWelcome && (
        <div className="anam-popup-overlay" onClick={closeWelcome}>
          <div
            className="anam-popup-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            aria-describedby="welcome-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="anam-popup-close"
              onClick={closeWelcome}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
            <div className="anam-popup-badge">Bienvenue</div>
            <h2 id="welcome-title" className="anam-popup-title" dir="auto">
              {popupConfig.title}
            </h2>
            <p id="welcome-desc" className="anam-popup-text" dir="auto">
              {renderBoldText(popupConfig.message)}
            </p>
            <ul className="anam-popup-list" dir="auto">
              {popupConfig.bullets.map((item, index) => (
                <li key={`popup-bullet-${index}`} dir="auto">{item}</li>
              ))}
            </ul>
            <div className="anam-popup-actions">
              
              <button
                type="button"
                className="anam-popup-secondary"
                onClick={closeWelcome}
              >
                Fermer
              </button>
              {popupConfig.linkType !== 'none' && (
                <button
                  type="button"
                  className="anam-popup-primary"
                  onClick={handleWelcomePrimary}
                >
                  {popupConfig.primaryLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Navbar */}
      <nav className={`navbar navbar-expand-lg sticky-top bg-white shadow-sm force-full-width${navScrolled ? ' is-scrolled' : ''}`}>
        <div className="wide-container">
          <div className="navbar-content">
            {/* Logo */}
            <div className="logo-container">
              <a className="navbar-brand" href="#">
                <img 
                  src="/full_logo.png"
                  alt="Logo ANAM"
                  className="navbar-logo"
                />
              </a>
            </div>
            <div className="nav-right" ref={navRef}>
              <button
                type="button"
                className="nav-toggle"
                onClick={toggleNavMenu}
                aria-label={navMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={navMenuOpen}
              >
                {navMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <div className={`nav-menu ${navMenuOpen ? 'is-open' : ''}`}>
                 
                <NotificationBell />  
                
               <button
  ref={antennesTriggerRef}
  type="button"
  className="nav-link nav-icon-link antennes-nav-trigger"
  onMouseEnter={() => previewPanel('antennes', antennesTriggerRef.current)}
  onMouseLeave={schedulePanelClose}
  onFocus={() => previewPanel('antennes', antennesTriggerRef.current)}
  onBlur={schedulePanelClose}
  onClick={() => pinPanel('antennes', antennesTriggerRef.current)}
  aria-expanded={activePanel === 'antennes'}
  title="Antennes"
  aria-label="Afficher les antennes dans un panneau"
>
  <MapPin size={20} strokeWidth={1.8} />
</button>
               <button
  ref={contactsTriggerRef}
  type="button"
  className="nav-link nav-icon-link antennes-nav-trigger"
  onMouseEnter={() => previewPanel('contacts', contactsTriggerRef.current)}
  onMouseLeave={schedulePanelClose}
  onFocus={() => previewPanel('contacts', contactsTriggerRef.current)}
  onBlur={schedulePanelClose}
  onClick={() => pinPanel('contacts', contactsTriggerRef.current)}
  aria-expanded={activePanel === 'contacts'}
  title="Contacts"
  aria-label="Afficher les contacts dans un panneau"
>
  <Phone size={20} strokeWidth={1.8} />
</button>


 <Link
  to="/ihm"
  className="nav-link nav-icon-link"
  onClick={closeNavMenu}
  title="IHM"
  aria-label="IHM"
>
  <PanelsTopLeft size={20} strokeWidth={1.8} />
</Link>
 <Link
  to="/guide"
  className="nav-link nav-icon-link"
  onClick={closeNavMenu}
  title="Sécurité Minière - Édition 2026"
  aria-label="Sécurité Minière - Édition 2026"
>
  <BookOpen size={20} strokeWidth={1.8} />
</Link>
                {/* 1. MENU DÉROULANT : Ressources Minières */}
                <div className={`custom-dropdown ${navDropdownOpen === 'ministere' ? 'open' : ''}`}>
                   <button
  type="button"
  className="nav-link nav-icon-link custom-dropdown-toggle"
  onClick={() => toggleNavDropdown('ministere')}
  aria-haspopup="menu"
  aria-expanded={navDropdownOpen === 'ministere'}
  title="Ministère"
  aria-label="Ministère"
>
  <Landmark size={20} strokeWidth={1.8} />
  <ChevronDown size={12} />
</button>
                  <div className="custom-dropdown-content">
                    
                    <Link
                      to="/Annuaire DEM — Ministère de l'Énergie et des mines"
                      className="custom-dropdown-item"
                      onClick={closeNavMenu}
                    >
                      Annuaire DEM — Ministère de l'Énergie et des mines
                    </Link>
                    <Link
                      to="/Valeurs Marchandes Moyennes des Produits Miniers"
                      className="custom-dropdown-item"
                      onClick={closeNavMenu}
                    >
                      Valeurs Marchandes Moyennes des Produits Miniers
                    </Link>
                    <Link
                      to="/Experts_Miniers_Agréés"
                      className="custom-dropdown-item"
                      onClick={closeNavMenu}
                    >
                      Liste des Experts Miniers Agréés
                    </Link>
                  </div>
                </div>

               <button
  ref={linksTriggerRef}
  type="button"
  className="nav-link nav-icon-link antennes-nav-trigger"
  onMouseEnter={() => previewPanel('links', linksTriggerRef.current)}
  onMouseLeave={schedulePanelClose}
  onFocus={() => previewPanel('links', linksTriggerRef.current)}
  onBlur={schedulePanelClose}
  onClick={() => pinPanel('links', linksTriggerRef.current)}
  aria-expanded={activePanel === 'links'}
  title="Liens utiles"
  aria-label="Afficher les liens utiles dans un panneau"
>
  <LinkIcon size={20} strokeWidth={1.8} />
</button>
  
                {/* 2. MENU DÉROULANT : Chaînes TV */}
                <div className={`custom-dropdown ${navDropdownOpen === 'tv' ? 'open' : ''}`}>
                   <button
  type="button"
  className="nav-link nav-icon-link custom-dropdown-toggle"
  onClick={() => toggleNavDropdown('tv')}
  aria-haspopup="menu"
  aria-expanded={navDropdownOpen === 'tv'}
  title="Chaînes TV"
  aria-label="Chaînes TV"
>
  <AntennaIcon size={20} />
  <ChevronDown size={12} />
</button>
                   {/* On réduit un peu la largeur pour le menu TV */}
                   <div className="custom-dropdown-content align-right" style={{ minWidth: '150px' }}>
                    <a
                      href="http://10.16.220.204:8080/hls/scene1/scene1.m3u8"
                      className="custom-dropdown-item d-flex align-items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ gap: '8px' }}
                      onClick={closeNavMenu}
                    >
                      <AntennaIcon size={16} /> TV1
                    </a>
                    <a
                      href="http://10.16.220.204:8080/hls/scene2/scene2.m3u8"
                      className="custom-dropdown-item d-flex align-items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ gap: '8px' }}
                      onClick={closeNavMenu}
                    >
                      <AntennaIcon size={16} /> TV2
                    </a>
                  </div>
                </div>

              

              
                
              <Link
  to="/interfaces"
  className="nav-link nav-icon-link"
  onClick={closeNavMenu}
  title="Interfaces"
  aria-label="Interfaces"
>
  <Layers size={20} strokeWidth={1.8} />
</Link>
                <div className="login-container">
                  <Link to="/applications" className="btn login-btn" onClick={closeNavMenu}>
                    <User size={18} />
                    <span>Mes applications</span>
                  </Link>
                </div>

                  <div className="time-display">
                   <span className="time-icon">🕐</span>
                   <span className="time-text">{currentTime}</span>
                </div>  
              </div>
            </div>
          </div>
        </div>
      </nav>

      {activePanel && (
        <div
          className={`antennes-panel-backdrop ${panelPinned ? 'is-pinned' : 'is-preview'}`}
          onClick={panelPinned ? closePanel : undefined}
        >
          <section
            className="antennes-panel"
            style={{
              top: antennesPanelPosition.top,
              left: antennesPanelPosition.left,
              '--antennes-arrow-left': `${antennesPanelPosition.arrowLeft}px`
            } as React.CSSProperties}
            role="dialog"
            aria-modal="true"
            aria-label={activePanel === 'links' ? 'Liens utiles' : activePanel === 'contacts' ? 'Annuaire des contacts' : 'Liste des antennes'}
            onMouseEnter={clearPanelCloseTimer}
            onMouseLeave={schedulePanelClose}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="antennes-panel-close"
              onClick={() => {
                closePanel();
              }}
              aria-label="Fermer le panneau"
            >
              <X size={18} />
            </button>
            <div className="antennes-panel-body">
              {activePanel === 'links' ? (
                <LienUtilsPage onClose={closePanel} />
              ) : activePanel === 'contacts' ? (
                <ContactsPage onClose={closePanel} />
              ) : (
                <AntennesPage onClose={closePanel} />
              )}
            </div>
          </section>
        </div>
      )}

      <div className="portal-main">
        {/* Flèche de scroll */}
        {showScrollArrow && (
  <button 
    className="scroll-down-arrow"
    onClick={scrollToContent}
    aria-label="Voir le contenu"
    style={{
      right: '40px', // Position à droite
      left: 'auto',  // Enlève le left: 50%
      transform: 'none' // Enlève le translateX
    }}
  >
    <ChevronDown size={32} />
  </button>
)}

        {/* Slider dynamique */}
        <section className="slider-section">
          <div className="wide-container">
            {slides.length > 0 ? (
              <div className="slider-container">
                <div 
                  className="slider-track" 
                  style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
                >
                  {slides.map((slide) => (
                    <div 
                      key={slide._id} 
                      className="slide-item"
                      onClick={() => handleSlideClick(slide)}
                    >
                      <img 
                        src={getImageUrl(slide.imageUrl)} 
                        alt={slide.title} 
                        className="slide-image"
                      />
                      <div className="slide-overlay"></div>
                      <div className="slide-content">
                        <h1 className="slide-title">{slide.title}</h1>
                        {slide.subtitle?.trim() && <p className="slide-subtitle">{slide.subtitle}</p>}
                        {slide.buttonText && slide.link && (
                          <button className="slide-button">
                            {slide.buttonText}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Indicateurs de slide */}
                <div className="slide-indicators">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlideIndex(idx);
                      }}
                      className={`slide-indicator ${idx === currentSlideIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                  }} 
                  className="slide-nav-btn prev"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }} 
                  className="slide-nav-btn next"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="slider-placeholder">
                <div className="placeholder-content">
                  <h1>Agence Nationale des Activités Minières</h1>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="search-container">
              <div className="search-group">
                <span className="search-icon">
                  <Search size={20} />
                </span>
                <input 
                  type="text" 
                  placeholder="Rechercher une note, un formulaire, une loi..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={handlePortalSearch}
                />
                <button className="search-button">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sections principales */}
        <main className="main-content" id="main-content">
          <div className="wide-container">
            
            {/* Filtres par catégorie */}
            <div className="category-controls" ref={categoriesRef}>
              <button
                type="button"
                className={`category-toggle ${showCategories ? 'active' : ''}`}
                onClick={() => setShowCategories(prev => !prev)}
              >
                <Menu size={18} />
                <span>Catégories</span>
              </button>

              {showCategories && (
                <div className="category-dropdown">
                  <div className="category-filters">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          setShowCategories(false);
                        }}
                        className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cartes */}
            {loading ? (
              <div className="loading-container">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <p className="loading-text">Chargement des sections...</p>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">Aucune section trouvée</p>
                {searchQuery && (
                  <p className="empty-subtext">Essayez avec d'autres mots-clés</p>
                )}
              </div>
            ) : (
              <div className="cards-grid-container">
                <div className="cards-grid">
                  {filteredCards.map(card => (
                    <div
                      key={card._id}
                      onClick={() => handleCardClick(card)}
                      className="card-item"
                    >
                      <div className="card-wrapper">
                        {/* IMAGE */}
                        {card.imageUrl && (
                          <div className="card-image-container">
                            <img
                              src={getImageUrl(card.imageUrl)}
                              alt={card.title}
                              className="card-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* CONTENU */}
                        <div className="card-body">
                          <h5 className="card-title">
                            {card.title}
                          </h5>

                          {card.description && (
                            <p className="card-text">
                              {card.description}
                            </p>
                          )}

                          {/* Bas */}
                          <div className="card-footer">
                            <span
                              className="card-category"
                            >
                              {card.category}
                            </span>

                            <div className="card-cta">
                              <span>Voir</span>
                              <ArrowUpRight size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="site-footer">
        <div className="wide-container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <Globe size={18} />
              </div>
              <span className="footer-website">
                <a 
                  href="https://www.anam.gov.dz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  www.anam.gov.dz
                </a>
              </span>
            </div>
            
            <div className="footer-copyright">
              © {new Date().getFullYear()} Agence Nationale des Activités Minières. Tous droits réservés.
            </div>

            <div className="footer-links">
              <a href="#" className="footer-link">Mentions légales</a>
              <a href="#" className="footer-link">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Styles inline pour la flèche */}
      <style>{`
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
      `}</style>
    </div>
  );
};

export default PublicPortal;
