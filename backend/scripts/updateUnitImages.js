/**
 * Script pour ajouter des photos aux unités
 * Utilise les images unite 5 à 14 pour les unités
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Charger tous les modèles nécessaires
require('../models/Building');
require('../models/Unit');

const Unit = mongoose.model('Unit');

// Connexion à la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moncondo', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    process.exit(1);
  }
};

// Images disponibles (unites 5 à 14) - basé sur les fichiers réels trouvés
const unitImages = [
  '/images/unites/unite5.jpg',
  '/images/unites/unites6.jpg',
  '/images/unites/unites7.jpg',
  '/images/unites/unites8.jpg',
  '/images/unites/unites9.jpg',
  '/images/unites/unites11.jpg',
  '/images/unites/unites12.jpeg',
  '/images/unites/unites13.jpg',
  '/images/unites/unites14.jpeg',
  '/images/unites/unites15.jpg'
];

async function updateUnitImages() {
  try {
    await connectDB();

    console.log('🖼️  Mise à jour des images des unités...\n');

    // Récupérer toutes les unités disponibles (disponibles ou en négociation)
    const units = await Unit.find({
      $or: [
        { status: 'disponible' },
        { status: 'negociation' }
      ],
      isAvailable: { $ne: false }
    })
    .sort('createdAt')
    .lean();
    
    // Récupérer les noms des immeubles séparément
    const Building = mongoose.model('Building');
    for (const unit of units) {
      if (unit.building) {
        const building = await Building.findById(unit.building).select('name').lean();
        unit.building = building ? { name: building.name } : null;
      }
    }
    
    console.log(`📋 ${units.length} unités trouvées\n`);

    const updated = [];
    const skipped = [];
    let imageIndex = 0;

    // Assigner les images aux unités (en commençant par les plus récentes)
    // On va assigner les images aux 10 dernières unités créées qui sont disponibles
    const unitsToUpdate = units.slice(-10).reverse(); // Les 10 plus récentes, du plus récent au plus ancien

    for (let i = 0; i < unitsToUpdate.length && imageIndex < unitImages.length; i++) {
      const unit = unitsToUpdate[i];
      const imagePath = unitImages[imageIndex];

      try {
        // Vérifier si l'unité a déjà des images
        if (unit.images && unit.images.length > 0 && !unit.images[0].includes('unite')) {
          console.log(`   ⏭️  Unité ${unit.unitNumber} a déjà des images: ${unit.images[0]}`);
          skipped.push({
            unitNumber: unit.unitNumber,
            building: unit.building?.name || 'N/A',
            currentImages: unit.images,
            reason: 'Images déjà assignées'
          });
          continue;
        }

        // Mettre à jour les images (tableau avec une image)
        await Unit.findByIdAndUpdate(unit._id, {
          $set: { images: [imagePath] }
        });

        console.log(`   ✅ Image assignée: Unité ${unit.unitNumber} (${unit.building?.name || 'N/A'}) → ${imagePath}`);
        updated.push({
          unitNumber: unit.unitNumber,
          building: unit.building?.name || 'N/A',
          image: imagePath
        });
        
        imageIndex++;
      } catch (error) {
        console.error(`   ❌ Erreur pour unité ${unit.unitNumber}:`, error.message);
      }
    }

    // Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL');
    console.log('='.repeat(60));
    console.log('\n✅ UNITÉS MISES À JOUR:');
    updated.forEach((item, index) => {
      console.log(`   ${index + 1}. Unité ${item.unitNumber} (${item.building})`);
      console.log(`      Image: ${item.image}`);
    });

    if (skipped.length > 0) {
      console.log('\n⏭️  UNITÉS IGNORÉES:');
      skipped.forEach((item, index) => {
        console.log(`   ${index + 1}. Unité ${item.unitNumber} (${item.building})`);
        console.log(`      Raison: ${item.reason}`);
      });
    }

    console.log(`\n📊 Total: ${updated.length} mises à jour, ${skipped.length} ignorées`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
updateUnitImages();

