import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
const DEFAULT_POPUP_CONFIG = {
    enabled: true,
    mode: 'always',
    intervalHours: 24,
    title: 'Bienvenue sur le portail public',
    message: "Acces rapide aux informations et services essentiels de l'ANAM.",
    bulletsText: [
        'Rechercher des notes, lois et formulaires.',
        'Explorer les sections par categories.',
        'Acceder a vos applications internes.'
    ].join('\n'),
    primaryLabel: 'Decouvrir',
    linkType: 'none',
    linkUrl: '',
    linkLabel: ''
};
const AdminPopupManger = ({ onError }) => {
    const [popupConfig, setPopupConfig] = useState(DEFAULT_POPUP_CONFIG);
    const [popupStatus, setPopupStatus] = useState('idle');
    const [popupFeedback, setPopupFeedback] = useState(null);
    const [popupUploadStatus, setPopupUploadStatus] = useState('idle');
    const [popupUploadFeedback, setPopupUploadFeedback] = useState(null);
    const mapPopupConfig = useCallback((data) => {
        const hasBulletsArray = Array.isArray(data?.bullets);
        const bulletsArray = hasBulletsArray
            ? data.bullets.map((item) => String(item).trim()).filter(Boolean)
            : [];
        const intervalValue = Number(data?.intervalHours);
        return {
            enabled: data?.enabled !== false,
            mode: data?.mode === 'always' ? 'always' : 'interval',
            intervalHours: Number.isFinite(intervalValue) && intervalValue > 0 ? intervalValue : DEFAULT_POPUP_CONFIG.intervalHours,
            title: typeof data?.title === 'string' ? data.title.trim() : DEFAULT_POPUP_CONFIG.title,
            message: typeof data?.message === 'string' ? data.message.trim() : DEFAULT_POPUP_CONFIG.message,
            bulletsText: hasBulletsArray ? bulletsArray.join('\n') : DEFAULT_POPUP_CONFIG.bulletsText,
            primaryLabel: typeof data?.primaryLabel === 'string' && data.primaryLabel.trim()
                ? data.primaryLabel.trim()
                : DEFAULT_POPUP_CONFIG.primaryLabel,
            linkType: data?.linkType === 'url' || data?.linkType === 'pdf' ? data.linkType : 'none',
            linkUrl: typeof data?.linkUrl === 'string' ? data.linkUrl.trim() : '',
            linkLabel: typeof data?.linkLabel === 'string' ? data.linkLabel.trim() : ''
        };
    }, []);
    useEffect(() => {
        let isMounted = true;
        const loadPopupConfig = async () => {
            setPopupStatus('loading');
            setPopupFeedback(null);
            try {
                const response = await api.get('/public/popup-config');
                if (!isMounted)
                    return;
                setPopupConfig(mapPopupConfig(response.data));
                setPopupStatus('idle');
            }
            catch (error) {
                if (!isMounted)
                    return;
                setPopupStatus('error');
                setPopupFeedback('Impossible de charger la configuration du pop-up.');
                if (error?.response?.status === 401 && onError) {
                    onError('Session expiree. Veuillez vous reconnecter.');
                }
            }
        };
        loadPopupConfig();
        return () => {
            isMounted = false;
        };
    }, [mapPopupConfig, onError]);
    const handlePopupSave = async (event) => {
        event.preventDefault();
        setPopupStatus('saving');
        setPopupFeedback(null);
        const bullets = popupConfig.bulletsText
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean)
            .slice(0, 6);
        const payload = {
            enabled: popupConfig.enabled,
            mode: popupConfig.mode,
            intervalHours: popupConfig.intervalHours,
            title: popupConfig.title,
            message: popupConfig.message,
            bullets,
            primaryLabel: popupConfig.primaryLabel,
            linkType: popupConfig.linkType,
            linkUrl: popupConfig.linkUrl,
            linkLabel: popupConfig.linkLabel
        };
        try {
            const response = await api.put('/admin/popup-config', payload);
            setPopupConfig(mapPopupConfig(response.data));
            setPopupStatus('saved');
            setPopupFeedback('Configuration enregistree.');
            setTimeout(() => setPopupStatus('idle'), 2000);
        }
        catch (error) {
            setPopupStatus('error');
            setPopupFeedback("Erreur lors de l'enregistrement.");
            if (error?.response?.status === 401 && onError) {
                onError('Session expiree. Veuillez vous reconnecter.');
            }
        }
    };
    const handlePopupFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setPopupUploadStatus('uploading');
        setPopupUploadFeedback(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post('/admin/popup-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fileUrl = response?.data?.url;
            if (!fileUrl) {
                throw new Error("URL manquante apres l'upload.");
            }
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            setPopupConfig(prev => ({
                ...prev,
                linkUrl: fileUrl,
                linkType: isPdf ? 'pdf' : 'url'
            }));
            setPopupUploadStatus('success');
            setPopupUploadFeedback("Fichier uploadé. Pensez a enregistrer.");
            setTimeout(() => setPopupUploadStatus('idle'), 2000);
        }
        catch (error) {
            setPopupUploadStatus('error');
            setPopupUploadFeedback(error?.message || "Erreur lors de l'upload.");
            if (error?.response?.status === 401 && onError) {
                onError('Session expiree. Veuillez vous reconnecter.');
            }
        }
        finally {
            event.target.value = '';
        }
    };
    const handlePopupReset = () => {
        setPopupConfig(DEFAULT_POPUP_CONFIG);
        setPopupFeedback(null);
        setPopupStatus('idle');
    };
    return (_jsxs("div", { className: "p-4 bg-white rounded shadow-sm", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "h4 fw-bold mb-1", children: "Pop-up portail public" }), _jsx("p", { className: "small text-secondary mb-0", children: "Configurer l'affichage du pop-up d'accueil." })] }), popupStatus === 'loading' && (_jsx("span", { className: "text-muted small", children: "Chargement..." }))] }), popupFeedback && (_jsx("div", { className: `alert ${popupStatus === 'error' ? 'alert-danger' : 'alert-success'} mb-3`, children: popupFeedback })), _jsxs("form", { onSubmit: handlePopupSave, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Activer le pop-up" }), _jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "popupEnabled", checked: popupConfig.enabled, onChange: (event) => setPopupConfig(prev => ({ ...prev, enabled: event.target.checked })) }), _jsx("label", { className: "form-check-label", htmlFor: "popupEnabled", children: "Visible" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Frequence" }), _jsxs("select", { className: "form-select", value: popupConfig.mode, onChange: (event) => setPopupConfig(prev => ({ ...prev, mode: event.target.value })), children: [_jsx("option", { value: "always", children: "A chaque chargement" }), _jsx("option", { value: "interval", children: "Toutes les X heures" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Intervalle (heures)" }), _jsx("input", { className: "form-control", type: "number", min: 1, value: popupConfig.intervalHours, disabled: popupConfig.mode !== 'interval', onChange: (event) => setPopupConfig(prev => ({
                                            ...prev,
                                            intervalHours: Math.max(1, Number(event.target.value) || 1)
                                        })) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-semibold", children: "Titre" }), _jsx("input", { className: "form-control", dir: "auto", value: popupConfig.title, onChange: (event) => setPopupConfig(prev => ({ ...prev, title: event.target.value })) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-semibold", children: "Message" }), _jsx("textarea", { className: "form-control", dir: "auto", rows: 2, value: popupConfig.message, onChange: (event) => setPopupConfig(prev => ({ ...prev, message: event.target.value })) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-semibold", children: "Puces (une par ligne)" }), _jsx("textarea", { className: "form-control", dir: "auto", rows: 3, value: popupConfig.bulletsText, onChange: (event) => setPopupConfig(prev => ({ ...prev, bulletsText: event.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Texte bouton principal" }), _jsx("input", { className: "form-control", dir: "auto", value: popupConfig.primaryLabel, onChange: (event) => setPopupConfig(prev => ({ ...prev, primaryLabel: event.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Type de lien" }), _jsxs("select", { className: "form-select", value: popupConfig.linkType, onChange: (event) => setPopupConfig(prev => ({ ...prev, linkType: event.target.value })), children: [_jsx("option", { value: "none", children: "Aucun" }), _jsx("option", { value: "url", children: "Lien externe" }), _jsx("option", { value: "pdf", children: "Lien PDF" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "URL (lien ou PDF)" }), _jsx("input", { className: "form-control", value: popupConfig.linkUrl, disabled: popupConfig.linkType === 'none', placeholder: "https://exemple.dz/document.pdf", onChange: (event) => setPopupConfig(prev => ({ ...prev, linkUrl: event.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Importer un fichier (PDF ou image)" }), _jsx("input", { type: "file", className: "form-control", accept: ".pdf,image/*", onChange: handlePopupFileUpload, disabled: popupUploadStatus === 'uploading' }), popupUploadFeedback && (_jsx("div", { className: `small mt-2 ${popupUploadStatus === 'error' ? 'text-danger' : 'text-success'}`, children: popupUploadFeedback }))] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-3", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: handlePopupReset, disabled: popupStatus === 'saving', children: "Reinitialiser" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: popupStatus === 'saving', children: popupStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer' })] })] })] }));
};
export default AdminPopupManger;
