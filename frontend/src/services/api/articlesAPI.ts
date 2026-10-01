import api from './index';

const articlesAPI = {
  getAll: (params?: { page?: number; limit?: number; cardId?: string; category?: string; status?: string }) => 
    api.get('/articles', { params }),
  getAllForAdmin: () => api.get('/articles/all'), 
  getPublished: () => api.get('/articles'),
  getById: (id: string) => api.get(`/articles/${id}`),
  create: (data: any) => api.post('/articles', data),
  update: (id: string, data: any) => api.put(`/articles/${id}`, data),
  
  // SUPPRESSION DOUCE : DELETE /articles/soft/:id (dans votre backend)
  delete: (id: string) => api.delete(`/articles/soft/${id}`),
  
  // PUBLIER/DÉPUBLIER : ces routes n'existent pas dans votre backend, utilisons update
  publish: (id: string) => api.put(`/articles/${id}`, { status: 'published' }),
  unpublish: (id: string) => api.put(`/articles/${id}`, { status: 'draft' }),
  
  getDeleted: () => api.get('/articles/deleted'),
  
  // RESTAURATION : POST /articles/restore/:id (dans votre backend)
  restore: (id: string) => api.post(`/articles/restore/${id}`, {}),
  
  // SUPPRESSION DÉFINITIVE : DELETE /articles/permanent/:id (dans votre backend)
  permanentDelete: (id: string) => api.delete(`/articles/permanent/${id}`),
};

export default articlesAPI;
