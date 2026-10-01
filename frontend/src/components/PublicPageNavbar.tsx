import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Clock3, Layers, Landmark, Link as LinkIcon, MapPin, PanelsTopLeft, Phone, User } from 'lucide-react';
import NotificationBell from './Notifications';
import './PublicPageNavbar.css';

const PublicPageNavbar: React.FC = () => {
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

  if (pathname === '/' || pathname.startsWith('/admin')) return null;

  return (
    <nav className={`public-page-navbar${scrolled ? ' is-scrolled' : ''}`} aria-label="Navigation principale">
      <div className="public-page-navbar-inner">
        <Link className="public-page-navbar-brand" to="/" aria-label="ANAM — Accueil">
          <img src="/logoanam.png" alt="Logo ANAM" />
          <span><b>الوكالة الوطنية للنشاطات المنجمية</b><small>Agence Nationale des Activités Minières</small></span>
        </Link>
        <div className="public-page-navbar-links">
          <NotificationBell />
          <Link to="/antennes" title="Antennes" aria-label="Antennes"><MapPin /></Link>
          <Link to="/contacts" title="Contacts" aria-label="Contacts"><Phone /></Link>
          <Link to="/ihm" title="IHM" aria-label="IHM"><PanelsTopLeft /></Link>
          <Link to="/guide" title="Guide" aria-label="Guide"><BookOpen /></Link>
          <Link to="/applications" title="Applications ministérielles" aria-label="Applications ministérielles"><Landmark /></Link>
          <Link to="/lien-utils" title="Liens utiles" aria-label="Liens utiles"><LinkIcon /></Link>
          <Link to="/interfaces" title="Interfaces" aria-label="Interfaces"><Layers /></Link>
          <Link className="public-page-apps-button" to="/applications"><User size={19} /><span>Mes applications</span></Link>
          <span className="public-page-time"><Clock3 size={17} /><b>{time}</b></span>
        </div>
      </div>
    </nav>
  );
};

export default PublicPageNavbar;
