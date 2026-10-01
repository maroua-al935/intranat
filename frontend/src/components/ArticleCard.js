import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Calendar, FileText } from 'lucide-react';
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
const ArticleCard = ({ article, onRead, className, cardColor = '#7a2b3a' }) => {
    const [expanded, setExpanded] = useState(false);
    const isSuperadmin = getStoredRole() === 'superadmin';
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };
    const resolveImageUrl = (url) => {
        const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
        if (!url)
            return '';
        if (url.startsWith('http'))
            return url;
        if (url.startsWith('/'))
            return `${backendUrl}${url}`;
        return `${backendUrl}/${url}`;
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
    const shouldShowSeeMore = (title) => {
        return title.length > 100;
    };
    const toggleExpansion = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };
    return (_jsx("div", { className: `card border-0 shadow-sm h-100 ${className}`, onClick: onRead, style: {
            cursor: 'pointer',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
        }, onMouseEnter: e => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.15)';
        }, onMouseLeave: e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
        }, children: _jsxs("div", { className: "card-body p-4 d-flex flex-column", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("span", { className: "badge rounded-pill px-3 py-2", style: {
                                backgroundColor: `${cardColor}20`,
                                color: cardColor
                            }, children: article.category }), _jsxs("small", { className: "text-muted d-flex align-items-center", children: [_jsx(Calendar, { size: 14, className: "me-1" }), formatDate(article.date)] })] }), article.imageUrl && (_jsx("div", { className: "mb-3", children: _jsx("img", { src: resolveImageUrl(article.imageUrl), alt: article.title, className: "img-fluid rounded border", style: { width: '100%', height: '160px', objectFit: 'cover' }, onError: (e) => { e.currentTarget.style.display = 'none'; } }) })), _jsxs("div", { className: "mb-3", children: [_jsx("h4", { className: "fw-bold mb-2 text-dark", style: {
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: expanded ? 'none' : 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: '2.8em'
                            }, title: article.title, children: article.title }), shouldShowSeeMore(article.title) && (_jsx("button", { onClick: toggleExpansion, className: "btn btn-link p-0 text-primary text-decoration-none d-flex align-items-center gap-1", style: { fontSize: '0.85rem' }, children: expanded ? (_jsxs(_Fragment, { children: ["Voir moins", _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "18 15 12 9 6 15" }) })] })) : (_jsxs(_Fragment, { children: ["Voir plus", _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "6 9 12 15 18 9" }) })] })) }))] }), article.description && (_jsx("p", { className: "card-text text-muted mb-4 flex-grow-1", children: article.description.length > 120
                        ? `${article.description.substring(0, 120)}...`
                        : article.description })), _jsx("div", { className: "mt-auto pt-3 border-top", children: _jsx("div", { className: "d-flex justify-content-between align-items-center", children: _jsxs("div", { className: "d-flex gap-2", children: [article.pdfUrl && (!article.pdfProtected || isSuperadmin) && (_jsxs("a", { href: article.pdfProtected ? `/pdf/${article._id}` : article.pdfUrl, target: "_blank", rel: "noopener noreferrer", className: "btn btn-primary btn-sm d-flex align-items-center", style: { backgroundColor: cardColor, borderColor: cardColor }, onClick: (e) => e.stopPropagation(), children: [_jsx(FileText, { size: 16, className: "me-1" }), (() => {
                                            const label = getFileTypeLabel(article.pdfUrl);
                                            const suffix = article.pdfProtected ? ' (protégé)' : '';
                                            return label ? `Fichier (${label})${suffix}` : `Fichier${suffix}`;
                                        })()] })), article.pdfUrl && article.pdfProtected && !isSuperadmin && (_jsxs("span", { className: "text-muted small d-flex align-items-center", children: [_jsx(FileText, { size: 16, className: "me-1" }), "PDF protege (reserve au superadmin)"] }))] }) }) })] }) }));
};
export default ArticleCard;
