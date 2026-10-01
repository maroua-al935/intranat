const express = require('express');
const router = express.Router();
const { Slide, Article, Card, User, Notification, PopupConfig } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = require('../../middlewares/upload');
const ldapService = require('../services/ldap');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const slidesUploadPath = path.join(uploadsRoot, 'slides');
const cardsUploadPath = path.join(uploadsRoot, 'cards');
const articlesUploadPath = path.join(uploadsRoot, 'articles');
const popupUploadPath = path.join(uploadsRoot, 'popup');

const resolveUploadFile = (imageUrl = '') => {
  if (!imageUrl) return '';
  const relative = imageUrl.replace(/^\/uploads\//, '');
  return path.join(uploadsRoot, relative);
};

// Configuration du stockage pour les slides
const slideStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (!fs.existsSync(slidesUploadPath)) {
      fs.mkdirSync(slidesUploadPath, { recursive: true });
    }
    cb(null, slidesUploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les cartes
const cardStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (!fs.existsSync(cardsUploadPath)) {
      fs.mkdirSync(cardsUploadPath, { recursive: true });
    }
    cb(null, cardsUploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Configuration du stockage pour les articles
const articleStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (!fs.existsSync(articlesUploadPath)) {
      fs.mkdirSync(articlesUploadPath, { recursive: true });
    }
    cb(null, articlesUploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Filtrage des fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
};

const uploadSlide = multer({ 
  storage: slideStorage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadCard = multer({ 
  storage: cardStorage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadArticle = multer({ 
  storage: articleStorage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Configuration du stockage pour les fichiers du pop-up (images ou PDF)
const popupStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(popupUploadPath)) {
      fs.mkdirSync(popupUploadPath, { recursive: true });
    }
    cb(null, popupUploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const popupFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = imageTypes.test(file.mimetype);
  const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdf || (mimetype && extname)) {
    return cb(null, true);
  }

  cb(new Error('Seuls les fichiers PDF ou images sont autorisés (jpeg, jpg, png, gif, webp).'));
};

const uploadPopup = multer({
  storage: popupStorage,
  fileFilter: popupFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 10MB
});

// Middleware d'authentification
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Accès non autorisé' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre-secret-jwt');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Accès réservé au superadmin' });
  }
  next();
};

// === LDAP (superadmin) ===
// Recherche users LDAP (typeahead) pour sélectionner une whitelist par carte
router.get('/admin/ldap/users', auth, adminOnly, async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const limit = Math.min(Number(req.query?.limit || 20) || 20, 50);

    if (q.length < 2) {
      return res.status(400).json({ error: 'q doit contenir au moins 2 caractères' });
    }

    const users = await ldapService.searchUsers(q, { limit });
    return res.json({ users });
  } catch (error) {
    console.error('Erreur GET /admin/ldap/users:', error);
    const message = error?.message || 'Erreur serveur';
    const isConfigError =
      message.includes('service account') ||
      message.includes('Compte de service LDAP') ||
      message.includes('LDAP bind service account');

    return res.status(isConfigError ? 503 : 500).json({
      error: message,
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Recherche LDAP via identifiants fournis par le superadmin (sans compte de service).
router.post('/admin/ldap/users/search', auth, adminOnly, async (req, res) => {
  try {
    const q = String(req.body?.q || '').trim();
    const limit = Math.min(Number(req.body?.limit || 20) || 20, 50);
    const bindUsername = String(req.body?.bindUsername || '').trim();
    const bindPassword = String(req.body?.bindPassword || '');

    if (q.length < 2) {
      return res.status(400).json({ error: 'q doit contenir au moins 2 caractères' });
    }
    if (!bindUsername || !bindPassword) {
      return res.status(400).json({ error: 'Identifiants LDAP requis' });
    }

    const users = await ldapService.searchUsersWithBind(bindUsername, bindPassword, q, { limit });
    return res.json({ users });
  } catch (error) {
    console.error('Erreur POST /admin/ldap/users/search:', error);
    return res.status(500).json({
      error: error?.message || 'Erreur serveur',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const sectionPermissionField = {
  slides: 'canManageSlides',
  popup: 'canManagePopup'
};

// superadmin -> accès total; admin -> accès si permission explicite
const canManageSection = (section) => async (req, res, next) => {
  try {
    if (req.user?.role === 'superadmin') return next();
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const field = sectionPermissionField[section];
    if (!field) {
      return res.status(500).json({ error: 'Section inconnue' });
    }

    const user = await User.findById(req.user.id).select(field);
    if (!user || !user[field]) {
      return res.status(403).json({ error: 'Permission insuffisante pour cette section' });
    }

    next();
  } catch (error) {
    console.error(`Erreur middleware canManageSection(${section}):`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Vérifie si l'utilisateur est autorisé à gérer une carte (assignation directe ou groupe AD)
const userCanManageCard = async (userId, cardId) => {
  if (!cardId) return { allowed: false, card: null };
  const card = await Card.findById(cardId).select('managers managerGroups');
  if (!card) return { allowed: false, card: null };

  const user = await User.findById(userId).select('ldapGroups');
  if (!user) return { allowed: false, card };

  if (user.role === 'superadmin') return { allowed: true, card };
  const isManager = Array.isArray(card.managers) && card.managers.some(id => id?.toString() === user._id.toString());
  const hasGroup =
    Array.isArray(card.managerGroups) &&
    Array.isArray(user.ldapGroups) &&
    card.managerGroups.some(g => user.ldapGroups.includes(g));

  return { allowed: isManager || hasGroup, card };
};

const cardManagerOnly = async (req, res, next) => {
  try {
    if (req.user?.role === 'superadmin') return next();

    const cardId = req.params.id || req.body.cardId || req.query.cardId;
    if (!cardId) return res.status(400).json({ error: 'cardId requis pour vérifier les droits' });

    const { allowed, card } = await userCanManageCard(req.user.id, cardId);
    if (!card) return res.status(404).json({ error: 'Carte non trouvée' });
    if (!allowed) return res.status(403).json({ error: 'Accès refusé pour cette carte' });

    req.card = card;
    next();
  } catch (error) {
    console.error('Erreur middleware cardManagerOnly:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Vérifie l'accès sur la carte liée à un article
const articleManagerOnly = async (req, res, next) => {
  try {
    if (req.user?.role === 'superadmin') return next();

    const articleId = req.params.id || req.body.id || req.body.articleId;
    if (!articleId) return res.status(400).json({ error: 'articleId requis pour vérifier les droits' });

    const article = await Article.findById(articleId).select('cardId');
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    if (!article.cardId) return res.status(403).json({ error: 'Cet article n\'est associé à aucune carte' });

    const { allowed, card } = await userCanManageCard(req.user.id, article.cardId);
    if (!card) return res.status(404).json({ error: 'Carte non trouvée' });
    if (!allowed) return res.status(403).json({ error: 'Accès refusé pour la carte de cet article' });

    // Si on veut déplacer l'article vers une autre carte, vérifier aussi la cible
    if (req.body.cardId && req.body.cardId !== article.cardId.toString()) {
      const targetCheck = await userCanManageCard(req.user.id, req.body.cardId);
      if (!targetCheck.card) return res.status(404).json({ error: 'Carte cible non trouvée' });
      if (!targetCheck.allowed) return res.status(403).json({ error: 'Accès refusé pour la carte cible' });
    }

    req.card = card;
    next();
  } catch (error) {
    console.error('Erreur middleware articleManagerOnly:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// === CONFIGURATION POP-UP PORTAIL PUBLIC ===
const DEFAULT_POPUP_CONFIG = {
  enabled: true,
  mode: 'always',
  intervalHours: 24,
  title: 'Bienvenue sur le portail public',
  message: "Acces rapide aux informations et services essentiels de l'ANAM.",
  bullets: [
    'Rechercher des notes, lois et formulaires.',
    'Explorer les sections par categories.',
    'Acceder a vos applications internes.'
  ],
  primaryLabel: 'Decouvrir',
  linkType: 'none',
  linkUrl: '',
  linkLabel: ''
};

const normalizePopupConfig = (config = {}) => {
  const merged = { ...DEFAULT_POPUP_CONFIG, ...config };

  merged.enabled = merged.enabled !== false;
  merged.mode = merged.mode === 'always' ? 'always' : 'interval';

  const interval = Number(merged.intervalHours);
  merged.intervalHours = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_POPUP_CONFIG.intervalHours;

  merged.title = typeof merged.title === 'string' ? merged.title.trim() : DEFAULT_POPUP_CONFIG.title;
  merged.message = typeof merged.message === 'string' ? merged.message.trim() : DEFAULT_POPUP_CONFIG.message;
  merged.primaryLabel = typeof merged.primaryLabel === 'string' && merged.primaryLabel.trim()
    ? merged.primaryLabel.trim()
    : DEFAULT_POPUP_CONFIG.primaryLabel;

  if (!Array.isArray(merged.bullets)) {
    merged.bullets = DEFAULT_POPUP_CONFIG.bullets;
  } else {
    merged.bullets = merged.bullets
      .map(item => String(item).trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  if (!['none', 'url', 'pdf'].includes(merged.linkType)) {
    merged.linkType = DEFAULT_POPUP_CONFIG.linkType;
  }
  merged.linkUrl = typeof merged.linkUrl === 'string' ? merged.linkUrl.trim() : '';
  merged.linkLabel = typeof merged.linkLabel === 'string' ? merged.linkLabel.trim() : '';

  return merged;
};

const sanitizePopupPayload = (body = {}) => {
  const payload = {
    enabled: body.enabled !== false,
    mode: body.mode === 'always' ? 'always' : 'interval',
    intervalHours: body.intervalHours,
    title: body.title,
    message: body.message,
    primaryLabel: body.primaryLabel,
    linkType: body.linkType,
    linkUrl: body.linkUrl,
    linkLabel: body.linkLabel,
    bullets: Array.isArray(body.bullets)
      ? body.bullets
      : typeof body.bullets === 'string'
        ? body.bullets.split('\n')
        : []
  };

  return normalizePopupConfig(payload);
};

router.get('/public/popup-config', async (req, res) => {
  try {
    const config = await PopupConfig.findOne({ key: 'public_portal' }).lean();
    return res.json(normalizePopupConfig(config || {}));
  } catch (error) {
    console.error('Erreur popup-config:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/admin/popup-config', auth, canManageSection('popup'), async (req, res) => {
  try {
    const payload = sanitizePopupPayload(req.body || {});
    const updated = await PopupConfig.findOneAndUpdate(
      { key: 'public_portal' },
      { ...payload, key: 'public_portal' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json(normalizePopupConfig(updated || payload));
  } catch (error) {
    console.error('Erreur popup-config update:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/admin/popup-upload', auth, canManageSection('popup'), uploadPopup.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const fileUrl = `/uploads/popup/${req.file.filename}`;
    return res.json({
      url: fileUrl
    });
  } catch (error) {
    console.error('Erreur popup-upload:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES CARTES ===

// Créer une carte avec upload d'image
router.post('/cards/upload', uploadCard.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier envoyé' });
  }

  // URL accessible depuis le frontend
  const fileUrl = `/uploads/cards/${req.file.filename}`;
  res.json({
    url: fileUrl
  });
});

// Upload d'image pour les articles
router.post('/articles/upload', auth, uploadArticle.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier envoyé' });
  }

  const fileUrl = `/uploads/articles/${req.file.filename}`;
  res.json({
    url: fileUrl
  });
});

// === UTILISATEURS & PERMISSIONS (admin) ===
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email role displayName ldapGroups canManageSlides canManagePopup')
      .lean();

    const cards = await Card.find({ deleted: { $ne: true } })
      .select('title managers managerGroups')
      .lean();

    const result = users.map(u => {
      const managed = cards
        .filter(c => {
          const byId = Array.isArray(c.managers) && c.managers.some(id => id?.toString() === u._id.toString());
          const byGroup = Array.isArray(c.managerGroups) && Array.isArray(u.ldapGroups) &&
            c.managerGroups.some(g => u.ldapGroups.includes(g));
          return byId || byGroup;
        })
        .map(c => ({ _id: c._id, title: c.title }));

      return {
        _id: u._id,
        username: u.username,
        email: u.email || '',
        role: u.role || 'user',
        displayName: u.displayName || u.username,
        canManageSlides: !!u.canManageSlides,
        canManagePopup: !!u.canManagePopup,
        ldapGroups: u.ldapGroups || [],
        managedCards: u.role === 'superadmin' ? 'all' : managed
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur GET /users:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le rôle d'un utilisateur (admin/user) - réservé superadmin
router.put('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role doit être "admin" ou "user"' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (target.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de modifier le superadmin' });
    }

    // Update partiel pour eviter la revalidation complete (certains users historiques n'ont pas password).
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    );
    res.json({ success: true, role: updated?.role || role });
  } catch (error) {
    console.error('Erreur PUT /users/:id/role:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Assigner des cartes à un utilisateur (remplace l’ensemble) - réservé superadmin
router.put('/users/:id/cards', auth, adminOnly, async (req, res) => {
  try {
    const { cardIds } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }
    if (!Array.isArray(cardIds)) {
      return res.status(400).json({ error: 'cardIds doit être un tableau' });
    }

    const normalizedCardIds = [...new Set(
      cardIds
        .map(id => String(id).trim())
        .filter(Boolean)
    )];
    const invalidIds = normalizedCardIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length) {
      return res.status(400).json({ error: `ID(s) carte invalide(s): ${invalidIds.join(', ')}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de modifier les cartes du superadmin' });
    }

    // Retirer l'utilisateur de toutes les cartes
    await Card.updateMany(
      { managers: user._id },
      { $pull: { managers: user._id } }
    );

    // Ajouter sur les cartes choisies
    if (cardIds.length) {
      await Card.updateMany(
        { _id: { $in: normalizedCardIds } },
        { $addToSet: { managers: user._id } }
      );
    }

    res.json({ success: true, cardIds: normalizedCardIds });
  } catch (error) {
    console.error('Erreur PUT /users/:id/cards:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour les permissions section (slides/popup) - réservé superadmin
router.put('/users/:id/section-permissions', auth, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const { canManageSlides, canManagePopup } = req.body || {};
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (target.username === 'admin') {
      return res.status(403).json({ error: 'Impossible de modifier les permissions du superadmin' });
    }

    const updates = {};
    if (typeof canManageSlides === 'boolean') updates.canManageSlides = canManageSlides;
    if (typeof canManagePopup === 'boolean') updates.canManagePopup = canManagePopup;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('canManageSlides canManagePopup');

    res.json({
      success: true,
      canManageSlides: !!updated?.canManageSlides,
      canManagePopup: !!updated?.canManagePopup
    });
  } catch (error) {
    console.error('Erreur PUT /users/:id/section-permissions:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/cards', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, category, isActive, imageUrl } = req.body;
    const managers = Array.isArray(req.body.managers) ? req.body.managers : [];
    const managerGroups = Array.isArray(req.body.managerGroups) ? req.body.managerGroups : [];

    // Settings that affect access/visibility should be restricted to superadmin.
    const requiresLdapLogin = req.user?.role === 'superadmin'
      ? (req.body?.requiresLdapLogin === true || req.body?.requiresLdapLogin === 'true')
      : false;
    const disableNotifications = req.user?.role === 'superadmin'
      ? (req.body?.disableNotifications === true || req.body?.disableNotifications === 'true')
      : false;
    const accessUsernames = req.user?.role === 'superadmin'
      ? (Array.isArray(req.body.accessUsernames) ? req.body.accessUsernames : [])
      : [];

    const newCard = new Card({
      title,
      description,
      category,
      isActive,
      imageUrl,
      requiresLdapLogin,
      accessUsernames,
      disableNotifications,
      order: 0,
      deleted: false, // Ajouté pour la suppression douce
      managers,
      managerGroups
    });

    await newCard.save();
    res.status(201).json(newCard);
  } catch (error) {
    console.error('Erreur POST /cards:', error);
    res.status(400).json({ error: error.message });
  }
});

// Récupérer toutes les cartes actives (public) - EXCLURE LES SUPPRIMÉS
router.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find({ 
      isActive: true,
      deleted: { $ne: true } // N'inclut pas les cartes supprimées
    })
      .select('-accessUsernames')
      .sort({ order: 1 });
    res.json(cards);
  } catch (error) {
    console.error('Erreur GET /cards:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les cartes (admin) - EXCLURE LES SUPPRIMÉS
router.get('/cards/all', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') {
      const cards = await Card.find({ deleted: { $ne: true } }).sort({ order: 1 });
      return res.json(cards);
    }

    // admin non superadmin : ne renvoyer que les cartes qu'il gère
    const user = await User.findById(req.user.id).select('ldapGroups');
    const cards = await Card.find({ 
      deleted: { $ne: true },
      $or: [
        { managers: user?._id },
        { managerGroups: { $in: user?.ldapGroups || [] } }
      ]
    }).sort({ order: 1 });
    res.json(cards);
  } catch (error) {
    console.error('Erreur GET /cards/all:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les cartes supprimées
router.get('/cards/deleted', auth, adminOnly, async (req, res) => {
  try {
    const cards = await Card.find({ deleted: true }).sort({ deletedAt: -1 });
    res.json(cards);
  } catch (error) {
    console.error('Erreur GET /cards/deleted:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Recuperer une carte par ID (public) - EXCLURE LES SUPPRIMES
router.get('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      deleted: { $ne: true }
    }).select('-accessUsernames');

    if (!card) {
      return res.status(404).json({ error: 'Carte non trouvee' });
    }

    res.json(card);
  } catch (error) {
    console.error('Erreur GET /cards/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre a jour une carte avec upload optionnel
router.put('/cards/:id', auth, cardManagerOnly, uploadCard.single('image'), async (req, res) => {
  try {
    console.log('=== DEBUG CARD UPDATE ===');
    console.log('Body reçu:', req.body);
    console.log('isActive reçu:', req.body.isActive, 'Type:', typeof req.body.isActive);
    console.log('isActive === "false":', req.body.isActive === 'false');
    console.log('isActive !== "false":', req.body.isActive !== 'false');
    
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }
    
    // Vérifier si la carte est supprimée
    if (card.deleted) {
      return res.status(410).json({ error: 'Cette carte a été supprimée' });
    }
    
    // Mettre à jour les données
    card.title = req.body.title || card.title;  
    card.description = req.body.description || card.description;
    card.category = req.body.category || card.category;
    card.color = req.body.color || card.color;
    // Seul le superadmin peut modifier les affectations de gestion
    if (req.user?.role === 'superadmin' && Array.isArray(req.body.managers)) {
      card.managers = req.body.managers;
    }
    if (req.user?.role === 'superadmin' && Array.isArray(req.body.managerGroups)) {
      card.managerGroups = req.body.managerGroups;
    }
    if (req.body.isActive !== undefined) {
      if (req.body.isActive === 'false' || req.body.isActive === false) {
        card.isActive = false;
      } else if (req.body.isActive === 'true' || req.body.isActive === true) {
        card.isActive = true;
      }
    }

    // Settings that affect access/visibility should be restricted to superadmin.
    if (req.user?.role === 'superadmin') {
      if (req.body.requiresLdapLogin !== undefined) {
        if (req.body.requiresLdapLogin === 'false' || req.body.requiresLdapLogin === false) {
          card.requiresLdapLogin = false;
        } else if (req.body.requiresLdapLogin === 'true' || req.body.requiresLdapLogin === true) {
          card.requiresLdapLogin = true;
        }
      }

      if (req.body.accessUsernames !== undefined) {
        card.accessUsernames = Array.isArray(req.body.accessUsernames) ? req.body.accessUsernames : [];
      }

      if (req.body.disableNotifications !== undefined) {
        if (req.body.disableNotifications === 'false' || req.body.disableNotifications === false) {
          card.disableNotifications = false;
        } else if (req.body.disableNotifications === 'true' || req.body.disableNotifications === true) {
          card.disableNotifications = true;
        }
      }
    }

    // Gérer la nouvelle image si fournie (fichier ou URL)
    let incomingImageUrl;
    if (req.file) {
      incomingImageUrl = `/uploads/cards/${req.file.filename}`;
    } else if (typeof req.body.imageUrl === 'string') {
      incomingImageUrl = req.body.imageUrl.trim();
    }

    if (incomingImageUrl !== undefined && incomingImageUrl !== card.imageUrl) {
      if (card.imageUrl && card.imageUrl.startsWith('/uploads/')) {
        const oldImagePath = resolveUploadFile(card.imageUrl);
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      card.imageUrl = incomingImageUrl;
    }
    
    console.log('Ancien isActive:', card.isActive);
    
    await card.save();
    console.log('Carte sauvegardée avec isActive:', card.isActive);
    res.json(card);
    
  } catch (error) {
    console.error('Erreur PUT /cards/:id:', error);
    res.status(400).json({ error: error.message });
  }
});

// === ROUTES POUR LA CORBEILLE ===

// Récupérer les éléments supprimés
router.get('/trash', auth, adminOnly, async (req, res) => {
  try {
    const [articles, cards, slides] = await Promise.all([
      Article.find({ deleted: true }),
      Card.find({ deleted: true }),
      Slide.find({ deleted: true })
    ]);
    
    const trashItems = [
      ...articles.map(item => ({ 
        ...item.toObject(), 
        type: 'article',
        _id: item._id
      })),
      ...cards.map(item => ({ 
        ...item.toObject(), 
        type: 'card',
        _id: item._id
      })),
      ...slides.map(item => ({ 
        ...item.toObject(), 
        type: 'slide',
        _id: item._id
      }))
    ];
    
    // Trier par date de suppression (plus récent d'abord)
    trashItems.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    
    res.json(trashItems);
  } catch (error) {
    console.error('Erreur GET /trash:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route générique de suppression douce
const softDelete = (Model) => async (req, res) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: `${Model.modelName} non trouvé` });
    }
    
    // Marquer comme supprimé au lieu de supprimer
    item.deleted = true;
    item.deletedAt = new Date();
    item.deletedBy = req.user.id;
    await item.save();
    
    res.json({ 
      message: `${Model.modelName} déplacé dans la corbeille`,
      item 
    });
  } catch (error) {
    console.error(`Erreur soft delete ${Model.modelName}:`, error);
    res.status(400).json({ error: error.message });
  }
};

// Route générique de restauration
const restoreItem = (Model) => async (req, res) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: `${Model.modelName} non trouvé` });
    }
    
    // Restaurer l'élément
    item.deleted = false;
    item.deletedAt = null;
    item.deletedBy = null;
    await item.save();
    
    res.json({ 
      message: `${Model.modelName} restauré`,
      item 
    });
  } catch (error) {
    console.error(`Erreur restore ${Model.modelName}:`, error);
    res.status(400).json({ error: error.message });
  }
};

// Route générique de suppression définitive
const permanentDelete = (Model) => async (req, res) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: `${Model.modelName} non trouvé` });
    }
    
    // Supprimer physiquement l'élément
    await Model.deleteOne({ _id: req.params.id });
    
    // Si c'est une carte, supprimer aussi ses articles
    if (Model.modelName === 'Card') {
      await Article.deleteMany({ cardId: req.params.id });
    }
    
    res.json({ 
      message: `${Model.modelName} supprimé définitivement`
    });
  } catch (error) {
    console.error(`Erreur permanent delete ${Model.modelName}:`, error);
    res.status(400).json({ error: error.message });
  }
};

// === ROUTES SPÉCIFIQUES POUR CHAQUE TYPE ===

// Articles
router.delete('/articles/soft/:id', auth, articleManagerOnly, softDelete(Article));
router.post('/articles/restore/:id', auth, adminOnly, restoreItem(Article));
router.delete('/articles/permanent/:id', auth, adminOnly, permanentDelete(Article));

// Cartes
router.delete('/cards/soft/:id', auth, adminOnly, softDelete(Card));
router.post('/cards/restore/:id', auth, adminOnly, restoreItem(Card));
router.delete('/cards/permanent/:id', auth, adminOnly, permanentDelete(Card));

// Slides
router.delete('/slides/soft/:id', auth, canManageSection('slides'), softDelete(Slide));
router.post('/slides/restore/:id', auth, canManageSection('slides'), restoreItem(Slide));
router.delete('/slides/permanent/:id', auth, canManageSection('slides'), permanentDelete(Slide));

// REMPLACER les anciennes routes DELETE par les nouvelles routes de suppression douce

// Ancienne route DELETE /cards/:id - REMPLACÉE par soft delete
router.delete('/cards/:id', auth, adminOnly, softDelete(Card));


// Ancienne route DELETE /slides/:id - REMPLACÉE par soft delete
router.delete('/slides/:id', auth, canManageSection('slides'), softDelete(Slide));

// === ROUTES POUR LES SLIDES ===

// Récupérer tous les slides actifs (public) - EXCLURE LES SUPPRIMÉS
router.get('/slides', async (req, res) => {
  try {
    const slides = await Slide.find({ 
      isActive: true,
      deleted: { $ne: true } // N'inclut pas les slides supprimés
    }).sort({ order: 1 });
    res.json(slides);
  } catch (error) {
    console.error('Erreur GET /slides:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les slides (admin) - EXCLURE LES SUPPRIMÉS
router.get('/slides/all', auth, canManageSection('slides'), async (req, res) => {
  try {
    const slides = await Slide.find({ 
      deleted: { $ne: true } // N'inclut pas les slides supprimés
    }).sort({ order: 1 });
    res.json(slides);
  } catch (error) {
    console.error('Erreur GET /slides/all:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les slides supprimés
router.get('/slides/deleted', auth, canManageSection('slides'), async (req, res) => {
  try {
    const slides = await Slide.find({ deleted: true }).sort({ deletedAt: -1 });
    res.json(slides);
  } catch (error) {
    console.error('Erreur GET /slides/deleted:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un slide avec upload d'image
router.post('/slides', auth, canManageSection('slides'), uploadSlide.single('image'), async (req, res) => {
  try {
    const slideData = {
      title: req.body.title,
      subtitle: req.body.subtitle,
      link: req.body.link || '',
      buttonText: req.body.buttonText || 'En savoir plus',
      isActive: req.body.isActive === 'true',
      order: parseInt(req.body.order) || 0,
      deleted: false // Ajouté pour la suppression douce
    };
    
    if (req.file) {
      slideData.imageUrl = `/uploads/slides/${req.file.filename}`;
    }
    
    const slide = new Slide(slideData);
    await slide.save();
    res.status(201).json(slide);
  } catch (error) {
    console.error('Erreur POST /slides:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un slide avec upload optionnel
router.put('/slides/:id', auth, canManageSection('slides'), uploadSlide.single('image'), async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Slide non trouvé' });
    }
    
    // Vérifier si le slide est supprimé
    if (slide.deleted) {
      return res.status(410).json({ error: 'Ce slide a été supprimé' });
    }
    
    // Mettre à jour les données
    slide.title = req.body.title || slide.title;
    slide.subtitle = req.body.subtitle || slide.subtitle;
    slide.link = req.body.link || slide.link;
    slide.buttonText = req.body.buttonText || slide.buttonText;
    slide.isActive = req.body.isActive === 'true';
    slide.order = parseInt(req.body.order) || slide.order;
    
    // Gérer la nouvelle image si fournie
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (slide.imageUrl && slide.imageUrl.startsWith('/uploads/')) {
        const oldImagePath = resolveUploadFile(slide.imageUrl);
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      slide.imageUrl = `/uploads/slides/${req.file.filename}`;
    }
    
    await slide.save();
    res.json(slide);
  } catch (error) {
    console.error('Erreur PUT /slides/:id:', error);
    res.status(400).json({ error: error.message });
  }
});

// Réorganiser les slides
router.post('/slides/reorder', auth, canManageSection('slides'), async (req, res) => {
  try {
    const { slides } = req.body;
    
    const updatePromises = slides.map(slide => 
      Slide.findByIdAndUpdate(slide.id, { order: slide.order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Ordre mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur POST /slides/reorder:', error);
    res.status(400).json({ error: error.message });
  }
});
// Réorganiser les cartes
router.patch('/cards/reorder', auth, adminOnly, async (req, res) => {
  try {
    const { cards } = req.body;
    
    console.log('Reordonnancement cartes reçu:', cards);
    
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Données invalides. "cards" doit être un tableau.' });
    }
    
    // Mettre à jour chaque carte
    const updatePromises = cards.map(item => 
      Card.findByIdAndUpdate(
        item.id, 
        { order: item.order }, 
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    console.log(`${cards.length} cartes réordonnées`);
    
    res.json({ 
      success: true, 
      message: 'Ordre des cartes mis à jour avec succès',
      count: cards.length
    });
    
  } catch (error) {
    console.error('Erreur PATCH /cards/reorder:', error);
    res.status(400).json({ error: error.message });
  }
});
// === ROUTES D'AUTHENTIFICATION ===
const normalizeRole = (role = '') => (role === 'superadmin' ? 'superadmin' : role === 'admin' ? 'admin' : 'user');
const defaultLdapRole = normalizeRole((process.env.LDAP_DEFAULT_ROLE || 'user').trim().toLowerCase());
const adminGroupsEnv = (process.env.LDAP_ADMIN_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);

const ensureLdapUser = async (profile) => {
  const username = (profile.username || profile.email || '').trim();
  if (!username) throw new Error('Profil LDAP invalide (username manquant)');

  const ldapGroups = profile.groupNames?.length
    ? profile.groupNames
    : (profile.groupDns || []);

  // Si un groupe LDAP figure dans LDAP_ADMIN_GROUPS, forcer le rôle admin
  const isLdapAdmin = adminGroupsEnv.length > 0 &&
    ldapGroups.some(g => adminGroupsEnv.includes(g));

  let user = await User.findOne({ username });

  if (!user) {
    const randomPass = crypto.randomBytes(24).toString('hex');
    const hashed = await bcrypt.hash(randomPass, 10);
    user = await User.create({
      username,
      password: hashed,
      role: isLdapAdmin ? 'admin' : defaultLdapRole,
      email: profile.email || '',
      displayName: profile.displayName || '',
      ldapDn: profile.dn || '',
      ldapGroups,
      isLdap: true,
      lastLoginAt: new Date(),
      lastLdapLoginAt: new Date()
    });
  } else {
    const updates = {
      email: profile.email || user.email || '',
      displayName: profile.displayName || user.displayName || '',
      ldapDn: profile.dn || user.ldapDn || '',
      ldapGroups: ldapGroups.length ? ldapGroups : user.ldapGroups || [],
      isLdap: true,
      lastLoginAt: new Date(),
      lastLdapLoginAt: new Date()
    };

    // Synchroniser le rôle si admin détecté ou si aucune valeur
    if (isLdapAdmin && user.role !== 'admin' && user.role !== 'superadmin') updates.role = 'admin';
    else if (!user.role) updates.role = defaultLdapRole;

    user = await User.findByIdAndUpdate(user._id, updates, { new: true });
  }

  return user;
};

// Login (portail / cartes protégées) : accepte les comptes LDAP (et fallback local) pour tous les rôles.
router.post('/portal/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis" });
    }

    const jwtSecret = process.env.JWT_SECRET || 'votre-secret-jwt';

    // Auth locale en premier (si user existe en base)
    const existing = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (existing && existing.password) {
      try {
        const validPassword = await bcrypt.compare(password, existing.password);
        if (validPassword) {
          const token = jwt.sign(
            { id: existing._id, username: existing.username, role: existing.role },
            jwtSecret,
            { expiresIn: '8h' }
          );

          return res.json({
            token,
            user: {
              username: existing.username,
              role: existing.role,
              email: existing.email || '',
              displayName: existing.displayName || existing.username,
              ldapGroups: existing.ldapGroups || [],
              canManageSlides: existing.role === 'superadmin' ? true : !!existing.canManageSlides,
              canManagePopup: existing.role === 'superadmin' ? true : !!existing.canManagePopup
            }
          });
        }
      } catch (err) {
        console.warn('bcrypt compare failed, fallback LDAP:', err.message);
      }
    }

    // LDAP
    const ldapProfile = await ldapService.authenticate(username, password);
    if (!ldapProfile) {
      return res.status(401).json({ error: 'Identifiants invalides (local ou LDAP)' });
    }

    const ldapUser = await ensureLdapUser(ldapProfile);
    const token = jwt.sign(
      { id: ldapUser._id, username: ldapUser.username, role: ldapUser.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        username: ldapUser.username,
        role: ldapUser.role,
        email: ldapUser.email || '',
        displayName: ldapUser.displayName || ldapUser.username,
        ldapGroups: ldapUser.ldapGroups || [],
        canManageSlides: ldapUser.role === 'superadmin' ? true : !!ldapUser.canManageSlides,
        canManagePopup: ldapUser.role === 'superadmin' ? true : !!ldapUser.canManagePopup
      }
    });
  } catch (error) {
    console.error('Erreur portal/login:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    // Auth locale en premier
    const existing = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    if (existing && existing.password) {
      try {
        const validPassword = await bcrypt.compare(password, existing.password);
        if (validPassword) {
          if (!['admin', 'superadmin'].includes(existing.role)) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
          }
          const token = jwt.sign(
            { id: existing._id, username: existing.username, role: existing.role },
            process.env.JWT_SECRET || 'votre-secret-jwt',
            { expiresIn: '8h' }
          );
          return res.json({ 
            token, 
            user: { 
              username: existing.username, 
              role: existing.role,
              email: existing.email || '',
              displayName: existing.displayName || existing.username,
              canManageSlides: existing.role === 'superadmin' ? true : !!existing.canManageSlides,
              canManagePopup: existing.role === 'superadmin' ? true : !!existing.canManagePopup
            } 
          });
        }
      } catch (err) {
        console.warn('bcrypt compare failed, fallback LDAP:', err.message);
      }
    }

    // Fallback LDAP si activé
    const ldapProfile = await ldapService.authenticate(username, password);
    if (!ldapProfile) {
      return res.status(401).json({ error: 'Identifiants invalides (local ou LDAP)' });
    }

    const ldapUser = await ensureLdapUser(ldapProfile);
    if (!['admin', 'superadmin'].includes(ldapUser.role)) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const token = jwt.sign(
      { id: ldapUser._id, username: ldapUser.username, role: ldapUser.role },
      process.env.JWT_SECRET || 'votre-secret-jwt',
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token, 
      user: { 
        username: ldapUser.username, 
        role: ldapUser.role,
        email: ldapUser.email || '',
        displayName: ldapUser.displayName || ldapUser.username,
        canManageSlides: ldapUser.role === 'superadmin' ? true : !!ldapUser.canManageSlides,
        canManagePopup: ldapUser.role === 'superadmin' ? true : !!ldapUser.canManagePopup
      } 
    });
    
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === ROUTES POUR LES ARTICLES ===
// Récupérer tous les articles publiés (public) - EXCLURE LES SUPPRIMÉS
router.get('/articles', async (req, res) => {
  try {
    const { category, cardId, status } = req.query;
    const jwtSecret = process.env.JWT_SECRET || 'votre-secret-jwt';
    const token = req.headers.authorization?.split(' ')?.[1];
    let authUser = null;
    if (token) {
      try {
        authUser = jwt.verify(token, jwtSecret);
      } catch {
        authUser = null;
      }
    }

    let query = { 
      status: 'published',
      deleted: { $ne: true } // N'inclut pas les articles supprimés
    };
    
    if (category) query.category = category;
    if (cardId) {
      const cardIdStr = String(cardId);
      if (!mongoose.Types.ObjectId.isValid(cardIdStr)) {
        return res.status(400).json({ error: 'cardId invalide' });
      }

      const card = await Card.findOne({ _id: cardIdStr, deleted: { $ne: true } })
        .select('requiresLdapLogin accessUsernames')
        .lean();

      if (card?.requiresLdapLogin && !authUser) {
        return res.status(401).json({ error: 'Authentification requise pour accéder à cette carte' });
      }

      if (card?.requiresLdapLogin && authUser && Array.isArray(card?.accessUsernames) && card.accessUsernames.length) {
        if (authUser?.role !== 'superadmin') {
          const allowed = new Set(card.accessUsernames.map(u => String(u).trim().toLowerCase()).filter(Boolean));
          const username = String(authUser?.username || '').trim().toLowerCase();
          if (!allowed.has(username)) {
            return res.status(403).json({ error: 'Accès interdit: utilisateur non autorisé pour cette carte' });
          }
        }
      }

      query.cardId = cardIdStr;
    } else if (!authUser) {
      // Sans cardId explicite, ne pas exposer les articles des cartes protégées.
      const protectedCardIds = await Card.distinct('_id', {
        requiresLdapLogin: true,
        deleted: { $ne: true }
      });

      if (protectedCardIds.length) {
        query.cardId = { $nin: protectedCardIds };
      }
    }
    if (status) query.status = status;
    
    const articles = await Article.find(query)
      .populate('cardId')
      .sort({ date: -1 });
    res.json(articles);
  } catch (error) {
    console.error('Erreur GET /articles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les articles (admin) - EXCLURE LES SUPPRIMÉS
router.get('/articles/all', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') {
      const articles = await Article.find({ deleted: { $ne: true } })
        .populate('cardId')
        .sort({ date: -1 });
      return res.json(articles);
    }

    // admin : ne voir que les articles dont la carte est gérée
    const user = await User.findById(req.user.id).select('ldapGroups');
    const cards = await Card.find({
      $or: [
        { managers: user?._id },
        { managerGroups: { $in: user?.ldapGroups || [] } }
      ]
    }).select('_id');
    const cardIds = cards.map(c => c._id);

    const articles = await Article.find({ 
      deleted: { $ne: true },
      cardId: { $in: cardIds }
    })
      .populate('cardId')
      .sort({ date: -1 });
    res.json(articles);
  } catch (error) {
    console.error('Erreur GET /articles/all:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les articles supprimés
router.get('/articles/deleted', auth, adminOnly, async (req, res) => {
  try {
    const articles = await Article.find({ deleted: true })
      .populate('cardId')
      .sort({ deletedAt: -1 });
    res.json(articles);
  } catch (error) {
    console.error('Erreur GET /articles/deleted:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un article par ID (public)
router.get('/articles/:id', async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'votre-secret-jwt';
    const token = req.headers.authorization?.split(' ')?.[1];
    let authUser = null;
    if (token) {
      try {
        authUser = jwt.verify(token, jwtSecret);
      } catch {
        authUser = null;
      }
    }

    const article = await Article.findOne({ 
      _id: req.params.id,
      deleted: { $ne: true } // N'inclut pas les articles supprimés
    }).populate('cardId');
    
    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    const card = article.cardId && typeof article.cardId === 'object' ? article.cardId : null;
    if (card?.requiresLdapLogin && !authUser) {
      return res.status(401).json({ error: 'Authentification requise pour accéder à cet article' });
    }
    
    if (card?.requiresLdapLogin && authUser && Array.isArray(card?.accessUsernames) && card.accessUsernames.length) {
      if (authUser?.role !== 'superadmin') {
        const allowed = new Set(card.accessUsernames.map(u => String(u).trim().toLowerCase()).filter(Boolean));
        const username = String(authUser?.username || '').trim().toLowerCase();
        if (!allowed.has(username)) {
          return res.status(403).json({ error: 'Accès interdit: utilisateur non autorisé pour cette carte' });
        }
      }
    }

    article.views += 1;
    await article.save();
    
    res.json(article);
  } catch (error) {
    console.error('Erreur GET /articles/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Télécharger/afficher le fichier (PDF) d'un article.
// - Si l'article est protégé (pdfProtected=true), le fichier est attendu dans /uploads/protected/...
// - L'accès suit les mêmes règles que GET /articles/:id (carte LDAP/whitelist).
router.get('/articles/:id/file', async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'votre-secret-jwt';
    const token = req.headers.authorization?.split(' ')?.[1];
    let authUser = null;
    if (token) {
      try {
        authUser = jwt.verify(token, jwtSecret);
      } catch {
        authUser = null;
      }
    }

    const article = await Article.findOne({
      _id: req.params.id,
      deleted: { $ne: true }
    }).populate('cardId');

    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    if (!article.pdfUrl) return res.status(404).json({ error: 'Aucun fichier associé à cet article' });

    const card = article.cardId && typeof article.cardId === 'object' ? article.cardId : null;
    if (card?.requiresLdapLogin && !authUser) {
      return res.status(401).json({ error: 'Authentification requise pour accéder à ce fichier' });
    }

    if (card?.requiresLdapLogin && authUser && Array.isArray(card?.accessUsernames) && card.accessUsernames.length) {
      if (authUser?.role !== 'superadmin') {
        const allowed = new Set(card.accessUsernames.map(u => String(u).trim().toLowerCase()).filter(Boolean));
        const username = String(authUser?.username || '').trim().toLowerCase();
        if (!allowed.has(username)) {
          return res.status(403).json({ error: 'Accès interdit: utilisateur non autorisé pour cette carte' });
        }
      }
    }

    if (!String(article.pdfUrl).startsWith('/uploads/')) {
      return res.status(400).json({ error: 'pdfUrl invalide (doit commencer par /uploads/...)' });
    }

    const relative = String(article.pdfUrl).replace(/^\/uploads\//, '');
    const absolutePath = path.join(uploadsRoot, relative);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    }

    const ext = path.extname(absolutePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
    res.setHeader('Cache-Control', 'no-store');

    return fs.createReadStream(absolutePath).pipe(res);
  } catch (error) {
    console.error('Erreur GET /articles/:id/file:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// === ROUTES POUR LES NOTIFICATIONS ===

// Récupérer toutes les notifications (non expirées)
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      expiresAt: { $gt: new Date() }, // Non expirées
      $or: [
        { recipients: { $size: 0 } }, // Pour tous les utilisateurs
        { recipients: req.user.id } // Ou spécifiquement pour cet utilisateur
      ]
    })
    .populate('articleId', 'title')
    .populate('cardId', 'title')
    .sort({ createdAt: -1 })
    .limit(50); // Limiter à 50 dernières
    
    res.json(notifications);
  } catch (error) {
    console.error('Erreur GET /notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.json(notification);
  } catch (error) {
    console.error('Erreur PATCH /notifications/:id/read:', error);
    res.status(400).json({ error: error.message });
  }
});

// Marquer toutes les notifications comme lues
router.patch('/notifications/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        $or: [
          { recipients: { $size: 0 } },
          { recipients: req.user.id }
        ],
        isRead: false 
      },
      { $set: { isRead: true } }
    );
    
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur PATCH /notifications/mark-all-read:', error);
    res.status(400).json({ error: error.message });
  }
});

// Récupérer les notifications non lues (count)
router.get('/notifications/unread/count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      expiresAt: { $gt: new Date() },
      isRead: false,
      $or: [
        { recipients: { $size: 0 } },
        { recipients: req.user.id }
      ]
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Erreur GET /notifications/unread/count:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// Mettre à jour un article AVEC notification optionnelle
router.put('/articles/:id', auth, articleManagerOnly, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    // Vérifier si l'article est supprimé
    if (article.deleted) {
      return res.status(410).json({ error: 'Cet article a été supprimé' });
    }
    
    const oldStatus = article.status;
    const newStatus = req.body.status || article.status;
    
    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('cardId');
    
    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    // Créer une notification si l'article passe de "draft" à "published"
    if (oldStatus === 'draft' && newStatus === 'published') {
      const notification = new Notification({
        type: 'new_article',
        title: 'Article publié',
        message: `L'article "${updatedArticle.title}" vient d'être publié`,
        articleId: updatedArticle._id,
        cardId: updatedArticle.cardId,
        createdBy: req.user.id,
        recipients: [],
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      });
      
      await notification.save();
      console.log('✅ Notification créée pour la publication:', updatedArticle.title);
    }
    
    res.json(updatedArticle);
  } catch (error) {
    console.error('Erreur PUT /articles/:id:', error);
    res.status(400).json({ error: error.message });
  }
});
// Créer un article (protection par carte)
router.post('/articles', auth, cardManagerOnly, async (req, res) => {
  try {
    console.log('📥 POST /api/articles - Body received:', JSON.stringify(req.body, null, 2));
    console.log('📥 Headers:', req.headers);
    
    // Valider les données requises
    const { title, category } = req.body;
    const description = typeof req.body.description === 'string' ? req.body.description : '';
    const content = typeof req.body.content === 'string' ? req.body.content : '';
    const normalizedContent = (content || description || '').trim();
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    
    
    
    const pdfProtected = String(req.body.pdfProtected || '').toLowerCase() === 'true' || req.body.pdfProtected === true;

    // Préparer l'article
    const articleData = {
      title: title.trim(),
      content: normalizedContent,
      category: category || 'Actualités',
      description,
      date: req.body.date || new Date(),
      views: 0,
      status: req.body.status || 'published',
      cardId: req.body.cardId || null,
      imageUrl: req.body.imageUrl || '',
      pdfUrl: req.body.pdfUrl || '',
      pdfProtected
    };
    
    console.log('📝 Article data to create:', articleData);
    
    // Créer l'article
    const article = await Article.create(articleData);
    
    console.log('✅ Article créé:', article._id);
    
    // Émettre la notification via Socket.IO
    // NOTE: Vous devez avoir accès à l'objet io
    // Si vous utilisez socket.io avec req.io
    if (req.io) {
      let cardTitle = null;
      let shouldNotify = true;
      if (article.cardId) {
        const card = await Card.findById(article.cardId).select('title disableNotifications');
        cardTitle = card?.title || null;
        if (card?.disableNotifications) {
          shouldNotify = false;
        }
      }

      const notificationData = {
        title: article.title,
        category: article.category,
        date: article.date || new Date().toISOString(),
        id: article._id.toString(),
        content: article.description || '',
        cardId: article.cardId ? article.cardId.toString() : null,
        cardTitle
      };

      if (shouldNotify) {
        console.log('🔔 Émission notification:', notificationData);
        req.io.emit('new-notification', notificationData);
      } else {
        console.log('🔕 Notifications désactivées pour cette carte:', cardTitle || article.cardId?.toString());
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Article créé avec succès',
      article
    });
    
  } catch (error) {
    console.error('❌ Erreur création article:', error);
    
    // Gestion des erreurs spécifiques Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Erreur de validation', 
        details: errors 
      });
    }
    
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message 
    });
  }
});


// Mettre à jour un article
router.put('/articles/:id', auth, articleManagerOnly, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    // Vérifier si l'article est supprimé
    if (article.deleted) {
      return res.status(410).json({ error: 'Cet article a été supprimé' });
    }
    
    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('cardId');
    
    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    
    res.json(updatedArticle);
  } catch (error) {
    console.error('Erreur PUT /articles/:id:', error);
    res.status(400).json({ error: error.message });
  }
});

// === ROUTE D'UPLOAD POUR LES ARTICLES (FICHIERS) ===
// 1. Configurer le stockage pour les fichiers (dossier existant "pdf")
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Important: `req.body` may not be populated yet when multer chooses destination.
    // Prefer query param which is available immediately, then fallback to body.
    const wantsProtected = String(req.query?.protected || req.body?.protected || '').toLowerCase() === 'true';
    const uploadDir = wantsProtected
      ? path.join(uploadsRoot, 'protected', 'pdf')
      : path.join(uploadsRoot, 'pdf');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Crée un nom unique avec timestamp et extension d'origine
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Accepter tous les types de fichiers
const pdfFileFilter = (req, file, cb) => {
  cb(null, true);
};

// 3. Initialiser multer pour les fichiers (pas de limite applicative)
const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter
});

// 4. Definir la route d'upload de fichiers
router.post('/upload/pdf', (req, res) => {
  uploadPdf.single('pdf')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Erreur lors de l'upload." });
    }

    // Verifier si un fichier a bien ete recu
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier recu.' });
    }

    const storedProtected = String(req.file?.destination || '').includes(path.join('protected', 'pdf'));
    const fileUrl = storedProtected
      ? `/uploads/protected/pdf/${req.file.filename}`
      : `/uploads/pdf/${req.file.filename}`;

    // Repondre avec l'URL du fichier sauvegarde
    return res.status(200).json({
      message: 'Fichier uploade avec succes.',
      url: fileUrl,
      protected: storedProtected
    });
  });
});

// Route de test
router.get('/test', (req, res) => {
  res.json({ message: 'API fonctionne !' });
});

module.exports = router;
