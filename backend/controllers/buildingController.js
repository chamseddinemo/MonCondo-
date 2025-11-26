const Building = require('../models/Building');
const Unit = require('../models/Unit');
const { getBuildingImageUrl } = require('../utils/imageHelper');

// @desc    Obtenir tous les immeubles
// @route   GET /api/buildings
// @access  Private
exports.getBuildings = async (req, res) => {
  try {
    console.log('[getBuildings] 📡 Requête reçue:', {
      method: req.method,
      url: req.originalUrl,
      user: req.user ? req.user.email : 'non authentifié',
      query: req.query
    });

    const { city, status, type, search } = req.query;
    const query = {};

    // Filtres
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (status) {
      query.isActive = status === 'active';
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { 'address.street': new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') }
      ];
    }

    console.log('[getBuildings] 🔍 Recherche avec query:', JSON.stringify(query));

    const buildings = await Building.find(query)
      .populate('admin', 'firstName lastName email phone')
      .sort('-createdAt')
      .lean();

    console.log('[getBuildings] ✅ Immeubles trouvés:', buildings.length);

    // Pour chaque immeuble, compter les unités et calculer les stats
    const buildingsWithStats = await Promise.all(buildings.map(async (building) => {
      const units = await Unit.find({ building: building._id }).lean();
      
      const totalUnits = units.length;
      const availableUnits = units.filter(u => 
        u.status === 'disponible' || 
        (u.isAvailable !== false && !u.locataire)
      ).length;
      const rentedUnits = units.filter(u => 
        u.status === 'loue' || 
        u.status === 'en_location' ||
        (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
      ).length;
      
      const monthlyRevenue = units
        .filter(u => u.locataire && u.rentPrice)
        .reduce((sum, u) => sum + (u.rentPrice || 0), 0);

      const occupancyRate = totalUnits > 0 
        ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) 
        : 0;

      return {
        ...building,
        imageUrl: building.image || getBuildingImageUrl(building),
        totalUnits,
        availableUnits,
        rentedUnits,
        monthlyRevenue,
        occupancyRate
      };
    }));

    console.log('[getBuildings] ✅ Envoi de la réponse:', {
      count: buildingsWithStats.length,
      hasData: buildingsWithStats.length > 0
    });

    res.status(200).json({
      success: true,
      count: buildingsWithStats.length,
      data: buildingsWithStats
    });
  } catch (error) {
    console.error('[getBuildings] ❌ Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des immeubles'
    });
  }
};

// @desc    Obtenir un immeuble par ID
// @route   GET /api/buildings/:id
// @access  Private
exports.getBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id)
      .populate('admin', 'firstName lastName email phone')
      .lean();

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Immeuble non trouvé'
      });
    }

    // Récupérer les unités de cet immeuble
    const units = await Unit.find({ building: building._id })
      .populate('proprietaire', 'firstName lastName email phone')
      .populate('locataire', 'firstName lastName email phone')
      .lean();

    const totalUnits = units.length;
    const availableUnits = units.filter(u => 
      u.status === 'disponible' || 
      (u.isAvailable !== false && !u.locataire)
    ).length;
    const rentedUnits = units.filter(u => 
      u.status === 'loue' || 
      u.status === 'en_location' ||
      (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length;

    const monthlyRevenue = units
      .filter(u => u.locataire && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0);

    const occupancyRate = totalUnits > 0 
      ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...building,
        imageUrl: building.image || getBuildingImageUrl(building),
        totalUnits,
        availableUnits,
        rentedUnits,
        monthlyRevenue,
        occupancyRate,
        units
      }
    });
  } catch (error) {
    console.error('[getBuilding] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les statistiques des immeubles
// @route   GET /api/buildings/stats
// @access  Private (Admin)
exports.getBuildingsStats = async (req, res) => {
  try {
    // Récupérer tous les immeubles
    const buildings = await Building.find({}).lean();
    
    // Récupérer toutes les unités
    const units = await Unit.find({}).lean();

    // Compter les immeubles (depuis la collection Building)
    const totalBuildings = buildings.length;
    const activeBuildings = buildings.filter(b => b.isActive !== false).length;

    // Calculer les statistiques globales des unités
    const totalUnits = units.length;
    const availableUnits = units.filter(u => 
      u.status === 'disponible' || 
      (u.isAvailable !== false && !u.locataire)
    ).length;
    const rentedUnits = units.filter(u => 
      u.status === 'loue' || 
      u.status === 'en_location' ||
      (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length;
    const soldUnits = units.filter(u => 
      u.status === 'vendu' || u.status === 'Vendu' || u.status === 'vendue'
    ).length;

    // Calculer les revenus mensuels (somme des loyers des unités occupées)
    const monthlyRevenue = units
      .filter(u => u.locataire && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0);

    // Calculer le taux d'occupation (unités non disponibles / total)
    const occupancyRate = totalUnits > 0 
      ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) 
      : 0;

    console.log('[getBuildingsStats] Stats calculées:', {
      totalBuildings,
      activeBuildings,
      totalUnits,
      availableUnits,
      rentedUnits,
      soldUnits,
      monthlyRevenue,
      occupancyRate
    });

    res.status(200).json({
      success: true,
      data: {
        totalBuildings,
        activeBuildings,
        totalUnits,
        availableUnits,
        rentedUnits,
        soldUnits,
        monthlyRevenue,
        occupancyRate
      }
    });
  } catch (error) {
    console.error('[getBuildingsStats] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer un immeuble
// @route   POST /api/buildings
// @access  Private (Admin)
// Fonction pour générer automatiquement les documents administratifs d'un immeuble
const generateBuildingDocuments = async (building, admin) => {
  try {
    const Document = require('../models/Document');
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    
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
      console.log(`[CREATE BUILDING] Document créé: ${doc.name}`);
    }
    
    return createdDocuments;
  } catch (error) {
    console.error('[CREATE BUILDING] Erreur génération documents:', error);
    return [];
  }
};

// Fonction pour générer la fiche technique en PDF
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

// Fonction pour générer le règlement intérieur en PDF
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

// Fonction pour générer le plan de maintenance en PDF
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

exports.createBuilding = async (req, res) => {
  try {
    const buildingData = {
      ...req.body,
      admin: req.user._id
    };

    const building = await Building.create(buildingData);

    // Générer l'image si non fournie
    if (!building.image) {
      building.image = getBuildingImageUrl(building);
      await building.save();
    }

    // Générer automatiquement les documents administratifs
    try {
      await generateBuildingDocuments(building, req.user);
      console.log('[CREATE BUILDING] Documents administratifs générés avec succès');
    } catch (docError) {
      console.error('[CREATE BUILDING] Erreur génération documents (non bloquant):', docError);
      // Ne pas bloquer la création de l'immeuble si la génération de documents échoue
    }

    const populatedBuilding = await Building.findById(building._id)
      .populate('admin', 'firstName lastName email phone')
      .lean();

    // Émettre un événement Socket.io pour la synchronisation
    if (req.io) {
      req.io.emit('building:created', { building: populatedBuilding });
      req.io.emit('stats:updated');
    }

    res.status(201).json({
      success: true,
      data: {
        ...populatedBuilding,
        imageUrl: populatedBuilding.image || getBuildingImageUrl(populatedBuilding)
      }
    });
  } catch (error) {
    console.error('[createBuilding] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un immeuble
// @route   PUT /api/buildings/:id
// @access  Private (Admin)
exports.updateBuilding = async (req, res) => {
  try {
    let building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Immeuble non trouvé'
      });
    }

    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        building[key] = req.body[key];
      }
    });

    await building.save();

    const populatedBuilding = await Building.findById(building._id)
      .populate('admin', 'firstName lastName email phone')
      .lean();

    // Émettre un événement Socket.io pour la synchronisation
    if (req.io) {
      req.io.emit('building:updated', { building: populatedBuilding });
      req.io.emit('stats:updated');
    }

    res.status(200).json({
      success: true,
      data: {
        ...populatedBuilding,
        imageUrl: populatedBuilding.image || getBuildingImageUrl(populatedBuilding)
      }
    });
  } catch (error) {
    console.error('[updateBuilding] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un immeuble
// @route   DELETE /api/buildings/:id
// @access  Private (Admin)
exports.deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: 'Immeuble non trouvé'
      });
    }

    // Vérifier s'il y a des unités associées
    const unitsCount = await Unit.countDocuments({ building: building._id });
    if (unitsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cet immeuble car ${unitsCount} unité(s) y sont associées`
      });
    }

    await building.deleteOne();

    // Émettre un événement Socket.io pour la synchronisation
    if (req.io) {
      req.io.emit('building:deleted', { buildingId: building._id });
      req.io.emit('stats:updated');
    }

    res.status(200).json({
      success: true,
      message: 'Immeuble supprimé avec succès'
    });
  } catch (error) {
    console.error('[deleteBuilding] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

