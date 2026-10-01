import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import 'bootstrap/dist/css/bootstrap.min.css';
const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
const getStoredRole = () => {
    const readRole = (raw) => {
        if (!raw)
            return '';
        try {
            const obj = JSON.parse(raw);
            return String(obj?.role || '');
        }
        catch {
            return '';
        }
    };
    const portalRole = readRole(sessionStorage.getItem('portalUser')) ||
        readRole(localStorage.getItem('portalUser'));
    const adminRole = readRole(sessionStorage.getItem('user')) ||
        readRole(localStorage.getItem('user'));
    return portalRole || adminRole || '';
};
const EventsPage = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const isSuperadmin = getStoredRole() === 'superadmin';
    useEffect(() => {
        fetchArticles();
    }, []);
    const fetchArticles = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/articles?category=Communication`);
            const data = await response.json();
            setArticles(data);
        }
        catch (error) {
            console.error('Erreur:', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsxs("div", { className: "container py-5 text-center", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Chargement..." }) }), _jsx("p", { className: "mt-3 text-muted", children: "Chargement..." })] }));
    }
    return (_jsx("div", { className: "container py-4", children: _jsx("div", { className: "row justify-content-center", children: _jsxs("div", { className: "col-lg-10 col-xl-8", children: [_jsx("h1", { className: "h2 fw-bold mb-4 anam-text-primary", children: "\u00C9v\u00E9nements" }), articles.length === 0 && (_jsxs("div", { className: "text-center py-5", children: [_jsx("p", { className: "text-muted mb-3", children: "Aucun \u00E9v\u00E9nement trouv\u00E9." }), _jsx("p", { className: "text-secondary small", children: "Les \u00E9v\u00E9nements appara\u00EEtront ici lorsqu'ils seront publi\u00E9s." })] })), _jsx("div", { className: "d-flex flex-column gap-4", children: articles.map((art) => (_jsx("div", { className: "card anam-card anam-shadow border-0", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { className: "flex-grow-1 me-4", children: [_jsx("h2", { className: "h5 fw-bold mb-2", children: art.title }), _jsxs("div", { className: "d-flex flex-wrap gap-3 mb-3", children: [_jsx("span", { className: "badge bg-light text-dark", children: art.category || "Événement" }), _jsxs("span", { className: "text-muted small d-flex align-items-center", children: [_jsx("i", { className: "bi bi-calendar me-1" }), _jsx("strong", { children: "Soumis le:" }), " ", new Date(art.date).toLocaleDateString('fr-FR')] }), _jsxs("span", { className: "text-muted small d-flex align-items-center", children: [_jsx("i", { className: "bi bi-eye me-1" }), _jsx("strong", { children: "Vues:" }), " ", art.views || 0] })] }), art.description && (_jsx("p", { className: "text-muted mb-3", children: art.description })), art.pdfUrl && (!art.pdfProtected || isSuperadmin) && (_jsx("div", { className: "mt-3", children: _jsxs("a", { href: art.pdfProtected ? `/pdf/${art._id}` : art.pdfUrl, target: "_blank", rel: "noopener noreferrer", className: "btn btn-sm btn-anam-outline d-inline-flex align-items-center gap-2", children: [_jsx(FileText, { size: 16 }), _jsx("span", { children: "T\u00E9l\u00E9charger le fichier" })] }) }))] }), art.pdfUrl && (!art.pdfProtected || isSuperadmin) && (_jsx("div", { className: "d-flex flex-column align-items-center", children: _jsxs("a", { href: art.pdfProtected ? `/pdf/${art._id}` : art.pdfUrl, target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none d-flex flex-column align-items-center text-primary anam-hover-lift", children: [_jsx("div", { className: "bg-light rounded-circle p-3 mb-2 anam-hover-shadow", children: _jsx(FileText, { size: 32, className: "text-danger" }) }), _jsx("span", { className: "small fw-bold text-danger", children: "Fichier" })] }) }))] }) }) }, art._id))) })] }) }) }));
};
export default EventsPage;
