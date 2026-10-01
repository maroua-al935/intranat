import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, ArrowLeftRight, Building2, Map, Pickaxe } from 'lucide-react';
import { Link } from 'react-router-dom';
import './InterfacesPage.css';
const interfaces = [
    {
        code: 'GUNAM',
        title: 'Guichet Unique National des Activités Minières',
        description: 'Centralisez vos démarches et demandes minières en ligne.',
        icon: Building2,
        number: '01',
    },
    {
        code: 'POM',
        title: 'Portail des Opérateurs Miniers',
        description: 'Gérez efficacement vos permis miniers.',
        icon: Pickaxe,
        number: '02',
    },
    {
        code: 'CADASTRE MINIER NATIONAL',
        title: 'Cadastre Minier National',
        description: 'Consultez les données cadastrales minières nationales.',
        icon: Map,
        number: '03',
    },
    {
        code: 'SIGAM ↔ GUNAM',
        title: 'Dashboard de Synchronisation SIGAM–GUNAM',
        description: 'Supervisez les échanges entre plateformes.',
        icon: ArrowLeftRight,
        number: '04',
    },
];
const InterfacesPage = () => (_jsxs("main", { className: "interfaces-page", children: [_jsxs(Link, { className: "interfaces-back-button", to: "/", children: [_jsx(ArrowLeft, { size: 17, "aria-hidden": "true" }), _jsx("span", { children: "Retour \u00E0 l\u2019accueil" })] }), _jsxs("header", { className: "interfaces-heading", children: [_jsxs("div", { className: "interfaces-eyebrow", children: [_jsx("span", {}), " \u00C9COSYST\u00C8ME NUM\u00C9RIQUE MINIER"] }), _jsx("h1", { children: "Nos plateformes" }), _jsx("p", { children: "Des outils num\u00E9riques d\u00E9di\u00E9s aux d\u00E9marches et aux activit\u00E9s mini\u00E8res nationales." })] }), _jsx("section", { className: "interfaces-grid", "aria-label": "Plateformes mini\u00E8res", children: interfaces.map(({ code, title, description, icon: Icon, number }, index) => (_jsx("article", { className: "interface-card", style: { '--card-delay': `${index * 100}ms` }, children: _jsxs("div", { className: "interface-card-content", children: [_jsxs("div", { className: "interface-card-topline", children: [_jsx("span", { className: "interface-card-icon", children: _jsx(Icon, { size: 21, strokeWidth: 1.8 }) }), _jsx("span", { className: "interface-card-number", children: number })] }), _jsxs("div", { className: "interface-card-copy", children: [_jsx("span", { className: "interface-card-code", children: code }), _jsx("h2", { children: title }), _jsx("span", { className: "interface-card-status", children: "En cours de d\u00E9veloppement \u00B7 Lancement prochain" }), _jsx("p", { children: description })] })] }) }, code))) }), _jsxs("footer", { className: "interfaces-footer", children: ["Agence Nationale des Activit\u00E9s Mini\u00E8res ", _jsx("span", { children: "\u2022" }), " ANAM"] })] }));
export default InterfacesPage;
