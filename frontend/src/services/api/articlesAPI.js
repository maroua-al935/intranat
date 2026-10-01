import api from './index';
const articlesAPI = {
    getAll: (params) => api.get('/articles', { params }),
    getAllForAdmin: () => api.get('/articles/all'),
    getPublished: () => api.get('/articles'),
    getById: (id) => api.get(`/articles/${id}`),
    create: (data) => api.post('/articles', data),
    update: (id, data) => api.put(`/articles/${id}`, data),
    // SUPPRESSION DOUCE : DELETE /articles/soft/:id (dans votre backend)
    delete: (id) => api.delete(`/articles/soft/${id}`),
    // PUBLIER/DÉPUBLIER : ces routes n'existent pas dans votre backend, utilisons update
    publish: (id) => api.put(`/articles/${id}`, { status: 'published' }),
    unpublish: (id) => api.put(`/articles/${id}`, { status: 'draft' }),
    getDeleted: () => api.get('/articles/deleted'),
    // RESTAURATION : POST /articles/restore/:id (dans votre backend)
    restore: (id) => api.post(`/articles/restore/${id}`, {}),
    // SUPPRESSION DÉFINITIVE : DELETE /articles/permanent/:id (dans votre backend)
    permanentDelete: (id) => api.delete(`/articles/permanent/${id}`),
};
export default articlesAPI;
