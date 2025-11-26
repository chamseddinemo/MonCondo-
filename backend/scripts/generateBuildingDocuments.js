/**
 * Script pour générer les documents administratifs pour tous les immeubles existants
 * Usage: node scripts/generateBuildingDocuments.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Building = require('../models/Building');
const Document = require('../models/Document');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Fonctions de génération PDF (copiées du controller)
const generateTechnicalSheetPDF = (doc, building, admin) => {
  const address = building.address;
  const fullAddress = `${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
  
  doc.fontSize(20).text('FICHE TECHNIQUE DE L\'IMMEUBLE', { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(14).text('INFORMATIONS GÉNÉRALES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Nom de l'immeuble: ${building.name}`);
  doc.text(`Adresse complète: ${fullAddress}`);
  doc.text(`Année de construction: ${building.yearBuilt || 'Non spécifiée'}`);
  doc.text(`Nombre d'unités: ${building.totalUnits || 0}`);
  doc.text(`Statut: ${building.isActive ? 'Actif' : 'Inactif'}`);
  doc.moveDown();
  
  doc.fontSize(14).text('ADMINISTRATEUR', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Nom: ${admin.firstName} ${admin.lastName}`);
  doc.text(`Email: ${admin.email}`);
  if (admin.phone) {
    doc.text(`Téléphone: ${admin.phone}`);
  }
  doc.moveDown();
  
  doc.fontSize(14).text('DATE DE CRÉATION', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(new Date(building.createdAt).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
  doc.moveDown();
  
  doc.fontSize(14).text('DESCRIPTION', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(building.description || 'Aucune description disponible');
  doc.moveDown();
  
  doc.fontSize(14).text('AMÉNAGEMENTS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(building.amenities && building.amenities.length > 0 
    ? building.amenities.join(', ') 
    : 'Aucun aménagement spécifié');
  doc.moveDown(2);
  
  doc.fontSize(9).text(`Document généré automatiquement le ${new Date().toLocaleDateString('fr-CA')}`, { align: 'center' });
};

const generateInternalRegulationPDF = (doc, building, admin) => {
  const address = building.address;
  const fullAddress = `${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
  
  doc.fontSize(20).text('RÈGLEMENT INTÉRIEUR', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(building.name.toUpperCase(), { align: 'center' });
  doc.fontSize(11).text(fullAddress, { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(14).text('ARTICLE 1 - DISPOSITIONS GÉNÉRALES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Le présent règlement intérieur a pour objet de définir les règles de vie en commun dans l'immeuble ${building.name}, situé ${fullAddress}.`);
  doc.moveDown();
  
  doc.fontSize(14).text('ARTICLE 2 - RESPECT DES LIEUX COMMUNS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Tous les résidents sont tenus de respecter les parties communes de l\'immeuble.');
  doc.text('Les espaces communs doivent être maintenus propres et en bon état.');
  doc.moveDown();
  
  doc.fontSize(14).text('ARTICLE 3 - BRUIT ET NUISANCES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Les résidents doivent éviter tout bruit excessif, notamment entre 22h et 7h.');
  doc.text('Les travaux bruyants sont interdits les dimanches et jours fériés.');
  doc.moveDown();
  
  doc.fontSize(14).text('ARTICLE 4 - SÉCURITÉ', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Chaque résident est responsable de la sécurité de son unité.');
  doc.text('Les clés et codes d\'accès doivent être gardés confidentiels.');
  doc.moveDown();
  
  doc.fontSize(14).text('ARTICLE 5 - MAINTENANCE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Tout problème technique ou de maintenance doit être signalé à l\'administration.');
  doc.text('L\'administration se réserve le droit d\'effectuer des visites de maintenance avec préavis de 48 heures.');
  doc.moveDown();
  
  doc.fontSize(14).text('ARTICLE 6 - RESPONSABILITÉ', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('L\'administration de l\'immeuble n\'est pas responsable des dommages causés par la négligence des résidents.');
  doc.moveDown(2);
  
  doc.fontSize(9);
  doc.text(`Administrateur: ${admin.firstName} ${admin.lastName}`);
  doc.text(`Email: ${admin.email}`);
  doc.text(`Date d'entrée en vigueur: ${new Date().toLocaleDateString('fr-CA')}`, { align: 'center' });
};

const generateMaintenancePlanPDF = (doc, building, admin) => {
  const address = building.address;
  const fullAddress = `${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
  
  doc.fontSize(20).text('PLAN DE MAINTENANCE', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(building.name.toUpperCase(), { align: 'center' });
  doc.fontSize(11).text(fullAddress, { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(14).text('OBJECTIF', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Ce plan de maintenance définit les interventions préventives et curatives nécessaires pour maintenir l\'immeuble en bon état.');
  doc.moveDown();
  
  doc.fontSize(14).text('MAINTENANCE MENSUELLE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('- Inspection des parties communes');
  doc.text('- Vérification des systèmes de sécurité');
  doc.text('- Nettoyage des espaces communs');
  doc.text('- Vérification des ascenseurs (si applicable)');
  doc.moveDown();
  
  doc.fontSize(14).text('MAINTENANCE TRIMESTRIELLE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('- Inspection des systèmes électriques');
  doc.text('- Vérification des systèmes de plomberie');
  doc.text('- Contrôle des systèmes de chauffage/ventilation');
  doc.text('- Inspection des toitures et façades');
  doc.moveDown();
  
  doc.fontSize(14).text('MAINTENANCE ANNUELLE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('- Révision complète des installations');
  doc.text('- Inspection des fondations');
  doc.text('- Vérification de la conformité aux normes');
  doc.text('- Mise à jour des équipements de sécurité');
  doc.moveDown();
  
  doc.fontSize(14).text('INTERVENTIONS D\'URGENCE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('En cas d\'urgence, contacter immédiatement:');
  doc.text(`- Administrateur: ${admin.firstName} ${admin.lastName}`);
  doc.text(`- Email: ${admin.email}`);
  if (admin.phone) {
    doc.text(`- Téléphone: ${admin.phone}`);
  }
  doc.moveDown();
  
  doc.fontSize(14).text('PROCÉDURE DE SIGNALEMENT', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text('Tout problème doit être signalé par écrit à l\'administration avec:');
  doc.text('- Description détaillée du problème');
  doc.text('- Localisation précise');
  doc.text('- Photos si nécessaire');
  doc.text('- Date et heure de l\'observation');
  doc.moveDown(2);
  
  doc.fontSize(9);
  doc.text(`Document généré automatiquement le ${new Date().toLocaleDateString('fr-CA')}`, { align: 'center' });
  doc.text(`Administrateur: ${admin.firstName} ${admin.lastName}`, { align: 'center' });
};

async function generateDocumentsForBuilding(building, admin) {
  try {
    // Vérifier si les documents existent déjà
    const existingDocs = await Document.find({ 
      building: building._id,
      category: { $in: ['autre', 'reglement', 'maintenance'] }
    });
    
    if (existingDocs.length >= 3) {
      console.log(`[SKIP] Immeuble "${building.name}" a déjà ${existingDocs.length} documents administratifs`);
      return { created: 0, skipped: 1 };
    }
    
    // Créer le dossier documents s'il n'existe pas
    const documentsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
    
    const buildingName = building.name.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    
    // Liste des documents à générer
    const documentsToCreate = [
      {
        name: `Fiche_Technique_${buildingName}_${timestamp}.pdf`,
        category: 'autre',
        description: 'Fiche technique de l\'immeuble',
        generator: generateTechnicalSheetPDF
      },
      {
        name: `Reglement_Interieur_${buildingName}_${timestamp}.pdf`,
        category: 'reglement',
        description: 'Règlement intérieur de l\'immeuble',
        generator: generateInternalRegulationPDF
      },
      {
        name: `Plan_Maintenance_${buildingName}_${timestamp}.pdf`,
        category: 'maintenance',
        description: 'Plan de maintenance de l\'immeuble',
        generator: generateMaintenancePlanPDF
      }
    ];
    
    const createdDocuments = [];
    
    for (const doc of documentsToCreate) {
      // Vérifier si un document de cette catégorie existe déjà
      const existingDoc = existingDocs.find(d => d.category === doc.category);
      if (existingDoc) {
        console.log(`[SKIP] Document "${doc.category}" existe déjà pour "${building.name}"`);
        continue;
      }
      
      const filePath = path.join(documentsDir, doc.name);
      
      // Générer le PDF
      await new Promise((resolve, reject) => {
        const pdfDoc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filePath);
        pdfDoc.pipe(stream);
        
        // Générer le contenu selon le type de document
        doc.generator(pdfDoc, building, admin);
        
        pdfDoc.end();
        
        stream.on('finish', () => {
          resolve();
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      });
      
      // Obtenir la taille du fichier
      const stats = fs.statSync(filePath);
      
      // Créer l'entrée document dans la base de données
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);
      
      const document = await Document.create({
        filename: doc.name,
        originalName: doc.name,
        path: relativePath,
        mimeType: 'application/pdf',
        size: stats.size,
        building: building._id,
        unit: null,
        uploadedBy: admin._id,
        category: doc.category,
        description: doc.description,
        accessRoles: ['admin'],
        isPublic: false
      });
      
      createdDocuments.push(document);
      console.log(`[OK] Document créé: ${doc.name} pour "${building.name}"`);
    }
    
    return { created: createdDocuments.length, skipped: 0 };
  } catch (error) {
    console.error(`[ERROR] Erreur pour "${building.name}":`, error.message);
    return { created: 0, skipped: 0, error: error.message };
  }
}

async function main() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moncondo');
    console.log('✅ Connecté à MongoDB');
    
    // Récupérer tous les immeubles
    const buildings = await Building.find().populate('admin');
    console.log(`\n📋 ${buildings.length} immeuble(s) trouvé(s)\n`);
    
    if (buildings.length === 0) {
      console.log('Aucun immeuble à traiter.');
      await mongoose.connection.close();
      return;
    }
    
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const building of buildings) {
      const admin = building.admin || await User.findOne({ role: 'admin' });
      
      if (!admin) {
        console.log(`[SKIP] Immeuble "${building.name}" n'a pas d'administrateur assigné`);
        totalSkipped++;
        continue;
      }
      
      const result = await generateDocumentsForBuilding(building, admin);
      totalCreated += result.created;
      totalSkipped += result.skipped;
      if (result.error) totalErrors++;
    }
    
    console.log('\n========================================');
    console.log('📊 RÉSUMÉ');
    console.log('========================================');
    console.log(`✅ Documents créés: ${totalCreated}`);
    console.log(`⏭️  Immeubles ignorés: ${totalSkipped}`);
    if (totalErrors > 0) {
      console.log(`❌ Erreurs: ${totalErrors}`);
    }
    console.log('========================================\n');
    
    await mongoose.connection.close();
    console.log('✅ Terminé!');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

main();

