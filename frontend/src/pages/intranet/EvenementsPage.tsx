import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Article } from "../../types";
import 'bootstrap/dist/css/bootstrap.min.css';
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';

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

const EventsPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const isSuperadmin = getStoredRole() === 'superadmin';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/articles?category=Communication`);
      const data = await response.json();
      setArticles(data);
    } catch (error: any) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-3 text-muted">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <h1 className="h2 fw-bold mb-4 anam-text-primary">Événements</h1>

          {articles.length === 0 && (
            <div className="text-center py-5">
              <p className="text-muted mb-3">Aucun événement trouvé.</p>
              <p className="text-secondary small">Les événements apparaîtront ici lorsqu'ils seront publiés.</p>
            </div>
          )}

          <div className="d-flex flex-column gap-4">
            {articles.map((art) => (
              <div key={art._id} className="card anam-card anam-shadow border-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1 me-4">
                      <h2 className="h5 fw-bold mb-2">{art.title}</h2>
                      <div className="d-flex flex-wrap gap-3 mb-3">
                        <span className="badge bg-light text-dark">
                          {art.category || "Événement"}
                        </span>
                        <span className="text-muted small d-flex align-items-center">
                          <i className="bi bi-calendar me-1"></i>
                          <strong>Soumis le:</strong> {new Date(art.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-muted small d-flex align-items-center">
                          <i className="bi bi-eye me-1"></i>
                          <strong>Vues:</strong> {art.views || 0}
                        </span>
                      </div>
                      
                      {art.description && (
                        <p className="text-muted mb-3">{art.description}</p>
                      )}
                      
                      {art.pdfUrl && (!art.pdfProtected || isSuperadmin) && (
                        <div className="mt-3">
                          <a 
                            href={art.pdfProtected ? `/pdf/${art._id}` : art.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-anam-outline d-inline-flex align-items-center gap-2"
                          >
                            <FileText size={16} />
                            <span>Télécharger le fichier</span>
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {art.pdfUrl && (!art.pdfProtected || isSuperadmin) && (
                      <div className="d-flex flex-column align-items-center">
                        <a 
                          href={art.pdfProtected ? `/pdf/${art._id}` : art.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-decoration-none d-flex flex-column align-items-center text-primary anam-hover-lift"
                        >
                          <div className="bg-light rounded-circle p-3 mb-2 anam-hover-shadow">
                            <FileText size={32} className="text-danger" />
                          </div>
                          <span className="small fw-bold text-danger">Fichier</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
