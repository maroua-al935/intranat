import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, Search, X } from 'lucide-react';
import { cardsAPI, ldapAPI } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
const AdminCardManager = ({ onError }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [error, setError] = useState(null);
    const [showLdapPicker, setShowLdapPicker] = useState(false);
    const [ldapQuery, setLdapQuery] = useState('');
    const [ldapResults, setLdapResults] = useState([]);
    const [ldapLoading, setLdapLoading] = useState(false);
    const [ldapError, setLdapError] = useState('');
    const [ldapSelected, setLdapSelected] = useState({});
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
    let storedUser = null;
    try {
        storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    }
    catch {
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
        }
        catch (error) {
            // AJOUTEZ CETTE GESTION D'ERREUR
            let errorMessage = 'Erreur lors du chargement des cartes';
            if (error.response?.status === 401) {
                errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                setError(errorMessage);
                if (onError)
                    onError(errorMessage);
            }
            else if (error.message?.includes('Network Error')) {
                errorMessage = 'Impossible de se connecter au serveur';
                setError(errorMessage);
            }
            else {
                setError(errorMessage);
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
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
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let imageUrl = formData.imageUrl;
            if (selectedFile) {
                const formDataFile = new FormData();
                formDataFile.append("image", selectedFile);
                const uploadRes = await axios.post(`${BACKEND_URL}/api/cards/upload`, formDataFile, { headers: { "Content-Type": "multipart/form-data" } });
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
            }
            else {
                await cardsAPI.create(dataToSend);
            }
            fetchCards();
            resetForm();
        }
        catch (error) {
            alert(`Erreur ${error.response?.status}: ${error.response?.data?.message || error.message}`);
        }
    };
    const handleEdit = (card) => {
        setEditingCard(card);
        setFormData({
            title: card.title,
            description: card.description || '',
            category: card.category,
            imageUrl: card.imageUrl || '',
            redirectUrl: card.redirectUrl || '',
            isActive: card.isActive,
            requiresLdapLogin: !!card.requiresLdapLogin,
            accessUsernamesText: Array.isArray(card.accessUsernames) ? card.accessUsernames.join('\n') : '',
            disableNotifications: !!card.disableNotifications
        });
        setImagePreview(card.imageUrl || '');
        setSelectedFile(null);
        setShowForm(true);
    };
    const parseUsernames = (raw) => String(raw || '')
        .split(/[\n,;]+/g)
        .map(v => v.trim())
        .filter(Boolean);
    const mergeUsernames = (currentRaw, toAdd) => {
        const current = parseUsernames(currentRaw);
        const seen = new Set(current.map(v => v.toLowerCase()));
        const next = [...current];
        for (const u of toAdd) {
            const key = String(u).trim().toLowerCase();
            if (!key || seen.has(key))
                continue;
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
        }
        catch (err) {
            setLdapError(err?.response?.data?.error || err?.message || 'Erreur LDAP');
            setLdapResults([]);
            setLdapSelected({});
        }
        finally {
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
    const handleDelete = async (id) => {
        if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
            try {
                await cardsAPI.delete(id); // Utilise maintenant la suppression douce
                fetchCards();
                // Optionnel: Afficher un message de confirmation
                alert('Élément déplacé dans la corbeille');
            }
            catch (error) {
                if (error.response?.status === 401 && onError) {
                    onError('Session expirée');
                }
            }
        }
    };
    const prepareCardData = (card, updatedFields) => {
        return {
            title: card.title,
            description: card.description || '',
            category: card.category,
            imageUrl: card.imageUrl || '',
            isActive: card.isActive,
            ...updatedFields // Surcharger avec les champs mis à jour
        };
    };
    const handleToggleActive = async (card) => {
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
            setCards(prevCards => prevCards.map(c => c._id === card._id ? { ...c, isActive: !c.isActive } : c));
            // Envoyez la requête
            const response = await cardsAPI.update(card._id, testData);
            // Rechargez pour être sûr
            fetchCards();
        }
        catch (error) {
            // Annulez la mise à jour optimiste
            setCards(prevCards => prevCards.map(c => c._id === card._id ? { ...c, isActive: card.isActive } : c));
            // Essayez avec PATCH directement
            try {
                const patchResponse = await axios.patch(`${BACKEND_URL}/api/cards/${card._id}`, { isActive: !card.isActive }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                fetchCards();
            }
            catch (patchError) {
                alert(`Erreur: ${patchError.response?.data?.message || patchError.message}`);
            }
        }
    };
    const handleReorder = async (index, direction) => {
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
        }
        catch (error) {
            let errorMessage = 'Erreur lors du réordonnancement';
            if (error.response?.status === 401) {
                errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                if (onError)
                    onError(errorMessage);
            }
            else if (error.response?.status === 404) {
                errorMessage = 'Route API non trouvée. Vérifiez la configuration backend.';
            }
            else if (error.response?.data?.error) {
                errorMessage = `Erreur serveur: ${error.response.data.error}`;
            }
            else if (error.message?.includes('Network Error')) {
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
        return (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "mt-2", children: "Chargement..." })] }));
    }
    return (_jsxs("div", { className: "container-fluid p-0", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h3", { className: "h4 fw-semibold mb-0", children: ["Cartes disponibles: ", cards.length] }), _jsxs("button", { onClick: () => setShowForm(!showForm), className: "btn btn-primary d-flex align-items-center gap-2", children: [_jsx(Plus, { className: "w-5 h-5" }), " Nouvelle Carte"] })] }), error && (_jsx("div", { className: "alert alert-danger mb-4", children: error })), showForm && (_jsx("div", { className: "card mb-4 border shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsx("h4", { className: "h5 fw-semibold mb-3", children: editingCard ? 'Modifier la carte' : 'Créer une nouvelle carte' }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Titre *" }), _jsx("input", { type: "text", value: formData.title, onChange: e => setFormData({ ...formData, title: e.target.value }), className: "form-control", required: true })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Cat\u00E9gorie" }), _jsx("input", { type: "text", value: formData.category, onChange: e => setFormData({ ...formData, category: e.target.value }), className: "form-control" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Lien de redirection" }), _jsx("input", { type: "url", value: formData.redirectUrl, onChange: e => setFormData({ ...formData, redirectUrl: e.target.value }), className: "form-control", placeholder: "http://10.16.220.140:5009/" }), _jsx("div", { className: "form-text text-muted", children: "Si renseign\u00E9, la carte redirige vers ce lien apr\u00E8s l'authentification LDAP." })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Image" }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "btn btn-outline-secondary d-inline-flex align-items-center gap-2", children: [_jsx(Upload, { className: "w-4 h-4" }), " S\u00E9lectionner une image", _jsx("input", { type: "file", accept: "image/*", onChange: handleFileSelect, className: "d-none" })] }), selectedFile && (_jsxs("div", { className: "mt-2 small text-muted", children: ["Fichier s\u00E9lectionn\u00E9: ", selectedFile.name, " (", (selectedFile.size / 1024).toFixed(1), " KB)"] }))] }), (imagePreview || formData.imageUrl) && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "small text-muted mb-2", children: "Aper\u00E7u:" }), _jsx("img", { src: imagePreview ||
                                                                (formData.imageUrl.startsWith('http') ? formData.imageUrl : `${BACKEND_URL}${formData.imageUrl}`), alt: "Preview", className: "img-fluid rounded border", style: { maxHeight: '150px' } })] }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("div", { className: "form-check mt-4 pt-3", children: [_jsx("input", { type: "checkbox", checked: formData.isActive, onChange: e => setFormData({ ...formData, isActive: e.target.checked }), className: "form-check-input", id: "isActiveCheck" }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "isActiveCheck", children: "Activ\u00E9e" })] }), _jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: "requiresLdapLoginCheck", checked: formData.requiresLdapLogin, disabled: !isSuperadmin, onChange: e => setFormData({ ...formData, requiresLdapLogin: e.target.checked }) }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "requiresLdapLoginCheck", children: "Acces LDAP requis (lecture)" }), !isSuperadmin && (_jsx("div", { className: "form-text text-muted", children: "Reserve au superadmin" }))] }), isSuperadmin && formData.requiresLdapLogin && (_jsxs("div", { className: "mt-3", children: [_jsx("label", { className: "form-label fw-medium", children: "Utilisateurs autoris\u00E9s (liste)" }), _jsx("textarea", { value: formData.accessUsernamesText, onChange: e => setFormData({ ...formData, accessUsernamesText: e.target.value }), className: "form-control", rows: 4, placeholder: "Un identifiant par ligne (ou séparé par virgules)\nEx: prenom.nom" }), _jsxs("div", { className: "mt-2 d-flex flex-wrap gap-2", children: [_jsxs("button", { type: "button", className: "btn btn-sm btn-outline-primary d-flex align-items-center gap-2", onClick: () => {
                                                                                setLdapQuery('');
                                                                                setLdapResults([]);
                                                                                setLdapError('');
                                                                                setLdapSelected({});
                                                                                setShowLdapPicker(true);
                                                                            }, children: [_jsx(Search, { size: 16 }), " Choisir depuis LDAP"] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => setFormData({ ...formData, accessUsernamesText: '' }), children: "Vider la liste" })] }), _jsx("div", { className: "form-text text-muted", children: "Vide = tous les utilisateurs connect\u00E9s (LDAP/local) peuvent acc\u00E9der." })] })), _jsxs("div", { className: "form-check mt-2", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: "disableNotificationsCheck", checked: formData.disableNotifications, disabled: !isSuperadmin, onChange: e => setFormData({ ...formData, disableNotifications: e.target.checked }) }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "disableNotificationsCheck", children: "Desactiver les notifications" })] })] })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-medium", children: "Description" }), _jsx("textarea", { value: formData.description, onChange: e => setFormData({ ...formData, description: e.target.value }), className: "form-control", rows: 3 })] })] }), _jsxs("div", { className: "d-flex gap-2 mt-4", children: [_jsx("button", { type: "submit", className: "btn btn-success", disabled: !formData.title, children: editingCard ? 'Mettre à jour' : 'Créer' }), _jsx("button", { type: "button", onClick: resetForm, className: "btn btn-secondary", children: "Annuler" })] })] })] }) })), _jsx("div", { className: "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4", children: cards.map((card, index) => (_jsx("div", { className: "col", children: _jsx("div", { className: "card h-100 border shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-3", children: [_jsxs("div", { children: [_jsx("h5", { className: "card-title fw-semibold mb-1", children: card.title }), _jsx("p", { className: "text-muted small mb-0", children: card.category })] }), card.isActive ? _jsx(Eye, { className: "w-4 h-4 text-success" }) : _jsx(EyeOff, { className: "w-4 h-4 text-secondary" })] }), card.imageUrl && (_jsx("div", { className: "mb-3", children: _jsx("img", { src: card.imageUrl ? `${BACKEND_URL}${card.imageUrl}` : undefined, alt: card.title, className: "img-fluid rounded border", style: { maxHeight: '100px', width: '100%', objectFit: 'cover' } }) })), _jsx("p", { className: "card-text text-secondary small mb-4", children: card.description || "Pas de description" }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-auto", children: [_jsx("span", { className: "text-muted small", children: new Date(card.createdAt).toLocaleDateString() }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [index > 0 && (_jsx("button", { onClick: () => handleReorder(index, 'up'), className: "btn btn-sm btn-outline-secondary p-1", children: _jsx(ArrowUp, { className: "w-4 h-4" }) })), index < cards.length - 1 && (_jsx("button", { onClick: () => handleReorder(index, 'down'), className: "btn btn-sm btn-outline-secondary p-1", children: _jsx(ArrowDown, { className: "w-4 h-4" }) })), _jsx("button", { onClick: () => handleEdit(card), className: "btn btn-sm btn-outline-primary", children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleToggleActive(card), className: "btn btn-sm btn-outline-warning", children: card.isActive ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDelete(card._id), className: "btn btn-sm btn-outline-danger", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] })] }) }) }, card._id))) }), showLdapPicker && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(12, 12, 12, 0.55)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 4000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }, children: _jsxs("div", { className: "bg-white rounded-4 shadow-lg p-4", style: { width: 'min(720px, 96vw)' }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("div", { className: "fw-bold", children: "Recherche LDAP" }), _jsx("div", { className: "text-muted small", children: "Recherchez puis cochez les personnes \u00E0 ajouter." })] }), _jsxs("button", { type: "button", className: "btn btn-sm btn-outline-secondary d-flex align-items-center gap-2", onClick: () => setShowLdapPicker(false), children: [_jsx(X, { size: 16 }), " Fermer"] })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("input", { type: "text", className: "form-control", placeholder: "Nom, pr\u00E9nom, username, email... (min 2 caract\u00E8res)", value: ldapQuery, onChange: (e) => setLdapQuery(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLdapSearch();
                                        }
                                    }, disabled: ldapLoading }), _jsxs("button", { type: "button", className: "btn btn-primary d-flex align-items-center gap-2", onClick: handleLdapSearch, disabled: ldapLoading, children: [_jsx(Search, { size: 16 }), " ", ldapLoading ? 'Recherche...' : 'Rechercher'] })] }), ldapError && (_jsx("div", { className: "alert alert-danger py-2 mt-3 mb-0", role: "alert", children: _jsx("small", { children: ldapError }) })), _jsx("div", { className: "mt-3", style: { maxHeight: '46vh', overflow: 'auto' }, children: ldapResults.length === 0 ? (_jsx("div", { className: "text-muted small py-3", children: "Aucun r\u00E9sultat." })) : (_jsx("div", { className: "list-group", children: ldapResults.map((u) => {
                                    const key = String(u.username).toLowerCase();
                                    const checked = !!ldapSelected[key];
                                    return (_jsxs("label", { className: "list-group-item d-flex gap-3 align-items-start", children: [_jsx("input", { type: "checkbox", className: "form-check-input mt-1", checked: checked, onChange: (e) => setLdapSelected((prev) => ({ ...prev, [key]: e.target.checked })) }), _jsxs("div", { className: "flex-grow-1", children: [_jsx("div", { className: "fw-semibold", children: u.displayName || u.username }), _jsxs("div", { className: "text-muted small", children: [u.username, u.email ? ` • ${u.email}` : ''] })] })] }, u.dn || u.username));
                                }) })) }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-3", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowLdapPicker(false), children: "Annuler" }), _jsx("button", { type: "button", className: "btn btn-success", onClick: handleAddSelectedFromLdap, disabled: ldapResults.length === 0, children: "Ajouter la s\u00E9lection" })] })] }) }))] }));
};
export default AdminCardManager;
