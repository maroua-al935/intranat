import api from './index';

const slidesAPI = {
  getAll: () => api.get('/slides'),
  getAllForAdmin: () => api.get('/slides/all'),
  getActive: () => api.get('/slides/active'),
  getById: (id: string) => api.get(`/slides/${id}`),
  create: (data: FormData) => api.post('/slides', data),
  update: (id: string, data: any) => api.put(`/slides/${id}`, data),
  getDeleted: () => api.get('/slides/deleted'),
  
  // CORRECTION: Restaurer utilise POST /slides/restore/:id
  restore: (id: string) => api.post(`/slides/restore/${id}`, {}), // <-- CHANGÉ
  
  // CORRECTION: Suppression définitive utilise DELETE /slides/permanent/:id
  permanentDelete: (id: string) => api.delete(`/slides/permanent/${id}`), // <-- CHANGÉ
  
  // CORRECTION: Suppression douce utilise DELETE /slides/:id (maintenant c'est soft delete)
  delete: (id: string) => api.delete(`/slides/${id}`), // <-- CHANGÉ: correspond à la route DELETE /slides/:id
  
  updateOrder: (slides: Array<{ id: string; order: number }>) => 
    api.post('/slides/reorder', { slides }), // Note: POST, pas PUT
};

export default slidesAPI;