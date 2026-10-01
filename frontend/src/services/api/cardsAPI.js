import api from './index';
const cardsAPI = {
    getAll: () => api.get('/cards'),
    getAllForAdmin: () => api.get('/cards/all'),
    getById: (id) => api.get(`/cards/${id}`),
    create: (data) => api.post('/cards', data),
    update: (id, data) => api.put(`/cards/${id}`, data),
    getPublic: () => api.get('/cards/public'),
    getDeleted: () => api.get('/cards/deleted'),
    updateOrder: (cards) => api.patch('/cards/reorder', { cards }),
    restore: (id) => api.post(`/cards/restore/${id}`, {}),
    permanentDelete: (id) => api.delete(`/cards/permanent/${id}`),
    delete: (id) => api.delete(`/cards/${id}`),
};
export default cardsAPI;
