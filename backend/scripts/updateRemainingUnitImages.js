/**
 * Script pour ajouter des photos aux unités qui n'ont pas encore d'images
 * Utilise les images unite16 et unite17
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

// Images disponibles (unite16 et unite17)
const unitImages = [
  '/images/unites/unite16.jpeg',
  '/images/unites/unite17.jpeg'
];

async function updateRemainingUnitImages() {
  try {
    await connectDB();

    console.log('🖼️  Mise à jour des images des unités restantes...\n');

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

    const updated = [];
    const skipped = [];
    let imageIndex = 0;

    // Prioriser les unités disponibles ou en négociation
    const priorityUnits = unitsWithoutImages.filter(u => 
      u.status === 'disponible' || u.status === 'Disponible' || u.status === 'negociation'
    );
    const otherUnits = unitsWithoutImages.filter(u => 
      u.status !== 'disponible' && u.status !== 'Disponible' && u.status !== 'negociation'
    );

    // Traiter d'abord les unités prioritaires
    const unitsToUpdate = [...priorityUnits, ...otherUnits].slice(0, unitImages.length);

    for (let i = 0; i < unitsToUpdate.length && imageIndex < unitImages.length; i++) {
      const unit = unitsToUpdate[i];
      const imagePath = unitImages[imageIndex];

      try {
        // Mettre à jour les images (tableau avec une image)
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

    // Si on a encore des unités sans images et qu'on a des images restantes
    if (unitsToUpdate.length < unitsWithoutImages.length && imageIndex < unitImages.length) {
      const remainingUnits = unitsWithoutImages.slice(unitsToUpdate.length);
      for (let i = 0; i < remainingUnits.length && imageIndex < unitImages.length; i++) {
        const unit = remainingUnits[i];
        const imagePath = unitImages[imageIndex];

        try {
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

    if (skipped.length > 0) {
      console.log('\n⏭️  UNITÉS IGNORÉES:');
      skipped.forEach((item, index) => {
        console.log(`   ${index + 1}. Unité ${item.unitNumber} (${item.building})`);
        console.log(`      Raison: ${item.reason}`);
      });
    }

    console.log(`\n📊 Total: ${updated.length} mises à jour`);
    console.log(`📊 Restantes sans images: ${unitsWithoutImages.length - updated.length}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
updateRemainingUnitImages();

