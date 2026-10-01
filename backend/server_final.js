const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = 5001;

// ==================== MIDDLEWARES ====================
app.use(cors({
  origin: 'http://localhost:3020',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', req.body);
  }
  next();
});

// ==================== SOCKET.IO ====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "http://localhost:3020",
    methods: ["GET", "POST"]
  }
});

// ==================== STATIC FILES ====================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ==================== MONGODB ====================
mongoose.connect('mongodb://localhost:27017/anam_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => {
  console.error('❌ Erreur MongoDB:', err);
  process.exit(1);
});

// ==================== IMPORT MODÈLES ====================
// Utilisez le bon chemin
const { Article, Card, Slide, User } = require('./server/models');
console.log('✅ Modèles chargés depuis ./server/models');

// ==================== SOCKET EVENTS ====================
io.on('connection', (socket) => {
  console.log('🔌 Client connecté', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client déconnecté', socket.id);
  });
});

// Écouter les nouveaux articles
Article.watch().on('change', async (change) => {
  if (change.operationType === 'insert') {
    const article = change.fullDocument;
    console.log('?? Nouvel article d?tect? via Change Stream:', article.title);

    let cardTitle = null;
    if (article.cardId) {
      const card = await Card.findById(article.cardId).select('title');
      cardTitle = card?.title || null;
    }

    io.emit('new-notification', {
      title: article.title,
      category: article.category || 'G?n?ral',
      date: article.date || new Date().toISOString(),
      id: article._id.toString(),
      content: article.description || '',
      cardId: article.cardId ? article.cardId.toString() : null,
      cardTitle,
      isNew: true
    });
  }
});

// ==================== ROUTES PUBLIQUES ====================

// Route publique pour les notifications
app.get('/api/public/notifications', async (req, res) => {
  try {
    console.log('📥 GET /api/public/notifications');
    
    const articles = await Article.find({ 
      status: 'published'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('cardId', 'title')
    .lean();
    
    const notifications = articles.map(article => {
      const cardIdValue = article.cardId
        ? (typeof article.cardId === 'string' ? article.cardId : article.cardId._id?.toString())
        : null;
      const cardTitle = article.cardId && typeof article.cardId === 'object'
        ? article.cardId.title || null
        : null;

      return {
        _id: article._id.toString(),
        title: article.title,
        category: article.category || 'G?n?ral',
        date: article.createdAt || new Date().toISOString(),
        content: article.description || '',
        cardId: cardIdValue,
        cardTitle,
        isNew: true
      };
    });
    
    console.log(`📊 Envoi de ${notifications.length} notifications`);
    res.json(notifications);
  } catch (error) {
    console.error('❌ Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== ROUTE TEMPORAIRE POUR CRÉER DES ARTICLES ====================
// Cette route émettra toujours une notification
app.post('/api/articles-with-notification', async (req, res) => {
  try {
    console.log('📥 POST /api/articles-with-notification');
    console.log('Données reçues:', req.body);
    
    // Préparer les données (content optionnel)
    const articleData = {
      title: req.body.title || 'Sans titre',
      content: req.body.content || '', // OPTIONNEL
      category: req.body.category || 'Actualités',
      description: req.body.description || '',
      date: req.body.date || new Date(),
      views: 0,
      status: req.body.status || 'published',
      cardId: req.body.cardId || null,
      imageUrl: req.body.imageUrl || '',
      pdfUrl: req.body.pdfUrl || ''
    };
    
    console.log('📝 Création article avec:', articleData);
    
    // Créer l'article
    const article = await Article.create(articleData);
    console.log('✅ Article créé:', article._id);
    
    // Émettre la notification IMMÉDIATEMENT
    let cardTitle = null;
    if (article.cardId) {
      const card = await Card.findById(article.cardId).select('title');
      cardTitle = card?.title || null;
    }

    const notification = {
      title: article.title,
      category: article.category || 'G?n?ral',
      date: article.date || new Date().toISOString(),
      id: article._id.toString(),
      content: article.description || '',
      cardId: article.cardId ? article.cardId.toString() : null,
      cardTitle,
      isNew: true
    };
    
    console.log('🔔 Émission notification Socket.IO:', notification);
    io.emit('new-notification', notification);
    
    res.status(201).json({
      success: true,
      message: 'Article créé avec notification',
      article: article,
      notification: notification
    });
    
  } catch (error) {
    console.error('❌ Erreur création article:', error);
    res.status(400).json({ 
      error: error.name === 'ValidationError' ? 'Données invalides' : 'Erreur serveur',
      message: error.message 
    });
  }
});

// Test notification
app.post('/api/test-notification', (req, res) => {
  const { title, category } = req.body;
  const notif = {
    title: title || 'Test Notification',
    category: category || 'Info',
    date: new Date().toISOString(),
    id: Date.now().toString(),
    content: 'Ceci est une notification de test',
    isNew: true
  };
  
  console.log('🔔 Test notification:', notif);
  io.emit('new-notification', notif);
  
  res.json({ 
    message: 'Notification test envoyée', 
    notif 
  });
});

// Test socket
app.get('/api/socket-test', (req, res) => {
  res.json({ 
    message: 'Socket test OK',
    clients: io.engine.clientsCount || 0
  });
});

// ==================== IMPORTEZ VOS ROUTES API EXISTANTES ====================
// Pour garder toutes vos autres routes (login, cards, slides, etc.)
const apiRouter = require('./server/routes/api');

// Passez io aux routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', apiRouter);

// ==================== START SERVER ====================
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log(`✅ Socket.IO actif`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/public/notifications`);
  console.log(`🔗 Créer article: http://localhost:${PORT}/api/articles-with-notification`);
});
