import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { Users, Shield, Loader2 } from 'lucide-react';
const AdminUserManager = ({ onError }) => {
    const [currentRole, setCurrentRole] = useState('admin');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cards, setCards] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [roleDraft, setRoleDraft] = useState('user');
    const [cardsDraft, setCardsDraft] = useState([]);
    const [slidesDraft, setSlidesDraft] = useState(false);
    const [popupDraft, setPopupDraft] = useState(false);
    useEffect(() => {
        try {
            const u = localStorage.getItem('user');
            const parsed = u ? JSON.parse(u) : {};
            setCurrentRole(parsed.role || 'admin');
        }
        catch { }
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const res = await api.get('/users');
                setUsers(res.data);
                setError(null);
            }
            catch (err) {
                const message = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Erreur lors du chargement des utilisateurs';
                setError(message);
                onError?.(message);
            }
            finally {
                setLoading(false);
            }
        };
        const fetchCards = async () => {
            try {
                const res = await api.get('/cards/all');
                setCards(res.data.map((c) => ({ _id: c._id, title: c.title })));
            }
            catch {
                // ignore
            }
        };
        fetchUsers();
        fetchCards();
    }, [onError]);
    const totalCardsManaged = useMemo(() => {
        const admins = users.filter(u => u.role === 'admin').length;
        const managers = users.reduce((acc, u) => {
            if (u.role === 'admin')
                return acc;
            if (u.managedCards === 'all')
                return acc + 1;
            return acc + (u.managedCards?.length || 0);
        }, 0);
        return { admins, managers };
    }, [users]);
    return (_jsxs("div", { className: "p-4 bg-white rounded shadow-sm", children: [_jsxs("div", { className: "d-flex align-items-center justify-content-between mb-3", children: [_jsxs("div", { children: [_jsxs("h2", { className: "h4 fw-bold mb-1 d-flex align-items-center gap-2", children: [_jsx(Users, { size: 20 }), " Gestion des Utilisateurs"] }), _jsx("p", { className: "text-muted mb-0", children: currentRole === 'superadmin'
                                    ? 'Modifier rôle et cartes gérées (superadmin uniquement).'
                                    : 'Vue lecture seule des comptes et des cartes qu’ils peuvent gérer.' })] }), _jsxs("div", { className: "text-end small text-muted", children: [_jsxs("div", { children: [_jsx(Shield, { size: 14, className: "me-1" }), " Admins : ", totalCardsManaged.admins] }), _jsxs("div", { children: ["Cartes li\u00E9es (managers non-admin) : ", totalCardsManaged.managers] })] })] }), loading && (_jsxs("div", { className: "d-flex align-items-center gap-2 text-secondary mb-3", children: [_jsx(Loader2, { className: "me-1", size: 18 }), "Chargement..."] })), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table align-middle", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Utilisateur" }), _jsx("th", { children: "R\u00F4le" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Sections" }), _jsx("th", { children: "Cartes g\u00E9r\u00E9es" }), currentRole === 'superadmin' && _jsx("th", { children: "Actions" })] }) }), _jsxs("tbody", { children: [users.map(u => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("div", { className: "fw-semibold", children: u.displayName || u.username }), _jsx("div", { className: "text-muted small", children: u.username })] }), _jsx("td", { children: _jsx("span", { className: `badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`, children: u.role }) }), _jsx("td", { children: u.email || '—' }), _jsx("td", { children: _jsxs("div", { className: "d-flex flex-wrap gap-1", children: [(u.role === 'superadmin' || u.canManageSlides) && (_jsx("span", { className: "badge bg-info-subtle text-info", children: "Slides" })), (u.role === 'superadmin' || u.canManagePopup) && (_jsx("span", { className: "badge bg-warning-subtle text-warning", children: "Pop-up" })), u.role !== 'superadmin' && !u.canManageSlides && !u.canManagePopup && (_jsx("span", { className: "text-muted", children: "Aucune" }))] }) }), _jsx("td", { children: u.role === 'superadmin' || u.managedCards === 'all' ? (_jsx("span", { className: "badge bg-success-subtle text-success", children: "Toutes les cartes" })) : u.managedCards?.length ? (_jsx("div", { className: "d-flex flex-wrap gap-1", children: u.managedCards.map(c => (_jsx("span", { className: "badge bg-primary-subtle text-primary", children: c.title }, c._id))) })) : (_jsx("span", { className: "text-muted", children: "Aucune" })) }), currentRole === 'superadmin' && (_jsx("td", { children: editingId === u._id ? (_jsxs("div", { className: "d-flex flex-column gap-2", children: [_jsxs("select", { className: "form-select form-select-sm", value: roleDraft, onChange: e => setRoleDraft(e.target.value), disabled: u.username === 'admin', children: [_jsx("option", { value: "admin", children: "admin" }), _jsx("option", { value: "user", children: "user" })] }), _jsxs("div", { className: "border rounded p-2", style: { maxHeight: 160, overflowY: 'auto' }, children: [cards.map(c => (_jsxs("label", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("input", { type: "checkbox", checked: cardsDraft.includes(c._id), onChange: e => {
                                                                            const checked = e.target.checked;
                                                                            setCardsDraft(prev => checked ? [...prev, c._id] : prev.filter(id => id !== c._id));
                                                                        } }), _jsx("span", { children: c.title })] }, c._id))), !cards.length && _jsx("div", { className: "text-muted small", children: "Aucune carte" })] }), _jsxs("div", { className: "border rounded p-2", children: [_jsxs("label", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("input", { type: "checkbox", checked: slidesDraft, onChange: e => setSlidesDraft(e.target.checked), disabled: u.username === 'admin' }), _jsx("span", { children: "Gestion des Slides" })] }), _jsxs("label", { className: "d-flex align-items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: popupDraft, onChange: e => setPopupDraft(e.target.checked), disabled: u.username === 'admin' }), _jsx("span", { children: "Gestion du Pop-up" })] })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { className: "btn btn-sm btn-primary", onClick: async () => {
                                                                    try {
                                                                        await api.put(`/users/${u._id}/role`, { role: roleDraft });
                                                                        await api.put(`/users/${u._id}/cards`, { cardIds: cardsDraft });
                                                                        await api.put(`/users/${u._id}/section-permissions`, {
                                                                            canManageSlides: slidesDraft,
                                                                            canManagePopup: popupDraft
                                                                        });
                                                                        setUsers(prev => prev.map(item => item._id === u._id
                                                                            ? {
                                                                                ...item,
                                                                                role: roleDraft,
                                                                                canManageSlides: slidesDraft,
                                                                                canManagePopup: popupDraft,
                                                                                managedCards: cards.filter(c => cardsDraft.includes(c._id))
                                                                            }
                                                                            : item));
                                                                        setEditingId(null);
                                                                    }
                                                                    catch (err) {
                                                                        const message = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Erreur de mise à jour';
                                                                        setError(message);
                                                                        onError?.(message);
                                                                    }
                                                                }, children: "Enregistrer" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => setEditingId(null), children: "Annuler" })] })] })) : (_jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: () => {
                                                    setEditingId(u._id);
                                                    setRoleDraft(u.role === 'superadmin' ? 'admin' : u.role);
                                                    const initialCards = (u.managedCards || []).map(c => c._id);
                                                    setCardsDraft(initialCards);
                                                    setSlidesDraft(!!u.canManageSlides);
                                                    setPopupDraft(!!u.canManagePopup);
                                                }, disabled: u.username === 'admin', children: "Modifier" })) }))] }, u._id))), !loading && !users.length && (_jsx("tr", { children: _jsx("td", { colSpan: currentRole === 'superadmin' ? 7 : 6, className: "text-center text-muted py-4", children: "Aucun utilisateur trouv\u00E9." }) }))] })] }) })] }));
};
export default AdminUserManager;
