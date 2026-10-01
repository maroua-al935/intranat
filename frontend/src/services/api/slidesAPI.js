import api from './index';
const slidesAPI = {
    getAll: () => api.get('/slides'),
    getAllForAdmin: () => api.get('/slides/all'),
    getActive: () => api.get('/slides/active'),
    getById: (id) => api.get(`/slides/${id}`),
    create: (data) => api.post('/slides', data),
    update: (id, data) => api.put(`/slides/${id}`, data),
    getDeleted: () => api.get('/slides/deleted'),
    // CORRECTION: Restaurer utilise POST /slides/restore/:id
    restore: (id) => api.post(`/slides/restore/${id}`, {}), // <-- CHANGÉ
    // CORRECTION: Suppression définitive utilise DELETE /slides/permanent/:id
    permanentDelete: (id) => api.delete(`/slides/permanent/${id}`), // <-- CHANGÉ
    // CORRECTION: Suppression douce utilise DELETE /slides/:id (maintenant c'est soft delete)
    delete: (id) => api.delete(`/slides/${id}`), // <-- CHANGÉ: correspond à la route DELETE /slides/:id
    updateOrder: (slides) => api.post('/slides/reorder', { slides }), // Note: POST, pas PUT
};
export default slidesAPI;
