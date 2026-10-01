import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './LienUtilsPage.css';
import { useNavigate } from 'react-router-dom';
const LienUtilsPage = ({ onClose }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const primaryAccent = '#7a2b3a';
    const groups = [
        {
            group: 'Agences et Organisations',
            items: [
                { name: 'Agence Nationale d’Appui et de Développement de l’Entrepreneuriat (ex-ANSEJ → ANADE)', url: 'https://www.nesda.dz/' },
                { name: 'Agence Algérienne de Promotion de l’Investissement (ex-ANDI → AAPI)', url: 'https://aapi.dz/' },
                { name: 'Agence du Service Géologique de l’Algérie (ASGA)', url: 'https://asga.dz/' },
                { name: 'Agence Nationale pour la Promotion et Rationalisation de l’utilisation de l’énergie (APRUE)', url: 'https://aprue.org.dz/' },
                { name: 'Autorité de Régulation des Hydrocarbures (ARH)', url: 'https://www.arh.gov.dz/' },
                { name: 'Chambre Algérienne de Commerce et d’Industrie (CACI)', url: 'https://www.caci.dz/' },
                // Les autres n'ont pas de site officiel clair et actif → supprimés
            ],
        },
        {
            group: 'Centres de Recherches',
            items: [
                { name: 'Centre de Développement des Energies Renouvelables (CDER)', url: 'https://www.cder.dz/' },
                { name: 'Centre de Développement des Technologies Avancées (CDTA)', url: 'https://www.cdta.dz/' },
                { name: 'Centre de Recherche en Information Scientifique et Technique (CERIST)', url: 'https://www.cerist.dz/' },
                // Les autres n'ont pas de site officiel facilement identifiable et actif → supprimés
            ],
        },
        {
            group: 'Ministères',
            items: [
                { name: "Ministère des Hydrocarbures et des Mines", url: 'https://www.oilmines.gov.dz/' },
                { name: "Ministère de l'Énergie et des Énergies renouvelables", url: 'https://www.energy.gov.dz/en' },
                { name: "Ministère de l'Agriculture et du Développement Rural", url: 'https://www.madr.gov.dz/' },
                { name: "Ministère de l'Education Nationale", url: 'https://www.education.gov.dz/' },
                { name: "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique", url: 'https://www.mesrs.dz/' },
                { name: "Ministère des Affaires étrangères", url: 'https://www.mfa.gov.dz/' },
                { name: 'Ministère des Finances', url: 'https://www.mf.gov.dz/' },
                { name: 'Ministère du Commerce', url: 'https://www.commerce.gov.dz/' },
                // Les autres n'ont pas tous un site officiel clair ou ont été fusionnés/réorganisés → conservés seulement les plus stables
            ],
        },
        {
            group: 'Entreprises algériennes du secteur de l’énergie',
            items: [
                { name: 'Sonatrach', url: 'https://www.sonatrach.com/' },
                { name: 'Sonelgaz', url: 'https://www.sonelgaz.dz/' },
                { name: 'Naftal', url: 'https://www.naftal.dz/' },
                // AEC, NEAL, BAOSEM → pas de site officiel clair → supprimés
            ],
        },
        {
            group: 'Associations régionales de régulateurs',
            items: [
                { name: 'Mediterranean Working Group on Electricity and Natural Gas Regulation (MEDREG)', url: 'https://www.medreg-regulators.org/' },
                { name: 'Energy Regulators Regional Association (ERRA)', url: 'https://erranet.org/' },
                // Les autres sont soit inactifs, soit très anciens → conservés les plus actifs
            ],
        },
        {
            group: 'Autorités et agences de régulation étrangères',
            items: [
                { name: 'National Energy Regulator of South Africa (NERSA)', url: 'https://www.nersa.org.za/' },
                // Les autres (Italie, Espagne) ont changé de nom ou fusionné → supprimés ou à actualiser
            ],
        },
        {
            group: 'Presse nationale',
            items: [
                { name: 'Journal Officiel de la République Algérienne (JORADP)', url: 'https://www.joradp.dz/HFR/Index.htm' }
            ],
        },
    ];
    return (_jsx("div", { className: "lien-utils-page", children: _jsxs("div", { className: "container py-4", children: [_jsx("div", { className: "lien-utils-header card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "lien-utils-header-top", children: [_jsx("div", { className: "lien-utils-title-block", children: _jsx("div", { children: _jsx("h1", { className: "h3 fw-bold mb-1", children: "Liens utils" }) }) }), _jsxs("div", { className: "lien-utils-header-actions", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary lien-utils-back-btn", onClick: onClose || (() => navigate(-1)), children: "Retour" }), _jsx("img", { src: "/logoanam.png", alt: "Logo ANAM", className: "lien-utils-logo" })] })] }), _jsx("div", { className: "lien-utils-header-bottom", children: _jsx("div", { className: "lien-utils-search", children: _jsx("input", { type: "text", className: "form-control lien-utils-search-input", placeholder: "Rechercher un organisme, un minist\u00E8re...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }) }) })] }) }), _jsx("div", { className: "lien-utils-grid", children: groups
                        .map((group) => {
                        const query = searchQuery.trim().toLowerCase();
                        if (!query)
                            return group;
                        const filteredItems = group.items.filter((item) => item.name.toLowerCase().includes(query));
                        return { ...group, items: filteredItems };
                    })
                        .filter((group) => group.items.length > 0)
                        .map((group) => {
                        const accent = primaryAccent;
                        return (_jsxs("div", { className: "lien-utils-card", style: { borderTop: `4px solid ${accent}` }, children: [_jsx("h5", { style: { color: accent }, children: group.group }), _jsx("div", { className: "lien-utils-links", children: group.items.map((item) => item.url ? (_jsx("a", { className: "lien-utils-chip", href: item.url, target: "_blank", rel: "noopener noreferrer", style: { borderColor: accent, color: accent }, children: item.name }, item.name)) : (_jsx("span", { className: "lien-utils-chip lien-utils-chip--plain", children: item.name }, item.name))) })] }, group.group));
                    }) })] }) }));
};
export default LienUtilsPage;
