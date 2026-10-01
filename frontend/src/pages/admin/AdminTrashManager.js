import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertCircle, FileText, Image as ImageIcon, Layout } from 'lucide-react';
import { trashAPI } from '../../services/api'; // IMPORT SIMPLIFIÉ
import 'bootstrap/dist/css/bootstrap.min.css';
const AdminTrashManager = ({ onError }) => {
    const [trashItems, setTrashItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [error, setError] = useState(null);
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
            const items = response.data.map((item) => ({
                id: item._id,
                type: item.type,
                title: item.title,
                deletedAt: item.deletedAt || new Date().toISOString(),
                data: item
            }));
            // Trier par date de suppression
            items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
            setTrashItems(items);
        }
        catch (error) {
            console.error('Erreur:', error);
            setError('Erreur lors du chargement de la corbeille');
            if (error.response?.status === 401 && onError) {
                onError('Session expirée');
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleRestore = async (id, type) => {
        try {
            setLoading(true);
            // UTILISEZ trashAPI.restore QUI GÈRE TOUS LES TYPES
            await trashAPI.restore(id, type);
            await fetchTrashItems();
            setSelectedItems(selectedItems.filter(itemId => itemId !== id));
        }
        catch (error) {
            console.error('Erreur:', error);
            alert(`Erreur lors de la restauration: ${error.response?.data?.message || error.message}`);
        }
    };
    const handlePermanentDelete = async (id, type) => {
        if (!window.confirm('Supprimer définitivement cet élément ? Cette action est irréversible.')) {
            return;
        }
        try {
            setLoading(true);
            // UTILISEZ trashAPI.permanentDelete QUI GÈRE TOUS LES TYPES
            await trashAPI.permanentDelete(id, type);
            await fetchTrashItems();
            setSelectedItems(selectedItems.filter(itemId => itemId !== id));
        }
        catch (error) {
            console.error('Erreur:', error);
            alert(`Erreur lors de la suppression: ${error.response?.data?.message || error.message}`);
        }
    };
    const handleRestoreSelected = async () => {
        if (selectedItems.length === 0)
            return;
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
        }
        catch (error) {
            console.error('Erreur:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDeleteSelected = async () => {
        if (selectedItems.length === 0)
            return;
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
        }
        catch (error) {
            console.error('Erreur:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectAll = () => {
        if (selectedItems.length === trashItems.length) {
            setSelectedItems([]);
        }
        else {
            setSelectedItems(trashItems.map(item => item.id));
        }
    };
    const toggleSelectItem = (id) => {
        setSelectedItems(prev => prev.includes(id)
            ? prev.filter(itemId => itemId !== id)
            : [...prev, id]);
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'article': return _jsx(FileText, { size: 16 });
            case 'card': return _jsx(Layout, { size: 16 });
            case 'slide': return _jsx(ImageIcon, { size: 16 });
            default: return null;
        }
    };
    const getTypeLabel = (type) => {
        switch (type) {
            case 'article': return 'Article';
            case 'card': return 'Carte';
            case 'slide': return 'Slide';
            default: return type;
        }
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    if (loading) {
        return (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "mt-2", children: "Chargement de la corbeille..." })] }));
    }
    return (_jsxs("div", { className: "container-fluid p-0", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h3", { className: "h4 fw-semibold mb-0", children: ["Corbeille (", trashItems.length, " \u00E9l\u00E9ment", trashItems.length > 1 ? 's' : '', ")"] }), selectedItems.length > 0 && (_jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { onClick: handleRestoreSelected, className: "btn btn-success d-flex align-items-center gap-2", disabled: loading, children: [_jsx(RotateCcw, { size: 16 }), "Restaurer (", selectedItems.length, ")"] }), _jsxs("button", { onClick: handleDeleteSelected, className: "btn btn-danger d-flex align-items-center gap-2", disabled: loading, children: [_jsx(Trash2, { size: 16 }), "Supprimer (", selectedItems.length, ")"] })] }))] }), error && (_jsxs("div", { className: "alert alert-danger mb-4", children: [_jsx(AlertCircle, { className: "me-2" }), error] })), trashItems.length === 0 ? (_jsxs("div", { className: "text-center py-5", children: [_jsx(Trash2, { className: "w-12 h-12 text-secondary mx-auto mb-3" }), _jsx("p", { className: "text-muted mb-2", children: "La corbeille est vide" }), _jsx("p", { className: "small text-muted", children: "Les \u00E9l\u00E9ments que vous supprimez appara\u00EEtront ici pendant 30 jours avant d'\u00EAtre supprim\u00E9s d\u00E9finitivement." })] })) : (_jsxs("div", { className: "card border shadow-sm", children: [_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { style: { width: '50px' }, children: _jsx("input", { type: "checkbox", checked: selectedItems.length === trashItems.length && trashItems.length > 0, onChange: handleSelectAll, className: "form-check-input" }) }), _jsx("th", { style: { width: '50px' }, children: "Type" }), _jsx("th", { children: "Titre" }), _jsx("th", { style: { width: '200px' }, children: "Supprim\u00E9 le" }), _jsx("th", { style: { width: '150px' }, children: "Actions" })] }) }), _jsx("tbody", { children: trashItems.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selectedItems.includes(item.id), onChange: () => toggleSelectItem(item.id), className: "form-check-input" }) }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center gap-2", children: [getTypeIcon(item.type), _jsx("span", { className: "badge bg-light text-dark", children: getTypeLabel(item.type) })] }) }), _jsxs("td", { children: [_jsx("div", { className: "fw-medium", children: item.title }), _jsx("div", { className: "small text-muted", children: item.data.category && `Catégorie: ${item.data.category}` })] }), _jsx("td", { className: "text-muted small", children: formatDate(item.deletedAt) }), _jsx("td", { children: _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { onClick: () => handleRestore(item.id, item.type), className: "btn btn-sm btn-outline-success", title: "Restaurer", disabled: loading, children: _jsx(RotateCcw, { size: 16 }) }), _jsx("button", { onClick: () => handlePermanentDelete(item.id, item.type), className: "btn btn-sm btn-outline-danger", title: "Supprimer d\u00E9finitivement", disabled: loading, children: _jsx(Trash2, { size: 16 }) })] }) })] }, `${item.type}-${item.id}`))) })] }) }), _jsx("div", { className: "card-footer bg-light", children: _jsx("div", { className: "d-flex justify-content-between align-items-center", children: _jsx("small", { className: "text-muted", children: "Les \u00E9l\u00E9ments sont automatiquement supprim\u00E9s apr\u00E8s 30 jours" }) }) })] }))] }));
};
export default AdminTrashManager;
