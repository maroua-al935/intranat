const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    minlength: [3, 'Le titre doit avoir au moins 3 caractères']
  },
  content: {
    type: String,
    default: '' // ← CHANGEZ ICI : enlevez "required"
  },
  category: {
    type: String,
    default: 'Actualités',
    enum: ['Actualités', 'Événements', 'Médias', 'Documents', 'Interne', 'Général']
  },
  description: {
    type: String,
    default: ''
  },
  imageUrl: String,
  pdfUrl: String,
  pdfProtected: { type: Boolean, default: false },
  date: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: true
  },
  deleted: {  // ← AJOUTEZ CES CHAMPS POUR LA SUPPRESSION DOUCE
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Middleware pour émettre une notification après création
articleSchema.post('save', function(doc, next) {
  console.log('📢 Article sauvegardé, émission notification pour:', doc.title);
  
  // Émettre une notification via Socket.IO si disponible
  if (process.io) {
    const notification = {
      title: doc.title,
      category: doc.category || 'Général',
      date: doc.date || new Date().toISOString(),
      id: doc._id.toString(),
      content: doc.description || '',
      isNew: true
    };
    
    console.log('🔔 Émission notification via post-save hook:', notification);
    process.io.emit('new-notification', notification);
  } else {
    console.log('⚠️ process.io non disponible pour émettre la notification');
  }
  
  next();
});

module.exports = mongoose.model('Article', articleSchema);
