import React, { useState } from 'react';
import { Calendar, Eye, FileText } from 'lucide-react';
import { Article, Card } from '../types';

interface ArticleCardProps {
  article: Article;
  onRead?: () => void;
  className?: string;
  cardColor?: string;
}

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

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onRead, className, cardColor = '#7a2b3a' }) => {
  const [expanded, setExpanded] = useState(false);
  const isSuperadmin = getStoredRole() === 'superadmin';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const resolveImageUrl = (url?: string) => {
    const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${backendUrl}${url}`;
    return `${backendUrl}/${url}`;
  };

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

  const shouldShowSeeMore = (title: string): boolean => {
    return title.length > 100;
  };

  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div 
      className={`card border-0 shadow-sm h-100 ${className}`}
      onClick={onRead}
      style={{ 
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="card-body p-4 d-flex flex-column">
        {/* En-tête */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span 
            className="badge rounded-pill px-3 py-2"
            style={{ 
              backgroundColor: `${cardColor}20`,
              color: cardColor
            }}
          >
            {article.category}
          </span>
          <small className="text-muted d-flex align-items-center">
            <Calendar size={14} className="me-1" />
            {formatDate(article.date)}
          </small>
        </div>
        
        {/* Image */}
        {article.imageUrl && (
          <div className="mb-3">
            <img
              src={resolveImageUrl(article.imageUrl)}
              alt={article.title}
              className="img-fluid rounded border"
              style={{ width: '100%', height: '160px', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Titre avec bouton "Voir plus" */}
        <div className="mb-3">
          <h4 
            className="fw-bold mb-2 text-dark"
            style={{
              fontSize: '1rem',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minHeight: '2.8em'
            }}
            title={article.title}
          >
            {article.title}
          </h4>
          
          {shouldShowSeeMore(article.title) && (
            <button
              onClick={toggleExpansion}
              className="btn btn-link p-0 text-primary text-decoration-none d-flex align-items-center gap-1"
              style={{ fontSize: '0.85rem' }}
            >
              {expanded ? (
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
        </div>
        
        {/* Description */}
        {article.description && (
          <p className="card-text text-muted mb-4 flex-grow-1">
            {article.description.length > 120 
              ? `${article.description.substring(0, 120)}...` 
              : article.description}
          </p>
        )}
        
        {/* Pied de carte */}
        <div className="mt-auto pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
              {article.pdfUrl && (!article.pdfProtected || isSuperadmin) && (
                <a 
                  href={article.pdfProtected ? `/pdf/${article._id}` : article.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm d-flex align-items-center"
                  style={{ backgroundColor: cardColor, borderColor: cardColor }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText size={16} className="me-1" />
                  {(() => {
                    const label = getFileTypeLabel(article.pdfUrl);
                    const suffix = article.pdfProtected ? ' (protégé)' : '';
                    return label ? `Fichier (${label})${suffix}` : `Fichier${suffix}`;
                  })()}
                </a>
              )}
              {article.pdfUrl && article.pdfProtected && !isSuperadmin && (
                <span className="text-muted small d-flex align-items-center">
                  <FileText size={16} className="me-1" />
                  PDF protege (reserve au superadmin)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
