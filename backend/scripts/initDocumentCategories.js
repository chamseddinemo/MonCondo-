/**
 * Script d'initialisation des catégories de documents système
 * À exécuter une fois pour créer les catégories par défaut
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DocumentCategory = require('../models/DocumentCategory');

dotenv.config();

const SYSTEM_CATEGORIES = [
  {
    name: 'Contrat',
    description: 'Contrats de location et de vente',
    color: '#10B981',
    icon: 'file-contract',
    isSystem: true
  },
  {
    name: 'Facture',
    description: 'Factures et reçus de paiement',
    color: '#3B82F6',
    icon: 'file-invoice',
    isSystem: true
  },
  {
    name: 'Maintenance',
    description: 'Documents de maintenance et réparations',
    color: '#F59E0B',
    icon: 'tools',
    isSystem: true
  },
  {
    name: 'Règlement',
    description: 'Règlements intérieurs et documents administratifs',
    color: '#8B5CF6',
    icon: 'file-alt',
    isSystem: true
  },
  {
    name: 'Fiche Technique',
    description: 'Fiches techniques et plans',
    color: '#EF4444',
    icon: 'file-pdf',
    isSystem: true
  },
  {
    name: 'Plan Maintenance',
    description: 'Plans de maintenance préventive',
    color: '#06B6D4',
    icon: 'calendar-alt',
    isSystem: true
  },
  {
    name: 'Autre',
    description: 'Autres types de documents',
    color: '#6B7280',
    icon: 'file',
    isSystem: true
  }
];

async function initCategories() {
  try {
    // Connexion à MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connecté à MongoDB');

    // Créer les catégories système
    let created = 0;
    let skipped = 0;

    for (const categoryData of SYSTEM_CATEGORIES) {
      const existing = await DocumentCategory.findOne({ 
        name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') } 
      });

      if (existing) {
        console.log(`⏭️  Catégorie "${categoryData.name}" existe déjà`);
        skipped++;
      } else {
        await DocumentCategory.create(categoryData);
        console.log(`✅ Catégorie "${categoryData.name}" créée`);
        created++;
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ Créées: ${created}`);
    console.log(`   ⏭️  Ignorées: ${skipped}`);
    console.log(`   📁 Total: ${SYSTEM_CATEGORIES.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Initialisation terminée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initCategories();

