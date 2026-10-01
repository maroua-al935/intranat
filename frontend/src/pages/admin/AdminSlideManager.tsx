import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Image as ImageIcon, Upload, AlertCircle } from 'lucide-react';
import { slidesAPI } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Slide, Card, Article, AdminComponentProps } from '../../types';
// CORRECTION : Définir l'interface pour import.meta.env
interface ImportMetaEnv {
  VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

interface AdminSlideManagerProps {
  onError?: (error: string) => void;
}

// CORRECTION : Gestion sécurisée de l'URL
const BACKEND_URL = (import.meta as ImportMeta).env?.VITE_BACKEND_URL || 'http://localhost:5001';

// CORRECTION : Fonction sécurisée pour les URLs d'images
const buildImageUrl = (url?: string): string => {
  if (!url) return '';
  
  // Si c'est déjà une URL complète
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Si c'est un chemin relatif
  if (url.startsWith('/')) {
    return `${BACKEND_URL}${url}`;
  }
  
  return `${BACKEND_URL}/${url}`;
};

const resolvePreviewSrc = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  return buildImageUrl(url);
};

const AdminSlideManager: React.FC<AdminSlideManagerProps> = ({ onError }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    link: '',
    buttonText: 'En savoir plus',
    isActive: true,
    order: 0
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleApiError = (err: any, context: string) => {
    console.error(`Erreur ${context}:`, err);
    
    let errorMessage = `Erreur lors de ${context}`;
    
    if (err.response?.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return true; // Indique que c'est une erreur d'authentification
    } 
    else if (err.response?.status === 403) {
      errorMessage = 'Accès interdit. Vous n\'avez pas les permissions nécessaires.';
    }
    else if (err.message?.includes('Network Error')) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    }
    else if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    }
    else if (err.response?.status) {
      errorMessage = `Erreur serveur (${err.response.status})`;
    }
    
    setError(errorMessage);
    return false;
  };

  const fetchSlides = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await slidesAPI.getAllForAdmin();
      setSlides(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      handleApiError(err, 'le chargement des slides');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  const handleEdit = (slide: Slide) => {
    try {
      setEditingSlide(slide);
      setFormData({
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        imageUrl: slide.imageUrl || '',
        link: slide.link || '',
        buttonText: slide.buttonText || 'En savoir plus',
        isActive: slide.isActive ?? true,
        order: slide.order || 0
      });
      setImagePreview(slide.imageUrl || '');
      setFile(null);
      setShowForm(true);
    } catch (error) {
      console.error('Erreur lors de l\'édition:', error);
      setError('Erreur lors de la préparation de l\'édition');
    }
  };

  
  const handleDelete = async (id: string) => {
  if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
    try {
      await slidesAPI.delete(id); // Utilise maintenant la suppression douce
      fetchSlides();
      // Optionnel: Afficher un message de confirmation
      alert('Élément déplacé dans la corbeille');
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.response?.status === 401 && onError) {
        onError('Session expirée');
      }
    }
  }
};

  const handleToggleActive = async (slide: Slide) => {
    if (!slide._id) {
      console.error('Slide invalide pour toggle');
      setError('Slide invalide');
      return;
    }
    
    try {
      setActionLoading(`toggle-${slide._id}`);
      await slidesAPI.update(slide._id, { 
        ...slide, 
        isActive: !slide.isActive 
      });
      await fetchSlides();
    } catch (err: any) {
      handleApiError(err, 'le changement de statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    try {
      const newSlides = [...slides];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newSlides.length) return;
      
      [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
      
      const updatedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        order: idx
      }));
      
      setActionLoading(`reorder-${index}`);
      await slidesAPI.updateOrder(updatedSlides.map(s => ({ 
        id: s._id, 
        order: s.order 
      })));
      setSlides(updatedSlides);
    } catch (err: any) {
      handleApiError(err, 'le réordonnancement');
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      link: '',
      buttonText: 'En savoir plus',
      isActive: true,
      order: 0
    });
    setImagePreview('');
    setFile(null);
    setEditingSlide(null);
    setShowForm(false);
    setError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert("Format d'image non supporté. Utilisez JPEG, PNG, GIF, WebP ou SVG");
        return;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        alert("L'image est trop grande. Taille maximum: 10MB");
        return;
      }
      
      setFile(selectedFile);
      const localPreview = URL.createObjectURL(selectedFile);
      setImagePreview(localPreview);
      setFormData(prev => ({ ...prev, imageUrl: localPreview }));
      setError(null);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      setError('Erreur lors du téléchargement de l\'image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      return;
    }
    
    if (!formData.imageUrl && !file) {
      setError('Une image est requise');
      return;
    }

    try {
      setActionLoading('submit');
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('subtitle', formData.subtitle.trim());
      data.append('link', formData.link.trim());
      data.append('buttonText', formData.buttonText.trim());
      data.append('isActive', String(formData.isActive));
      data.append('order', String(formData.order));

      if (file) {
        data.append('image', file);
      } else if (formData.imageUrl && formData.imageUrl.startsWith('http')) {
        data.append('imageUrl', formData.imageUrl);
      }

      if (editingSlide) {
        await slidesAPI.update(editingSlide._id, data);
      } else {
        await slidesAPI.create(data);
      }

      await fetchSlides();
      resetForm();
    } catch (err: any) {
      handleApiError(err, 'la sauvegarde');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-3 text-muted">Chargement des slides...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="h4 fw-semibold mb-0">Slides du carousel: {slides.length}</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary d-flex align-items-center gap-2"
          disabled={actionLoading !== null}
        >
          <Plus size={20} />
          {showForm ? 'Masquer le formulaire' : 'Nouveau Slide'}
        </button>
      </div>

      {/* Message d'erreur global */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <AlertCircle className="me-2" size={20} />
          <div>{error}</div>
          <button 
            type="button" 
            className="btn-close ms-auto" 
            onClick={() => setError(null)}
            aria-label="Fermer"
          ></button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card mb-4 border shadow-sm">
          <div className="card-body">
            <h4 className="h5 fw-semibold mb-3">
              {editingSlide ? 'Modifier le slide' : 'Créer un nouveau slide'}
            </h4>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="form-control"
                    required
                    disabled={actionLoading === 'submit'}
                    maxLength={100}
                  />
                  <small className="text-muted">Maximum 100 caractères</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium">Sous-titre <span className="text-muted">(facultatif)</span></label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="form-control"
                    disabled={actionLoading === 'submit'}
                    maxLength={200}
                  />
                  <small className="text-muted">Maximum 200 caractères</small>
                </div>
                <div className="col-12">
                  <label className="form-label fw-medium">Image *</label>
                  <div className="input-group">
                    <label className="input-group-text btn btn-outline-secondary cursor-pointer">
                      <Upload size={16} className="me-1" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="d-none"
                        disabled={actionLoading === 'submit'}
                      />
                    </label>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="URL de l'image"
                      className="form-control"
                      disabled={actionLoading === 'submit'}
                    />
                  </div>
                  <small className="text-muted">Formats acceptés: JPEG, PNG, GIF, WebP, SVG. Max: 10MB</small>
                  {(imagePreview || formData.imageUrl) && (
                    <div className="mt-2">
                      <img 
                        src={resolvePreviewSrc(imagePreview || formData.imageUrl)} 
                        alt="Preview" 
                        className="img-fluid rounded border"
                        style={{ maxHeight: '150px' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          setError('Impossible de charger l\'image. Vérifiez l\'URL.');
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium">Lien (optionnel)</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://..."
                    className="form-control"
                    disabled={actionLoading === 'submit'}
                  />
                  <small className="text-muted">Lien vers lequel rediriger lorsque le slide est cliqué</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium">Texte du bouton</label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="form-control"
                    disabled={actionLoading === 'submit'}
                    maxLength={50}
                  />
                  <small className="text-muted">Texte affiché sur le bouton (optionnel)</small>
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-check-input"
                      id="isActiveCheck"
                      disabled={actionLoading === 'submit'}
                    />
                    <label className="form-check-label fw-medium" htmlFor="isActiveCheck">
                      Slide actif (visible sur le site)
                    </label>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-success d-flex align-items-center gap-2"
                  disabled={actionLoading === 'submit'}
                >
                  {actionLoading === 'submit' ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      {editingSlide ? 'Mise à jour...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      {editingSlide ? 'Mettre à jour' : 'Créer'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                  disabled={actionLoading === 'submit'}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aperçu du carousel */}
      {slides.filter(s => s.isActive).length > 0 && (
        <div className="card mb-4 border shadow-sm">
          <div className="card-body">
            <h4 className="h5 fw-semibold mb-3">Aperçu du carousel</h4>
            <div className="position-relative rounded overflow-hidden border" style={{ height: '250px' }}>
              <div className="d-flex h-100">
                {slides
                  .filter(s => s.isActive)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .slice(0, 3)
                  .map((slide, index) => (
                    <div key={slide._id || index} className="min-vw-100 position-relative">
                      <img 
                        src={buildImageUrl(slide.imageUrl)} 
                        alt={slide.title} 
                        className="w-100 h-100 object-fit-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `
                            <div class="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                              <span class="text-muted">Image non disponible</span>
                            </div>
                          `;
                        }}
                      />
                      <div className="position-absolute top-0 start-0 w-100 h-100" 
                           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)' }}>
                      </div>
                      <div className="position-absolute bottom-0 p-4 text-white">
                        <h5 className="fw-bold mb-1">{slide.title || 'Sans titre'}</h5>
                        <p className="small mb-0 opacity-90">{slide.subtitle || 'Sans sous-titre'}</p>
                        {slide.buttonText && (
                          <span className="badge bg-light text-dark mt-2">{slide.buttonText}</span>
                        )}
                      </div>
                      {index === 0 && (
                        <div className="position-absolute top-2 start-2 badge bg-success">
                          Actif
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <p className="small text-muted mt-2">
              {slides.filter(s => s.isActive).length} slides actifs sur {slides.length} au total
            </p>
          </div>
        </div>
      )}

      {/* Slides list */}
      <div className="card border shadow-sm">
        <div className="card-header bg-light">
          <h5 className="mb-0 fw-semibold">Liste des slides</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="text-nowrap" style={{ width: '100px' }}>Image</th>
                <th className="text-nowrap">Titre</th>
                <th className="text-nowrap">Sous-titre</th>
                <th className="text-nowrap" style={{ width: '120px' }}>Ordre</th>
                <th className="text-nowrap" style={{ width: '100px' }}>Statut</th>
                <th className="text-nowrap" style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slides.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <ImageIcon size={48} className="text-secondary mx-auto mb-3 opacity-50" />
                    <p className="text-muted mb-2">Aucun slide créé</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="btn btn-link text-decoration-none"
                    >
                      Créer votre premier slide
                    </button>
                  </td>
                </tr>
              ) : (
                slides
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((slide, index) => (
                    <tr key={slide._id || index}>
                      <td>
                        <div className="overflow-hidden rounded border" style={{ width: '80px', height: '48px' }}>
                          <img 
                            src={buildImageUrl(slide.imageUrl)} 
                            alt={slide.title}
                            className="w-100 h-100 object-fit-cover"
                            onError={() => handleImageError(slide._id || '')}
                            style={{ display: imageErrors.has(slide._id || '') ? 'none' : 'block' }}
                          />
                          {imageErrors.has(slide._id || '') && (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                              <span className="text-muted small">No image</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">{slide.title || 'Sans titre'}</div>
                        {slide.link && (
                          <small className="text-muted d-block">
                            <a href={slide.link} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                              Lien: {slide.link.length > 30 ? `${slide.link.substring(0, 30)}...` : slide.link}
                            </a>
                          </small>
                        )}
                      </td>
                      <td className="text-muted small">
                        {slide.subtitle || 'Sans sous-titre'}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {index > 0 && (
                            <button
                              onClick={() => handleReorder(index, 'up')}
                              className="btn btn-sm btn-outline-secondary p-1"
                              title="Monter"
                              disabled={actionLoading?.startsWith('reorder')}
                            >
                              <ArrowUp size={16} />
                            </button>
                          )}
                          <span className="badge bg-secondary">
                            {(slide.order || 0) + 1}
                          </span>
                          {index < slides.length - 1 && (
                            <button
                              onClick={() => handleReorder(index, 'down')}
                              className="btn btn-sm btn-outline-secondary p-1"
                              title="Descendre"
                              disabled={actionLoading?.startsWith('reorder')}
                            >
                              <ArrowDown size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${slide.isActive ? 'bg-success' : 'bg-danger'}`}>
                          {slide.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            onClick={() => handleEdit(slide)}
                            className="btn btn-sm btn-outline-primary"
                            title="Modifier"
                            disabled={actionLoading !== null}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(slide)}
                            className="btn btn-sm btn-outline-warning"
                            title={slide.isActive ? 'Désactiver' : 'Activer'}
                            disabled={actionLoading === `toggle-${slide._id}`}
                          >
                            {actionLoading === `toggle-${slide._id}` ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : slide.isActive ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => slide._id && handleDelete(slide._id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Supprimer"
                            disabled={!slide._id || actionLoading === `delete-${slide._id}`}
                          >
                            {actionLoading === `delete-${slide._id}` ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSlideManager;
