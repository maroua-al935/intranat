import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { SECURE_APPS } from '../intranet/applications';
import './ApplicationsPage.css';
const ApplicationsPage = () => {
    const [selectedApplication, setSelectedApplication] = useState(null);
    const handleAppClick = (app) => {
        if (app.status !== 'active')
            return;
        setSelectedApplication(app);
    };
    const handleQuickOpen = (app) => {
        if (app.status === 'active' && app.url) {
            window.open(app.url, '_blank', 'noopener,noreferrer');
        }
    };
    useEffect(() => {
        if (!selectedApplication)
            return;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape')
                setSelectedApplication(null);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [selectedApplication]);
    return (_jsxs("div", { className: "applications-page", children: [_jsx("main", { className: "applications-main", children: _jsxs("div", { className: "wide-container", children: [_jsxs("div", { className: "applications-page-heading", children: [_jsxs("div", { children: [_jsx("h1", { className: "nav-title", children: "Mes Applications" }), _jsx("p", { className: "nav-subtitle", children: "Acc\u00E9dez \u00E0 toutes vos applications professionnelles s\u00E9curis\u00E9es" })] }), _jsxs(Link, { to: "/", className: "back-nav-button", children: [_jsx(ArrowLeft, { size: 18 }), _jsx("span", { children: "Retour au portail" })] })] }), _jsx("div", { className: "applications-grid", children: SECURE_APPS.map((app) => {
                                const IconComponent = app.icon;
                                return (_jsxs("div", { className: `app-card app-card-${app.id}${app.image ? ' app-card-with-image' : ''}`, role: "button", tabIndex: app.status === 'active' ? 0 : -1, "aria-label": `Afficher la fiche de ${app.title}`, "aria-disabled": app.status !== 'active', onClick: () => handleAppClick(app), onKeyDown: (event) => {
                                        if (event.target !== event.currentTarget)
                                            return;
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleAppClick(app);
                                        }
                                    }, children: [_jsx("div", { className: `app-image-container${app.image ? '' : ' app-image-placeholder'}`, children: app.image && (_jsx("img", { className: "app-image", src: app.image.startsWith('/') ? app.image : `/${app.image}`, alt: `Illustration de ${app.title}`, loading: "eager", fetchPriority: app.id === 'app21' ? 'high' : 'auto', decoding: "async" })) }), _jsx("div", { className: "app-card-header", children: _jsxs("div", { className: "app-title-row", children: [_jsx("div", { className: "app-icon-container", children: app.iconImage ? (_jsx("img", { className: `application-card-icon-image${app.id === 'app1' ? ' support-it-card-icon' : ''}`, src: app.iconImage, alt: "" })) : (_jsx(IconComponent, { className: "app-icon" })) }), _jsx("h3", { className: "app-title", children: app.title })] }) }), _jsx("div", { className: "app-card-actions", children: _jsx("button", { type: "button", className: "app-link", disabled: app.status !== 'active' || !app.url, onClick: (event) => {
                                                    event.stopPropagation();
                                                    handleQuickOpen(app);
                                                }, "aria-label": `Ouvrir ${app.title} dans un nouvel onglet`, children: _jsx(ExternalLink, { size: 18, "aria-hidden": "true" }) }) })] }, app.id));
                            }) })] }) }), selectedApplication && (_jsx("div", { className: "application-detail-backdrop", onClick: () => setSelectedApplication(null), children: _jsxs("section", { className: "application-detail-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "application-detail-title", onClick: event => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "application-detail-close", "aria-label": "Fermer la fiche", onClick: () => setSelectedApplication(null), children: _jsx(X, { size: 20 }) }), selectedApplication.image ? (_jsx("img", { className: "application-detail-image", src: selectedApplication.image.startsWith('/') ? selectedApplication.image : `/${selectedApplication.image}`, alt: `Illustration de ${selectedApplication.title}` })) : (_jsx("div", { className: "application-detail-icon", children: selectedApplication.iconImage ? (_jsx("img", { src: selectedApplication.iconImage, alt: "" })) : (_jsx(selectedApplication.icon, { "aria-hidden": "true" })) })), _jsxs("div", { className: "application-detail-content", children: [_jsx("h2", { id: "application-detail-title", children: selectedApplication.title }), _jsx("p", { children: selectedApplication.description || 'Aucune description disponible pour cette application.' }), selectedApplication.url && (_jsxs("a", { className: "application-detail-launch", href: selectedApplication.url, target: "_blank", rel: "noopener noreferrer", children: ["Acc\u00E9der \u00E0 l\u2019application", _jsx(ExternalLink, { size: 17 })] }))] })] }) }))] }));
};
export default ApplicationsPage;
