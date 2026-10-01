import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './IHMPage.css';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { platforms } from '../data';
const IHMPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const filteredRows = platforms.filter(row => {
        const q = searchQuery.trim().toLowerCase();
        if (!q)
            return true;
        return [
            row.nom,
            row.description,
            row.fournisseur,
            row.type
        ]
            .filter(Boolean)
            .some(value => value.toLowerCase().includes(q));
    });
    const renderCell = (value) => (value && value.trim().length > 0 ? value : '—');
    return (_jsx("div", { className: "ihm-page", children: _jsxs("div", { className: "container py-4", children: [_jsx("div", { className: "ihm-header card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "ihm-header-top", children: [_jsx("div", { className: "ihm-title-block", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 fw-bold mb-1", children: "Interfaces et Plateformes (IHM)" }), _jsx("p", { className: "mb-0 text-muted", children: "Acc\u00E8s aux plateformes et services num\u00E9riques utilis\u00E9s par l'organisation." })] }) }), _jsx("div", { className: "ihm-header-actions", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary ihm-back-btn", onClick: () => navigate(-1), children: "Retour" }) })] }), _jsx("div", { className: "ihm-header-bottom", children: _jsx("div", { className: "ihm-search", children: _jsx("input", { type: "text", className: "form-control ihm-search-input", placeholder: "Rechercher par nom, fournisseur...", value: searchQuery, onChange: e => setSearchQuery(e.target.value) }) }) })] }) }), _jsx("div", { className: "ihm-table-wrapper", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table ihm-table table-hover align-middle mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-center", children: "N\u00B0" }), _jsx("th", { children: "Nom" }), _jsx("th", { children: "Description" }), _jsx("th", { children: "Fournisseur" }), _jsx("th", { children: "Type" }), _jsx("th", { className: "text-center", children: "Action" })] }) }), _jsx("tbody", { children: filteredRows.map((row, index) => {
                                        return (_jsxs("tr", { children: [_jsx("td", { className: "text-center", children: index + 1 }), _jsx("td", { className: "fw-semibold", children: renderCell(row.nom) }), _jsx("td", { className: "text-break", children: renderCell(row.description) }), _jsx("td", { children: renderCell(row.fournisseur) }), _jsx("td", { children: _jsx("span", { className: `badge ${row.type === 'Interne' ? 'bg-success' : 'bg-primary'}`, children: row.type }) }), _jsx("td", { className: "text-center", children: _jsxs("a", { href: row.lien, target: "_blank", rel: "noopener noreferrer", className: "action-button", children: [_jsx(ExternalLink, { size: 18 }), _jsx("span", { children: "Acc\u00E9der" })] }) })] }, row.id));
                                    }) })] }) }) }), _jsxs("div", { className: "ihm-footer", children: ["(c) ", new Date().getFullYear(), " Agence Nationale des Activit\u00E9s Mini\u00E8res. Tous droits reserv\u00E9s."] })] }) }));
};
export default IHMPage;
