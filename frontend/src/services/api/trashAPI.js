import api from './index';
const trashAPI = {
    // Récupérer tous les éléments de la corbeille
    getAll: () => api.get('/trash'),
    // Restaurer un élément - CORRIGÉ
    restore: (id, type) => {
        // Utilisez les routes spécifiques par type
        switch (type) {
            case 'article':
                return api.post(`/articles/restore/${id}`);
            case 'card':
                return api.post(`/cards/restore/${id}`);
            case 'slide':
                return api.post(`/slides/restore/${id}`);
            default:
                throw new Error(`Type non supporté: ${type}`);
        }
    },
    // Supprimer définitivement un élément - CORRIGÉ
    permanentDelete: (id, type) => {
        // Utilisez les routes spécifiques par type
        switch (type) {
            case 'article':
                return api.delete(`/articles/permanent/${id}`);
            case 'card':
                return api.delete(`/cards/permanent/${id}`);
            case 'slide':
                return api.delete(`/slides/permanent/${id}`);
            default:
                throw new Error(`Type non supporté: ${type}`);
        }
    }
};
export default trashAPI;
