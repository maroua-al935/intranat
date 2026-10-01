import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './AntennesPage.css';
import { QrCode, Download, X, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const QR_BASE_PATH = '/QR_antennes';
const toSlug = (value) => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
};
const buildQrSrc = (row) => {
    const raw = row.qr?.trim()
        || (row.antenne ? `an_${toSlug(row.antenne)}` : '')
        || (row.wilaya ? `an_${toSlug(row.wilaya)}` : '');
    if (!raw)
        return null;
    if (raw.includes('/')) {
        return raw;
    }
    if (raw.endsWith('.png')) {
        return `${QR_BASE_PATH}/${raw}`;
    }
    return `${QR_BASE_PATH}/${raw}.png`;
};
const extractKmlUrl = (value) => {
    if (!value)
        return null;
    const match = value.match(/[?&]url=([^&]+)/i);
    if (match?.[1]) {
        try {
            return decodeURIComponent(match[1]);
        }
        catch {
            return match[1];
        }
    }
    return value;
};
const parseCoordsFromKml = (kmlText) => {
    const coordMatch = kmlText.match(/<coordinates>\s*([\-0-9.]+)\s*,\s*([\-0-9.]+)/i);
    if (coordMatch) {
        return { lng: parseFloat(coordMatch[1]), lat: parseFloat(coordMatch[2]) };
    }
    const latMatch = kmlText.match(/<latitude>\s*([\-0-9.]+)\s*<\/latitude>/i);
    const lngMatch = kmlText.match(/<longitude>\s*([\-0-9.]+)\s*<\/longitude>/i);
    if (latMatch && lngMatch) {
        return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }
    return null;
};
const buildMapsUrls = (coords) => {
    const { lat, lng } = coords;
    return {
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        embedUrl: `https://www.google.com/maps?q=${lat},${lng}&hl=fr&z=16&output=embed`
    };
};
const AntennesPage = ({ onClose }) => {
    const navigate = useNavigate();
    const [qrErrors, setQrErrors] = useState({});
    const [activeQr, setActiveQr] = useState(null);
    const [activeLocation, setActiveLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const rows = [
        {
            antenne: 'Batna',
            adresse: 'Cité Administrative Bordj El Ghoula DMI, 1er étage, Batna',
            telephone: '030 36 16 05',
            fax: '033 80 74 49',
            email: 'anam-batna@anam.gov.dz',
            wilaya: 'Batna, Biskra',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_BATNA.kml'
        },
        {
            antenne: 'Béchar',
            adresse: 'Hai el Djihani N° 11 Lot 49, Béchar',
            telephone: '049 23 08 91',
            fax: '049 23 08 91',
            email: 'anam-bechar@anam.gov.dz',
            wilaya: 'Adrar, Béchar, Tindouf',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_BECHAR.kml'
        },
        {
            antenne: 'Blida',
            adresse: 'Cité des 160 villas N°05 Beni Merad CP 09300',
            telephone: '025 22 15 78',
            fax: '025 22 15 79',
            email: 'anam-blida@anam.gov.dz',
            wilaya: 'Blida, Médéa, Tipaza',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_BLIDA.kml'
        },
        {
            antenne: 'Bordj Bou Arréridj',
            adresse: 'Cité 150 Logements Belaameche Bâtiment N° 05, Bordj Bou Arréridj',
            telephone: '037 50 05 92',
            fax: '037 50 05 87',
            email: 'anam-bba@anam.gov.dz',
            wilaya: 'Bordj Bou Arréridj, Bouira',
            qr: 'an_Bordj Bou Arréridj.png',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_BBA.kml'
        },
        {
            antenne: 'Boumerdès',
            adresse: "Boulevard de l'ALN Centre Villa de Boumerdès",
            telephone: '024 79 10 41',
            fax: '024 79 10 43',
            email: 'anam-boumerdes@anam.gov.dz',
            wilaya: 'Alger, Boumerdès, Tizi Ouzou',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_BOUMERDES.kml'
        },
        {
            antenne: 'Chlef',
            adresse: 'Zone différée Bt N° 03 2ème étage, Chlef',
            telephone: '027 77 14 92',
            fax: '027 77 13 98',
            email: 'anam-chlef@anam.gov.dz',
            wilaya: 'Ain-Defla, Chlef, Relizane',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_CHLEF.kml'
        },
        {
            antenne: 'Constantine',
            adresse: 'Cité Kohil Lakhdar, Tranche N° 02-B, Djenane Ezzitoune, Constantine',
            telephone: '031 93 70 91',
            fax: '031 93 70 92',
            email: 'anam-constantine@anam.gov.dz',
            wilaya: 'Constantine, Skikda',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_CONSTANTINE.kml'
        },
        {
            antenne: 'Djanet',
            adresse: 'Cité Tin khatma djanet, Djanet',
            telephone: '030351110',
            fax: '030351011',
            email: 'ant.djanet@anam.dz',
            wilaya: 'Djanet',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_DJANET.kml'
        },
        {
            antenne: 'Djelfa',
            adresse: 'Cité Raous Laoune Lot 188 N° 53, Djelfa',
            telephone: '027 93 67 27',
            fax: '027 93 67 28',
            email: 'anam-djelfa@anam.gov.dz',
            wilaya: 'Djelfa, Laghouat, Msila',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_DJELFA.kml'
        },
        {
            antenne: 'Guelma',
            adresse: 'Cité Administrative Ex Mohafa, Guelma',
            telephone: '037 26 04 70',
            fax: '037 26 04 71',
            email: 'anam-guelma@anam.gov.dz',
            wilaya: 'Annaba, El-Tarf, Guelma',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_GUELMA.kml'
        },
        {
            antenne: 'Mila',
            adresse: 'Lotissement Benmaamer chez Boumesshel Nourdine, Ville de Mila',
            telephone: '031 46 82 28',
            fax: '031 46 82 27',
            email: 'anam-mila@anam.gov.dz',
            wilaya: 'Jijel, Mila',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_MILA.kml'
        },
        {
            antenne: 'Oran',
            adresse: 'Cité Jordaine N° 46 2ème étage, les Castors, Oran',
            telephone: '041 46 26 48',
            fax: '041 45 52 76',
            email: 'anam-oran@anam.gov.dz',
            wilaya: 'Ain-Temouchent, Mostaganem, Oran',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_ORAN.kml'
        },
        {
            antenne: 'Ouargla',
            adresse: "Cité 460 logts n° 160 3ème étage Rue L'Arbi Ben M'hidi Mekhadma, Ouargla.",
            telephone: '029 71 18 16',
            fax: '',
            email: 'anam-ouargla@anam.gov.dz',
            wilaya: 'Ghardaia, Ouargla',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_OUARGLA.kml'
        },
        {
            antenne: 'Oum El Bouaghi',
            adresse: '83, Cité Bouaziz Saadi, Oum El Bouaghi',
            telephone: '032 56 74 56',
            fax: '032 56 68 68',
            email: 'anam-oum-el-bouaghi@anam.gov.dz',
            wilaya: 'Khenchela, Oum El Bouaghi, Souk-Ahrass',
            qr: 'an_Oum El Bouaghi.png',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_OUM_EL_BOUAGHI.kml'
        },
        {
            antenne: 'Saïda',
            adresse: 'Cité Aoufi Miloud n° 17, Lotissement L1, Saïda',
            telephone: '048 47 17 10',
            fax: '048 47 17 34',
            email: 'anam-saida@anam.gov.dz',
            wilaya: 'El-Bayadh, Mascara, Saïda',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_SAIDA.kml'
        },
        {
            antenne: 'Sétif',
            adresse: 'Rue Mokhtar N° 16 Cité Hachemi, Sétif',
            telephone: '036 52 79 91',
            fax: '036 52 79 90',
            email: 'anam-setif@anam.gov.dz',
            wilaya: 'Sétif, Bejaia',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_SETIF.kml'
        },
        {
            antenne: 'Tamanrasset',
            adresse: 'Sonarem-ORGM Gattaa El Oued, Tamanrasset',
            telephone: '029 32 45 04',
            fax: '029 32 45 04',
            email: 'anam-tamanrasset@anam.gov.dz',
            wilaya: 'Illizi, Tamanrasset',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_TAMANRASSET.kml'
        },
        {
            antenne: 'Tébessa',
            adresse: 'Zone urbaine N°02 classe 189 groupe de propriété n°71, Quartier el djorf, Tébessa',
            telephone: '037 50 05 92',
            fax: '037 50 05 87',
            email: 'anam-tebessa@anam.gov.dz',
            wilaya: 'El-Oued, Tébessa',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_TEBESSA.kml'
        },
        {
            antenne: 'Tiaret',
            adresse: 'Cité 500 Logts Gaid Ahmed Bt n° 07 n° 14, Tiaret',
            telephone: '046 20 89 57',
            fax: '046 20 89 58',
            email: 'anam-tiaret@anam.gov.dz',
            wilaya: 'Tiaret, Tissemsilt',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_TIARET.kml'
        },
        {
            antenne: 'Tlemcen',
            adresse: 'Résidence El Ikhlas 1er étage les Dahlias Kiffane, Tlemcen',
            telephone: '043 26 26 12',
            fax: '043 26 27 39',
            email: 'anam-tlemcen@anam.gov.dz',
            wilaya: 'Naama, Sidi Bel Abbes, Tlemcen',
            localisation: 'https://earth.google.com/web/?url=' + window.location.origin + '/kml/ANTENNE_TLEMCEN.kml'
        }
    ];
    const renderCell = (value) => (value && value.trim().length > 0 ? value : '—');
    const closeQrModal = () => setActiveQr(null);
    const closeLocationModal = () => setActiveLocation(null);
    const openLocation = async (row) => {
        if (!row.localisation)
            return;
        const kmlUrl = extractKmlUrl(row.localisation);
        if (!kmlUrl)
            return;
        try {
            const response = await fetch(kmlUrl);
            if (!response.ok)
                throw new Error('KML not found');
            const kmlText = await response.text();
            const coords = parseCoordsFromKml(kmlText);
            if (!coords)
                throw new Error('No coordinates');
            const { mapUrl, embedUrl } = buildMapsUrls(coords);
            setActiveLocation({
                label: row.antenne || row.wilaya || 'Antenne',
                mapUrl,
                embedUrl
            });
        }
        catch (error) {
            window.open(row.localisation, '_blank', 'noopener,noreferrer');
        }
    };
    const filteredRows = rows.filter(row => {
        const q = searchQuery.trim().toLowerCase();
        if (!q)
            return true;
        return [
            row.antenne,
            row.adresse,
            row.telephone,
            row.fax,
            row.email,
            row.wilaya,
            row.localisation,
            row.qr
        ]
            .filter(Boolean)
            .some(value => value.toLowerCase().includes(q));
    });
    useEffect(() => {
        if (!activeQr && !activeLocation)
            return;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeQrModal();
                closeLocationModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeQr, activeLocation]);
    return (_jsx("div", { className: "antennes-page", children: _jsxs("div", { className: "container py-4", children: [_jsx("div", { className: "antennes-header card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "antennes-header-top", children: [_jsx("div", { className: "antennes-title-block", children: _jsxs("div", { children: [_jsx("h1", { className: "h3 fw-bold mb-1", children: "Antennes" }), _jsx("p", { className: "mb-0 text-muted", children: "Liste des antennes et leurs coordonn\u00E9es." })] }) }), _jsxs("div", { className: "antennes-header-actions", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary antennes-back-btn", onClick: onClose || (() => navigate(-1)), children: "Retour" }), _jsx("img", { src: "/logoanam.png", alt: "Logo ANAM", className: "antennes-logo" })] })] }), _jsx("div", { className: "antennes-header-bottom", children: _jsx("div", { className: "antennes-search", children: _jsx("input", { type: "text", className: "form-control antennes-search-input", placeholder: "Rechercher une antenne, wilaya, email...", value: searchQuery, onChange: e => setSearchQuery(e.target.value) }) }) })] }) }), _jsx("div", { className: "antennes-table-wrapper", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table antennes-table table-hover align-middle mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-center", children: "N\u00B0" }), _jsx("th", { children: "Antenne" }), _jsx("th", { children: "Adresse" }), _jsx("th", { className: "text-nowrap", children: "T\u00E9l\u00E9phone / Fax" }), _jsx("th", { children: "E-mail" }), _jsx("th", { children: "Wilaya" }), _jsx("th", { children: "Localisation" }), _jsx("th", { children: "QR" })] }) }), _jsx("tbody", { children: filteredRows.map((row, index) => {
                                        const rowKey = `${row.antenne}-${index}`;
                                        const qrSrc = buildQrSrc(row);
                                        const showQr = qrSrc && !qrErrors[rowKey];
                                        const qrLabel = row.antenne || row.wilaya || 'Antenne';
                                        return (_jsxs("tr", { children: [_jsx("td", { className: "text-center", children: index + 1 }), _jsx("td", { className: "fw-semibold", children: renderCell(row.antenne) }), _jsx("td", { className: "text-break", children: renderCell(row.adresse) }), _jsxs("td", { className: "antenne-phone-fax", children: [_jsxs("span", { children: [_jsx("small", { className: "text-muted fw-semibold", children: "T\u00E9l. " }), renderCell(row.telephone)] }), _jsxs("span", { children: [_jsx("small", { className: "text-muted fw-semibold", children: "Fax " }), renderCell(row.fax)] })] }), _jsx("td", { className: "text-break", children: renderCell(row.email) }), _jsx("td", { children: renderCell(row.wilaya) }), _jsx("td", { className: "text-center", children: row.localisation ? (_jsx("button", { type: "button", title: "Voir sur la carte", className: "btn btn-sm btn-outline-primary", onClick: () => openLocation(row), children: _jsx(Globe, { size: 18 }) })) : ('???') }), _jsx("td", { children: showQr ? (_jsxs(_Fragment, { children: [_jsx("img", { src: qrSrc, alt: "", className: "qr-preload", onError: () => setQrErrors(prev => ({ ...prev, [rowKey]: true })) }), _jsxs("button", { type: "button", className: "qr-button", onClick: () => setActiveQr({ src: qrSrc, label: qrLabel }), children: [_jsx(QrCode, { size: 18 }), _jsx("span", { children: "Voir" })] })] })) : ('—') })] }, rowKey));
                                    }) })] }) }) }), activeQr && (_jsx("div", { className: "qr-modal-backdrop", onClick: closeQrModal, children: _jsxs("div", { className: "qr-modal", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "qr-modal-header", children: [_jsxs("div", { children: [_jsxs("h5", { className: "mb-1", children: ["QR - ", activeQr.label] }), _jsx("small", { className: "text-muted", children: "Scannez ou t\u00E9l\u00E9chargez le code." })] }), _jsx("button", { type: "button", className: "btn btn-light btn-sm", onClick: closeQrModal, children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "qr-modal-body", children: [_jsx("img", { src: activeQr.src, alt: `QR ${activeQr.label}`, className: "qr-modal-image" }), _jsxs("div", { className: "qr-modal-actions", children: [_jsxs("a", { href: activeQr.src, download: true, className: "btn btn-primary d-inline-flex align-items-center gap-2", children: [_jsx(Download, { size: 16 }), "T\u00E9l\u00E9charger"] }), _jsx("a", { href: activeQr.src, target: "_blank", rel: "noopener noreferrer", className: "btn btn-outline-secondary", children: "Ouvrir dans un onglet" })] })] })] }) })), activeLocation && (_jsx("div", { className: "qr-modal-backdrop", onClick: closeLocationModal, children: _jsxs("div", { className: "location-modal", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "qr-modal-header", children: [_jsxs("div", { children: [_jsxs("h5", { className: "mb-1", children: ["Localisation - ", activeLocation.label] }), _jsx("small", { className: "text-muted", children: "Carte de localisation." })] }), _jsx("button", { type: "button", className: "btn btn-light btn-sm", onClick: closeLocationModal, children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "location-modal-body", children: [_jsx("iframe", { className: "location-map-frame", src: activeLocation.embedUrl, title: `Carte ${activeLocation.label}`, loading: "lazy" }), _jsx("div", { className: "qr-modal-actions", children: _jsxs("a", { href: activeLocation.mapUrl, target: "_blank", rel: "noopener noreferrer", className: "btn btn-primary d-inline-flex align-items-center gap-2", children: [_jsx(Globe, { size: 16 }), "Ouvrir dans Google Maps"] }) })] })] }) }))] }) }));
};
export default AntennesPage;
