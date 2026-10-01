import api from './index';
const ldapAPI = {
    searchUsers: (q, limit = 20) => api.get('/admin/ldap/users', {
        params: { q, limit }
    })
};
export default ldapAPI;
