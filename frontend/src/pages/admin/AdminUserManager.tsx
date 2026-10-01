import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { Users, Shield, Loader2 } from 'lucide-react';

type ManagedCard = { _id: string; title: string };

type AdminUser = {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user' | string;
  canManageSlides?: boolean;
  canManagePopup?: boolean;
  ldapGroups: string[];
  managedCards: 'all' | ManagedCard[];
};

type Props = {
  onError?: (msg: string) => void;
};

const AdminUserManager: React.FC<Props> = ({ onError }) => {
  const [currentRole, setCurrentRole] = useState<'superadmin' | 'admin' | 'user'>('admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<ManagedCard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<'admin' | 'user'>('user');
  const [cardsDraft, setCardsDraft] = useState<string[]>([]);
  const [slidesDraft, setSlidesDraft] = useState(false);
  const [popupDraft, setPopupDraft] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      const parsed = u ? JSON.parse(u) : {};
      setCurrentRole(parsed.role || 'admin');
    } catch {}

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await api.get<AdminUser[]>('/users');
        setUsers(res.data);
        setError(null);
      } catch (err: any) {
        const message = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Erreur lors du chargement des utilisateurs';
        setError(message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    };

    const fetchCards = async () => {
      try {
        const res = await api.get<ManagedCard[]>('/cards/all');
        setCards(res.data.map((c: any) => ({ _id: c._id, title: c.title })));
      } catch {
        // ignore
      }
    };

    fetchUsers();
    fetchCards();
  }, [onError]);

  const totalCardsManaged = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin').length;
    const managers = users.reduce((acc, u) => {
      if (u.role === 'admin') return acc;
      if (u.managedCards === 'all') return acc + 1;
      return acc + (u.managedCards?.length || 0);
    }, 0);
    return { admins, managers };
  }, [users]);

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <Users size={20} /> Gestion des Utilisateurs
          </h2>
          <p className="text-muted mb-0">
            {currentRole === 'superadmin'
              ? 'Modifier rôle et cartes gérées (superadmin uniquement).'
              : 'Vue lecture seule des comptes et des cartes qu’ils peuvent gérer.'}
          </p>
        </div>
        <div className="text-end small text-muted">
          <div><Shield size={14} className="me-1" /> Admins : {totalCardsManaged.admins}</div>
          <div>Cartes liées (managers non-admin) : {totalCardsManaged.managers}</div>
        </div>
      </div>

      {loading && (
        <div className="d-flex align-items-center gap-2 text-secondary mb-3">
          <Loader2 className="me-1" size={18} />
          Chargement...
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead className="table-light">
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Sections</th>
              <th>Cartes gérées</th>
              {currentRole === 'superadmin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>
                  <div className="fw-semibold">{u.displayName || u.username}</div>
                  <div className="text-muted small">{u.username}</div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>
                    {u.role}
                  </span>
                </td>
                <td>{u.email || '—'}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {(u.role === 'superadmin' || u.canManageSlides) && (
                      <span className="badge bg-info-subtle text-info">Slides</span>
                    )}
                    {(u.role === 'superadmin' || u.canManagePopup) && (
                      <span className="badge bg-warning-subtle text-warning">Pop-up</span>
                    )}
                    {u.role !== 'superadmin' && !u.canManageSlides && !u.canManagePopup && (
                      <span className="text-muted">Aucune</span>
                    )}
                  </div>
                </td>
                <td>
                  {u.role === 'superadmin' || u.managedCards === 'all' ? (
                    <span className="badge bg-success-subtle text-success">Toutes les cartes</span>
                  ) : (u.managedCards as ManagedCard[])?.length ? (
                    <div className="d-flex flex-wrap gap-1">
                      {(u.managedCards as ManagedCard[]).map(c => (
                        <span key={c._id} className="badge bg-primary-subtle text-primary">
                          {c.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">Aucune</span>
                  )}
                </td>
                {currentRole === 'superadmin' && (
                  <td>
                    {editingId === u._id ? (
                      <div className="d-flex flex-column gap-2">
                        <select
                          className="form-select form-select-sm"
                          value={roleDraft}
                          onChange={e => setRoleDraft(e.target.value as 'admin' | 'user')}
                          disabled={u.username === 'admin'}
                        >
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                        </select>
                        <div className="border rounded p-2" style={{ maxHeight: 160, overflowY: 'auto' }}>
                          {cards.map(c => (
                            <label key={c._id} className="d-flex align-items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={cardsDraft.includes(c._id)}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setCardsDraft(prev =>
                                    checked ? [...prev, c._id] : prev.filter(id => id !== c._id)
                                  );
                                }}
                              />
                              <span>{c.title}</span>
                            </label>
                          ))}
                          {!cards.length && <div className="text-muted small">Aucune carte</div>}
                        </div>
                        <div className="border rounded p-2">
                          <label className="d-flex align-items-center gap-2 mb-1">
                            <input
                              type="checkbox"
                              checked={slidesDraft}
                              onChange={e => setSlidesDraft(e.target.checked)}
                              disabled={u.username === 'admin'}
                            />
                            <span>Gestion des Slides</span>
                          </label>
                          <label className="d-flex align-items-center gap-2">
                            <input
                              type="checkbox"
                              checked={popupDraft}
                              onChange={e => setPopupDraft(e.target.checked)}
                              disabled={u.username === 'admin'}
                            />
                            <span>Gestion du Pop-up</span>
                          </label>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              try {
                                await api.put(`/users/${u._id}/role`, { role: roleDraft });
                                await api.put(`/users/${u._id}/cards`, { cardIds: cardsDraft });
                                await api.put(`/users/${u._id}/section-permissions`, {
                                  canManageSlides: slidesDraft,
                                  canManagePopup: popupDraft
                                });
                                setUsers(prev =>
                                  prev.map(item =>
                                    item._id === u._id
                                      ? {
                                          ...item,
                                          role: roleDraft,
                                          canManageSlides: slidesDraft,
                                          canManagePopup: popupDraft,
                                          managedCards: cards.filter(c => cardsDraft.includes(c._id))
                                        }
                                      : item
                                  )
                                );
                                setEditingId(null);
                              } catch (err: any) {
                                const message = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Erreur de mise à jour';
                                setError(message);
                                onError?.(message);
                              }
                            }}
                          >
                            Enregistrer
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditingId(null)}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditingId(u._id);
                          setRoleDraft(u.role === 'superadmin' ? 'admin' : (u.role as 'admin' | 'user'));
                          const initialCards = ((u.managedCards as ManagedCard[]) || []).map(c => c._id);
                          setCardsDraft(initialCards);
                          setSlidesDraft(!!u.canManageSlides);
                          setPopupDraft(!!u.canManagePopup);
                        }}
                        disabled={u.username === 'admin'}
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && !users.length && (
              <tr>
                <td colSpan={currentRole === 'superadmin' ? 7 : 6} className="text-center text-muted py-4">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserManager;
