// server/index.js

require('dotenv').config(); // Charge immédiatement le .env

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ==================== CONFIG VIA .env ====================
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-par-defaut-a-changer';
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*'; // fallback sécurisé
const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads';

// Vérification minimale des variables obligatoires
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI est obligatoire dans .env');
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET === 'votre_super_secret_jwt_a_changer_immediatement') {
  console.warn('⚠️  JWT_SECRET semble être la valeur par défaut – changez-le !');
}

// ==================== MIDDLEWARES ====================
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en dev seulement
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length) {
      console.log('📦 Body:', req.body);
    }
    next();
  });
}

// ==================== SOCKET.IO ====================
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});

global.io = io; // ou process.io = io selon tes besoins

// ==================== DOSSIER UPLOADS ====================
const uploadsDir = path.join(__dirname, '..', UPLOAD_PATH);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Dossier uploads créé : ${uploadsDir}`);
}

// Ne jamais exposer les fichiers "protégés" en accès direct (téléchargement).
// Ils doivent passer par un endpoint API qui vérifie les droits.
app.use('/uploads/protected', (req, res) => res.status(404).end());

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      // Afficher dans le lecteur PDF du navigateur (ou Adobe si configuré)
      res.setHeader('Content-Disposition', 'inline');
      return;
    }
    const officeLike = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.odt', '.ods', '.odp'];
    if (officeLike.includes(ext)) {
      // Forcer le téléchargement pour ouvrir dans Word/Excel/PowerPoint
      res.setHeader('Content-Disposition', 'attachment');
      return;
    }
    const mediaInline = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv'];
    if (mediaInline.includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
      return;
    }
  }
}));

// ==================== MONGO ====================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ MongoDB connexion échouée :', err.message);
    process.exit(1);
  });

// ==================== MODÈLES ====================
const { Article, Card, Slide, User } = require('./models');
console.log('✅ Modèles chargés');

// ==================== SOCKET ÉVÈNEMENTS DE BASE ====================
io.on('connection', (socket) => {
  console.log(`🔌 Client connecté : ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client déconnecté : ${socket.id}`);
  });
});

// ==================== MIDDLEWARES AUTH ====================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')?.[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Accès admin requis' });
  }
  next();
};

// ==================== ROUTES PUBLIQUES ====================

app.get('/api/public/notifications', async (req, res) => {
  try {
    const disabledCardIds = await Card.distinct('_id', {
      disableNotifications: true,
      deleted: { $ne: true }
    });

    const query = {
      status: 'published',
      deleted: { $ne: true }
    };

    if (disabledCardIds.length) {
      query.cardId = { $nin: disabledCardIds };
    }

    const articles = await Article.find(query)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('cardId', 'title')
    .lean();

    res.json(articles.map(a => {
      const cardIdValue = a.cardId
        ? (typeof a.cardId === 'string' ? a.cardId : a.cardId._id?.toString())
        : null;
      const cardTitle = a.cardId && typeof a.cardId === 'object'
        ? a.cardId.title || null
        : null;

      return {
        _id: a._id.toString(),
        title: a.title,
        category: a.category || 'Général',
        date: a.createdAt?.toISOString() || new Date().toISOString(),
        content: a.description || '',
        cardId: cardIdValue,
        cardTitle,
        isNew: true,
        isRead: false
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== ROUTES AVEC NOTIFICATION ====================
app.post('/api/articles-with-notification', auth, adminOnly, async (req, res) => {
  try {
    const { title, content, category, description, date, cardId, imageUrl, pdfUrl, status, pdfProtected } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Titre obligatoire' });
    }

    const article = await Article.create({
      title: title.trim(),
      content: content || '',
      category: category || 'Actualités',
      description: description || '',
      date: date || new Date(),
      cardId: cardId || null,
      imageUrl: imageUrl || '',
      pdfUrl: pdfUrl || '',
      pdfProtected: String(pdfProtected || '').toLowerCase() === 'true' || pdfProtected === true,
      status: status || 'published',
      views: 0
    });
    let cardTitle = null;
    let shouldNotify = true;
    if (article.cardId) {
      const card = await Card.findById(article.cardId).select('title disableNotifications');
      cardTitle = card?.title || null;
      if (card?.disableNotifications) {
        shouldNotify = false;
      }
    }

    const notif = {
      _id: article._id.toString(),
      title: article.title,
      category: article.category || 'Général',
      date: article.date?.toISOString() || new Date().toISOString(),
      content: article.description || '',
      cardId: article.cardId ? article.cardId.toString() : null,
      cardTitle,
      isNew: true,
      isRead: false
    };

    if (shouldNotify) {
      io.emit('new-notification', notif);
    }

    res.status(201).json({
      success: true,
      article,
      notification: notif,
      notificationSent: shouldNotify
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur création' });
  }
});

// Routes de test
app.post('/api/test-notification', (req, res) => {
  const notif = {
    title: req.body.title || 'Test',
    category: req.body.category || 'Test',
    date: new Date().toISOString(),
    _id: Date.now().toString(),
    content: 'Test Socket.IO',
    isNew: true,
    isRead: false
  };
  io.emit('new-notification', notif);
  res.json({ message: 'Notification test envoyée', notif });
});

app.get('/api/socket-test', (req, res) => {
  res.json({ 
    message: 'Socket.IO OK',
    clients: io.engine.clientsCount || 0 
  });
});

// ==================== ROUTES API PRINCIPALES ====================
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// ==================== UTILISATEURS PAR DÉFAUT ====================
async function initDefaultUsers() {
  try {
    const defaults = [
      { username: process.env.INITIAL_SUPERADMIN_USERNAME, password: process.env.INITIAL_SUPERADMIN_PASSWORD, role: 'superadmin' },
      { username: process.env.INITIAL_USER_USERNAME, password: process.env.INITIAL_USER_PASSWORD, role: 'user' }
    ].filter((u) => u.username && u.password);

    for (const u of defaults) {
      if (!await User.findOne({ username: u.username })) {
        await User.create({
          username: u.username,
          password: await bcrypt.hash(u.password, 10),
          role: u.role
        });
        console.log(`👤 Créé : ${u.username} (${u.role})`);
      }
    }
  } catch (err) {
    console.error('❌ Erreur init users:', err);
  }
}

// ==================== DÉMARRAGE ====================
async function start() {
  await initDefaultUsers();

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Serveur sur port ${PORT}`);
    console.log(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS origin  : ${CORS_ORIGIN}`);
    console.log(`📁 Uploads      : ${uploadsDir}`);
    console.log(`🗄️  MongoDB      : ${MONGODB_URI.split('@')[0]}...`);
    console.log(`👤 admin/admin  |  user/user\n`);
  });
}

start().catch(err => {
  console.error('❌ Démarrage échoué :', err);
  process.exit(1);
});
