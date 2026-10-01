const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');

const app = express();

// Dossiers uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
const cardsDir = path.join(uploadsDir, 'cards');
const slidesDir = path.join(uploadsDir, 'slides');

[uploadsDir, cardsDir, slidesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/uploads', express.static(uploadsDir));
app.use(cors());
app.use(express.json());

// MongoDB
console.log('🔗 Connexion MongoDB...');
mongoose.connect('mongodb://localhost:27017/anam_db')
  .then(() => {
    console.log('✅ MongoDB connecté');
    
    // Routes
    app.use('/api', apiRoutes);
    
    // Test route
    app.get('/api/test', (req, res) => {
      res.json({ message: 'API fonctionne!', time: new Date() });
    });
    
    const PORT = 5001;
    app.listen(PORT, () => {
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📁 Uploads: ${uploadsDir}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });
