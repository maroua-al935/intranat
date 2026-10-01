import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Search, Grid, List, Filter, Globe, ChevronRight, LogOut } from 'lucide-react';
import { cardsAPI, articlesAPI, authAPI, clearPortalAuthData } from '../services/api';
import { Card, Article } from '../types';
import ArticleCard from '../components/ArticleCard';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link} from 'react-router-dom';
import './CardArticlesPage.css';

const toRgba = (hex: string, alpha: number): string => {
  const fallback = `rgba(122, 43, 58, ${alpha})`;
  if (!hex) return fallback;
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value.split('').map(char => char + char).join('');
  }
  if (value.length !== 6 || /[^0-9a-f]/i.test(value)) return fallback;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveFileUrl = (url?: string): string => {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${backendUrl}${url}`;
  return `${backendUrl}/${url}`;
};

const getStoredRole = (): string => {
  const readRole = (raw: string | null): string => {
    if (!raw) return '';
    try {
      const obj = JSON.parse(raw);
      return String(obj?.role || '');
    } catch {
      return '';
    }
  };

  const portalRole =
    readRole(sessionStorage.getItem('portalUser')) ||
    readRole(localStorage.getItem('portalUser'));
  const adminRole =
    readRole(sessionStorage.getItem('user')) ||
    readRole(localStorage.getItem('user'));

  return portalRole || adminRole || '';
};

const AntennaIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
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

const getFileTypeLabel = (url?: string): string => {
  if (!url) return '';
  const clean = url.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (!ext || ext === clean) return '';

  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'Word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'Excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'PowerPoint';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic'].includes(ext)) return 'Image';
  if (['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'wmv', 'flv', '3gp', 'mpeg', 'mpg', 'ogv'].includes(ext)) return 'Vidéo';

  return ext.toUpperCase();
};

const CardArticlesPage: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<Card | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTitles, setExpandedTitles] = useState<Record<string, boolean>>({});
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
    ['--recent-color' as any]: recentBaseColor,
    ['--recent-color-strong' as any]: toRgba(recentBaseColor, 0.35),
    ['--recent-color-soft' as any]: toRgba(recentBaseColor, 0.12),
    ['--recent-pulse-color' as any]: toRgba(recentBaseColor, 0.4)
  } as React.CSSProperties;

  useEffect(() => {
    if (cardId) fetchCardAndArticles(cardId);
  }, [cardId]);

  const toggleTitleExpansion = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche la navigation vers l'article
    setExpandedTitles(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }));
  };

  const shouldShowSeeMore = (title: string): boolean => {
    // Si le titre fait plus de 100 caractères, on montre le bouton "Voir plus"
    return title.length > 100;
  };

  const RECENT_HOURS = 48;

  const isRecentArticle = (article: Article): boolean => {
    const rawDate = article.createdAt || article.date;
    if (!rawDate) return false;
    const ts = new Date(rawDate).getTime();
    if (Number.isNaN(ts)) return false;
    const diffMs = Date.now() - ts;
    const recentWindow = RECENT_HOURS * 60 * 60 * 1000;
    return diffMs >= 0 && diffMs <= recentWindow;
  };

  const openPdf = (article: Article) => {
    if (article.pdfProtected) {
      if (!isSuperadmin) {
        window.alert('PDF protege: acces reserve au superadmin.');
        return;
      }
      window.open(`/pdf/${article._id}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const pdfUrl = resolveFileUrl(article.pdfUrl);
    if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const fetchCardAndArticles = async (id: string) => {
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
      } catch (err: any) {
        if (nextCard?.requiresLdapLogin && err?.response?.status === 401) {
          setArticles([]);
          setHasPortalToken(false);
          setShowPortalLogin(true);
        } else if (nextCard?.requiresLdapLogin && err?.response?.status === 403) {
          setArticles([]);
          setHasPortalToken(true);
          setPortalError(err?.response?.data?.error || 'Accès interdit');
          setShowPortalLogin(true);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      setCard(null);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePortalLogin = async (e: React.FormEvent) => {
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
      } else {
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
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setPortalError('Identifiants incorrects');
      } else if (error?.response?.status === 403) {
        setPortalError(error?.response?.data?.error || 'Acces interdit');
      } else {
        setPortalError(error?.response?.data?.error || error?.message || 'Erreur de connexion');
      }
    } finally {
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
    return (
      a.title.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      contentValue.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-light">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-3 text-muted fs-5">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-light">
        <div className="text-center p-5 bg-white rounded-4 shadow-lg">
          <h3 className="fw-bold mb-4 text-danger">Carte introuvable</h3>
          <p className="text-muted mb-4">La carte que vous recherchez n'existe pas ou a été supprimée.</p>
          <p className="small text-muted mb-4">ID: {cardId}</p>
          <button 
            onClick={handleBack} 
            className="btn btn-primary btn-lg px-4 py-3 rounded-pill d-flex align-items-center mx-auto"
            style={{ 
              background: 'linear-gradient(135deg, #7a2b3a, #9a3b4a)',
              border: 'none',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <ArrowLeft className="me-2" /> Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {showPortalLogin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12, 12, 12, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: 'min(520px, 96vw)' }}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <img src="/full_logo.png" alt="ANAM" style={{ height: '3rem' }} />
              <div>
                <div className="fw-bold">Connexion requise</div>
                <div className="text-muted small">
                  {isItOnlyCard ? (
                    <>
                      Accès réservé au service informatique. Merci de vous connecter pour accéder à :{' '}
                      <span className="fw-semibold">{card?.title}</span>
                    </>
                  ) : (
                    <>
                      Merci de vous connecter pour accéder à : <span className="fw-semibold">{card?.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handlePortalLogin}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Identifiant</label>
                <input
                  type="text"
                  className="form-control"
                  value={portalUsername}
                  onChange={(e) => setPortalUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={portalLoading}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mot de passe</label>
                <input
                  type="password"
                  className="form-control"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={portalLoading}
                />
              </div>

              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="portalRemember"
                  checked={portalRemember}
                  onChange={(e) => setPortalRemember(e.target.checked)}
                  disabled={portalLoading}
                />
                <label className="form-check-label" htmlFor="portalRemember">
                  Se souvenir de moi
                </label>
              </div>

              {portalError && (
                <div className="alert alert-danger py-2" role="alert">
                  <small>{portalError}</small>
                </div>
              )}

              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleBack}
                  disabled={portalLoading}
                >
                  Retour
                </button>
                <button type="submit" className="btn btn-primary" disabled={portalLoading}>
                  {portalLoading ? 'Connexion...' : 'Se connecter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      <main className="container-lg pt-4 pb-9">

        {/* HEADER CARTE AMÉLIORÉ */}
        <div className="card border-0 mb-4 animate-fade-in mx-auto"
          style={{ 
            backgroundColor: card.color || '#f5f5f5',
            background: `linear-gradient(135deg, ${card.color || '#7a2b3a'} 0%, ${card.color ? card.color + 'cc' : '#9a3b4a'} 100%)`,
            borderRadius: '15px',
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            width: '100%'
          }}>
          <div className="card-body p-7">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button
                onClick={handleBack}
                className="btn btn-outline-light d-flex align-items-center px-3 py-1 rounded-pill border-1"
                style={{
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ArrowLeft className="me-2" size={18} /> Retour
              </button>

              <div className="d-flex align-items-center gap-2">
                <div className="btn-group">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`btn btn-sm px-3 py-1 ${viewMode === 'grid' ? 'btn-light text-dark' : 'btn-outline-light'}`}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Grid size={16} className="me-1" /> Grille
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`btn btn-sm px-3 py-1 ${viewMode === 'list' ? 'btn-light text-dark' : 'btn-outline-light'}`}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <List size={16} className="me-1" /> Liste
                  </button>
                </div>

                

                {card.requiresLdapLogin && hasPortalToken && !showPortalLogin && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light px-3 py-1 d-flex align-items-center"
                    style={{ fontSize: '0.85rem' }}
                    onClick={handlePortalLogout}
                    title="Déconnexion"
                  >
                    <LogOut size={16} className="me-1" />
                    Déconnexion
                  </button>
                )}
              </div>
            </div>

            <h1 className="fw-bold text-white mb-2" style={{ fontSize: '1.8rem' }}>{card.title}</h1>
            <p className="text-white-75 mb-0" style={{ opacity: 0.9, fontSize: '1rem' }}>{card.description}</p>
          </div>
        </div>

        {/* BARRE DE RECHERCHE MINIMALISTE */}
        <div className="mb-4 mx-auto" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="position-relative">
            <div className="d-flex align-items-center border rounded-3 px-3 py-2 bg-white shadow-sm">
              <Search size={18} className="text-muted me-3" />
              <input
                type="text"
                className="border-0 flex-grow-1"
                placeholder="Rechercher"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  outline: 'none',
                  fontSize: '0.9rem',
                  background: 'transparent'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn btn-link p-0 ms-2"
                  style={{ minWidth: '24px' }}
                >
                  <small className="text-muted">✕</small>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ARTICLES */}
        {filteredArticles.length === 0 ? (
          <div className="card shadow-lg border-0 animate-fade-in">
            <div className="card-body text-center py-6">
              <Filter className="text-secondary mb-4" size={25} />
              <h3 className="fw-bold mb-3">Aucun résultat trouvé</h3>
              <p className="text-muted fs-5 mb-4">
                {searchQuery 
                  ? "Essayez avec d'autres mots-clés ou vérifiez l'orthographe." 
                  : "Aucun article disponible pour cette carte."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn btn-outline-primary px-4 py-2 rounded-pill"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="row g-4">
            {filteredArticles.map((a, index) => {
              const isRecent = isRecentArticle(a);
              return (
                <div 
                  key={a._id} 
                  className={`col-12 col-md-6 col-lg-4 animate-fade-in ${isRecent ? 'recent-card-wrapper' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s`, ...recentVars }}
                >
                  {isRecent && (
                    <span className="recent-badge">Nouveau</span>
                  )}
                  <ArticleCard 
                    article={a} 
                    onRead={() => openPdf(a)}
                    cardColor={card.color}
                    className={`h-100 shadow-hover ${isRecent ? 'recent-article' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card shadow-lg border-0 overflow-hidden animate-fade-in">
            <div className="list-group list-group-flush">
              {filteredArticles.map((a, index) => {
                const isRecent = isRecentArticle(a);
                return (
                  <div 
                    key={a._id} 
                    className={`list-group-item p-0 border-0 ${isRecent ? 'recent-list-item' : ''}`}
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                      borderBottom: '1px solid rgba(0,0,0,0.05) !important',
                      ...recentVars
                    }}
                  >
                    <div className="p-4 hover-lift d-flex justify-content-between align-items-center"
                         style={{
                           transition: 'all 0.3s ease',
                           cursor: 'pointer'
                         }}
                         onClick={() => openPdf(a)}
                         onMouseEnter={e => {
                           e.currentTarget.style.backgroundColor = 'rgba(122, 43, 58, 0.02)';
                           e.currentTarget.style.transform = 'translateX(10px)';
                         }}
                         onMouseLeave={e => {
                           e.currentTarget.style.backgroundColor = '';
                           e.currentTarget.style.transform = 'translateX(0)';
                         }}>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-3 mb-2">
                          <h5
                            className="fw-bold mb-0 text-dark"
                            style={{
                              
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: expandedTitles[a._id] ? 'none' : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minHeight: '2.8em',
                              flex: 1
                            }}
                            title={a.title}
                          >
                            {a.title}
                          </h5> 
                          <span className="badge rounded-pill px-3 py-2" 
                                style={{ 
                                  backgroundColor: `${card.color}20`,
                                  color: card.color || '#7a2b3a',
                                  flexShrink: 0
                                }}>
                            {a.category}
                          </span>
                          {isRecent && (
                            <span className="badge rounded-pill px-3 py-2 recent-badge-inline">
                              Nouveau
                            </span>
                          )}
                        </div>
                      
                      {shouldShowSeeMore(a.title) && (
                        <button
                          onClick={(e) => toggleTitleExpansion(a._id, e)}
                          className="btn btn-link p-0 text-primary text-decoration-none d-flex align-items-center gap-1 mb-2"
                          style={{ fontSize: '0.85rem' }}
                        >
                          {expandedTitles[a._id] ? (
                            <>
                              Voir moins 
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                              </svg>
                            </>
                          ) : (
                            <>
                              Voir plus 
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                      
                      <p 
                        className="text-muted mb-3"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.5'
                        }}
                      >
                        {a.description || 'Aucune description disponible'}
                      </p>

                      <div className="d-flex gap-4 text-muted small">
                        <span className="d-flex align-items-center">
                          <Calendar size={16} className="me-2" />
                          {new Date(a.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        
                        {a.pdfUrl && (
                          <span className="d-flex align-items-center">
                            <FileText size={16} className="me-2" />
                            {getFileTypeLabel(a.pdfUrl) || 'Fichier'}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="text-primary ms-3" size={24} />
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

      </main>

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

      {/* STYLES INLINE POUR LES ANIMATIONS */}
      <style>{`
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
      `}</style>
    </div>
  );
};

export default CardArticlesPage;
