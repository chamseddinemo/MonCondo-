/**
 * Script pour assigner des images à TOUTES les unités qui n'en ont pas
 * Utilise les images disponibles de manière cohérente
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Charger tous les modèles nécessaires
require('../models/Building');
require('../models/Unit');

const Unit = mongoose.model('Unit');
const Building = mongoose.model('Building');

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

// Toutes les images disponibles (unite5 à unite17)
const allUnitImages = [
  '/images/unites/unite5.jpg',
  '/images/unites/unites6.jpg',
  '/images/unites/unites7.jpg',
  '/images/unites/unites8.jpg',
  '/images/unites/unites9.jpg',
  '/images/unites/unites11.jpg',
  '/images/unites/unites12.jpeg',
  '/images/unites/unites13.jpg',
  '/images/unites/unites14.jpeg',
  '/images/unites/unite16.jpeg',
  '/images/unites/unite17.jpeg'
];

async function assignAllUnitImages() {
  try {
    await connectDB();

    console.log('🖼️  Attribution des images à toutes les unités...\n');

    // Récupérer toutes les unités
    const allUnits = await Unit.find({})
      .sort('createdAt')
      .lean();
    
    console.log(`📋 ${allUnits.length} unités trouvées au total\n`);

    // Identifier les unités sans images locales
    const unitsWithoutImages = [];
    for (const unit of allUnits) {
      const hasLocalImage = (unit.images && unit.images.length > 0 && 
        (unit.images[0].includes('/images/unites/') || unit.images[0].includes('unite'))) ||
        (unit.imageUrl && (unit.imageUrl.includes('/images/unites/') || unit.imageUrl.includes('unite')));
      
      if (!hasLocalImage) {
        const building = unit.building ? await Building.findById(unit.building).select('name').lean() : null;
        unitsWithoutImages.push({
          ...unit,
          buildingName: building?.name || 'N/A'
        });
      }
    }

    console.log(`📋 ${unitsWithoutImages.length} unités sans images locales trouvées\n`);

    if (unitsWithoutImages.length === 0) {
      console.log('✅ Toutes les unités ont déjà des images locales assignées!\n');
      process.exit(0);
      return;
    }

    const updated = [];
    let imageIndex = 0;

    // Assigner les images de manière cyclique si on a plus d'unités que d'images
    for (let i = 0; i < unitsWithoutImages.length; i++) {
      const unit = unitsWithoutImages[i];
      const imagePath = allUnitImages[imageIndex % allUnitImages.length];

      try {
        // Mettre à jour les images
        await Unit.findByIdAndUpdate(unit._id, {
          $set: { images: [imagePath] }
        });

        console.log(`   ✅ Image assignée: Unité ${unit.unitNumber} (${unit.buildingName}) → ${imagePath}`);
        updated.push({
          unitNumber: unit.unitNumber,
          building: unit.buildingName,
          status: unit.status,
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
      console.log(`      Status: ${item.status}`);
      console.log(`      Image: ${item.image}`);
    });

    console.log(`\n📊 Total: ${updated.length} unités mises à jour`);
    console.log(`📊 Total unités avec images: ${allUnits.length - unitsWithoutImages.length + updated.length}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
assignAllUnitImages();

