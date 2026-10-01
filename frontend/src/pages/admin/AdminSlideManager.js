import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Image as ImageIcon, Upload, AlertCircle } from 'lucide-react';
import { slidesAPI } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
// CORRECTION : Gestion sécurisée de l'URL
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
// CORRECTION : Fonction sécurisée pour les URLs d'images
const buildImageUrl = (url) => {
    if (!url)
        return '';
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
const resolvePreviewSrc = (url) => {
    if (!url)
        return '';
    if (url.startsWith('blob:'))
        return url;
    return buildImageUrl(url);
};
const AdminSlideManager = ({ onError }) => {
    const [slides, setSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSlide, setEditingSlide] = useState(null);
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [imageErrors, setImageErrors] = useState(new Set());
    const [actionLoading, setActionLoading] = useState(null);
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
    const handleApiError = (err, context) => {
        console.error(`Erreur ${context}:`, err);
        let errorMessage = `Erreur lors de ${context}`;
        if (err.response?.status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            setError(errorMessage);
            if (onError)
                onError(errorMessage);
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
        }
        catch (err) {
            handleApiError(err, 'le chargement des slides');
        }
        finally {
            setLoading(false);
        }
    };
    const handleImageError = (id) => {
        setImageErrors(prev => new Set(prev).add(id));
    };
    const handleEdit = (slide) => {
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
        }
        catch (error) {
            console.error('Erreur lors de l\'édition:', error);
            setError('Erreur lors de la préparation de l\'édition');
        }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
            try {
                await slidesAPI.delete(id); // Utilise maintenant la suppression douce
                fetchSlides();
                // Optionnel: Afficher un message de confirmation
                alert('Élément déplacé dans la corbeille');
            }
            catch (error) {
                console.error('Erreur:', error);
                if (error.response?.status === 401 && onError) {
                    onError('Session expirée');
                }
            }
        }
    };
    const handleToggleActive = async (slide) => {
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
        }
        catch (err) {
            handleApiError(err, 'le changement de statut');
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleReorder = async (index, direction) => {
        try {
            const newSlides = [...slides];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= newSlides.length)
                return;
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
        }
        catch (err) {
            handleApiError(err, 'le réordonnancement');
        }
        finally {
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
    const handleImageUpload = (e) => {
        try {
            const selectedFile = e.target.files?.[0];
            if (!selectedFile)
                return;
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
        }
        catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            setError('Erreur lors du téléchargement de l\'image');
        }
    };
    const handleSubmit = async (e) => {
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
            }
            else if (formData.imageUrl && formData.imageUrl.startsWith('http')) {
                data.append('imageUrl', formData.imageUrl);
            }
            if (editingSlide) {
                await slidesAPI.update(editingSlide._id, data);
            }
            else {
                await slidesAPI.create(data);
            }
            await fetchSlides();
            resetForm();
        }
        catch (err) {
            handleApiError(err, 'la sauvegarde');
        }
        finally {
            setActionLoading(null);
        }
    };
    if (loading) {
        return (_jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "mt-3 text-muted", children: "Chargement des slides..." })] }));
    }
    return (_jsxs("div", { className: "container-fluid p-0", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h3", { className: "h4 fw-semibold mb-0", children: ["Slides du carousel: ", slides.length] }), _jsxs("button", { onClick: () => setShowForm(!showForm), className: "btn btn-primary d-flex align-items-center gap-2", disabled: actionLoading !== null, children: [_jsx(Plus, { size: 20 }), showForm ? 'Masquer le formulaire' : 'Nouveau Slide'] })] }), error && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center mb-4", children: [_jsx(AlertCircle, { className: "me-2", size: 20 }), _jsx("div", { children: error }), _jsx("button", { type: "button", className: "btn-close ms-auto", onClick: () => setError(null), "aria-label": "Fermer" })] })), showForm && (_jsx("div", { className: "card mb-4 border shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsx("h4", { className: "h5 fw-semibold mb-3", children: editingSlide ? 'Modifier le slide' : 'Créer un nouveau slide' }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Titre *" }), _jsx("input", { type: "text", value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), className: "form-control", required: true, disabled: actionLoading === 'submit', maxLength: 100 }), _jsx("small", { className: "text-muted", children: "Maximum 100 caract\u00E8res" })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label fw-medium", children: ["Sous-titre ", _jsx("span", { className: "text-muted", children: "(facultatif)" })] }), _jsx("input", { type: "text", value: formData.subtitle, onChange: (e) => setFormData({ ...formData, subtitle: e.target.value }), className: "form-control", disabled: actionLoading === 'submit', maxLength: 200 }), _jsx("small", { className: "text-muted", children: "Maximum 200 caract\u00E8res" })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-medium", children: "Image *" }), _jsxs("div", { className: "input-group", children: [_jsxs("label", { className: "input-group-text btn btn-outline-secondary cursor-pointer", children: [_jsx(Upload, { size: 16, className: "me-1" }), "Upload", _jsx("input", { type: "file", accept: "image/*", onChange: handleImageUpload, className: "d-none", disabled: actionLoading === 'submit' })] }), _jsx("input", { type: "text", value: formData.imageUrl, onChange: (e) => setFormData({ ...formData, imageUrl: e.target.value }), placeholder: "URL de l'image", className: "form-control", disabled: actionLoading === 'submit' })] }), _jsx("small", { className: "text-muted", children: "Formats accept\u00E9s: JPEG, PNG, GIF, WebP, SVG. Max: 10MB" }), (imagePreview || formData.imageUrl) && (_jsx("div", { className: "mt-2", children: _jsx("img", { src: resolvePreviewSrc(imagePreview || formData.imageUrl), alt: "Preview", className: "img-fluid rounded border", style: { maxHeight: '150px' }, onError: (e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            setError('Impossible de charger l\'image. Vérifiez l\'URL.');
                                                        } }) }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Lien (optionnel)" }), _jsx("input", { type: "url", value: formData.link, onChange: (e) => setFormData({ ...formData, link: e.target.value }), placeholder: "https://...", className: "form-control", disabled: actionLoading === 'submit' }), _jsx("small", { className: "text-muted", children: "Lien vers lequel rediriger lorsque le slide est cliqu\u00E9" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Texte du bouton" }), _jsx("input", { type: "text", value: formData.buttonText, onChange: (e) => setFormData({ ...formData, buttonText: e.target.value }), className: "form-control", disabled: actionLoading === 'submit', maxLength: 50 }), _jsx("small", { className: "text-muted", children: "Texte affich\u00E9 sur le bouton (optionnel)" })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", checked: formData.isActive, onChange: (e) => setFormData({ ...formData, isActive: e.target.checked }), className: "form-check-input", id: "isActiveCheck", disabled: actionLoading === 'submit' }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "isActiveCheck", children: "Slide actif (visible sur le site)" })] }) })] }), _jsxs("div", { className: "d-flex gap-2 mt-4", children: [_jsx("button", { type: "submit", className: "btn btn-success d-flex align-items-center gap-2", disabled: actionLoading === 'submit', children: actionLoading === 'submit' ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), editingSlide ? 'Mise à jour...' : 'Création...'] })) : (_jsx(_Fragment, { children: editingSlide ? 'Mettre à jour' : 'Créer' })) }), _jsx("button", { type: "button", onClick: resetForm, className: "btn btn-secondary", disabled: actionLoading === 'submit', children: "Annuler" })] })] })] }) })), slides.filter(s => s.isActive).length > 0 && (_jsx("div", { className: "card mb-4 border shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsx("h4", { className: "h5 fw-semibold mb-3", children: "Aper\u00E7u du carousel" }), _jsx("div", { className: "position-relative rounded overflow-hidden border", style: { height: '250px' }, children: _jsx("div", { className: "d-flex h-100", children: slides
                                    .filter(s => s.isActive)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .slice(0, 3)
                                    .map((slide, index) => (_jsxs("div", { className: "min-vw-100 position-relative", children: [_jsx("img", { src: buildImageUrl(slide.imageUrl), alt: slide.title, className: "w-100 h-100 object-fit-cover", onError: (e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement.innerHTML = `
                            <div class="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                              <span class="text-muted">Image non disponible</span>
                            </div>
                          `;
                                            } }), _jsx("div", { className: "position-absolute top-0 start-0 w-100 h-100", style: { background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)' } }), _jsxs("div", { className: "position-absolute bottom-0 p-4 text-white", children: [_jsx("h5", { className: "fw-bold mb-1", children: slide.title || 'Sans titre' }), _jsx("p", { className: "small mb-0 opacity-90", children: slide.subtitle || 'Sans sous-titre' }), slide.buttonText && (_jsx("span", { className: "badge bg-light text-dark mt-2", children: slide.buttonText }))] }), index === 0 && (_jsx("div", { className: "position-absolute top-2 start-2 badge bg-success", children: "Actif" }))] }, slide._id || index))) }) }), _jsxs("p", { className: "small text-muted mt-2", children: [slides.filter(s => s.isActive).length, " slides actifs sur ", slides.length, " au total"] })] }) })), _jsxs("div", { className: "card border shadow-sm", children: [_jsx("div", { className: "card-header bg-light", children: _jsx("h5", { className: "mb-0 fw-semibold", children: "Liste des slides" }) }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { className: "text-nowrap", style: { width: '100px' }, children: "Image" }), _jsx("th", { className: "text-nowrap", children: "Titre" }), _jsx("th", { className: "text-nowrap", children: "Sous-titre" }), _jsx("th", { className: "text-nowrap", style: { width: '120px' }, children: "Ordre" }), _jsx("th", { className: "text-nowrap", style: { width: '100px' }, children: "Statut" }), _jsx("th", { className: "text-nowrap", style: { width: '150px' }, children: "Actions" })] }) }), _jsx("tbody", { children: slides.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: 6, className: "text-center py-5", children: [_jsx(ImageIcon, { size: 48, className: "text-secondary mx-auto mb-3 opacity-50" }), _jsx("p", { className: "text-muted mb-2", children: "Aucun slide cr\u00E9\u00E9" }), _jsx("button", { onClick: () => setShowForm(true), className: "btn btn-link text-decoration-none", children: "Cr\u00E9er votre premier slide" })] }) })) : (slides
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((slide, index) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("div", { className: "overflow-hidden rounded border", style: { width: '80px', height: '48px' }, children: [_jsx("img", { src: buildImageUrl(slide.imageUrl), alt: slide.title, className: "w-100 h-100 object-fit-cover", onError: () => handleImageError(slide._id || ''), style: { display: imageErrors.has(slide._id || '') ? 'none' : 'block' } }), imageErrors.has(slide._id || '') && (_jsx("div", { className: "w-100 h-100 d-flex align-items-center justify-content-center bg-light", children: _jsx("span", { className: "text-muted small", children: "No image" }) }))] }) }), _jsxs("td", { children: [_jsx("div", { className: "fw-medium", children: slide.title || 'Sans titre' }), slide.link && (_jsx("small", { className: "text-muted d-block", children: _jsxs("a", { href: slide.link, target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none", children: ["Lien: ", slide.link.length > 30 ? `${slide.link.substring(0, 30)}...` : slide.link] }) }))] }), _jsx("td", { className: "text-muted small", children: slide.subtitle || 'Sans sous-titre' }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center gap-2", children: [index > 0 && (_jsx("button", { onClick: () => handleReorder(index, 'up'), className: "btn btn-sm btn-outline-secondary p-1", title: "Monter", disabled: actionLoading?.startsWith('reorder'), children: _jsx(ArrowUp, { size: 16 }) })), _jsx("span", { className: "badge bg-secondary", children: (slide.order || 0) + 1 }), index < slides.length - 1 && (_jsx("button", { onClick: () => handleReorder(index, 'down'), className: "btn btn-sm btn-outline-secondary p-1", title: "Descendre", disabled: actionLoading?.startsWith('reorder'), children: _jsx(ArrowDown, { size: 16 }) }))] }) }), _jsx("td", { children: _jsx("span", { className: `badge ${slide.isActive ? 'bg-success' : 'bg-danger'}`, children: slide.isActive ? 'Actif' : 'Inactif' }) }), _jsx("td", { children: _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(slide), className: "btn btn-sm btn-outline-primary", title: "Modifier", disabled: actionLoading !== null, children: _jsx(Edit, { size: 16 }) }), _jsx("button", { onClick: () => handleToggleActive(slide), className: "btn btn-sm btn-outline-warning", title: slide.isActive ? 'Désactiver' : 'Activer', disabled: actionLoading === `toggle-${slide._id}`, children: actionLoading === `toggle-${slide._id}` ? (_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" })) : slide.isActive ? (_jsx(EyeOff, { size: 16 })) : (_jsx(Eye, { size: 16 })) }), _jsx("button", { onClick: () => slide._id && handleDelete(slide._id), className: "btn btn-sm btn-outline-danger", title: "Supprimer", disabled: !slide._id || actionLoading === `delete-${slide._id}`, children: actionLoading === `delete-${slide._id}` ? (_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" })) : (_jsx(Trash2, { size: 16 })) })] }) })] }, slide._id || index)))) })] }) })] })] }));
};
export default AdminSlideManager;
