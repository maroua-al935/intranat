import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Calendar, Upload, X } from 'lucide-react';
import { Article, Card, AdminComponentProps } from '../../types';
import { api, articlesAPI, cardsAPI } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const AdminArticleList: React.FC<AdminComponentProps> = ({ onError }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';

  const storedUserRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
  let storedUser: any = null;
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  } catch {
    storedUser = null;
  }
  const isSuperadmin = storedUser?.role === 'superadmin';

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    imageUrl: '',
    pdfUrl: '',
    pdfProtected: false,
    status: 'draft' as 'draft' | 'published',
    cardId: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [articlesResponse, cardsResponse] = await Promise.all([
        articlesAPI.getAllForAdmin(),
        cardsAPI.getAllForAdmin()
      ]);
      setArticles(articlesResponse.data);
      setCards(cardsResponse.data.filter((card: Card) => card.isActive));
    } catch (error: any) {
      console.error('Erreur:', error);
      let errorMessage = 'Erreur lors du chargement des données';
      if (error.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Impossible de se connecter au serveur';
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadPdfFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    try {
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Échec de l\'upload');
      
      const data = await response.json();
      return data.url; // URL du fichier uploadé
    } catch (error) {
      console.error('Erreur upload fichier:', error);
      throw new Error('Échec de l\'upload du fichier');
    }
  };

  const uploadImageFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post(
        '/articles/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.url || response.data.imageUrl || '';
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw new Error('Échec de l\'upload de l\'image');
    }
  };

  const getFileTypeLabel = (url?: string) => {
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) errors.title = 'Le titre est requis';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

const createNotificationForArticle = async (articleId: string, articleTitle: string) => {
  try {
    const notificationData = {
      type: 'new_article', // Utilisez 'new_article' comme défini dans votre schéma
      title: 'Nouvel article publié',
      message: `Un nouvel article "${articleTitle}" a été créé.`,
      articleId: articleId, // <-- IMPORTANT: Utilisez "articleId" pas "relatedId"
      isRead: false,
      // Ajoutez ces champs si nécessaires
      // recipients: [],
      // createdBy: userId,
    };

    const response = await api.post('/notifications', notificationData);

    console.log('✅ Notification créée avec articleId:', articleId);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    throw error;
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      let finalImageUrl = formData.imageUrl;
      
      if (imageFile) {
        setUploadingImage(true);
        finalImageUrl = await uploadImageFile(imageFile);
      }

      let finalPdfUrl = formData.pdfUrl;
      
      // Si un fichier est sélectionné, on l'upload
      if (pdfFile) {
        setUploadingPdf(true);
        finalPdfUrl = await uploadPdfFile(pdfFile);
      }

       const articleData = {
         ...formData,
         imageUrl: finalImageUrl,
         pdfUrl: finalPdfUrl,
         pdfProtected: isSuperadmin ? !!formData.pdfProtected : false
       };

      if (editingArticle) {
        // Pour la mise à jour
        await articlesAPI.update(editingArticle._id, articleData);
        alert(`Article "${articleData.title}" mis à jour avec succès !`);
      } else {
        // Pour la création
        const response = await articlesAPI.create(articleData);
        const newArticle = response.data;
        
        // Créer une notification pour le nouvel article
        try {
          await createNotificationForArticle(newArticle._id, newArticle.title);
          console.log('✅ Article créé avec notification');
        } catch (notifError) {
          console.warn('Notification non créée, mais article sauvegardé:', notifError);
          // Ne pas bloquer si la notification échoue
        }
        
        alert(`Article "${articleData.title}" créé avec succès !`);
      }
      
      fetchData();
      resetForm();
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      let errorMsg = 'Erreur lors de la sauvegarde';
      
      if (error.message.includes('upload')) {
        errorMsg = 'Erreur lors de l\'upload du fichier';
      } else if (error.response?.status === 401) {
        errorMsg = 'Session expirée. Veuillez vous reconnecter.';
        if (onError) onError(errorMsg);
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(errorMsg);
    } finally {
      setUploadingPdf(false);
      setUploadingImage(false);
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      category: article.category,
      description: article.description || '',
      imageUrl: article.imageUrl || '',
      pdfUrl: article.pdfUrl || '',
      pdfProtected: !!(article as any).pdfProtected,
      status: article.status,
      cardId: typeof article.cardId === 'string' ? article.cardId : article.cardId?._id || ''
    });
    setImagePreview(article.imageUrl || null);
    setImageFile(null);
    setPdfFile(null);
    setPdfPreview(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
      try {
        await articlesAPI.delete(id);
        fetchData();
        alert('Élément déplacé dans la corbeille');
      } catch (error: any) {
        console.error('Erreur:', error);
        if (error.response?.status === 401 && onError) {
          onError('Session expirée');
        }
      }
    }
  };

  const handleToggleStatus = async (article: Article) => {
    try {
      const newStatus = article.status === 'published' ? 'draft' : 'published';
      await articlesAPI.update(article._id, { ...article, status: newStatus });
      fetchData();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.response?.status === 401 && onError) {
        onError('Session expirée. Veuillez vous reconnecter.');
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("L'image est trop grande. Taille maximum: 5MB");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Format d'image non supporté. Utilisez JPEG, PNG, GIF ou WebP");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImageFile = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setFormData({ ...formData, pdfUrl: '' }); // Effacer l'URL si un fichier est sélectionné
      setFormErrors({ ...formErrors, pdf: '' }); // Effacer l'erreur
      
      // Créer une preview (nom du fichier)
      setPdfPreview(file.name);
    }
  };

  const removePdfFile = () => {
    setPdfFile(null);
    setPdfPreview(null);
    setFormData({ ...formData, pdfUrl: '', pdfProtected: false }); // S'assurer que l'URL est aussi effacée
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      description: '',
      imageUrl: '',
      pdfUrl: '',
      pdfProtected: false,
      status: 'draft',
      cardId: ''
    });
    setImageFile(null);
    setImagePreview(null);
    setPdfFile(null);
    setPdfPreview(null);
    setFormErrors({});
    setEditingArticle(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-2">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="h4 fw-semibold mb-0">Articles: {articles.length}</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-success d-flex align-items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvel Article
        </button>
      </div>
      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card mb-4 border shadow-sm">
          <div className="card-body">
            <h4 className="h5 fw-semibold mb-3">
              {editingArticle ? 'Modifier l\'article' : 'Créer un nouvel article'}
            </h4>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Titre */}
                <div className="col-12">
                  <label className="form-label fw-medium">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setFormErrors({ ...formErrors, title: '' });
                    }}
                    className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                    required
                  />
                  {formErrors.title && (
                    <div className="invalid-feedback">{formErrors.title}</div>
                  )}
                </div>
                
                {/* Catégorie */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Catégorie</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                  />
                </div>
                
                {/* Carte */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Carte</label>
                  <select
                    value={formData.cardId}
                    onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Sélectionner une carte</option>
                    {cards.map(card => (
                      <option key={card._id} value={card._id}>
                        {card.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Image */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Image</label>
                  <div className="mb-3">
                    <label className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Sélectionner une image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="d-none"
                        disabled={uploadingImage}
                      />
                    </label>
                    {imageFile && (
                      <div className="mt-2 small text-muted d-flex align-items-center gap-2">
                        <span>
                          Fichier sélectionné: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={removeImageFile}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {(imagePreview || formData.imageUrl) && (
                    <div className="mt-3">
                      <p className="small text-muted mb-2">Aperçu:</p>
                      <img
                        src={imagePreview || (formData.imageUrl.startsWith('http') ? formData.imageUrl : `${BACKEND_URL}${formData.imageUrl}`)}
                        alt="Preview"
                        className="img-fluid rounded border"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="mt-2">
                      <div className="spinner-border spinner-border-sm text-secondary me-2" role="status">
                        <span className="visually-hidden">Upload...</span>
                      </div>
                      <span className="small text-muted">Upload de l'image en cours...</span>
                    </div>
                  )}
                </div>
                
                {/* Statut */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                    className="form-select"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
                
                {/* Fichier Upload/URL - FACULTATIF */}
                <div className="col-12">
                  <label className="form-label fw-medium d-flex align-items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Fichier (facultatif)
                  </label>
                  
                  <div className="mb-3">
                    <label className="btn btn-outline-primary btn-sm mb-2">
                      <Upload className="w-4 h-4 me-2" />
                      Uploader un fichier
                      <input
                        type="file"
                        accept="*/*"
                        onChange={handlePdfFileChange}
                        className="d-none"
                        disabled={uploadingPdf}
                      />
                    </label>
                    
                    {pdfPreview && (
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="small">{pdfPreview}</span>
                        <button
                          type="button"
                          onClick={removePdfFile}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    {uploadingPdf && (
                      <div className="mt-2">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                          <span className="visually-hidden">Upload...</span>
                        </div>
                        <span className="small text-muted">Upload du fichier en cours...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center text-muted small mb-2">OU</div>
                  
                  <div>
                    <input
                      type="text"
                      value={formData.pdfUrl}
                      onChange={(e) => {
                        const nextUrl = e.target.value;
                        setFormData({
                          ...formData,
                          pdfUrl: nextUrl,
                          pdfProtected: nextUrl.startsWith('/uploads/') ? formData.pdfProtected : false
                        });
                        if (pdfFile) {
                          setPdfFile(null);
                          setPdfPreview(null);
                        }
                      }}
                      className="form-control"
                      placeholder="Collez l'URL du fichier (facultatif)"
                      disabled={!!pdfFile}
                    />
                    <div className="form-text">
                      {pdfFile 
                        ? 'Un fichier est sélectionné pour upload'
                        : 'Entrez une URL valide vers un fichier ou laissez vide'}
                    </div>
                  </div>
                </div>

                {/* Protection PDF (superadmin uniquement) */}
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="pdfProtected"
                      className="form-check-input"
                      type="checkbox"
                      checked={!!formData.pdfProtected}
                      onChange={(e) => setFormData({ ...formData, pdfProtected: e.target.checked })}
                      disabled={
                        !isSuperadmin ||
                        (!pdfFile && !formData.pdfUrl) ||
                        (!!formData.pdfUrl && !formData.pdfUrl.startsWith('/uploads/') && !pdfFile)
                      }
                    />
                    <label className="form-check-label fw-medium" htmlFor="pdfProtected">
                      PDF protégé (lecture seule)
                    </label>
                    <div className="form-text">
                      Réservé au superadmin. Fonctionne uniquement pour les fichiers uploadés (URL `/uploads/...`).
                    </div>
                  </div>
                </div>
                 
                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-control"
                    rows={2}
                  />
                </div>
                
          
              </div>
              
              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={uploadingPdf || uploadingImage}
                >
                  {uploadingPdf || uploadingImage ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      Enregistrement...
                    </>
                  ) : (
                    editingArticle ? 'Mettre à jour' : 'Créer'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                  disabled={uploadingPdf || uploadingImage}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Articles list */}
      <div className="card border shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="text-nowrap">Titre</th>
                <th className="text-nowrap">Carte</th>
                <th className="text-nowrap">Date</th>
                <th className="text-nowrap">Statut</th>
                <th className="text-nowrap">Fichier</th>
                <th className="text-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <tr key={article._id}>
                  <td>
                    <div className="fw-medium">{article.title}</div>   
                  </td>
                  <td>
                    <div className="fw-medium">
                      {typeof article.cardId === 'string' 
                        ? cards.find(card => card._id === article.cardId)?.title || 'Non assigné'
                        : article.cardId?.title || 'Non assigné'
                      }
                    </div>   
                  </td>
                  <td className="text-muted small">
                    {formatDate(article.date)}
                  </td>
                  
                  <td>
                    <span className={`badge ${article.status === 'published' ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {article.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  
                   <td>
                     {article.pdfUrl ? (
                       <span className="badge bg-info">
                         <FileText className="w-3 h-3 me-1" />
                         {(() => {
                           const label = getFileTypeLabel(article.pdfUrl);
                           return `Fichier${label ? ` (${label})` : ''}`;
                         })()}
                         {article.pdfProtected && (
                           <span className="ms-2" title="PDF protégé (lecture seule)">
                             <EyeOff className="w-3 h-3" />
                           </span>
                         )}
                       </span>
                     ) : (
                       <span className="badge bg-secondary">Aucun</span>
                     )}
                   </td>
                  
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => handleEdit(article)}
                        className="btn btn-sm btn-outline-primary"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(article)}
                        className="btn btn-sm btn-outline-warning"
                        title={article.status === 'published' ? 'Mettre en brouillon' : 'Publier'}
                      >
                        {article.status === 'published' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(article._id)}
                        className="btn btn-sm btn-outline-danger"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {articles.length === 0 && (
            <div className="text-center py-5">
              <FileText className="w-12 h-12 text-secondary mx-auto mb-3" />
              <p className="text-muted mb-2">Aucun article créé</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-link text-decoration-none"
              >
                Créer votre premier article
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminArticleList;
