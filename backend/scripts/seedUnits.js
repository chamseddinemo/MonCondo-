const mongoose = require('mongoose');
const Unit = require('../models/Unit');
const Building = require('../models/Building');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moncondo';

async function seedUnits() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver ou créer un admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('⚠️  Aucun admin trouvé. Création d\'un admin par défaut...');
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'Système',
        email: 'admin@moncondo.com',
        password: 'admin123', // Devrait être hashé, mais pour le seed c'est OK
        role: 'admin',
        phone: '514-123-4567'
      });
      console.log('✅ Admin créé:', admin.email);
    }

    // Trouver ou créer des immeubles
    let building1 = await Building.findOne({ name: 'Résidence Les Jardins' });
    if (!building1) {
      building1 = await Building.create({
        name: 'Résidence Les Jardins',
        address: {
          street: '123 Rue Principale',
          city: 'Montréal',
          province: 'QC',
          postalCode: 'H1A 1A1',
          country: 'Canada'
        },
        admin: admin._id,
        yearBuilt: 2015,
        totalUnits: 0,
        isActive: true,
        amenities: ['Piscine', 'Gym', 'Stationnement', 'Ascenseur']
      });
      console.log('✅ Immeuble créé: Résidence Les Jardins');
    }

    let building2 = await Building.findOne({ name: 'Complexe Les Érables' });
    if (!building2) {
      building2 = await Building.create({
        name: 'Complexe Les Érables',
        address: {
          street: '456 Boulevard Saint-Laurent',
          city: 'Montréal',
          province: 'QC',
          postalCode: 'H2B 2B2',
          country: 'Canada'
        },
        admin: admin._id,
        yearBuilt: 2018,
        totalUnits: 0,
        isActive: true,
        amenities: ['Terrasse', 'Gym', 'Stationnement']
      });
      console.log('✅ Immeuble créé: Complexe Les Érables');
    }

    let building3 = await Building.findOne({ name: 'Tour du Parc' });
    if (!building3) {
      building3 = await Building.create({
        name: 'Tour du Parc',
        address: {
          street: '789 Avenue du Parc',
          city: 'Montréal',
          province: 'QC',
          postalCode: 'H3C 3C3',
          country: 'Canada'
        },
        admin: admin._id,
        yearBuilt: 2020,
        totalUnits: 0,
        isActive: true,
        amenities: ['Vue panoramique', 'Gym', 'Piscine', 'Conciergerie']
      });
      console.log('✅ Immeuble créé: Tour du Parc');
    }

    // Vérifier combien d'unités existent déjà
    const existingUnits = await Unit.countDocuments({
      status: { $in: ['disponible', 'negociation'] }
    });

    if (existingUnits > 0) {
      console.log(`ℹ️  ${existingUnits} unités disponibles existent déjà.`);
      console.log('Pour créer de nouvelles unités, supprimez d\'abord les existantes ou modifiez ce script.');
      await mongoose.disconnect();
      return;
    }

    // Créer des unités d'exemple
    const sampleUnits = [
      // Résidence Les Jardins
      {
        building: building1._id,
        unitNumber: '101',
        floor: 1,
        type: '2br',
        size: 85,
        bedrooms: 2,
        bathrooms: 1,
        status: 'disponible',
        rentPrice: 1200,
        monthlyCharges: 150,
        isAvailable: true,
        description: 'Appartement lumineux avec balcon',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Centre-ville'
      },
      {
        building: building1._id,
        unitNumber: '201',
        floor: 2,
        type: '3br',
        size: 110,
        bedrooms: 3,
        bathrooms: 2,
        status: 'disponible',
        rentPrice: 1500,
        monthlyCharges: 200,
        isAvailable: true,
        description: 'Grand appartement avec vue sur la ville',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Centre-ville'
      },
      {
        building: building1._id,
        unitNumber: '301',
        floor: 3,
        type: '2br',
        size: 90,
        bedrooms: 2,
        bathrooms: 1,
        status: 'negociation',
        salePrice: 350000,
        monthlyCharges: 180,
        isAvailable: true,
        description: 'Appartement à vendre, rénové récemment',
        transactionType: 'vente',
        ville: 'Montréal',
        quartier: 'Centre-ville'
      },
      {
        building: building1._id,
        unitNumber: '401',
        floor: 4,
        type: '1br',
        size: 60,
        bedrooms: 1,
        bathrooms: 1,
        status: 'disponible',
        rentPrice: 950,
        monthlyCharges: 120,
        isAvailable: true,
        description: 'Studio moderne et fonctionnel',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Centre-ville'
      },
      // Complexe Les Érables
      {
        building: building2._id,
        unitNumber: '102',
        floor: 1,
        type: '1br',
        size: 65,
        bedrooms: 1,
        bathrooms: 1,
        status: 'disponible',
        rentPrice: 1000,
        monthlyCharges: 130,
        isAvailable: true,
        description: 'Appartement cosy avec terrasse',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Plateau'
      },
      {
        building: building2._id,
        unitNumber: '302',
        floor: 3,
        type: '2br',
        size: 88,
        bedrooms: 2,
        bathrooms: 1,
        status: 'disponible',
        rentPrice: 1300,
        monthlyCharges: 160,
        isAvailable: true,
        description: 'Appartement spacieux avec beaucoup de lumière',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Plateau'
      },
      {
        building: building2._id,
        unitNumber: '501',
        floor: 5,
        type: 'penthouse',
        size: 150,
        bedrooms: 3,
        bathrooms: 2,
        status: 'negociation',
        salePrice: 450000,
        monthlyCharges: 250,
        isAvailable: true,
        description: 'Penthouse de luxe avec vue panoramique',
        transactionType: 'vente',
        ville: 'Montréal',
        quartier: 'Plateau'
      },
      // Tour du Parc
      {
        building: building3._id,
        unitNumber: '1001',
        floor: 10,
        type: '3br',
        size: 125,
        bedrooms: 3,
        bathrooms: 2,
        status: 'disponible',
        rentPrice: 1800,
        monthlyCharges: 220,
        isAvailable: true,
        description: 'Appartement avec vue panoramique',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Mile-End'
      },
      {
        building: building3._id,
        unitNumber: '1201',
        floor: 12,
        type: '2br',
        size: 95,
        bedrooms: 2,
        bathrooms: 1,
        status: 'disponible',
        rentPrice: 1400,
        monthlyCharges: 170,
        isAvailable: true,
        description: 'Appartement moderne avec balcon',
        transactionType: 'location',
        ville: 'Montréal',
        quartier: 'Mile-End'
      },
      {
        building: building3._id,
        unitNumber: '1501',
        floor: 15,
        type: '4br',
        size: 140,
        bedrooms: 4,
        bathrooms: 2,
        status: 'negociation',
        salePrice: 550000,
        monthlyCharges: 280,
        isAvailable: true,
        description: 'Grand appartement familial avec vue exceptionnelle',
        transactionType: 'vente',
        ville: 'Montréal',
        quartier: 'Mile-End'
      }
    ];

    // Créer les unités
    const createdUnits = await Unit.insertMany(sampleUnits);
    console.log(`✅ ${createdUnits.length} unités créées avec succès`);

    // Mettre à jour le nombre d'unités dans chaque immeuble
    for (const building of [building1, building2, building3]) {
      const unitCount = await Unit.countDocuments({ building: building._id });
      building.totalUnits = unitCount;
      await building.save();
      console.log(`✅ ${building.name}: ${unitCount} unités`);
    }

    console.log('\n✅ Seed terminé avec succès!');
    console.log(`📊 Total: ${createdUnits.length} unités disponibles créées`);
    
    await mongoose.disconnect();
    console.log('✅ Déconnecté de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Exécuter le seed
seedUnits();

