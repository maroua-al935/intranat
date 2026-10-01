const mongoose = require('mongoose');

// Assurez-vous que MONGODB_URI est bien une URI MongoDB, ex: mongodb://localhost:27017/nomdb
const MONGODB_URI = process.env.VITE_BACKEND_URL || 'mongodb://localhost:27017/anam_db';

async function addDefaultSlides() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const { Slide } = require('./server/models');

    // Supprimer les slides existants
    await Slide.deleteMany({});

    // Ajouter des slides par défaut
    const slides = await Slide.insertMany([
      {
        title: "Agence Nationale des Activités Minières",
        image: "",
      }
    ]);

    console.log('✅ Slides créés avec succès !');
    console.log(`📸 ${slides.length} slides ajoutés`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

addDefaultSlides();
