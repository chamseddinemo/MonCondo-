/**
 * Script pour générer les documents manquants pour les demandes acceptées
 * Usage: node backend/scripts/generate-missing-documents.js [requestId]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Request = require('../models/Request');
const Unit = require('../models/Unit');
const User = require('../models/User');
const Building = require('../models/Building'); // Nécessaire pour le populate
const { generateLeaseAgreement, generateSaleAgreement } = require('../services/documentService');
const path = require('path');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moncondo', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

async function generateDocumentsForRequest(requestId) {
  try {
    console.log(`\n📄 Génération des documents pour la demande: ${requestId}`);
    
    // Récupérer la demande
    const request = await Request.findById(requestId)
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice building proprietaire')
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName email phone monthlyIncome numberOfChildren creditScore reputation previousTenant');

    if (!request) {
      console.error(`❌ Demande non trouvée: ${requestId}`);
      return false;
    }

    // Vérifier que la demande est acceptée
    if (request.status !== 'accepte') {
      console.error(`❌ La demande n'est pas acceptée (statut: ${request.status})`);
      return false;
    }

    // Vérifier si des documents existent déjà
    if (request.generatedDocuments && request.generatedDocuments.length > 0) {
      console.log(`⚠️  Des documents existent déjà pour cette demande (${request.generatedDocuments.length} document(s))`);
      console.log(`   Documents existants:`, request.generatedDocuments.map(doc => doc.filename).join(', '));
      return true;
    }

    // Vérifier que la demande a une unité et un building
    if (!request.unit || !request.building) {
      console.error(`❌ La demande n'a pas d'unité ou de bâtiment associé`);
      return false;
    }

    if (request.type !== 'location' && request.type !== 'achat') {
      console.error(`❌ Type de demande non pris en charge pour la génération de documents: ${request.type}`);
      return false;
    }

    const unit = await Unit.findById(request.unit._id || request.unit)
      .populate('building', 'name address')
      .populate('proprietaire', 'firstName lastName email phone');

    if (!unit) {
      console.error(`❌ Unité non trouvée`);
      return false;
    }

    const building = unit.building || request.building;
    const requester = await User.findById(request.createdBy._id || request.createdBy);
    const owner = unit.proprietaire || await User.findOne({ role: 'admin' });

    if (!building) {
      console.error(`❌ Bâtiment non trouvé`);
      return false;
    }

    if (!requester) {
      console.error(`❌ Demandeur non trouvé`);
      return false;
    }

    if (!owner) {
      console.error(`❌ Propriétaire non trouvé`);
      return false;
    }

    console.log(`✅ Informations récupérées:`);
    console.log(`   Type: ${request.type}`);
    console.log(`   Unité: ${unit.unitNumber}`);
    console.log(`   Bâtiment: ${building.name}`);
    console.log(`   Demandeur: ${requester.firstName} ${requester.lastName}`);
    console.log(`   Propriétaire: ${owner.firstName} ${owner.lastName}`);

    // Générer le document
    console.log(`\n📝 Génération du document...`);
    let documentResult;
    if (request.type === 'location') {
      documentResult = await generateLeaseAgreement(request, unit, building, requester, owner);
    } else if (request.type === 'achat') {
      documentResult = await generateSaleAgreement(request, unit, building, requester, owner);
    }

    if (!documentResult || !documentResult.success) {
      console.error(`❌ Échec de la génération du document`);
      return false;
    }

    console.log(`✅ Document généré: ${documentResult.filename}`);

    // Ajouter le document à la demande
    if (!request.generatedDocuments) {
      request.generatedDocuments = [];
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    let relativePath;
    if (path.isAbsolute(documentResult.path)) {
      relativePath = path.relative(uploadsDir, documentResult.path).replace(/\\/g, '/');
    } else {
      relativePath = documentResult.path.replace(/\\/g, '/');
    }

    if (!relativePath.startsWith('documents/') && !relativePath.startsWith('/')) {
      relativePath = 'documents/' + relativePath;
    }

    const docType = documentResult.type === 'bail' ? 'bail' : 
                   documentResult.type === 'contrat_vente' ? 'contrat_vente' : 'autre';

    const newDocument = {
      type: docType,
      filename: documentResult.filename,
      path: relativePath,
      signed: false,
      generatedAt: documentResult.generatedAt || new Date(),
      signedBy: undefined,
      signedAt: undefined
    };

    request.generatedDocuments.push(newDocument);
    await request.save();

    console.log(`✅ Document ajouté à la demande et sauvegardé`);
    console.log(`   Type: ${docType}`);
    console.log(`   Fichier: ${documentResult.filename}`);
    console.log(`   Chemin: ${relativePath}`);

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la génération des documents:`, error);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  await connectDB();

  const requestId = process.argv[2];

  if (requestId) {
    // Générer les documents pour une demande spécifique
    console.log(`\n🔧 Génération des documents pour la demande: ${requestId}`);
    const success = await generateDocumentsForRequest(requestId);
    if (success) {
      console.log(`\n✅ Documents générés avec succès!`);
    } else {
      console.log(`\n❌ Échec de la génération des documents`);
      process.exit(1);
    }
  } else {
    // Générer les documents pour toutes les demandes acceptées sans documents
    console.log(`\n🔧 Recherche des demandes acceptées sans documents...`);
    const requests = await Request.find({
      status: 'accepte',
      $or: [
        { generatedDocuments: { $exists: false } },
        { generatedDocuments: { $size: 0 } }
      ],
      type: { $in: ['location', 'achat'] }
    }).populate('unit').populate('building');

    console.log(`📋 ${requests.length} demande(s) trouvée(s) sans documents`);

    let successCount = 0;
    let failCount = 0;

    for (const request of requests) {
      const success = await generateDocumentsForRequest(request._id.toString());
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ Succès: ${successCount}`);
    console.log(`   ❌ Échecs: ${failCount}`);
  }

  await mongoose.connection.close();
  console.log(`\n✅ Terminé!`);
}

main().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

