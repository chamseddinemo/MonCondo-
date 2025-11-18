/**
 * Script pour créer des exemples d'immeubles et d'unités
 * Ne touche PAS aux données réelles existantes
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const User = require('../models/User');

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

// Marqueur pour identifier les exemples
const EXAMPLE_MARKER = '[EXEMPLE]';

// Immeubles d'exemple
const exampleBuildings = [
  {
    name: `${EXAMPLE_MARKER} Résidence Le Château`,
    address: {
      street: '1500 Avenue des Champs',
      city: 'Montréal',
      province: 'Québec',
      postalCode: 'H3A 1A1',
      country: 'Canada'
    },
    description: 'Immeuble résidentiel moderne avec vue panoramique sur la ville. Proche des transports et des commerces.',
    yearBuilt: 2020,
    amenities: ['Ascenseur', 'Stationnement', 'Gym', 'Terrasse', 'Sécurité 24/7'],
    isActive: true,
    isExample: true
  },
  {
    name: `${EXAMPLE_MARKER} Complexe Les Jardins`,
    address: {
      street: '2500 Boulevard Saint-Laurent',
      city: 'Montréal',
      province: 'Québec',
      postalCode: 'H2X 1Y4',
      country: 'Canada'
    },
    description: 'Complexe résidentiel avec espaces verts et jardins communautaires. Idéal pour les familles.',
    yearBuilt: 2018,
    amenities: ['Jardin communautaire', 'Aire de jeux', 'Stationnement', 'Ascenseur'],
    isActive: true,
    isExample: true
  }
];

// Unités d'exemple
const exampleUnits = [
  // Pour le premier immeuble (Le Château)
  {
    unitNumber: '101',
    floor: 1,
    type: '2br',
    size: 85,
    bedrooms: 2,
    bathrooms: 1,
    status: 'disponible',
    rentPrice: 1200,
    salePrice: null,
    transactionType: 'location',
    description: 'Appartement lumineux avec balcon. Cuisine équipée, planchers en bois.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Centre-ville',
    nombrePieces: 2,
    isExample: true
  },
  {
    unitNumber: '205',
    floor: 2,
    type: '3br',
    size: 110,
    bedrooms: 3,
    bathrooms: 2,
    status: 'disponible',
    rentPrice: 1800,
    salePrice: null,
    transactionType: 'location',
    description: 'Grand appartement avec vue sur la ville. Parfait pour une famille.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Centre-ville',
    nombrePieces: 3,
    isExample: true
  },
  {
    unitNumber: '301',
    floor: 3,
    type: '2br',
    size: 90,
    bedrooms: 2,
    bathrooms: 1,
    status: 'disponible',
    rentPrice: null,
    salePrice: 350000,
    transactionType: 'vente',
    description: 'Appartement à vendre, rénové récemment. Excellent investissement.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Centre-ville',
    nombrePieces: 2,
    isExample: true
  },
  // Pour le deuxième immeuble (Les Jardins)
  {
    unitNumber: 'A1',
    floor: 1,
    type: '1br',
    size: 65,
    bedrooms: 1,
    bathrooms: 1,
    status: 'disponible',
    rentPrice: 950,
    salePrice: null,
    transactionType: 'location',
    description: 'Studio moderne et fonctionnel. Idéal pour une personne.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Plateau',
    nombrePieces: 1,
    isExample: true
  },
  {
    unitNumber: 'B2',
    floor: 2,
    type: '2br',
    size: 80,
    bedrooms: 2,
    bathrooms: 1,
    status: 'disponible',
    rentPrice: 1100,
    salePrice: null,
    transactionType: 'location',
    description: 'Appartement spacieux avec accès au jardin communautaire.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Plateau',
    nombrePieces: 2,
    isExample: true
  },
  {
    unitNumber: 'C3',
    floor: 3,
    type: '3br',
    size: 120,
    bedrooms: 3,
    bathrooms: 2,
    status: 'disponible',
    rentPrice: null,
    salePrice: 420000,
    transactionType: 'vente',
    description: 'Grand appartement familial à vendre. Vue sur les jardins.',
    availableFrom: new Date(),
    isAvailable: true,
    ville: 'Montréal',
    quartier: 'Plateau',
    nombrePieces: 3,
    isExample: true
  }
];

async function seedExamples() {
  try {
    await connectDB();

    console.log('🌱 Début de la création des exemples...\n');

    // Récupérer un admin pour assigner aux immeubles
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé. Créez d\'abord un admin.');
      process.exit(1);
    }

    const createdBuildings = [];
    const reusedBuildings = [];
    const createdUnits = [];
    const reusedUnits = [];
    const errors = [];

    // 1. Créer ou réutiliser les immeubles d'exemple
    console.log('📦 Traitement des immeubles d\'exemple...');
    for (const buildingData of exampleBuildings) {
      try {
        // Vérifier si l'immeuble existe déjà (par nom)
        const existing = await Building.findOne({ name: buildingData.name });
        
        if (existing) {
          console.log(`   ✅ Immeuble existant réutilisé: ${buildingData.name}`);
          reusedBuildings.push({
            _id: existing._id,
            name: existing.name
          });
          createdBuildings.push(existing);
        } else {
          // Créer l'immeuble
          const building = await Building.create({
            ...buildingData,
            admin: admin._id
          });
          console.log(`   ✅ Immeuble créé: ${building.name} (ID: ${building._id})`);
          createdBuildings.push(building);
        }
      } catch (error) {
        console.error(`   ❌ Erreur pour ${buildingData.name}:`, error.message);
        errors.push({ type: 'building', name: buildingData.name, error: error.message });
      }
    }

    // 2. Créer ou réutiliser les unités d'exemple
    console.log('\n🏠 Traitement des unités d\'exemple...');
    
    // Distribuer les unités aux immeubles
    const unitsForBuilding1 = exampleUnits.slice(0, 3); // 3 premières unités pour le premier immeuble
    const unitsForBuilding2 = exampleUnits.slice(3);   // 3 dernières unités pour le deuxième immeuble

    const buildingUnits = [
      { building: createdBuildings[0], units: unitsForBuilding1 },
      { building: createdBuildings[1], units: unitsForBuilding2 }
    ];

    for (const { building, units } of buildingUnits) {
      if (!building) continue;

      for (const unitData of units) {
        try {
          // Vérifier si l'unité existe déjà (par building + unitNumber)
          const existing = await Unit.findOne({
            building: building._id,
            unitNumber: unitData.unitNumber
          });

          if (existing) {
            console.log(`   ✅ Unité existante réutilisée: ${unitData.unitNumber} dans ${building.name}`);
            reusedUnits.push({
              _id: existing._id,
              unitNumber: existing.unitNumber,
              building: building.name
            });
            createdUnits.push(existing);
          } else {
            // Créer l'unité
            const unit = await Unit.create({
              ...unitData,
              building: building._id
            });
            console.log(`   ✅ Unité créée: ${unit.unitNumber} dans ${building.name} (ID: ${unit._id})`);
            createdUnits.push(unit);
          }
        } catch (error) {
          console.error(`   ❌ Erreur pour unité ${unitData.unitNumber}:`, error.message);
          errors.push({
            type: 'unit',
            unitNumber: unitData.unitNumber,
            building: building.name,
            error: error.message
          });
        }
      }
    }

    // 3. Rapport final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT FINAL');
    console.log('='.repeat(60));
    console.log('\n🏢 IMMEUBLES:');
    console.log(`   ✅ Créés: ${createdBuildings.length - reusedBuildings.length}`);
    console.log(`   ♻️  Réutilisés: ${reusedBuildings.length}`);
    console.log(`   📋 Total: ${createdBuildings.length}`);
    
    console.log('\n🏠 UNITÉS:');
    console.log(`   ✅ Créées: ${createdUnits.length - reusedUnits.length}`);
    console.log(`   ♻️  Réutilisées: ${reusedUnits.length}`);
    console.log(`   📋 Total: ${createdUnits.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERREURS:');
      errors.forEach(err => {
        console.log(`   - ${err.type}: ${err.name || err.unitNumber} - ${err.error}`);
      });
    }

    console.log('\n✅ Processus terminé avec succès!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
seedExamples();

