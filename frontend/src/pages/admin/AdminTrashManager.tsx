import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertCircle, FileText, Image as ImageIcon, Layout } from 'lucide-react';
import { trashAPI } from '../../services/api'; // IMPORT SIMPLIFIÉ
import 'bootstrap/dist/css/bootstrap.min.css';

interface TrashItem {
  id: string;
  type: 'article' | 'card' | 'slide';
  title: string;
  deletedAt: string;
  data: any;
}

const AdminTrashManager: React.FC<{ onError: (error: string) => void }> = ({ onError }) => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // UTILISEZ L'API DE CORBEILLE UNIFIÉE
      const response = await trashAPI.getAll();
      
      // Transformer les données pour correspondre à l'interface TrashItem
      const items: TrashItem[] = response.data.map((item: any) => ({
        id: item._id,
        type: item.type,
        title: item.title,
        deletedAt: item.deletedAt || new Date().toISOString(),
        data: item
      }));
      
      // Trier par date de suppression
      items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      setTrashItems(items);
    } catch (error: any) {
      console.error('Erreur:', error);
      setError('Erreur lors du chargement de la corbeille');
      if (error.response?.status === 401 && onError) {
        onError('Session expirée');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string, type: 'article' | 'card' | 'slide') => {
    try {
      setLoading(true);
      // UTILISEZ trashAPI.restore QUI GÈRE TOUS LES TYPES
      await trashAPI.restore(id, type);
      await fetchTrashItems();
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur lors de la restauration: ${error.response?.data?.message || error.message}`);
    }
  };

  const handlePermanentDelete = async (id: string, type: 'article' | 'card' | 'slide') => {
    if (!window.confirm('Supprimer définitivement cet élément ? Cette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      // UTILISEZ trashAPI.permanentDelete QUI GÈRE TOUS LES TYPES
      await trashAPI.permanentDelete(id, type);
      await fetchTrashItems();
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur lors de la suppression: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      for (const itemId of selectedItems) {
        const item = trashItems.find(i => i.id === itemId);
        if (item) {
          // Utilisez trashAPI au lieu de gérer chaque type séparément
          await trashAPI.restore(item.id, item.type);
        }
      }
      await fetchTrashItems();
      setSelectedItems([]);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    if (!window.confirm(`Supprimer définitivement ${selectedItems.length} élément(s) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      setLoading(true);
      for (const itemId of selectedItems) {
        const item = trashItems.find(i => i.id === itemId);
        if (item) {
          // Utilisez trashAPI au lieu de gérer chaque type séparément
          await trashAPI.permanentDelete(item.id, item.type);
        }
      }
      await fetchTrashItems();
      setSelectedItems([]);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === trashItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(trashItems.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText size={16} />;
      case 'card': return <Layout size={16} />;
      case 'slide': return <ImageIcon size={16} />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'article': return 'Article';
      case 'card': return 'Carte';
      case 'slide': return 'Slide';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-2">Chargement de la corbeille...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="h4 fw-semibold mb-0">
          Corbeille ({trashItems.length} élément{trashItems.length > 1 ? 's' : ''})
        </h3>
        
        {selectedItems.length > 0 && (
          <div className="d-flex gap-2">
            <button
              onClick={handleRestoreSelected}
              className="btn btn-success d-flex align-items-center gap-2"
              disabled={loading}
            >
              <RotateCcw size={16} />
              Restaurer ({selectedItems.length})
            </button>
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger d-flex align-items-center gap-2"
              disabled={loading}
            >
              <Trash2 size={16} />
              Supprimer ({selectedItems.length})
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <AlertCircle className="me-2" />
          {error}
        </div>
      )}

      {trashItems.length === 0 ? (
        <div className="text-center py-5">
          <Trash2 className="w-12 h-12 text-secondary mx-auto mb-3" />
          <p className="text-muted mb-2">La corbeille est vide</p>
          <p className="small text-muted">
            Les éléments que vous supprimez apparaîtront ici pendant 30 jours avant d'être supprimés définitivement.
          </p>
        </div>
      ) : (
        <div className="card border shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === trashItems.length && trashItems.length > 0}
                      onChange={handleSelectAll}
                      className="form-check-input"
                    />
                  </th>
                  <th style={{ width: '50px' }}>Type</th>
                  <th>Titre</th>
                  <th style={{ width: '200px' }}>Supprimé le</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="form-check-input"
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="badge bg-light text-dark">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="fw-medium">{item.title}</div>
                      <div className="small text-muted">
                        {item.data.category && `Catégorie: ${item.data.category}`}
                      </div>
                    </td>
                    <td className="text-muted small">
                      {formatDate(item.deletedAt)}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          onClick={() => handleRestore(item.id, item.type)}
                          className="btn btn-sm btn-outline-success"
                          title="Restaurer"
                          disabled={loading}
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id, item.type)}
                          className="btn btn-sm btn-outline-danger"
                          title="Supprimer définitivement"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Les éléments sont automatiquement supprimés après 30 jours
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrashManager;