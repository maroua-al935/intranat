const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// ==================== MIDDLEWARES ====================

// 1. CORS en premier
app.use(cors({
  origin: 'http://localhost:3020',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// 2. Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 4. Middleware d'erreur JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON parsing error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// ==================== SERVER HTTP + SOCKET.IO ====================
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: "http://localhost:3020",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Stocker io globalement
process.io = io;

// ==================== STATIC FILES ====================
const uploadsDir = path.join(__dirname, 'uploads');
const cardsDir = path.join(uploadsDir, 'cards');
const slidesDir = path.join(uploadsDir, 'slides');
const pdfDir = path.join(uploadsDir, 'pdf');

const fs = require('fs');
[uploadsDir, cardsDir, slidesDir, pdfDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', express.static(uploadsDir));

// ==================== DATABASE CONNECTION ====================
const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anam_db');
    console.log('✅ MongoDB connecté');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  }
};

// ==================== IMPORT MODELS ====================
// CORRECTION: Utilisez le chemin correct vers vos modèles
const { Article, Card, Slide, User } = require('./models'); // Ajustez le chemin selon votre structure

// ==================== SOCKET.IO EVENTS ====================
io.on("connection", (socket) => {
  console.log("✅ Client connecté:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("❌ Client déconnecté:", socket.id);
  });
});

// ==================== CHANGE STREAM ====================
if (Article) {
  Article.watch().on("change", (change) => {
    if (change.operationType === "insert") {
      const article = change.fullDocument;
      
      console.log("📢 Nouvel article détecté:", article.title);
      
      io.emit("new-notification", {
        title: article.title,
        category: article.category,
        date: article.date || new Date().toISOString(),
        id: article._id.toString(),
        content: article.description || ''
      });
    }
  });
} else {
  console.log("⚠️ Modèle Article non trouvé, le Change Stream ne fonctionnera pas");
}

// ==================== ROUTES PUBLIQUES ====================

// 1. Route publique pour les notifications
app.get('/api/public/notifications', async (req, res) => {
  try {
    console.log('📥 GET /api/public/notifications');
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const articles = await Article.find({ 
      status: 'published',
      createdAt: { $gte: twentyFourHoursAgo }
    })
    .sort({ createdAt: -1 })
    .limit(15)
    .select('title category date description createdAt _id views')
    .lean();
    
    const notifications = articles.map(article => ({
      _id: article._id.toString(),
      title: article.title,
      category: article.category || 'Général',
      date: article.createdAt || article.date || new Date().toISOString(),
      content: article.description || '',
      views: article.views || 0,
      isNew: true
    }));
    
    console.log(`📊 Envoi de ${notifications.length} notifications`);
    res.json(notifications);
    
  } catch (error) {
    console.error('❌ Erreur /api/public/notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 2. Route publique de test notification
app.post('/api/public/test-notification', (req, res) => {
  try {
    const { title, category } = req.body;
    
    const notification = {
      title: title || 'Test Notification',
      category: category || 'Info',
      date: new Date().toISOString(),
      content: 'Ceci est une notification de test',
      isNew: true,
      id: Date.now().toString()
    };
    
    io.emit('new-notification', notification);
    console.log('🔔 Notification test envoyée:', notification);
    
    res.json({ 
      success: true, 
      message: 'Notification test envoyée',
      notification 
    });
    
  } catch (error) {
    console.error('❌ Erreur test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Route de test pour créer un article
app.post('/api/public/test-article', async (req, res) => {
  try {
    const testArticle = {
      title: 'Test Article',
      content: 'Test content',
      category: 'Actualités',
      date: new Date(),
      views: 0,
      status: 'published',
      description: 'Test description'
    };
    
    const article = await Article.create(testArticle);
    console.log('✅ Test article created:', article._id);
    
    // Émettre une notification
    io.emit('new-notification', {
      title: article.title,
      category: article.category,
      date: article.date || new Date().toISOString(),
      id: article._id.toString(),
      content: article.description || ''
    });
    
    res.json({ 
      success: true, 
      message: 'Article créé et notification envoyée',
      article 
    });
    
  } catch (error) {
    console.error('❌ Test article error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== IMPORT API ROUTES ====================
// IMPORTANT: Ceci doit être APRÈS les routes publiques
const apiRouter = require('./routes/api'); // Vérifiez le chemin exact

// Middleware pour passer io aux routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', apiRouter);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur ANAM Intranet en ligne',
    socket: {
      active: true,
      clients: io.engine.clientsCount || 0
    }
  });
});

// ==================== ROUTES DE BASE ====================
app.get('/', (req, res) => {
  res.send('Backend ANAM Intranet - Socket.IO actif');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==================== INITIALISATION UTILISATEURS ====================
const bcrypt = require('bcryptjs');
async function initializeUsers() {
  try {
    const users = [
      { username: process.env.LEGACY_INITIAL_ADMIN_USERNAME, password: process.env.LEGACY_INITIAL_ADMIN_PASSWORD, role: 'admin' },
      { username: process.env.LEGACY_INITIAL_USER_USERNAME, password: process.env.LEGACY_INITIAL_USER_PASSWORD, role: 'user' }
    ].filter((u) => u.username && u.password);

    for (const u of users) {
      const exists = await User.findOne({ username: u.username });
      if (!exists) {
        const hashed = await bcrypt.hash(u.password, 10);
        await User.create({ username: u.username, password: hashed, role: u.role });
        console.log(`👤 Utilisateur créé : ${u.username}`);
      }
    }
  } catch (err) {
    console.error('❌ Erreur initialisation utilisateurs:', err);
  }
}

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    await connectDB();
    await initializeUsers();
    
    server.listen(PORT, () => {
      console.log(`✅ Serveur backend démarré sur le port ${PORT}`);
      console.log(`✅ HTTP: http://localhost:${PORT}`);
      console.log(`✅ WebSocket: ws://localhost:${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`📁 Cards directory: ${cardsDir}`);
      console.log(`📁 Slides directory: ${slidesDir}`);
      console.log(`📁 PDF directory: ${pdfDir}`);
      console.log(`🔗 Test notifications: http://localhost:${PORT}/api/public/notifications`);
    });
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

startServer();