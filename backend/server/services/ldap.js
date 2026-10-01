const { Client } = require('ldapts');

const LDAP_ENABLED = (process.env.LDAP_ENABLED || 'true').trim().toLowerCase();
const isEnabled = !['0', 'false', 'no', 'off'].includes(LDAP_ENABLED);

const ldapConfig = {
  url: process.env.LDAP_URL || 'ldap://10.16.220.10:389',
  baseDn: process.env.LDAP_BASE_DN || 'dc=corp,dc=anam,dc=dz',
  domain: process.env.LDAP_DOMAIN || 'corp.anam.dz',
  timeout: Number(process.env.LDAP_TIMEOUT_MS || 7000) || 7000,
  // Optional service account (required for LDAP search/listing; login can still work without it).
  bindUser: process.env.LDAP_BIND_DN || process.env.LDAP_BIND_USER || '',
  bindPassword: process.env.LDAP_BIND_PASSWORD || process.env.LDAP_BIND_PWD || ''
};

const escapeLdapFilterValue = (value = '') =>
  value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00');

const parseCnFromDn = (dn = '') => {
  const match = dn.match(/CN=([^,]+)/i);
  return match?.[1]?.trim() || null;
};

const toBindUser = (identifier = '', domain = ldapConfig.domain) => {
  const trimmed = identifier.trim();
  if (!trimmed) return '';
  if (trimmed.includes('=') && trimmed.includes(',')) return trimmed; // DN fourni
  if (trimmed.includes('@')) return trimmed; // UPN fourni
  return `${trimmed}@${domain}`;
};

async function searchUser(client, identifier) {
  const safe = escapeLdapFilterValue(identifier);
  const isUpn = safe.includes('@');
  const filter = isUpn
    ? `(|(userPrincipalName=${safe})(mail=${safe}))`
    : `(sAMAccountName=${safe})`;

  const res = await client.search(ldapConfig.baseDn, {
    scope: 'sub',
    filter,
    attributes: [
      'dn',
      'cn',
      'sn',
      'givenName',
      'displayName',
      'mail',
      'userPrincipalName',
      'sAMAccountName',
      'memberOf'
    ],
    sizeLimit: 2
  });

  const entry = res.searchEntries?.[0];
  if (!entry) return null;

  const memberOf = Array.isArray(entry.memberOf)
    ? entry.memberOf
    : entry.memberOf
      ? [String(entry.memberOf)]
      : [];

  const username =
    entry.sAMAccountName ||
    (entry.userPrincipalName ? String(entry.userPrincipalName).split('@')[0] : '') ||
    identifier;

  const email =
    entry.mail ||
    entry.userPrincipalName ||
    (identifier.includes('@') ? identifier : `${username}@${ldapConfig.domain}`);

  const firstName = entry.givenName || '';
  const lastName = entry.sn || '';
  const displayName =
    entry.displayName ||
    `${firstName} ${lastName}`.trim() ||
    username;

  const groupNames = memberOf
    .map(parseCnFromDn)
    .filter(Boolean);

  return {
    dn: entry.dn || '',
    username,
    email,
    firstName,
    lastName,
    displayName,
    groupDns: memberOf,
    groupNames
  };
}

async function authenticate(identifier, password) {
  if (!isEnabled) return null;
  const safeId = (identifier || '').trim();
  if (!safeId || !password) return null;

  const timeout = ldapConfig.timeout;

  // 1) Chercher l'utilisateur via compte de service si dispo pour récupérer le DN
  let userProfile = null;
  if (ldapConfig.bindUser && ldapConfig.bindPassword) {
    const serviceClient = new Client({
      url: ldapConfig.url,
      timeout,
      connectTimeout: timeout
    });
    try {
      await serviceClient.bind(
        toBindUser(ldapConfig.bindUser, ldapConfig.domain),
        ldapConfig.bindPassword
      );
      userProfile = await searchUser(serviceClient, safeId);
    } catch (err) {
      // silent fallback to direct bind
      userProfile = null;
    } finally {
      try { await serviceClient.unbind(); } catch {}
    }
  }

  // 2) Si on n'a pas trouvé de profil, on essaie quand même un bind direct par UPN
  const dnForBind = userProfile?.dn || toBindUser(safeId, ldapConfig.domain);

  const authClient = new Client({
    url: ldapConfig.url,
    timeout,
    connectTimeout: timeout
  });

  try {
    await authClient.bind(dnForBind, password);

    // Si pas de profil déjà récupéré (DN direct), on le cherche maintenant
    if (!userProfile) {
      try {
        userProfile = await searchUser(authClient, safeId);
      } catch (err) {
        // Si la recherche échoue, on renvoie un profil minimal
        userProfile = {
          dn: dnForBind,
          username: safeId,
          email: safeId.includes('@') ? safeId : `${safeId}@${ldapConfig.domain}`,
          firstName: '',
          lastName: '',
          displayName: safeId,
          groupDns: [],
          groupNames: []
        };
      }
    }

    return userProfile;
  } catch (err) {
    return null; // mauvais mot de passe ou bind impossible
  } finally {
    try { await authClient.unbind(); } catch {}
  }
}

async function searchUsers(query, options = {}) {
  if (!isEnabled) return [];

  const q = String(query || '').trim();
  const limitRaw = Number(options.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 20;

  if (q.length < 2) {
    throw new Error('Query trop courte (min 2 caractères)');
  }

  if (!ldapConfig.bindUser || !ldapConfig.bindPassword) {
    throw new Error('LDAP bind service account non configuré');
  }

  const safe = escapeLdapFilterValue(q);
  const filter = `(&
    (objectCategory=person)
    (objectClass=user)
    (|
      (sAMAccountName=*${safe}*)
      (sn=*${safe}*)
      (givenName=*${safe}*)
      (cn=*${safe}*)
      (displayName=*${safe}*)
      (mail=*${safe}*)
      (userPrincipalName=*${safe}*)
    )
  )`.replace(/\s+/g, '');

  const client = new Client({
    url: ldapConfig.url,
    timeout: ldapConfig.timeout,
    connectTimeout: ldapConfig.timeout
  });

  try {
    try {
      await client.bind(toBindUser(ldapConfig.bindUser, ldapConfig.domain), ldapConfig.bindPassword);
    } catch (bindError) {
      console.error('LDAP service bind failed:', bindError);
      throw new Error('Compte de service LDAP invalide ou accès refusé');
    }
    const res = await client.search(ldapConfig.baseDn, {
      scope: 'sub',
      filter,
      attributes: [
        'dn',
        'cn',
        'sn',
        'givenName',
        'displayName',
        'mail',
        'userPrincipalName',
        'sAMAccountName'
      ],
      sizeLimit: limit
    });

    const seen = new Set();
    const items = (res.searchEntries || [])
      .map(entry => {
        const username =
          entry.sAMAccountName ||
          (entry.userPrincipalName ? String(entry.userPrincipalName).split('@')[0] : '') ||
          '';
        if (!username) return null;

        const email =
          entry.mail ||
          entry.userPrincipalName ||
          `${username}@${ldapConfig.domain}`;

        const firstName = entry.givenName || '';
        const lastName = entry.sn || '';
        const displayName =
          entry.displayName ||
          `${firstName} ${lastName}`.trim() ||
          username;

        const key = String(username).trim().toLowerCase();
        if (!key || seen.has(key)) return null;
        seen.add(key);

        return {
          dn: entry.dn || '',
          username,
          email,
          displayName
        };
      })
      .filter(Boolean);

    items.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), 'fr', { sensitivity: 'base' }));
    return items;
  } finally {
    try { await client.unbind(); } catch {}
  }
}

async function searchUsersWithBind(bindIdentifier, bindPassword, query, options = {}) {
  if (!isEnabled) return [];

  const q = String(query || '').trim();
  const limitRaw = Number(options.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 20;

  const id = String(bindIdentifier || '').trim();
  const pwd = String(bindPassword || '');

  if (!id || !pwd) {
    throw new Error('Identifiants LDAP requis pour la recherche');
  }

  if (q.length < 2) {
    throw new Error('Query trop courte (min 2 caractères)');
  }

  const safe = escapeLdapFilterValue(q);
  const filter = `(&
    (objectCategory=person)
    (objectClass=user)
    (|
      (sAMAccountName=*${safe}*)
      (sn=*${safe}*)
      (givenName=*${safe}*)
      (cn=*${safe}*)
      (displayName=*${safe}*)
      (mail=*${safe}*)
      (userPrincipalName=*${safe}*)
    )
  )`.replace(/\s+/g, '');

  const client = new Client({
    url: ldapConfig.url,
    timeout: ldapConfig.timeout,
    connectTimeout: ldapConfig.timeout
  });

  try {
    try {
      await client.bind(toBindUser(id, ldapConfig.domain), pwd);
    } catch (bindError) {
      console.error('LDAP bind (user) failed:', bindError);
      throw new Error('Identifiants LDAP invalides');
    }

    const res = await client.search(ldapConfig.baseDn, {
      scope: 'sub',
      filter,
      attributes: [
        'dn',
        'cn',
        'sn',
        'givenName',
        'displayName',
        'mail',
        'userPrincipalName',
        'sAMAccountName'
      ],
      sizeLimit: limit
    });

    const seen = new Set();
    const items = (res.searchEntries || [])
      .map(entry => {
        const username =
          entry.sAMAccountName ||
          (entry.userPrincipalName ? String(entry.userPrincipalName).split('@')[0] : '') ||
          '';
        if (!username) return null;

        const email =
          entry.mail ||
          entry.userPrincipalName ||
          `${username}@${ldapConfig.domain}`;

        const firstName = entry.givenName || '';
        const lastName = entry.sn || '';
        const displayName =
          entry.displayName ||
          `${firstName} ${lastName}`.trim() ||
          username;

        const key = String(username).trim().toLowerCase();
        if (!key || seen.has(key)) return null;
        seen.add(key);

        return {
          dn: entry.dn || '',
          username,
          email,
          displayName
        };
      })
      .filter(Boolean);

    items.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), 'fr', { sensitivity: 'base' }));
    return items;
  } finally {
    try { await client.unbind(); } catch {}
  }
}

module.exports = {
  authenticate,
  searchUsers,
  searchUsersWithBind,
  isEnabled,
  config: ldapConfig
};
