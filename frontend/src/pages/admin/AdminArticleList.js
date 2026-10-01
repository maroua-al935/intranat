import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Upload, X } from 'lucide-react';
import { api, articlesAPI, cardsAPI } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
const AdminArticleList = ({ onError }) => {
    const [articles, setArticles] = useState([]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [error, setError] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfPreview, setPdfPreview] = useState(null);
    const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
    const storedUserRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
    let storedUser = null;
    try {
        storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    }
    catch {
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
        status: 'draft',
        cardId: ''
    });
    const [formErrors, setFormErrors] = useState({});
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
            setCards(cardsResponse.data.filter((card) => card.isActive));
        }
        catch (error) {
            console.error('Erreur:', error);
            let errorMessage = 'Erreur lors du chargement des données';
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
    const uploadPdfFile = async (file) => {
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            const response = await fetch('/api/upload/pdf', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok)
                throw new Error('Échec de l\'upload');
            const data = await response.json();
            return data.url; // URL du fichier uploadé
        }
        catch (error) {
            console.error('Erreur upload fichier:', error);
            throw new Error('Échec de l\'upload du fichier');
        }
    };
    const uploadImageFile = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await api.post('/articles/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            return response.data.url || response.data.imageUrl || '';
        }
        catch (error) {
            console.error('Erreur upload image:', error);
            throw new Error('Échec de l\'upload de l\'image');
        }
    };
    const getFileTypeLabel = (url) => {
        if (!url)
            return '';
        const clean = url.split('?')[0].split('#')[0];
        const ext = clean.split('.').pop()?.toLowerCase();
        if (!ext || ext === clean)
            return '';
        if (['pdf'].includes(ext))
            return 'PDF';
        if (['doc', 'docx', 'odt', 'rtf'].includes(ext))
            return 'Word';
        if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
            return 'Excel';
        if (['ppt', 'pptx', 'odp'].includes(ext))
            return 'PowerPoint';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic'].includes(ext))
            return 'Image';
        if (['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'wmv', 'flv', '3gp', 'mpeg', 'mpg', 'ogv'].includes(ext))
            return 'Vidéo';
        return ext.toUpperCase();
    };
    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim())
            errors.title = 'Le titre est requis';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const createNotificationForArticle = async (articleId, articleTitle) => {
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
        }
        catch (error) {
            console.error('❌ Erreur création notification:', error);
            throw error;
        }
    };
    const handleSubmit = async (e) => {
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
            }
            else {
                // Pour la création
                const response = await articlesAPI.create(articleData);
                const newArticle = response.data;
                // Créer une notification pour le nouvel article
                try {
                    await createNotificationForArticle(newArticle._id, newArticle.title);
                    console.log('✅ Article créé avec notification');
                }
                catch (notifError) {
                    console.warn('Notification non créée, mais article sauvegardé:', notifError);
                    // Ne pas bloquer si la notification échoue
                }
                alert(`Article "${articleData.title}" créé avec succès !`);
            }
            fetchData();
            resetForm();
        }
        catch (error) {
            console.error('❌ Erreur:', error);
            let errorMsg = 'Erreur lors de la sauvegarde';
            if (error.message.includes('upload')) {
                errorMsg = 'Erreur lors de l\'upload du fichier';
            }
            else if (error.response?.status === 401) {
                errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                if (onError)
                    onError(errorMsg);
            }
            else if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            }
            else if (error.message) {
                errorMsg = error.message;
            }
            alert(errorMsg);
        }
        finally {
            setUploadingPdf(false);
            setUploadingImage(false);
        }
    };
    const handleEdit = (article) => {
        setEditingArticle(article);
        setFormData({
            title: article.title,
            category: article.category,
            description: article.description || '',
            imageUrl: article.imageUrl || '',
            pdfUrl: article.pdfUrl || '',
            pdfProtected: !!article.pdfProtected,
            status: article.status,
            cardId: typeof article.cardId === 'string' ? article.cardId : article.cardId?._id || ''
        });
        setImagePreview(article.imageUrl || null);
        setImageFile(null);
        setPdfFile(null);
        setPdfPreview(null);
        setShowForm(true);
    };
    const handleDelete = async (id) => {
        if (window.confirm('Mettre cet élément dans la corbeille ? Vous pourrez le restaurer ultérieurement.')) {
            try {
                await articlesAPI.delete(id);
                fetchData();
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
    const handleToggleStatus = async (article) => {
        try {
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            await articlesAPI.update(article._id, { ...article, status: newStatus });
            fetchData();
        }
        catch (error) {
            console.error('Erreur:', error);
            if (error.response?.status === 401 && onError) {
                onError('Session expirée. Veuillez vous reconnecter.');
            }
        }
    };
    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
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
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };
    const removeImageFile = () => {
        setImageFile(null);
        setImagePreview(null);
    };
    const handlePdfFileChange = (e) => {
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
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };
    if (loading) {
        return (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "mt-2", children: "Chargement..." })] }));
    }
    return (_jsxs("div", { className: "container-fluid p-0", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h3", { className: "h4 fw-semibold mb-0", children: ["Articles: ", articles.length] }), _jsxs("button", { onClick: () => setShowForm(!showForm), className: "btn btn-success d-flex align-items-center gap-2", children: [_jsx(Plus, { className: "w-5 h-5" }), "Nouvel Article"] })] }), error && (_jsx("div", { className: "alert alert-danger mb-4", children: error })), showForm && (_jsx("div", { className: "card mb-4 border shadow-sm", children: _jsxs("div", { className: "card-body", children: [_jsx("h4", { className: "h5 fw-semibold mb-3", children: editingArticle ? 'Modifier l\'article' : 'Créer un nouvel article' }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-medium", children: "Titre *" }), _jsx("input", { type: "text", value: formData.title, onChange: (e) => {
                                                        setFormData({ ...formData, title: e.target.value });
                                                        setFormErrors({ ...formErrors, title: '' });
                                                    }, className: `form-control ${formErrors.title ? 'is-invalid' : ''}`, required: true }), formErrors.title && (_jsx("div", { className: "invalid-feedback", children: formErrors.title }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Cat\u00E9gorie" }), _jsx("input", { type: "text", value: formData.category, onChange: (e) => setFormData({ ...formData, category: e.target.value }), className: "form-control" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Carte" }), _jsxs("select", { value: formData.cardId, onChange: (e) => setFormData({ ...formData, cardId: e.target.value }), className: "form-select", children: [_jsx("option", { value: "", children: "S\u00E9lectionner une carte" }), cards.map(card => (_jsx("option", { value: card._id, children: card.title }, card._id)))] })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Image" }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "btn btn-outline-secondary d-inline-flex align-items-center gap-2", children: [_jsx(Upload, { className: "w-4 h-4" }), "S\u00E9lectionner une image", _jsx("input", { type: "file", accept: "image/*", onChange: handleImageFileChange, className: "d-none", disabled: uploadingImage })] }), imageFile && (_jsxs("div", { className: "mt-2 small text-muted d-flex align-items-center gap-2", children: [_jsxs("span", { children: ["Fichier s\u00E9lectionn\u00E9: ", imageFile.name, " (", (imageFile.size / 1024).toFixed(1), " KB)"] }), _jsx("button", { type: "button", onClick: removeImageFile, className: "btn btn-sm btn-outline-danger", children: _jsx(X, { className: "w-3 h-3" }) })] }))] }), (imagePreview || formData.imageUrl) && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "small text-muted mb-2", children: "Aper\u00E7u:" }), _jsx("img", { src: imagePreview || (formData.imageUrl.startsWith('http') ? formData.imageUrl : `${BACKEND_URL}${formData.imageUrl}`), alt: "Preview", className: "img-fluid rounded border", style: { maxHeight: '150px' } })] })), uploadingImage && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-secondary me-2", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Upload..." }) }), _jsx("span", { className: "small text-muted", children: "Upload de l'image en cours..." })] }))] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-medium", children: "Statut" }), _jsxs("select", { value: formData.status, onChange: (e) => setFormData({ ...formData, status: e.target.value }), className: "form-select", children: [_jsx("option", { value: "draft", children: "Brouillon" }), _jsx("option", { value: "published", children: "Publi\u00E9" })] })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label fw-medium d-flex align-items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4" }), "Fichier (facultatif)"] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "btn btn-outline-primary btn-sm mb-2", children: [_jsx(Upload, { className: "w-4 h-4 me-2" }), "Uploader un fichier", _jsx("input", { type: "file", accept: "*/*", onChange: handlePdfFileChange, className: "d-none", disabled: uploadingPdf })] }), pdfPreview && (_jsxs("div", { className: "d-flex align-items-center gap-2 mt-2", children: [_jsx(FileText, { className: "w-4 h-4 text-primary" }), _jsx("span", { className: "small", children: pdfPreview }), _jsx("button", { type: "button", onClick: removePdfFile, className: "btn btn-sm btn-outline-danger", children: _jsx(X, { className: "w-3 h-3" }) })] })), uploadingPdf && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-primary me-2", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Upload..." }) }), _jsx("span", { className: "small text-muted", children: "Upload du fichier en cours..." })] }))] }), _jsx("div", { className: "text-center text-muted small mb-2", children: "OU" }), _jsxs("div", { children: [_jsx("input", { type: "text", value: formData.pdfUrl, onChange: (e) => {
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
                                                            }, className: "form-control", placeholder: "Collez l'URL du fichier (facultatif)", disabled: !!pdfFile }), _jsx("div", { className: "form-text", children: pdfFile
                                                                ? 'Un fichier est sélectionné pour upload'
                                                                : 'Entrez une URL valide vers un fichier ou laissez vide' })] })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { id: "pdfProtected", className: "form-check-input", type: "checkbox", checked: !!formData.pdfProtected, onChange: (e) => setFormData({ ...formData, pdfProtected: e.target.checked }), disabled: !isSuperadmin ||
                                                            (!pdfFile && !formData.pdfUrl) ||
                                                            (!!formData.pdfUrl && !formData.pdfUrl.startsWith('/uploads/') && !pdfFile) }), _jsx("label", { className: "form-check-label fw-medium", htmlFor: "pdfProtected", children: "PDF prot\u00E9g\u00E9 (lecture seule)" }), _jsx("div", { className: "form-text", children: "R\u00E9serv\u00E9 au superadmin. Fonctionne uniquement pour les fichiers upload\u00E9s (URL `/uploads/...`)." })] }) }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-medium", children: "Description" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), className: "form-control", rows: 2 })] })] }), _jsxs("div", { className: "d-flex gap-2 mt-4", children: [_jsx("button", { type: "submit", className: "btn btn-success", disabled: uploadingPdf || uploadingImage, children: uploadingPdf || uploadingImage ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "spinner-border spinner-border-sm me-2", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), "Enregistrement..."] })) : (editingArticle ? 'Mettre à jour' : 'Créer') }), _jsx("button", { type: "button", onClick: resetForm, className: "btn btn-secondary", disabled: uploadingPdf || uploadingImage, children: "Annuler" })] })] })] }) })), _jsx("div", { className: "card border shadow-sm", children: _jsxs("div", { className: "table-responsive", children: [_jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { className: "text-nowrap", children: "Titre" }), _jsx("th", { className: "text-nowrap", children: "Carte" }), _jsx("th", { className: "text-nowrap", children: "Date" }), _jsx("th", { className: "text-nowrap", children: "Statut" }), _jsx("th", { className: "text-nowrap", children: "Fichier" }), _jsx("th", { className: "text-nowrap", children: "Actions" })] }) }), _jsx("tbody", { children: articles.map(article => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("div", { className: "fw-medium", children: article.title }) }), _jsx("td", { children: _jsx("div", { className: "fw-medium", children: typeof article.cardId === 'string'
                                                        ? cards.find(card => card._id === article.cardId)?.title || 'Non assigné'
                                                        : article.cardId?.title || 'Non assigné' }) }), _jsx("td", { className: "text-muted small", children: formatDate(article.date) }), _jsx("td", { children: _jsx("span", { className: `badge ${article.status === 'published' ? 'bg-success' : 'bg-warning text-dark'}`, children: article.status === 'published' ? 'Publié' : 'Brouillon' }) }), _jsx("td", { children: article.pdfUrl ? (_jsxs("span", { className: "badge bg-info", children: [_jsx(FileText, { className: "w-3 h-3 me-1" }), (() => {
                                                            const label = getFileTypeLabel(article.pdfUrl);
                                                            return `Fichier${label ? ` (${label})` : ''}`;
                                                        })(), article.pdfProtected && (_jsx("span", { className: "ms-2", title: "PDF prot\u00E9g\u00E9 (lecture seule)", children: _jsx(EyeOff, { className: "w-3 h-3" }) }))] })) : (_jsx("span", { className: "badge bg-secondary", children: "Aucun" })) }), _jsx("td", { children: _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { onClick: () => handleEdit(article), className: "btn btn-sm btn-outline-primary", title: "Modifier", children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleToggleStatus(article), className: "btn btn-sm btn-outline-warning", title: article.status === 'published' ? 'Mettre en brouillon' : 'Publier', children: article.status === 'published' ? (_jsx(EyeOff, { className: "w-4 h-4" })) : (_jsx(Eye, { className: "w-4 h-4" })) }), _jsx("button", { onClick: () => handleDelete(article._id), className: "btn btn-sm btn-outline-danger", title: "Supprimer", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, article._id))) })] }), articles.length === 0 && (_jsxs("div", { className: "text-center py-5", children: [_jsx(FileText, { className: "w-12 h-12 text-secondary mx-auto mb-3" }), _jsx("p", { className: "text-muted mb-2", children: "Aucun article cr\u00E9\u00E9" }), _jsx("button", { onClick: () => setShowForm(true), className: "btn btn-link text-decoration-none", children: "Cr\u00E9er votre premier article" })] }))] }) })] }));
};
export default AdminArticleList;
