import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Clock3, Layers, Landmark, Link as LinkIcon, MapPin, PanelsTopLeft, Phone, User } from 'lucide-react';
import NotificationBell from './Notifications';
import './PublicPageNavbar.css';
const PublicPageNavbar = () => {
    const { pathname } = useLocation();
    const [scrolled, setScrolled] = useState(() => window.scrollY > 24);
    const [time, setTime] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    useEffect(() => {
        const update = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    useEffect(() => {
        const timer = window.setInterval(() => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 30_000);
        return () => window.clearInterval(timer);
    }, []);
    if (pathname === '/' || pathname.startsWith('/admin'))
        return null;
    return (_jsx("nav", { className: `public-page-navbar${scrolled ? ' is-scrolled' : ''}`, "aria-label": "Navigation principale", children: _jsxs("div", { className: "public-page-navbar-inner", children: [_jsxs(Link, { className: "public-page-navbar-brand", to: "/", "aria-label": "ANAM \u2014 Accueil", children: [_jsx("img", { src: "/logoanam.png", alt: "Logo ANAM" }), _jsxs("span", { children: [_jsx("b", { children: "\u0627\u0644\u0648\u0643\u0627\u0644\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0644\u0644\u0646\u0634\u0627\u0637\u0627\u062A \u0627\u0644\u0645\u0646\u062C\u0645\u064A\u0629" }), _jsx("small", { children: "Agence Nationale des Activit\u00E9s Mini\u00E8res" })] })] }), _jsxs("div", { className: "public-page-navbar-links", children: [_jsx(NotificationBell, {}), _jsx(Link, { to: "/antennes", title: "Antennes", "aria-label": "Antennes", children: _jsx(MapPin, {}) }), _jsx(Link, { to: "/contacts", title: "Contacts", "aria-label": "Contacts", children: _jsx(Phone, {}) }), _jsx(Link, { to: "/ihm", title: "IHM", "aria-label": "IHM", children: _jsx(PanelsTopLeft, {}) }), _jsx(Link, { to: "/guide", title: "Guide", "aria-label": "Guide", children: _jsx(BookOpen, {}) }), _jsx(Link, { to: "/applications", title: "Applications minist\u00E9rielles", "aria-label": "Applications minist\u00E9rielles", children: _jsx(Landmark, {}) }), _jsx(Link, { to: "/lien-utils", title: "Liens utiles", "aria-label": "Liens utiles", children: _jsx(LinkIcon, {}) }), _jsx(Link, { to: "/interfaces", title: "Interfaces", "aria-label": "Interfaces", children: _jsx(Layers, {}) }), _jsxs(Link, { className: "public-page-apps-button", to: "/applications", children: [_jsx(User, { size: 19 }), _jsx("span", { children: "Mes applications" })] }), _jsxs("span", { className: "public-page-time", children: [_jsx(Clock3, { size: 17 }), _jsx("b", { children: time })] })] })] }) }));
};
export default PublicPageNavbar;
