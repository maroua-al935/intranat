import api from './index';

const cardsAPI = {
  getAll: () => api.get('/cards'),
  getAllForAdmin: () => api.get('/cards/all'),
  getById: (id: string) => api.get(`/cards/${id}`),
  create: (data: any) => api.post('/cards', data),
  update: (id: string, data: any) => api.put(`/cards/${id}`, data),
  getPublic: () => api.get('/cards/public'),
  getDeleted: () => api.get('/cards/deleted'),
  
  updateOrder: (cards: Array<{ id: string; order: number }>) => 
    api.patch('/cards/reorder', { cards }),
  
  restore: (id: string) => api.post(`/cards/restore/${id}`, {}), 
  
  permanentDelete: (id: string) => api.delete(`/cards/permanent/${id}`), 
  
  delete: (id: string) => api.delete(`/cards/${id}`),
};

export default cardsAPI;