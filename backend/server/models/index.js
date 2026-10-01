const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// Schéma pour les slides
const slideSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  imageUrl: { type: String, required: true }, // URL ou chemin de l'image
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  link: String, 
  buttonText: String,
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
slideSchema.index({ deleted: 1 });
// Schéma pour les articles
// models.js
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: '' },
  description: String,
  imageUrl: String,
  pdfUrl: String,
  pdfProtected: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  usefulLinks: [{
    title: String,
    url: String,
    description: String
  }],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isNewArticle: { type: Boolean, default: true }, 
  notificationSent: { type: Boolean, default: false },
}, { timestamps: true }); 
articleSchema.index({ deleted: 1 });

const notificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['new_article', 'update', 'alert'], 
    default: 'new_article' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  isRead: { type: Boolean, default: false },
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pour cibler des utilisateurs spécifiques
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Expire après 7 jours
}, { timestamps: true });
const Notification = mongoose.model('Notification', notificationSchema);


// Schéma pour les cartes
const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, default: '' },
  color: String,
  imageUrl: String, 
  isActive: { type: Boolean, default: true },
  // When enabled, viewing this card's articles requires a valid JWT obtained via LDAP (or local) login.
  requiresLdapLogin: { type: Boolean, default: false },
  // Optional whitelist of usernames allowed to view this card when requiresLdapLogin is enabled.
  // Empty => any authenticated user can access.
  accessUsernames: { type: [String], default: [] },
  // When enabled, articles under this card are excluded from the public notifications feed and realtime emits.
  disableNotifications: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // utilisateurs autorisés à gérer cette carte
  managerGroups: [{ type: String }], // noms de groupes AD autorisés
  usefulLinks: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String }
  }]
}, { timestamps: true });
cardSchema.index({ deleted: 1 });

// Schéma pour les utilisateurs
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'user'], default: 'user' },
  email: { type: String, default: '' },
  displayName: { type: String, default: '' },
  canManageSlides: { type: Boolean, default: false },
  canManagePopup: { type: Boolean, default: false },
  ldapDn: { type: String, default: '' },
  ldapGroups: { type: [String], default: [] },
  isLdap: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  lastLdapLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// SchÃ©ma pour la configuration du pop-up du portail public
const popupConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'public_portal', unique: true },
  enabled: { type: Boolean, default: true },
  mode: { type: String, enum: ['always', 'interval'], default: 'always' },
  intervalHours: { type: Number, default: 24 },
  title: { type: String, default: 'Bienvenue sur le portail public' },
  message: { type: String, default: 'Acces rapide aux informations et services essentiels de l\'ANAM.' },
  bullets: {
    type: [String],
    default: [
      'Rechercher des notes, lois et formulaires.',
      'Explorer les sections par categories.',
      'Acceder a vos applications internes.'
    ]
  },
  primaryLabel: { type: String, default: 'Decouvrir' },
  linkType: { type: String, enum: ['none', 'url', 'pdf'], default: 'none' },
  linkUrl: { type: String, default: '' },
  linkLabel: { type: String, default: '' }
}, { timestamps: true });

const Slide = mongoose.model('Slide', slideSchema);
const Article = mongoose.model('Article', articleSchema);
const Card = mongoose.model('Card', cardSchema);
const User = mongoose.model('User', userSchema);
const PopupConfig = mongoose.model('PopupConfig', popupConfigSchema);

module.exports = { Slide, Article, Card, User, Notification, PopupConfig };
