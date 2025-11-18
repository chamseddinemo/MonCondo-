require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const Request = require('../models/Request');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const Document = require('../models/Document');

// Connexion à la base de données
connectDB();

const seedData = async () => {
  try {
    console.log('🌱 Démarrage du seed de la base de données...\n');
    
    // Nettoyer la base de données
    console.log('🧹 Nettoyage de la base de données...');
    await User.deleteMany({});
    await Building.deleteMany({});
    await Unit.deleteMany({});
    await Request.deleteMany({});
    await Payment.deleteMany({});
    await Message.deleteMany({});
    await Document.deleteMany({});
    console.log('✅ Base de données nettoyée\n');

    // Créer des utilisateurs
    console.log('👥 Création des utilisateurs...');
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Système',
      email: 'admin@moncondo.com',
      password: 'administrateur',
      phone: '514-123-4567',
      role: 'admin',
      isActive: true
    });

    const proprietaire1 = await User.create({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      password: 'password123',
      phone: '514-234-5678',
      role: 'proprietaire',
      isActive: true
    });

    const proprietaire2 = await User.create({
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@example.com',
      password: 'password123',
      phone: '514-345-6789',
      role: 'proprietaire',
      isActive: true
    });

    const proprietaire3 = await User.create({
      firstName: 'Robert',
      lastName: 'Beaulieu',
      email: 'robert.beaulieu@example.com',
      password: 'password123',
      phone: '514-456-7890',
      role: 'proprietaire',
      isActive: true
    });

    const locataire1 = await User.create({
      firstName: 'Pierre',
      lastName: 'Tremblay',
      email: 'pierre.tremblay@example.com',
      password: 'password123',
      phone: '514-567-8901',
      role: 'locataire',
      isActive: true
    });

    const locataire2 = await User.create({
      firstName: 'Sophie',
      lastName: 'Gagnon',
      email: 'sophie.gagnon@example.com',
      password: 'password123',
      phone: '514-678-9012',
      role: 'locataire',
      isActive: true
    });

    const locataire3 = await User.create({
      firstName: 'Marc',
      lastName: 'Lavoie',
      email: 'marc.lavoie@example.com',
      password: 'password123',
      phone: '514-789-0123',
      role: 'locataire',
      isActive: true
    });

    const visiteur1 = await User.create({
      firstName: 'Paul',
      lastName: 'Lavoie',
      email: 'paul.lavoie@example.com',
      password: 'password123',
      phone: '514-890-1234',
      role: 'visiteur',
      isActive: true
    });

    const visiteur2 = await User.create({
      firstName: 'Lucie',
      lastName: 'Roy',
      email: 'lucie.roy@example.com',
      password: 'password123',
      phone: '514-901-2345',
      role: 'visiteur',
      isActive: true
    });

    console.log(`✅ ${await User.countDocuments()} utilisateurs créés\n`);

    // Créer des immeubles
    console.log('🏢 Création des immeubles...');
    const building1 = await Building.create({
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
      description: 'Immeuble moderne avec vue sur le fleuve',
      amenities: ['Gym', 'Piscine', 'Terrasse', 'Stationnement'],
      isActive: true
    });

    const building2 = await Building.create({
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
      description: 'Complexe résidentiel de luxe',
      amenities: ['Spa', 'Salle de réunion', 'Rooftop'],
      isActive: true
    });

    const building3 = await Building.create({
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
      description: 'Tour moderne au centre-ville',
      amenities: ['Concierge', 'Gym', 'Salle de jeux'],
      isActive: true
    });

    console.log(`✅ ${await Building.countDocuments()} immeubles créés\n`);

    // Créer des unités
    console.log('🏠 Création des unités...');
    const units = [];
    
    // Unités pour building1
    units.push(await Unit.create({
      building: building1._id,
      unitNumber: '101',
      floor: 1,
      type: '2br',
      size: 85,
      bedrooms: 2,
      bathrooms: 1,
      proprietaire: proprietaire1._id,
      locataire: locataire1._id,
      status: 'loue',
      isAvailable: false,
      rentPrice: 1200,
      monthlyCharges: 150,
      description: 'Appartement lumineux avec balcon',
      features: ['Balcon', 'Cuisine moderne', 'Planchers en bois'],
      ville: 'Montréal',
      quartier: 'Vieux-Montréal',
      transactionType: 'location',
      nombrePieces: 2,
      etatRenovation: 'acceptable'
    }));

    units.push(await Unit.create({
      building: building1._id,
      unitNumber: '201',
      floor: 2,
      type: '3br',
      size: 110,
      bedrooms: 3,
      bathrooms: 2,
      proprietaire: proprietaire1._id,
      status: 'disponible',
      isAvailable: true,
      rentPrice: 1500,
      salePrice: 350000,
      monthlyCharges: 200,
      description: 'Grand appartement avec vue',
      features: ['Vue sur le fleuve', 'Deux salles de bain', 'Balcon'],
      ville: 'Montréal',
      quartier: 'Vieux-Montréal',
      transactionType: 'location',
      nombrePieces: 3,
      etatRenovation: 'renovation_complete',
      titre: 'Appartement 3 chambres avec vue',
      datePublication: new Date()
    }));

    units.push(await Unit.create({
      building: building1._id,
      unitNumber: '301',
      floor: 3,
      type: '1br',
      size: 55,
      bedrooms: 1,
      bathrooms: 1,
      proprietaire: proprietaire2._id,
      locataire: locataire2._id,
      status: 'loue',
      isAvailable: false,
      rentPrice: 900,
      monthlyCharges: 120,
      description: 'Studio moderne',
      features: ['Cuisine équipée', 'Fenêtres grandes'],
      ville: 'Montréal',
      quartier: 'Vieux-Montréal',
      transactionType: 'location',
      nombrePieces: 1,
      etatRenovation: 'acceptable'
    }));

    units.push(await Unit.create({
      building: building1._id,
      unitNumber: '401',
      floor: 4,
      type: '2br',
      size: 90,
      bedrooms: 2,
      bathrooms: 1,
      proprietaire: proprietaire1._id,
      status: 'disponible',
      isAvailable: true,
      rentPrice: 1300,
      monthlyCharges: 160,
      description: 'Appartement rénové',
      features: ['Rénovation récente', 'Planchers en bois'],
      ville: 'Montréal',
      quartier: 'Vieux-Montréal',
      transactionType: 'location',
      nombrePieces: 2,
      etatRenovation: 'renovation_complete',
      titre: 'Appartement 2 chambres rénové',
      datePublication: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Il y a 5 jours
    }));

    // Unités pour building2
    units.push(await Unit.create({
      building: building2._id,
      unitNumber: '501',
      floor: 5,
      type: 'penthouse',
      size: 200,
      bedrooms: 4,
      bathrooms: 3,
      proprietaire: proprietaire2._id,
      status: 'disponible',
      isAvailable: true,
      salePrice: 750000,
      monthlyCharges: 500,
      description: 'Penthouse de luxe avec terrasse privée',
      features: ['Terrasse privée', 'Cheminée', 'Vue panoramique'],
      ville: 'Montréal',
      quartier: 'Plateau-Mont-Royal',
      transactionType: 'vente',
      nombrePieces: 4,
      etatRenovation: 'renovation_complete',
      titre: 'Penthouse de luxe avec terrasse',
      prix: 750000,
      datePublication: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isPremium: true
    }));

    units.push(await Unit.create({
      building: building2._id,
      unitNumber: '302',
      floor: 3,
      type: '2br',
      size: 95,
      bedrooms: 2,
      bathrooms: 2,
      proprietaire: proprietaire3._id,
      locataire: locataire3._id,
      status: 'loue',
      isAvailable: false,
      rentPrice: 1400,
      monthlyCharges: 180,
      description: 'Appartement moderne au 3e étage',
      features: ['Deux salles de bain', 'Balcon'],
      ville: 'Montréal',
      quartier: 'Plateau-Mont-Royal',
      transactionType: 'location',
      nombrePieces: 2,
      etatRenovation: 'renovation_partielle'
    }));

    units.push(await Unit.create({
      building: building2._id,
      unitNumber: '102',
      floor: 1,
      type: '1br',
      size: 60,
      bedrooms: 1,
      bathrooms: 1,
      proprietaire: proprietaire3._id,
      status: 'disponible',
      isAvailable: true,
      rentPrice: 950,
      monthlyCharges: 130,
      description: 'Studio lumineux au rez-de-chaussée',
      features: ['Lumineux', 'Cuisine équipée'],
      ville: 'Montréal',
      quartier: 'Plateau-Mont-Royal',
      transactionType: 'location',
      nombrePieces: 1,
      etatRenovation: 'acceptable',
      titre: 'Studio lumineux',
      datePublication: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isPremium: false
    }));

    // Unités pour building3
    units.push(await Unit.create({
      building: building3._id,
      unitNumber: '1001',
      floor: 10,
      type: '3br',
      size: 125,
      bedrooms: 3,
      bathrooms: 2,
      proprietaire: proprietaire1._id,
      status: 'disponible',
      isAvailable: true,
      salePrice: 450000,
      monthlyCharges: 250,
      description: 'Appartement avec vue panoramique',
      features: ['Vue panoramique', 'Balcon', 'Cuisine moderne'],
      ville: 'Montréal',
      quartier: 'Centre-ville',
      transactionType: 'vente',
      nombrePieces: 3,
      etatRenovation: 'renovation_complete',
      titre: 'Appartement 3 chambres avec vue',
      prix: 450000,
      datePublication: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isPremium: true
    }));

    units.push(await Unit.create({
      building: building3._id,
      unitNumber: '1502',
      floor: 15,
      type: '2br',
      size: 100,
      bedrooms: 2,
      bathrooms: 1,
      proprietaire: proprietaire2._id,
      status: 'negociation',
      isAvailable: false,
      rentPrice: 1600,
      monthlyCharges: 200,
      description: 'Appartement en négociation',
      features: ['Vue sur la ville', 'Balcon'],
      ville: 'Montréal',
      quartier: 'Centre-ville',
      transactionType: 'location',
      nombrePieces: 2,
      etatRenovation: 'acceptable',
      titre: 'Appartement 2 chambres',
      datePublication: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }));

    // Mettre à jour le nombre total d'unités
    building1.totalUnits = 4;
    building2.totalUnits = 3;
    building3.totalUnits = 2;
    await building1.save();
    await building2.save();
    await building3.save();

    console.log(`✅ ${await Unit.countDocuments()} unités créées\n`);

    // Créer des demandes
    console.log('📋 Création des demandes...');
    const requests = [];
    
    requests.push(await Request.create({
      title: 'Réparation de la climatisation',
      description: 'La climatisation de l\'unité 101 ne fonctionne plus correctement. Il fait très chaud dans l\'appartement.',
      type: 'maintenance',
      unit: units[0]._id,
      building: building1._id,
      createdBy: locataire1._id,
      assignedTo: admin._id,
      priority: 'haute',
      status: 'en_cours'
    }));

    requests.push(await Request.create({
      title: 'Demande de location - Unité 201',
      description: 'Je souhaite louer l\'unité 201. Disponible pour visite immédiate.',
      type: 'location',
      unit: units[1]._id,
      building: building1._id,
      createdBy: visiteur1._id,
      priority: 'moyenne',
      status: 'en_attente'
    }));

    requests.push(await Request.create({
      title: 'Fuite d\'eau dans la salle de bain',
      description: 'Il y a une fuite d\'eau constante dans la salle de bain principale de l\'unité 301.',
      type: 'maintenance',
      unit: units[2]._id,
      building: building1._id,
      createdBy: locataire2._id,
      assignedTo: admin._id,
      priority: 'urgente',
      status: 'en_attente'
    }));

    requests.push(await Request.create({
      title: 'Demande de renouvellement de bail',
      description: 'Je souhaite renouveler mon bail pour l\'unité 302.',
      type: 'autre',
      unit: units[5]._id,
      building: building2._id,
      createdBy: locataire3._id,
      priority: 'moyenne',
      status: 'en_attente'
    }));

    requests.push(await Request.create({
      title: 'Installation de stores',
      description: 'Besoin d\'installer des stores dans toutes les fenêtres de l\'unité 401.',
      type: 'service',
      unit: units[3]._id,
      building: building1._id,
      createdBy: proprietaire1._id,
      priority: 'faible',
      status: 'termine'
    }));

    requests.push(await Request.create({
      title: 'Réclamation - Bruit excessif',
      description: 'Réclamation concernant le bruit excessif provenant de l\'unité voisine.',
      type: 'reclamation',
      unit: units[0]._id,
      building: building1._id,
      createdBy: locataire1._id,
      priority: 'moyenne',
      status: 'en_attente'
    }));

    requests.push(await Request.create({
      title: 'Maintenance préventive - Chauffage',
      description: 'Vérification annuelle du système de chauffage.',
      type: 'maintenance',
      unit: units[4]._id,
      building: building2._id,
      createdBy: proprietaire2._id,
      priority: 'faible',
      status: 'termine'
    }));

    console.log(`✅ ${await Request.countDocuments()} demandes créées\n`);

    // Créer des paiements
    console.log('💳 Création des paiements...');
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const overdueDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    // Paiements payés ce mois
    await Payment.create({
      unit: units[0]._id,
      building: building1._id,
      payer: locataire1._id,
      type: 'loyer',
      amount: 1200,
      dueDate: thisMonth,
      paidDate: thisMonth,
      status: 'paye',
      paymentMethod: 'virement'
    });

    await Payment.create({
      unit: units[0]._id,
      building: building1._id,
      payer: locataire1._id,
      type: 'charges',
      amount: 150,
      dueDate: thisMonth,
      paidDate: thisMonth,
      status: 'paye',
      paymentMethod: 'virement'
    });

    await Payment.create({
      unit: units[2]._id,
      building: building1._id,
      payer: locataire2._id,
      type: 'loyer',
      amount: 900,
      dueDate: thisMonth,
      paidDate: thisMonth,
      status: 'paye',
      paymentMethod: 'carte_credit'
    });

    await Payment.create({
      unit: units[5]._id,
      building: building2._id,
      payer: locataire3._id,
      type: 'loyer',
      amount: 1400,
      dueDate: thisMonth,
      paidDate: thisMonth,
      status: 'paye',
      paymentMethod: 'virement'
    });

    // Paiements en attente
    await Payment.create({
      unit: units[0]._id,
      building: building1._id,
      payer: locataire1._id,
      type: 'loyer',
      amount: 1200,
      dueDate: nextMonth,
      status: 'en_attente'
    });

    await Payment.create({
      unit: units[2]._id,
      building: building1._id,
      payer: locataire2._id,
      type: 'loyer',
      amount: 900,
      dueDate: nextMonth,
      status: 'en_attente'
    });

    await Payment.create({
      unit: units[5]._id,
      building: building2._id,
      payer: locataire3._id,
      type: 'loyer',
      amount: 1400,
      dueDate: nextMonth,
      status: 'en_attente'
    });

    // Paiements en retard
    await Payment.create({
      unit: units[0]._id,
      building: building1._id,
      payer: locataire1._id,
      type: 'charges',
      amount: 150,
      dueDate: overdueDate,
      status: 'en_retard'
    });

    await Payment.create({
      unit: units[5]._id,
      building: building2._id,
      payer: locataire3._id,
      type: 'charges',
      amount: 180,
      dueDate: overdueDate,
      status: 'en_retard'
    });

    console.log(`✅ ${await Payment.countDocuments()} paiements créés\n`);

    // Créer des messages
    console.log('💬 Création des messages...');
    await Message.create({
      sender: locataire1._id,
      receiver: proprietaire1._id,
      unit: units[0]._id,
      building: building1._id,
      subject: 'Question sur le paiement',
      content: 'Bonjour, j\'aimerais confirmer que vous avez bien reçu mon paiement de loyer pour ce mois.',
      isRead: false
    });

    await Message.create({
      sender: proprietaire1._id,
      receiver: locataire1._id,
      unit: units[0]._id,
      building: building1._id,
      subject: 'Réponse - Paiement reçu',
      content: 'Oui, j\'ai bien reçu votre paiement. Merci!',
      isRead: true,
      readAt: new Date()
    });

    await Message.create({
      sender: admin._id,
      receiver: proprietaire1._id,
      building: building1._id,
      subject: 'Maintenance prévue',
      content: 'Une maintenance préventive est prévue pour votre immeuble la semaine prochaine.',
      isRead: false
    });

    await Message.create({
      sender: locataire2._id,
      receiver: proprietaire2._id,
      unit: units[2]._id,
      building: building1._id,
      subject: 'Demande de réparation',
      content: 'Il y a un problème avec la plomberie dans mon appartement.',
      isRead: false
    });

    await Message.create({
      sender: visiteur1._id,
      receiver: proprietaire1._id,
      unit: units[1]._id,
      building: building1._id,
      subject: 'Demande de visite',
      content: 'Je souhaiterais visiter l\'unité 201. Quand seriez-vous disponible?',
      isRead: false
    });

    console.log(`✅ ${await Message.countDocuments()} messages créés\n`);

    // Créer des documents
    console.log('📄 Création des documents...');
    await Document.create({
      filename: 'contrat_location_101.pdf',
      originalName: 'Contrat de location - Unité 101.pdf',
      path: '/uploads/documents/contrat_location_101.pdf',
      unit: units[0]._id,
      building: building1._id,
      uploadedBy: admin._id,
      description: 'Contrat de location pour l\'unité 101',
      category: 'contrat',
      size: 245678,
      mimeType: 'application/pdf',
      accessRoles: ['admin', 'proprietaire', 'locataire']
    });

    await Document.create({
      filename: 'facture_janvier_2024.pdf',
      originalName: 'Facture janvier 2024.pdf',
      path: '/uploads/documents/facture_janvier_2024.pdf',
      unit: units[0]._id,
      building: building1._id,
      uploadedBy: admin._id,
      description: 'Facture pour les charges du mois de janvier',
      category: 'facture',
      size: 123456,
      mimeType: 'application/pdf',
      accessRoles: ['admin', 'proprietaire', 'locataire']
    });

    await Document.create({
      filename: 'certificat_location_301.pdf',
      originalName: 'Certificat de location.pdf',
      path: '/uploads/documents/certificat_location_301.pdf',
      unit: units[2]._id,
      building: building1._id,
      uploadedBy: admin._id,
      description: 'Certificat de location pour l\'unité 301',
      category: 'contrat',
      size: 98765,
      mimeType: 'application/pdf',
      accessRoles: ['admin', 'proprietaire']
    });

    await Document.create({
      filename: 'rapport_inspection.pdf',
      originalName: 'Rapport d\'inspection.pdf',
      path: '/uploads/documents/rapport_inspection.pdf',
      building: building1._id,
      uploadedBy: admin._id,
      description: 'Rapport d\'inspection annuel de l\'immeuble',
      category: 'autre',
      size: 456789,
      mimeType: 'application/pdf',
      accessRoles: ['admin', 'proprietaire']
    });

    await Document.create({
      filename: 'recu_paiement_fevrier.pdf',
      originalName: 'Reçu de paiement - Février 2024.pdf',
      path: '/uploads/documents/recu_paiement_fevrier.pdf',
      unit: units[0]._id,
      building: building1._id,
      uploadedBy: admin._id,
      description: 'Reçu de paiement du loyer de février',
      category: 'facture',
      size: 87654,
      mimeType: 'application/pdf',
      accessRoles: ['admin', 'proprietaire', 'locataire']
    });

    console.log(`✅ ${await Document.countDocuments()} documents créés\n`);

    // Résumé final
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SEED TERMINÉ AVEC SUCCÈS!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 Résumé des données créées:');
    console.log(`   👥 Utilisateurs: ${await User.countDocuments()}`);
    console.log(`   🏢 Immeubles: ${await Building.countDocuments()}`);
    console.log(`   🏠 Unités: ${await Unit.countDocuments()}`);
    console.log(`   📋 Demandes: ${await Request.countDocuments()}`);
    console.log(`   💳 Paiements: ${await Payment.countDocuments()}`);
    console.log(`   💬 Messages: ${await Message.countDocuments()}`);
    console.log(`   📄 Documents: ${await Document.countDocuments()}\n`);
    
    console.log('🔐 Comptes créés:');
    console.log('   Admin:', admin.email, '- Mot de passe: admin123');
    console.log('   Propriétaire 1:', proprietaire1.email, '- Mot de passe: password123');
    console.log('   Propriétaire 2:', proprietaire2.email, '- Mot de passe: password123');
    console.log('   Propriétaire 3:', proprietaire3.email, '- Mot de passe: password123');
    console.log('   Locataire 1:', locataire1.email, '- Mot de passe: password123');
    console.log('   Locataire 2:', locataire2.email, '- Mot de passe: password123');
    console.log('   Locataire 3:', locataire3.email, '- Mot de passe: password123');
    console.log('   Visiteur 1:', visiteur1.email, '- Mot de passe: password123');
    console.log('   Visiteur 2:', visiteur2.email, '- Mot de passe: password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Exécuter le seed
seedData();
