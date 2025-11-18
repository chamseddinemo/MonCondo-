/**
 * Script pour ajouter des photos aux immeubles
 * Utilise les images immeb 5 à 9 pour les immeubles
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Building = require('../models/Building');

dotenv.config();

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

// Images disponibles (immeb 5 à 9)
const buildingImages = [
  '/images/immeubles/immeb 5.jpg',
  '/images/immeubles/immeb 6.jpg',
  '/images/immeubles/immeb 7.jpg',
  '/images/immeubles/immeub 8.jpg',
  '/images/immeubles/immeb 9.png'
];

async function updateBuildingImages() {
  try {
    await connectDB();

    console.log('🖼️  Mise à jour des images des immeubles...\n');

    // Récupérer tous les immeubles
    const buildings = await Building.find({}).sort('createdAt').lean();
    
    console.log(`📋 ${buildings.length} immeubles trouvés\n`);

    const updated = [];
    const skipped = [];

    // Assigner les images immeb 5 à 9 aux immeubles (en commençant par les plus récents)
    // On va assigner les images aux 5 derniers immeubles créés
    const buildingsToUpdate = buildings.slice(-5).reverse(); // Les 5 plus récents, du plus récent au plus ancien

    for (let i = 0; i < buildingsToUpdate.length && i < buildingImages.length; i++) {
      const building = buildingsToUpdate[i];
      const imagePath = buildingImages[i];

      try {
        // Vérifier si l'immeuble a déjà une image
        if (building.image && building.image !== imagePath) {
          console.log(`   ⏭️  Immeuble "${building.name}" a déjà une image: ${building.image}`);
          skipped.push({
            name: building.name,
            currentImage: building.image,
            reason: 'Image déjà assignée'
          });
          continue;
        }

        // Mettre à jour l'image
        await Building.findByIdAndUpdate(building._id, {
          $set: { image: imagePath }
        });

        console.log(`   ✅ Image assignée: "${building.name}" → ${imagePath}`);
        updated.push({
          name: building.name,
          image: imagePath
        });
      } catch (error) {
        console.error(`   ❌ Erreur pour "${building.name}":`, error.message);
      }
    }

    // Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL');
    console.log('='.repeat(60));
    console.log('\n✅ IMMEUBLES MIS À JOUR:');
    updated.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      Image: ${item.image}`);
    });

    if (skipped.length > 0) {
      console.log('\n⏭️  IMMEUBLES IGNORÉS:');
      skipped.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}`);
        console.log(`      Raison: ${item.reason}`);
      });
    }

    console.log(`\n📊 Total: ${updated.length} mis à jour, ${skipped.length} ignorés`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
updateBuildingImages();

