import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, Search, X } from 'lucide-react';
import { Card, AdminComponentProps } from '../../types';
import { cardsAPI, ldapAPI } from '../../services/api';
import type { LdapUserItem } from '../../services/api/ldapAPI';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5001';

const AdminCardManager: React.FC<AdminComponentProps> = ({ onError }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showLdapPicker, setShowLdapPicker] = useState(false);
  const [ldapQuery, setLdapQuery] = useState('');
  const [ldapResults, setLdapResults] = useState<LdapUserItem[]>([]);
  const [ldapLoading, setLdapLoading] = useState(false);
  const [ldapError, setLdapError] = useState<string>('');
  const [ldapSelected, setLdapSelected] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: '',
    redirectUrl: '',
    isActive: true,
    requiresLdapLogin: false,
    accessUsernamesText: '',
    disableNotifications: false
  });

  const storedUserRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
  let storedUser: any = null;
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  } catch {
    storedUser = null;
  }
  const isSuperadmin = storedUser?.role === 'superadmin';

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cardsAPI.getAllForAdmin();
      setCards(response.data);
    } catch (error: any) {
      
      
      // AJOUTEZ CETTE GESTION D'ERREUR
      let errorMessage = 'Erreur lors du chargement des cartes';
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert("L'image est trop grande. Taille maximum: 2MB");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Format d'image non supporté. Utilisez JPEG, PNG, GIF ou WebP");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = formData.imageUrl;

      if (selectedFile) {
        const formDataFile = new FormData();
        formDataFile.append("image", selectedFile);

        const uploadRes = await axios.post(
          `${BACKEND_URL}/api/cards/upload`,
          formDataFile,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        imageUrl = uploadRes.data.url || uploadRes.data.imageUrl;
        
      }

      const dataToSend = {
        title: formData.title,
        category: formData.category,
        isActive: formData.isActive,
              description: formData.description || '',
              imageUrl: imageUrl || '',
              redirectUrl: formData.redirectUrl.trim(),
              ...(isSuperadmin
          ? {
              requiresLdapLogin: formData.requiresLdapLogin,
              accessUsernames: formData.accessUsernamesText
                .split(/[\n,;]+/g)
                .map(v => v.trim())
                .filter(Boolean),
              disableNotifications: formData.disableNotifications
            }
          : {})
      };

     

      if (editingCard) {
        await cardsAPI.update(editingCard._id, dataToSend);
      } else {
        await cardsAPI.create(dataToSend);
      }

      fetchCards();
      resetForm();

    } catch (error: any) {
      
      alert(`Erreur ${error.response?.status}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      description: card.description || '',
      category: card.category,
      imageUrl: card.imageUrl || '',
      redirectUrl: card.redirectUrl || '',
      isActive: card.isActive,
      requiresLdapLogin: !!(card as any).requiresLdapLogin,
      accessUsernamesText: Array.isArray((card as any).accessUsernames) ? (card as any).accessUsernames.join('\n') : '',
      disableNotifications: !!(card as any).disableNotifications
    });
    setImagePreview(card.imageUrl || '');
    setSelectedFile(null);
    setShowForm(true);
  };

  const parseUsernames = (raw: string): string[] =>
    String(raw || '')
      .split(/[\n,;]+/g)
      .map(v => v.trim())
      .filter(Boolean);

  const mergeUsernames = (currentRaw: string, toAdd: string[]): string => {
    const current = parseUsernames(currentRaw);
    const seen = new Set(current.map(v => v.toLowerCase()));
    const next = [...current];
    for (const u of toAdd) {
      const key = String(u).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      next.push(String(u).trim());
    }
    return next.join('\n');
  };

  const handleLdapSearch = async () => {
    setLdapError('');
    const q = ldapQuery.trim();
    if (q.length < 2) {
      setLdapError('Tapez au moins 2 caractères.');
      return;
    }

    try {
      setLdapLoading(true);
      const res = await ldapAPI.searchUsers(q, 30);
      const users = res.data?.users || [];
      setLdapResults(users);
      setLdapSelected({});
    } catch (err: any) {
      setLdapError(err?.response?.data?.error || err?.message || 'Erreur LDAP');
      setLdapResults([]);
      setLdapSelected({});
    } finally {
      setLdapLoading(false);
    }
  };

  const handleAddSelectedFromLdap = () => {
    const selected = ldapResults
      .filter(u => ldapSelected[String(u.username).toLowerCase()])
      .map(u => u.username);

    setFormData(prev => ({
      ...prev,
      accessUsernamesText: mergeUsernames(prev.accessUsernamesText, selected)
    }));

    setShowLdapPicker(false);
  };

  
  const handleDelete = async (id: string) => {
  if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
    try {
      await cardsAPI.delete(id); // Utilise maintenant la suppression douce
      fetchCards();
      // Optionnel: Afficher un message de confirmation
      alert('Élément déplacé dans la corbeille');
    } catch (error: any) {
      
      if (error.response?.status === 401 && onError) {
        onError('Session expirée');
      }
    }
  }
};
  const prepareCardData = (card: Card, updatedFields: Partial<Card>) => {
  return {
    title: card.title,
    description: card.description || '',
    category: card.category,
    imageUrl: card.imageUrl || '',
    isActive: card.isActive,
    ...updatedFields // Surcharger avec les champs mis à jour
  };
};

const handleToggleActive = async (card: Card) => {
 
  
  try {
    // TEST 1: Envoyez avec PUT
    const testData = {
      title: card.title,
      description: card.description || '',
      category: card.category,
      imageUrl: card.imageUrl || '',
      isActive: !card.isActive
    };
    
    
    
    // Mise à jour optimiste immédiate
    setCards(prevCards => 
      prevCards.map(c => 
        c._id === card._id ? { ...c, isActive: !c.isActive } : c
      )
    );
    
    // Envoyez la requête
    const response = await cardsAPI.update(card._id, testData);
    
    
    // Rechargez pour être sûr
    fetchCards();
    
  } catch (error: any) {
    
    // Annulez la mise à jour optimiste
    setCards(prevCards => 
      prevCards.map(c => 
        c._id === card._id ? { ...c, isActive: card.isActive } : c
      )
    );
    
    // Essayez avec PATCH directement
    try {
      
      const patchResponse = await axios.patch(
        `${BACKEND_URL}/api/cards/${card._id}`,
        { isActive: !card.isActive },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      fetchCards();
    } catch (patchError: any) {
      
      alert(`Erreur: ${patchError.response?.data?.message || patchError.message}`);
    }
  }
};

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
  try {    
    const newCards = [...cards];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Vérifier les limites
    if (newIndex < 0 || newIndex >= newCards.length) {
      return;
    }
    
   
    
    // Échanger les positions
    [newCards[index], newCards[newIndex]] = [newCards[newIndex], newCards[index]];
    
    // Mettre à jour l'ordre pour tous
    const updatedCards = newCards.map((card, idx) => ({
      ...card,
      order: idx
    }));
    
    
    // Préparer les updates
    const updates = updatedCards.map(card => ({
      id: card._id,
      order: card.order
    }));
    
    
    
    // Utiliser la nouvelle méthode updateOrder
    const response = await cardsAPI.updateOrder(updates);
    
    
    // Mettre à jour l'état local
    setCards(updatedCards);
    setError(null); // Effacer les erreurs précédentes
    
  } catch (error: any) {
    
    
    let errorMessage = 'Erreur lors du réordonnancement';
    
    if (error.response?.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      if (onError) onError(errorMessage);
    } else if (error.response?.status === 404) {
      errorMessage = 'Route API non trouvée. Vérifiez la configuration backend.';
    } else if (error.response?.data?.error) {
      errorMessage = `Erreur serveur: ${error.response.data.error}`;
    } else if (error.message?.includes('Network Error')) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    }
    
    
    setError(errorMessage);
    
    // Recharger les cartes pour éviter un état incohérent
    fetchCards();
  }
};

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      imageUrl: '',
      redirectUrl: '',
      isActive: true,
      requiresLdapLogin: false,
      accessUsernamesText: '',
      disableNotifications: false
    });
    setSelectedFile(null);
    setImagePreview('');
    setEditingCard(null);
    setShowForm(false);
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
        <h3 className="h4 fw-semibold mb-0">Cartes disponibles: {cards.length}</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary d-flex align-items-center gap-2">
          <Plus className="w-5 h-5" /> Nouvelle Carte
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
            <h4 className="h5 fw-semibold mb-3">{editingCard ? 'Modifier la carte' : 'Créer une nouvelle carte'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Titre */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>

                {/* Catégorie */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Catégorie</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="form-control"
                    
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Lien de redirection</label>
                  <input
                    type="url"
                    value={formData.redirectUrl}
                    onChange={e => setFormData({ ...formData, redirectUrl: e.target.value })}
                    className="form-control"
                    placeholder="http://10.16.220.140:5009/"
                  />
                  <div className="form-text text-muted">
                    Si renseigné, la carte redirige vers ce lien après l&apos;authentification LDAP.
                  </div>
                </div>

                {/* Image Upload */}
                <div className="col-md-6">
                  <label className="form-label fw-medium">Image</label>
                  <div className="mb-3">
                    <label className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
                      <Upload className="w-4 h-4" /> Sélectionner une image
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="d-none" />
                    </label>
                    {selectedFile && (
                      <div className="mt-2 small text-muted">
                        Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>

                  {/* Aperçu */}
                  {(imagePreview || formData.imageUrl) && (
                    <div className="mt-3">
                      <p className="small text-muted mb-2">Aperçu:</p>
                      <img
                        src={
                          imagePreview ||
                          (formData.imageUrl.startsWith('http') ? formData.imageUrl : `${BACKEND_URL}${formData.imageUrl}`)
                        }
                        alt="Preview"
                        className="img-fluid rounded border"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  )}
                </div>

                {/* Active */}
                <div className="col-md-6">
                  <div className="form-check mt-4 pt-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-check-input"
                      id="isActiveCheck"
                    />
                    <label className="form-check-label fw-medium" htmlFor="isActiveCheck">Activée</label>
                  </div>

                    <div className="mt-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="requiresLdapLoginCheck"
                          checked={formData.requiresLdapLogin}
                          disabled={!isSuperadmin}
                          onChange={e => setFormData({ ...formData, requiresLdapLogin: e.target.checked })}
                        />
                        <label className="form-check-label fw-medium" htmlFor="requiresLdapLoginCheck">
                          Acces LDAP requis (lecture)
                        </label>
                        {!isSuperadmin && (
                          <div className="form-text text-muted">Reserve au superadmin</div>
                        )}
                      </div>

                      {isSuperadmin && formData.requiresLdapLogin && (
                        <div className="mt-3">
                          <label className="form-label fw-medium">Utilisateurs autorisés (liste)</label>
                          <textarea
                            value={formData.accessUsernamesText}
                            onChange={e => setFormData({ ...formData, accessUsernamesText: e.target.value })}
                            className="form-control"
                            rows={4}
                            placeholder={"Un identifiant par ligne (ou séparé par virgules)\nEx: prenom.nom"}
                          />
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                              onClick={() => {
                                setLdapQuery('');
                                setLdapResults([]);
                                setLdapError('');
                                setLdapSelected({});
                                setShowLdapPicker(true);
                              }}
                            >
                              <Search size={16} /> Choisir depuis LDAP
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setFormData({ ...formData, accessUsernamesText: '' })}
                            >
                              Vider la liste
                            </button>
                          </div>
                          <div className="form-text text-muted">
                            Vide = tous les utilisateurs connectés (LDAP/local) peuvent accéder.
                          </div>
                        </div>
                      )}

                      <div className="form-check mt-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="disableNotificationsCheck"
                        checked={formData.disableNotifications}
                        disabled={!isSuperadmin}
                        onChange={e => setFormData({ ...formData, disableNotifications: e.target.checked })}
                      />
                      <label className="form-check-label fw-medium" htmlFor="disableNotificationsCheck">
                        Desactiver les notifications
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="form-control"
                    rows={3}
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-success" disabled={!formData.title}>
  {editingCard ? 'Mettre à jour' : 'Créer'}
</button>
                <button type="button" onClick={resetForm} className="btn btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des cartes */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {cards.map((card, index) => (
          <div key={card._id} className="col">
            <div className="card h-100 border shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="card-title fw-semibold mb-1">{card.title}</h5>
                    <p className="text-muted small mb-0">{card.category}</p>
                  </div>
                  {card.isActive ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-secondary" />}
                </div>

                {/* Image carte */}
                {card.imageUrl && (
                  <div className="mb-3">
                    <img 
  src={card.imageUrl ? `${BACKEND_URL}${card.imageUrl}` : undefined} 
  alt={card.title} 
  className="img-fluid rounded border"
  style={{ maxHeight: '100px', width: '100%', objectFit: 'cover' }}
/>
                  </div>
                )}

                <p className="card-text text-secondary small mb-4">{card.description || "Pas de description"}</p>

                <div className="d-flex justify-content-between align-items-center mt-auto">
                  <span className="text-muted small">{new Date(card.createdAt).toLocaleDateString()}</span>
                  <div className="d-flex align-items-center gap-2">
                    {index > 0 && (
                      <button onClick={() => handleReorder(index, 'up')} className="btn btn-sm btn-outline-secondary p-1">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    )}
                    {index < cards.length - 1 && (
                      <button onClick={() => handleReorder(index, 'down')} className="btn btn-sm btn-outline-secondary p-1">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    )}

                    <button onClick={() => handleEdit(card)} className="btn btn-sm btn-outline-primary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleActive(card)} className="btn btn-sm btn-outline-warning">
                      {card.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(card._id)} className="btn btn-sm btn-outline-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showLdapPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12, 12, 12, 0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: 'min(720px, 96vw)' }}>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div className="fw-bold">Recherche LDAP</div>
                <div className="text-muted small">Recherchez puis cochez les personnes à ajouter.</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                onClick={() => setShowLdapPicker(false)}
              >
                <X size={16} /> Fermer
              </button>
            </div>

            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Nom, prénom, username, email... (min 2 caractères)"
                value={ldapQuery}
                onChange={(e) => setLdapQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLdapSearch();
                  }
                }}
                disabled={ldapLoading}
              />
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={handleLdapSearch}
                disabled={ldapLoading}
              >
                <Search size={16} /> {ldapLoading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>

            {ldapError && (
              <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
                <small>{ldapError}</small>
              </div>
            )}

            <div className="mt-3" style={{ maxHeight: '46vh', overflow: 'auto' }}>
              {ldapResults.length === 0 ? (
                <div className="text-muted small py-3">Aucun résultat.</div>
              ) : (
                <div className="list-group">
                  {ldapResults.map((u) => {
                    const key = String(u.username).toLowerCase();
                    const checked = !!ldapSelected[key];
                    return (
                      <label key={u.dn || u.username} className="list-group-item d-flex gap-3 align-items-start">
                        <input
                          type="checkbox"
                          className="form-check-input mt-1"
                          checked={checked}
                          onChange={(e) =>
                            setLdapSelected((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{u.displayName || u.username}</div>
                          <div className="text-muted small">
                            {u.username}
                            {u.email ? ` • ${u.email}` : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowLdapPicker(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleAddSelectedFromLdap}
                disabled={ldapResults.length === 0}
              >
                Ajouter la sélection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCardManager;
