import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { SECURE_APPS, AppItem } from '../intranet/applications';
import './ApplicationsPage.css';

const ApplicationsPage: React.FC = () => {
  const [selectedApplication, setSelectedApplication] = useState<AppItem | null>(null);

  const handleAppClick = (app: AppItem) => {
    if (app.status !== 'active') return;
    setSelectedApplication(app);
  };

  const handleQuickOpen = (app: AppItem) => {
    if (app.status === 'active' && app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (!selectedApplication) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedApplication(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedApplication]);

  return (
    <div className="applications-page">

      {/* Contenu principal avec grille d'applications */}
      <main className="applications-main">
        <div className="wide-container">
          <div className="applications-page-heading">
            <div><h1 className="nav-title">Mes Applications</h1><p className="nav-subtitle">Accédez à toutes vos applications professionnelles sécurisées</p></div>
            <Link to="/" className="back-nav-button"><ArrowLeft size={18} /><span>Retour au portail</span></Link>
          </div>
          <div className="applications-grid">
            {SECURE_APPS.map((app) => {
              const IconComponent = app.icon;
              
              return (
                <div
                  key={app.id}
                  className={`app-card app-card-${app.id}${app.image ? ' app-card-with-image' : ''}`}
                  role="button"
                  tabIndex={app.status === 'active' ? 0 : -1}
                  aria-label={`Afficher la fiche de ${app.title}`}
                  aria-disabled={app.status !== 'active'}
                  onClick={() => handleAppClick(app)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleAppClick(app);
                    }
                  }}
                >
                  <div className={`app-image-container${app.image ? '' : ' app-image-placeholder'}`}>
                    {app.image && (
                      <img
                        className="app-image"
                        src={app.image.startsWith('/') ? app.image : `/${app.image}`}
                        alt={`Illustration de ${app.title}`}
                        loading="eager"
                        fetchPriority={app.id === 'app21' ? 'high' : 'auto'}
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="app-card-header">
                    <div className="app-title-row">
                      <div className="app-icon-container">
                        {app.iconImage ? (
                          <img className={`application-card-icon-image${app.id === 'app1' ? ' support-it-card-icon' : ''}`} src={app.iconImage} alt="" />
                        ) : (
                          <IconComponent className="app-icon" />
                        )}
                      </div>
                      <h3 className="app-title">{app.title}</h3>
                    </div>
                  </div>
                  <div className="app-card-actions">
                    <button
                      type="button"
                      className="app-link"
                      disabled={app.status !== 'active' || !app.url}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleQuickOpen(app);
                      }}
                      aria-label={`Ouvrir ${app.title} dans un nouvel onglet`}
                    >
                      <ExternalLink size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {selectedApplication && (
        <div className="application-detail-backdrop" onClick={() => setSelectedApplication(null)}>
          <section
            className="application-detail-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-detail-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="application-detail-close"
              aria-label="Fermer la fiche"
              onClick={() => setSelectedApplication(null)}
            >
              <X size={20} />
            </button>
            {selectedApplication.image ? (
              <img
                className="application-detail-image"
                src={selectedApplication.image.startsWith('/') ? selectedApplication.image : `/${selectedApplication.image}`}
                alt={`Illustration de ${selectedApplication.title}`}
              />
            ) : (
              <div className="application-detail-icon">
                {selectedApplication.iconImage ? (
                  <img src={selectedApplication.iconImage} alt="" />
                ) : (
                  <selectedApplication.icon aria-hidden="true" />
                )}
              </div>
            )}
            <div className="application-detail-content">
              
              <h2 id="application-detail-title">{selectedApplication.title}</h2>
              <p>{selectedApplication.description || 'Aucune description disponible pour cette application.'}</p>
              {selectedApplication.url && (
                <a
                  className="application-detail-launch"
                  href={selectedApplication.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Accéder à l’application
                  <ExternalLink size={17} />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
