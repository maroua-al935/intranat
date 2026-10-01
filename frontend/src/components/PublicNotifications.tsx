import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PublicNotifications.css';

interface PublicNotification {
  _id: string;
  title: string;
  category: string;
  date: string;
  content?: string;
  cardId?: string | null;
  cardTitle?: string | null;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

const PublicNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<PublicNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/public/notifications`);
        if (!response.ok) throw new Error(`Erreur ${response.status}`);
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (loadError) {
        console.error('Erreur de chargement des notifications :', loadError);
        setError('Impossible de charger les notifications pour le moment.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date indisponible';
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <main className="public-notifications-page">
      <div className="public-notifications-container">
        <button className="public-notifications-back" type="button" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Retour au portail
        </button>

        <header className="public-notifications-heading">
          <span className="public-notifications-heading-icon"><Bell size={22} /></span>
          <div>
            <p>PORTAIL ANAM</p>
            <h1>Toutes les notifications</h1>
            <span>Les dernières actualités et mises à jour publiées.</span>
          </div>
        </header>

        {loading ? (
          <div className="public-notifications-state" role="status">Chargement des notifications…</div>
        ) : error ? (
          <div className="public-notifications-state is-error" role="alert">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="public-notifications-state">
            <Bell size={30} />
            <p>Aucune notification disponible.</p>
          </div>
        ) : (
          <section className="public-notifications-list" aria-label="Liste des notifications">
            {notifications.map((notification) => {
              const item = (
                <>
                  <div className="public-notification-topline">
                    <span className="public-notification-category">{notification.category || 'Général'}</span>
                    <span className="public-notification-date"><Clock size={14} /> {formatDate(notification.date)}</span>
                  </div>
                  <h2>{notification.title}</h2>
                  {notification.content && <p>{notification.content}</p>}
                  {notification.cardTitle && <span className="public-notification-card">Section : {notification.cardTitle}</span>}
                  {notification.cardId && <span className="public-notification-open">Voir la section <ArrowUpRight size={16} /></span>}
                </>
              );

              return notification.cardId ? (
                <button
                  type="button"
                  className="public-notification-card-item is-link"
                  key={notification._id}
                  onClick={() => navigate(`/carte/${notification.cardId}`)}
                >
                  {item}
                </button>
              ) : (
                <article className="public-notification-card-item" key={notification._id}>
                  {item}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
};

export default PublicNotifications;
