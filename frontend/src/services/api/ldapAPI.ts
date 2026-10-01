import api from './index';

export type LdapUserItem = {
  dn: string;
  username: string;
  email?: string;
  displayName?: string;
};

const ldapAPI = {
  searchUsers: (q: string, limit = 20) =>
    api.get<{ users: LdapUserItem[] }>('/admin/ldap/users', {
      params: { q, limit }
    })
};

export default ldapAPI;
