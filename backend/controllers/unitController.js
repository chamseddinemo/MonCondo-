const Unit = require('../models/Unit');
const Building = require('../models/Building');

// @desc    Obtenir toutes les unités avec filtres avancés pour propriétaires
// @route   GET /api/units
// @access  Private
exports.getUnits = async (req, res) => {
  try {
    const { 
      building, 
      status, 
      proprietaire, 
      locataire, 
      isAvailable,
      // Nouveaux filtres pour consultation intelligente
      ville,
      quartier,
      transactionType,
      minPrix,
      maxPrix,
      etatRenovation,
      minPieces,
      maxPieces,
      isPremium,
      sortBy,
      order
    } = req.query;
    
    const query = {};

    // Filtres existants
    if (building) query.building = building;
    if (status) query.status = status;
    if (proprietaire) query.proprietaire = proprietaire;
    if (locataire) query.locataire = locataire;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    // Nouveaux filtres
    if (ville) query.ville = new RegExp(ville, 'i'); // Recherche insensible à la casse
    if (quartier) query.quartier = new RegExp(quartier, 'i');
    if (transactionType) query.transactionType = transactionType;
    if (etatRenovation) query.etatRenovation = etatRenovation;
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';
    
    // Filtre par prix
    if (minPrix || maxPrix) {
      query.prix = {};
      if (minPrix) query.prix.$gte = Number(minPrix);
      if (maxPrix) query.prix.$lte = Number(maxPrix);
    }
    
    // Filtre par nombre de pièces
    if (minPieces || maxPieces) {
      query.nombrePieces = {};
      if (minPieces) query.nombrePieces.$gte = Number(minPieces);
      if (maxPieces) query.nombrePieces.$lte = Number(maxPieces);
    }

    // Si propriétaire, afficher toutes les unités disponibles (pas seulement les siennes)
    // Les propriétaires peuvent voir toutes les unités publiées par l'administration
    if (req.user.role === 'proprietaire') {
      // Pas de restriction, voir toutes les unités publiées
      // Optionnel: on peut filtrer pour voir seulement les unités disponibles
      if (!status) {
        query.status = { $in: ['disponible', 'negociation'] };
      }
    }

    // Tri
    let sortOptions = {};
    if (sortBy) {
      const sortOrder = order === 'desc' ? -1 : 1;
      sortOptions[sortBy] = sortOrder;
    } else {
      // Par défaut: trier par date de publication (les plus récentes en premier)
      sortOptions.datePublication = -1;
    }
    // Si premium, mettre en priorité
    if (!sortBy) {
      sortOptions.isPremium = -1;
    }

    const units = await Unit.find(query)
      .populate({
        path: 'building',
        select: 'name address admin image imageUrl',
        populate: {
          path: 'admin',
          select: 'firstName lastName email phone _id'
        }
      })
      .populate('proprietaire', 'firstName lastName email phone')
      .populate('locataire', 'firstName lastName email phone')
      .sort(sortOptions)
      .lean();

    // S'assurer que chaque unité a une image (générer si manquante)
    const { getUnitImageUrl } = require('../utils/imageHelper');
    const unitsWithImages = units.map(unit => ({
      ...unit,
      images: unit.images || [], // Inclure le tableau images
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || (unit.building._id ? require('../utils/imageHelper').getBuildingImageUrl(unit.building) : null)
      } : unit.building
    }));

    res.status(200).json({
      success: true,
      count: unitsWithImages.length,
      data: unitsWithImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir une unité par ID
// @route   GET /api/units/:id
// @access  Private
exports.getUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate({
        path: 'building',
        select: 'name address admin image imageUrl',
        populate: {
          path: 'admin',
          select: 'firstName lastName email phone _id'
        }
      })
      .populate('proprietaire', 'firstName lastName email phone')
      .populate('locataire', 'firstName lastName email phone')
      .lean();

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // S'assurer que l'unité a une image (générer si manquante)
    const { getUnitImageUrl, getBuildingImageUrl } = require('../utils/imageHelper');
    const unitWithImage = {
      ...unit,
      images: unit.images || [], // Inclure le tableau images
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || getBuildingImageUrl(unit.building)
      } : unit.building
    };

    res.status(200).json({
      success: true,
      data: unitWithImage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer une unité
// @route   POST /api/units
// @access  Private/Admin
exports.createUnit = async (req, res) => {
  try {
    const unit = await Unit.create(req.body);

    // Si l'image n'a pas été générée dans le pre-save, la générer maintenant
    if ((!unit.images || unit.images.length === 0) && unit._id) {
      const { getUnitImage } = require('../utils/imageHelper');
      unit.images = [getUnitImage(unit._id.toString(), unit.type)];
      await unit.save();
    }

    // Mettre à jour le nombre total d'unités dans l'immeuble
    const building = await Building.findById(unit.building);
    if (building) {
      const unitCount = await Unit.countDocuments({ building: building._id });
      building.totalUnits = unitCount;
      await building.save();
    }

    // Recharger avec toutes les relations et images
    const populatedUnit = await Unit.findById(unit._id)
      .populate({
        path: 'building',
        select: 'name address admin image imageUrl',
        populate: {
          path: 'admin',
          select: 'firstName lastName email phone _id'
        }
      })
      .populate('proprietaire', 'firstName lastName email phone')
      .populate('locataire', 'firstName lastName email phone')
      .lean();

    const { getUnitImageUrl, getBuildingImageUrl } = require('../utils/imageHelper');
    const unitWithImage = {
      ...populatedUnit,
      imageUrl: (populatedUnit.images && populatedUnit.images.length > 0) ? populatedUnit.images[0] : getUnitImageUrl(populatedUnit),
      building: populatedUnit.building ? {
        ...populatedUnit.building,
        imageUrl: populatedUnit.building.image || getBuildingImageUrl(populatedUnit.building)
      } : populatedUnit.building
    };

    res.status(201).json({
      success: true,
      data: unitWithImage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour une unité
// @route   PUT /api/units/:id
// @access  Private
exports.updateUnit = async (req, res) => {
  try {
    let unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Vérifier les permissions
    const building = await Building.findById(unit.building);
    const isAdmin = req.user.role === 'admin' || (building && building.admin.toString() === req.user._id.toString());
    const isOwner = unit.proprietaire && unit.proprietaire.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    unit = await Unit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // AUTOMATISATION: Si un locataire est assigné, créer une conversation et envoyer un message système
    if (req.body.locataire && req.body.locataire !== unit.locataire?.toString()) {
      try {
        const { syncContractConversation } = require('../services/messagingSync');
        await syncContractConversation(req.params.id, {
          locataire: req.body.locataire,
          proprietaire: unit.proprietaire
        });
      } catch (error) {
        console.error('[UPDATE UNIT] Erreur automatisation conversation:', error);
        // Ne pas faire échouer la mise à jour de l'unité si l'automatisation échoue
      }
    }

    res.status(200).json({
      success: true,
      data: unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer une unité
// @route   DELETE /api/units/:id
// @access  Private/Admin
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Vérifier les permissions
    const building = await Building.findById(unit.building);
    if (building.admin.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await unit.deleteOne();

    // Mettre à jour le nombre total d'unités
    const unitCount = await Unit.countDocuments({ building: unit.building });
    building.totalUnits = unitCount;
    await building.save();

    res.status(200).json({
      success: true,
      message: 'Unité supprimée',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assigner un propriétaire à une unité
// @route   PUT /api/units/:id/assign-owner
// @access  Private/Admin
exports.assignOwner = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    unit.proprietaire = req.body.proprietaireId;
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Propriétaire assigné avec succès',
      data: unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assigner un locataire à une unité avec création automatique de documents
// @route   PUT /api/units/:id/assign-tenant
// @access  Private
exports.assignTenant = async (req, res) => {
  try {
    const { locataireId, contractStartDate, contractEndDate, rentAmount, monthlyCharges } = req.body;
    
    const unit = await Unit.findById(req.params.id)
      .populate('building', 'name address admin')
      .populate('proprietaire', 'firstName lastName email phone');

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Vérifier les permissions
    const building = await Building.findById(unit.building);
    const isAdmin = req.user.role === 'admin' || (building && building.admin.toString() === req.user._id.toString());
    const isOwner = unit.proprietaire && unit.proprietaire.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer les informations du locataire
    const User = require('../models/User');
    const locataire = await User.findById(locataireId);
    if (!locataire) {
      return res.status(404).json({
        success: false,
        message: 'Locataire non trouvé'
      });
    }

    // Mettre à jour l'unité
    unit.locataire = locataireId;
    unit.status = 'loue';
    unit.isAvailable = false;
    
    // Mettre à jour les prix si fournis
    if (rentAmount) {
      unit.rentPrice = rentAmount;
    }
    if (monthlyCharges !== undefined) {
      unit.monthlyCharges = monthlyCharges;
    }
    
    await unit.save();

    // Créer automatiquement les documents nécessaires
    const Document = require('../models/Document');
    const fs = require('fs');
    const path = require('path');
    const { generateContractPDF } = require('../services/pdfService');

    try {
      // Créer le dossier documents s'il n'existe pas
      const documentsDir = path.join(__dirname, '../uploads/documents');
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      // Générer le contrat de location
      const contractData = {
        unitNumber: unit.unitNumber,
        buildingName: unit.building.name,
        buildingAddress: unit.building.address,
        proprietaire: {
          name: `${unit.proprietaire.firstName} ${unit.proprietaire.lastName}`,
          email: unit.proprietaire.email,
          phone: unit.proprietaire.phone
        },
        locataire: {
          name: `${locataire.firstName} ${locataire.lastName}`,
          email: locataire.email,
          phone: locataire.phone
        },
        rentAmount: unit.rentPrice || rentAmount || 0,
        monthlyCharges: unit.monthlyCharges || monthlyCharges || 0,
        contractStartDate: contractStartDate || new Date(),
        contractEndDate: contractEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        unitType: unit.type,
        size: unit.size,
        bedrooms: unit.bedrooms
      };

      const contractFilename = `contrat_location_${unit.unitNumber}_${Date.now()}.pdf`;
      const contractPath = path.join(documentsDir, contractFilename);
      
      // Générer le PDF du contrat
      await generateContractPDF(contractData, contractPath);

      // Créer l'entrée document dans la base de données
      const contractDocument = await Document.create({
        filename: contractFilename,
        originalName: `Contrat de location - Unité ${unit.unitNumber}.pdf`,
        path: path.relative(path.join(__dirname, '..'), contractPath),
        mimeType: 'application/pdf',
        size: fs.statSync(contractPath).size,
        building: unit.building._id,
        unit: unit._id,
        uploadedBy: req.user._id,
        category: 'contrat',
        description: `Contrat de location pour l'unité ${unit.unitNumber} - ${locataire.firstName} ${locataire.lastName}`,
        accessRoles: ['admin', 'proprietaire', 'locataire'],
        isPublic: false
      });

      console.log('[ASSIGN TENANT] Contrat créé:', contractDocument._id);

      // Créer un document de bienvenue/règlement
      const reglementFilename = `reglement_interieur_${unit.unitNumber}_${Date.now()}.pdf`;
      const reglementPath = path.join(documentsDir, reglementFilename);
      
      // Créer un document de règlement simple (ou utiliser un template)
      const reglementContent = `Règlement intérieur - ${unit.building.name}\n\nUnité: ${unit.unitNumber}\nLocataire: ${locataire.firstName} ${locataire.lastName}\n\nRègles et conditions de location...`;
      fs.writeFileSync(reglementPath.replace('.pdf', '.txt'), reglementContent);

      const reglementDocument = await Document.create({
        filename: reglementFilename.replace('.pdf', '.txt'),
        originalName: `Règlement intérieur - Unité ${unit.unitNumber}.txt`,
        path: path.relative(path.join(__dirname, '..'), reglementPath.replace('.pdf', '.txt')),
        mimeType: 'text/plain',
        size: fs.statSync(reglementPath.replace('.pdf', '.txt')).size,
        building: unit.building._id,
        unit: unit._id,
        uploadedBy: req.user._id,
        category: 'reglement',
        description: `Règlement intérieur pour l'unité ${unit.unitNumber}`,
        accessRoles: ['admin', 'proprietaire', 'locataire'],
        isPublic: false
      });

      console.log('[ASSIGN TENANT] Règlement créé:', reglementDocument._id);

      // Synchroniser la conversation de messagerie
      try {
        const { syncContractConversation } = require('../services/messagingSync');
        await syncContractConversation(unit._id, {
          locataire: locataireId,
          proprietaire: unit.proprietaire?._id
        });
      } catch (error) {
        console.error('[ASSIGN TENANT] Erreur synchronisation conversation:', error);
      }

      // Créer des notifications pour le locataire et le propriétaire
      try {
        const Notification = require('../models/Notification');
        
        // Notification pour le locataire
        await Notification.create({
          user: locataireId,
          type: 'contract',
          title: 'Unité assignée - Contrat créé',
          content: `Félicitations ! Vous avez été assigné à l'unité ${unit.unitNumber} de ${unit.building.name}. Votre contrat de location a été généré automatiquement.`,
          unit: unit._id,
          building: unit.building._id
        });

        // Notification pour le propriétaire
        if (unit.proprietaire && unit.proprietaire._id) {
          await Notification.create({
            user: unit.proprietaire._id,
            type: 'contract',
            title: 'Locataire assigné',
            content: `${locataire.firstName} ${locataire.lastName} a été assigné à l'unité ${unit.unitNumber}. Le contrat a été généré automatiquement.`,
            unit: unit._id,
            building: unit.building._id
          });
        }
      } catch (notifError) {
        console.error('[ASSIGN TENANT] Erreur création notifications:', notifError);
      }

      // Créer un paiement initial si nécessaire (via service centralisé)
      if (rentAmount) {
        try {
          const { recordPayment } = require('../services/paymentSyncService');
          const firstPayment = await recordPayment({
            unit: unit._id,
            building: unit.building._id,
            payer: locataireId,
            recipient: unit.proprietaire?._id || unit.building.admin?._id,
            type: 'loyer',
            amount: rentAmount + (monthlyCharges || 0),
            description: `Premier loyer - Unité ${unit.unitNumber}`,
            dueDate: contractStartDate ? new Date(contractStartDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
          console.log('[ASSIGN TENANT] Premier paiement créé:', firstPayment._id);
        } catch (error) {
          console.error('[ASSIGN TENANT] Erreur création paiement:', error);
        }
      }

      // Recharger l'unité avec toutes les relations
      const populatedUnit = await Unit.findById(unit._id)
        .populate('building', 'name address')
        .populate('proprietaire', 'firstName lastName email phone')
        .populate('locataire', 'firstName lastName email phone');

      res.status(200).json({
        success: true,
        message: 'Locataire assigné avec succès. Documents créés automatiquement.',
        data: {
          unit: populatedUnit,
          documents: {
            contract: contractDocument,
            reglement: reglementDocument
          }
        }
      });
    } catch (docError) {
      console.error('[ASSIGN TENANT] Erreur création documents:', docError);
      // L'assignation a réussi, mais les documents n'ont pas pu être créés
      res.status(200).json({
        success: true,
        message: 'Locataire assigné avec succès. Erreur lors de la création des documents.',
        warning: 'Les documents n\'ont pas pu être créés automatiquement. Veuillez les créer manuellement.',
        data: unit
      });
    }
  } catch (error) {
    console.error('[ASSIGN TENANT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Libérer une unité (retirer locataire)
// @route   PUT /api/units/:id/release
// @access  Private
exports.releaseUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Vérifier les permissions
    const building = await Building.findById(unit.building);
    const isAdmin = req.user.role === 'admin' || (building && building.admin.toString() === req.user._id.toString());
    const isOwner = unit.proprietaire && unit.proprietaire.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    unit.locataire = null;
    unit.status = 'disponible';
    unit.isAvailable = true;
    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unité libérée avec succès',
      data: unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les unités disponibles pour location/achat
// @route   GET /api/units/available
// @access  Public
exports.getAvailableUnits = async (req, res) => {
  try {
    // Cette route est PUBLIQUE - ne nécessite PAS de token
    // Le middleware optionalAuth permet l'accès sans token
    console.log('[getAvailableUnits] 📍 Route publique appelée');
    console.log('[getAvailableUnits] User:', req.user ? req.user.email : 'Public (no user)');
    console.log('[getAvailableUnits] Headers Authorization:', req.headers.authorization ? 'Present' : 'Not present');
    
    const { building, type, minSize, maxSize } = req.query;
    
    // Requête simplifiée et plus permissive pour trouver toutes les unités disponibles
    // On cherche les unités avec status 'disponible' ou 'negociation'
    // On n'exclut que si isAvailable est explicitement false
    const query = {
      // Inclure les unités disponibles (à louer) ET en négociation (à vendre)
      status: { $in: ['disponible', 'negociation'] }
      // Ne pas filtrer par isAvailable pour l'instant - on veut voir toutes les unités
      // avec status 'disponible' ou 'negociation'
    };

    if (building) query.building = building;
    if (type) query.type = type;
    if (minSize) query.size = { ...query.size, $gte: Number(minSize) };
    if (maxSize) query.size = { ...query.size, ...(query.size.$gte ? {} : { $lte: Number(maxSize) }) };

    console.log('[getAvailableUnits] Query:', JSON.stringify(query, null, 2));
    
    // Essayer d'abord avec la requête complète
    let units = await Unit.find(query)
      .populate({
        path: 'building',
        select: 'name address amenities image imageUrl'
      })
      .select('-locataire -proprietaire') // Ne pas exposer les informations sensibles
      .sort({ datePublication: -1, isPremium: -1 }) // Trier par date de publication (plus récentes en premier)
      .lean();

    console.log('[getAvailableUnits] Found units with full query:', units.length);
    
    // Si aucune unité trouvée, essayer une requête plus simple (juste par status)
    if (units.length === 0) {
      console.log('[getAvailableUnits] ⚠️ Aucune unité trouvée avec la requête complète, essai avec requête simplifiée...');
      const simpleQuery = {
        status: { $in: ['disponible', 'negociation'] }
      };
      units = await Unit.find(simpleQuery)
        .populate({
          path: 'building',
          select: 'name address amenities image imageUrl'
        })
        .select('-locataire -proprietaire')
        .sort({ createdAt: -1 })
        .lean();
      console.log('[getAvailableUnits] Found units with simple query:', units.length);
    }
    
    // Si toujours aucune unité, vérifier toutes les unités dans la DB
    if (units.length === 0) {
      console.log('[getAvailableUnits] ⚠️ Aucune unité disponible trouvée, vérification de toutes les unités...');
      const allUnits = await Unit.find({})
        .populate({
          path: 'building',
          select: 'name address'
        })
        .select('unitNumber status isAvailable building')
        .limit(10)
        .lean();
      console.log('[getAvailableUnits] Sample of all units in DB:', allUnits.map(u => ({
        unitNumber: u.unitNumber,
        status: u.status,
        isAvailable: u.isAvailable,
        building: u.building?.name
      })));
    }
    
    if (units.length > 0) {
      console.log('[getAvailableUnits] Sample unit:', {
        _id: units[0]._id,
        unitNumber: units[0].unitNumber,
        status: units[0].status,
        isAvailable: units[0].isAvailable,
        hasBuilding: !!units[0].building
      });
    }

    // Normaliser les unités : s'assurer que toutes les propriétés sont correctes
    const unitsWithImages = units.map(unit => {
      // Normaliser building.address si nécessaire
      if (unit.building && unit.building.address) {
        if (typeof unit.building.address === 'object') {
          // S'assurer que tous les champs sont des strings
          unit.building.address = {
            street: String(unit.building.address.street || ''),
            city: String(unit.building.address.city || ''),
            province: String(unit.building.address.province || ''),
            postalCode: String(unit.building.address.postalCode || ''),
            country: String(unit.building.address.country || 'Canada')
          }
        }
      }
      
      // Normaliser imageUrl - s'assurer que c'est toujours une string
      let imageUrl = ''
      if (unit.images && unit.images.length > 0 && typeof unit.images[0] === 'string') {
        imageUrl = unit.images[0]
      }
      
      // Normaliser building.imageUrl
      let buildingImageUrl = ''
      if (unit.building) {
        if (unit.building.image && typeof unit.building.image === 'string') {
          buildingImageUrl = unit.building.image
        }
      }
      
      return {
        ...unit,
        imageUrl: imageUrl,
        building: unit.building ? {
          ...unit.building,
          imageUrl: buildingImageUrl
        } : unit.building
      }
    });

    console.log('[getAvailableUnits] Returning', unitsWithImages.length, 'units');

    res.status(200).json({
      success: true,
      count: unitsWithImages.length,
      data: unitsWithImages
    });
  } catch (error) {
    console.error('[getAvailableUnits] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les statistiques complètes des unités
// @route   GET /api/units/stats
// @access  Private (Admin)
exports.getUnitsStats = async (req, res) => {
  try {
    // Compter les immeubles uniques depuis les unités
    const uniqueBuildings = await Unit.distinct('building');
    const buildingsCount = uniqueBuildings.length;

    // Compter toutes les unités
    const unitsCount = await Unit.countDocuments();

    // Compter par statut
    const availableUnits = await Unit.countDocuments({ 
      status: { $in: ['disponible', 'negociation'] },
      $or: [
        { isAvailable: { $ne: false } },
        { isAvailable: { $exists: false } }
      ]
    });

    const rentedUnits = await Unit.countDocuments({ 
      $or: [
        { status: { $in: ['loue', 'en_location'] } },
        { locataire: { $exists: true, $ne: null } }
      ]
    });

    const onSaleUnits = await Unit.countDocuments({ 
      status: { $in: ['en_vente', 'negociation'] }
    });

    const soldUnits = await Unit.countDocuments({ 
      status: { $in: ['vendu', 'vendue_louee'] }
    });

    // Calculer les revenus mensuels (somme des loyers des unités louées)
    const rentedUnitsWithPrice = await Unit.find({
      $or: [
        { status: { $in: ['loue', 'en_location'] } },
        { locataire: { $exists: true, $ne: null } }
      ],
      rentPrice: { $exists: true, $ne: null }
    }).select('rentPrice').lean();

    const monthlyRevenue = rentedUnitsWithPrice.reduce((sum, unit) => {
      return sum + (unit.rentPrice || 0);
    }, 0);

    // Calculer le taux d'occupation
    const totalOccupables = unitsCount;
    const occupiedUnits = rentedUnits + soldUnits;
    const occupationRate = totalOccupables > 0 
      ? Math.round((occupiedUnits / totalOccupables) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        buildingsCount,
        unitsCount,
        availableUnits,
        rentedUnits,
        onSaleUnits,
        soldUnits,
        monthlyRevenue,
        occupationRate
      }
    });
  } catch (error) {
    console.error('[getUnitsStats] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les unités récentes (nouvelles)
// @route   GET /api/units/nouvelles
// @access  Private (Propriétaires)
exports.getNouvellesUnits = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = {
      status: { $in: ['disponible', 'negociation'] }
    };

    // Les propriétaires peuvent voir toutes les unités récentes publiées
    const units = await Unit.find(query)
      .populate('building', 'name address')
      .populate('proprietaire', 'firstName lastName email')
      .sort({ datePublication: -1, isPremium: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: units.length,
      message: 'Unités récentes récupérées avec succès',
      data: units
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

