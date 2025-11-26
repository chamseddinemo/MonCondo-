const express = require('express');
const router = express.Router();
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const { getBuildingImageUrl, getUnitImageUrl } = require('../utils/imageHelper');
const { geocodeAddress } = require('../utils/geocoding');

// ============================================
// ROUTES PUBLIQUES - Aucune authentification requise
// ============================================

// @desc    Obtenir tous les immeubles publics (actifs uniquement)
// @route   GET /api/public/buildings
// @access  Public
router.get('/buildings', async (req, res) => {
  try {
    const { city, search } = req.query;
    const query = { isActive: { $ne: false } }; // Seulement les immeubles actifs

    // Filtres
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { 'address.street': new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') }
      ];
    }

    const buildings = await Building.find(query)
      .select('name address image yearBuilt isActive')
      .sort('-createdAt')
      .lean();

    // Pour chaque immeuble, compter les unités disponibles
    const buildingsWithStats = await Promise.all(buildings.map(async (building) => {
      const units = await Unit.find({ building: building._id }).lean();
      
      const totalUnits = units.length;
      const availableUnits = units.filter(u => 
        u.status === 'disponible' || 
        (u.isAvailable !== false && !u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
      ).length;

      return {
        _id: building._id,
        name: building.name,
        address: building.address,
        image: building.image, // Inclure le champ image pour les chemins locaux
        imageUrl: building.image || null, // Uniquement images uploadées, pas Unsplash
        yearBuilt: building.yearBuilt,
        totalUnits,
        availableUnits
      };
    }));

    res.status(200).json({
      success: true,
      count: buildingsWithStats.length,
      data: buildingsWithStats
    });
  } catch (error) {
    console.error('[PUBLIC BUILDINGS] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des immeubles'
    });
  }
});

// @desc    Obtenir un immeuble public par ID
// @route   GET /api/public/buildings/:id
// @access  Public
router.get('/buildings/:id', async (req, res) => {
  try {
    const building = await Building.findById(req.params.id)
      .select('name address image yearBuilt isActive description')
      .lean();

    if (!building || building.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Immeuble non trouvé'
      });
    }

    // Récupérer les unités de cet immeuble
    const units = await Unit.find({ building: building._id })
      .select('unitNumber type size bedrooms bathrooms status rentPrice salePrice images imageUrl')
      .lean();

    const totalUnits = units.length;
    const availableUnits = units.filter(u => 
      u.status === 'disponible' || 
      (u.isAvailable !== false && !u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length;

    res.status(200).json({
      success: true,
      data: {
        ...building,
        image: building.image, // Inclure le champ image
        imageUrl: building.image || null, // Uniquement images uploadées, pas Unsplash
        totalUnits,
        availableUnits,
        units: units.map(unit => ({
          ...unit,
          imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : null
        }))
      }
    });
  } catch (error) {
    console.error('[PUBLIC BUILDING] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir toutes les unités disponibles (publiques)
// @route   GET /api/public/units
// @access  Public
router.get('/units', async (req, res) => {
  try {
    const { 
      city, 
      type, 
      bedrooms, 
      minPrice, 
      maxPrice,
      transactionType, // 'location' ou 'vente'
      building, // ID du building pour filtrer par immeuble
      status // Statut spécifique (par défaut: disponible)
    } = req.query;

    const query = {
      isAvailable: { $ne: false }
    };

    // Filtrer par statut si fourni, sinon seulement les disponibles
    if (status) {
      query.status = status;
    } else {
      query.$or = [
        { status: 'disponible' },
        { status: 'negociation' }
      ];
    }

    // Ne pas inclure les unités avec locataire (sauf si statut spécifique)
    if (!status || status === 'disponible' || status === 'negociation') {
      query.locataire = { $exists: false };
    }

    // Filtres
    if (building) {
      query.building = building;
    }
    if (city) {
      query.ville = new RegExp(city, 'i');
    }
    if (type) {
      query.type = new RegExp(type, 'i');
    }
    if (bedrooms) {
      query.bedrooms = Number(bedrooms);
    }
    if (transactionType === 'location') {
      query.rentPrice = { $exists: true, $gt: 0 };
    } else if (transactionType === 'vente') {
      query.salePrice = { $exists: true, $gt: 0 };
    }
    if (minPrice || maxPrice) {
      if (transactionType === 'location') {
        query.rentPrice = {};
        if (minPrice) query.rentPrice.$gte = Number(minPrice);
        if (maxPrice) query.rentPrice.$lte = Number(maxPrice);
      } else if (transactionType === 'vente') {
        query.salePrice = {};
        if (minPrice) query.salePrice.$gte = Number(minPrice);
        if (maxPrice) query.salePrice.$lte = Number(maxPrice);
      }
    }

    const units = await Unit.find(query)
      .populate({
        path: 'building',
        select: 'name address image imageUrl'
      })
      .select('unitNumber type size bedrooms bathrooms status rentPrice salePrice images imageUrl description availableFrom building')
      .sort('-createdAt')
      .lean();

    // S'assurer que chaque unité a une image
    const unitsWithImages = units.map(unit => ({
      ...unit,
      images: unit.images || [], // Inclure le tableau images
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || getBuildingImageUrl(unit.building)
      } : null
    }));

    res.status(200).json({
      success: true,
      count: unitsWithImages.length,
      data: unitsWithImages
    });
  } catch (error) {
    console.error('[PUBLIC UNITS] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des unités'
    });
  }
});

// IMPORTANT: Les routes spécifiques (/units/rent, /units/sale) doivent être définies AVANT la route paramétrée (/units/:id)

// @desc    Obtenir les unités à louer
// @route   GET /api/public/units/rent
// @access  Public
router.get('/units/rent', async (req, res) => {
  try {
    const { city, bedrooms, minPrice, maxPrice } = req.query;

    const query = {
      $or: [
        { status: 'disponible' },
        { status: 'negociation' }
      ],
      isAvailable: { $ne: false },
      rentPrice: { $exists: true, $gt: 0 },
      locataire: { $exists: false }
    };

    if (city) query.ville = new RegExp(city, 'i');
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (minPrice || maxPrice) {
      query.rentPrice = {};
      if (minPrice) query.rentPrice.$gte = Number(minPrice);
      if (maxPrice) query.rentPrice.$lte = Number(maxPrice);
    }

    const units = await Unit.find(query)
      .populate({
        path: 'building',
        select: 'name address image imageUrl'
      })
      .select('unitNumber type size bedrooms bathrooms status rentPrice images imageUrl description availableFrom building')
      .sort('-createdAt')
      .lean();

    const unitsWithImages = units.map(unit => ({
      ...unit,
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || getBuildingImageUrl(unit.building)
      } : null
    }));

    res.status(200).json({
      success: true,
      count: unitsWithImages.length,
      data: unitsWithImages
    });
  } catch (error) {
    console.error('[PUBLIC UNITS RENT] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir les unités à vendre
// @route   GET /api/public/units/sale
// @access  Public
router.get('/units/sale', async (req, res) => {
  try {
    const { city, bedrooms, minPrice, maxPrice } = req.query;

    const query = {
      $or: [
        { status: 'disponible' },
        { status: 'negociation' }
      ],
      isAvailable: { $ne: false },
      salePrice: { $exists: true, $gt: 0 },
      locataire: { $exists: false }
    };

    if (city) query.ville = new RegExp(city, 'i');
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (minPrice || maxPrice) {
      query.salePrice = {};
      if (minPrice) query.salePrice.$gte = Number(minPrice);
      if (maxPrice) query.salePrice.$lte = Number(maxPrice);
    }

    const units = await Unit.find(query)
      .populate({
        path: 'building',
        select: 'name address image imageUrl'
      })
      .select('unitNumber type size bedrooms bathrooms status salePrice images imageUrl description availableFrom building')
      .sort('-createdAt')
      .lean();

    const unitsWithImages = units.map(unit => ({
      ...unit,
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || getBuildingImageUrl(unit.building)
      } : null
    }));

    res.status(200).json({
      success: true,
      count: unitsWithImages.length,
      data: unitsWithImages
    });
  } catch (error) {
    console.error('[PUBLIC UNITS SALE] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Obtenir une unité publique par ID
// @route   GET /api/public/units/:id
// @access  Public (mais peut être restreint si l'unité est vendue/louée)
// IMPORTANT: Cette route doit être définie APRÈS les routes spécifiques (/units/rent, /units/sale)
router.get('/units/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    const jwt = require('jsonwebtoken');
    
    // Essayer d'obtenir l'utilisateur depuis le token si disponible
    let currentUser = null;
    const authHeader = req.headers.authorization;
    
    console.log('[PUBLIC UNIT] Headers authorization:', {
      hasAuthHeader: !!authHeader,
      authHeaderType: typeof authHeader,
      startsWithBearer: authHeader && authHeader.startsWith('Bearer ')
    });
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select('_id role');
        
        console.log('[PUBLIC UNIT] Utilisateur authentifié:', {
          userId: currentUser?._id?.toString(),
          role: currentUser?.role,
          hasUser: !!currentUser
        });
      } catch (tokenError) {
        // Token invalide ou expiré, continuer sans utilisateur
        console.log('[PUBLIC UNIT] Token invalide ou expiré:', tokenError.message);
      }
    } else {
      console.log('[PUBLIC UNIT] Pas de token d\'authentification');
    }

    // Charger l'unité sans populate d'abord pour voir la structure
    let unit = await Unit.findById(req.params.id).lean();
    
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }
    
    console.log('[PUBLIC UNIT] Unité brute chargée:', {
      unitId: unit._id,
      status: unit.status,
      proprietaireRaw: unit.proprietaire,
      locataireRaw: unit.locataire,
      proprietaireType: typeof unit.proprietaire
    });
    
    // Populate le building
    if (unit.building) {
      const Building = require('../models/Building');
      unit.building = await Building.findById(unit.building)
        .select('name address image imageUrl')
        .lean();
    }
    
    // Populate le propriétaire (nécessaire pour la vérification)
    let proprietaireId = null;
    if (unit.proprietaire) {
      if (typeof unit.proprietaire === 'object' && unit.proprietaire._id) {
        // Déjà peuplé
        proprietaireId = unit.proprietaire._id.toString();
        unit.proprietaire = unit.proprietaire;
      } else {
        // Non peuplé - populate maintenant
        const proprietaireDoc = await User.findById(unit.proprietaire)
          .select('_id firstName lastName email')
          .lean();
        if (proprietaireDoc) {
          proprietaireId = proprietaireDoc._id.toString();
          unit.proprietaire = proprietaireDoc;
        } else {
          proprietaireId = unit.proprietaire.toString();
          unit.proprietaire = { _id: unit.proprietaire };
        }
      }
    }
    
    // Populate le locataire (nécessaire pour la vérification)
    let locataireId = null;
    if (unit.locataire) {
      if (typeof unit.locataire === 'object' && unit.locataire._id) {
        // Déjà peuplé
        locataireId = unit.locataire._id.toString();
        unit.locataire = unit.locataire;
      } else {
        // Non peuplé - populate maintenant
        const locataireDoc = await User.findById(unit.locataire)
          .select('_id firstName lastName email')
          .lean();
        if (locataireDoc) {
          locataireId = locataireDoc._id.toString();
          unit.locataire = locataireDoc;
        } else {
          locataireId = unit.locataire.toString();
          unit.locataire = { _id: unit.locataire };
        }
      }
    }
    
    console.log('[PUBLIC UNIT] Unité peuplée:', {
      unitId: unit._id,
      status: unit.status,
      proprietaireId,
      locataireId,
      currentUserId: currentUser?._id?.toString(),
      hasProprietaire: !!unit.proprietaire,
      hasLocataire: !!unit.locataire
    });

    // Vérifier les permissions : permettre l'accès si:
    // 1. L'unité est disponible ou en négociation (public)
    // 2. L'utilisateur est le propriétaire
    // 3. L'utilisateur est le locataire
    // 4. L'utilisateur est admin
    const isAvailable = unit.status === 'disponible' || unit.status === 'Disponible' || unit.status === 'negociation';
    
    // Vérifier si l'utilisateur est propriétaire - Vérification robuste avec plusieurs méthodes
    let isOwner = false;
    const userId = currentUser ? (currentUser._id ? currentUser._id.toString().trim() : String(currentUser._id).trim()) : null;
    
    if (currentUser && userId && unit._id) {
      console.log('[PUBLIC UNIT] 🔍 Début vérification propriétaire:', {
        userId,
        unitId: unit._id.toString(),
        hasProprietaireId: !!proprietaireId,
        proprietaireId,
        hasUnitProprietaire: !!unit.proprietaire
      });
      
      // PRIORITÉ 1: Vérifier directement dans la base de données (le plus fiable)
      try {
        // Utiliser une requête MongoDB avec ObjectId pour comparaison stricte
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        const unitCheck = await Unit.findOne({ 
          _id: unit._id,
          proprietaire: userObjectId 
        }).select('proprietaire').lean();
        
        // Si la requête retourne un résultat, c'est que l'utilisateur est le propriétaire
        if (unitCheck) {
          isOwner = true;
          
          console.log('[PUBLIC UNIT] ✅ Vérification BD directe (requête MongoDB):', {
            userId,
            userObjectId: userObjectId.toString(),
            isOwner: true,
            unitFound: !!unitCheck
          });
        } else {
          // Si pas trouvé avec la requête directe, vérifier avec comparaison d'IDs
          const unitCheck2 = await Unit.findById(unit._id).select('proprietaire').lean();
          if (unitCheck2 && unitCheck2.proprietaire) {
            let dbOwnerId = null;
            
            // Extraire l'ID du propriétaire de différentes façons
            if (unitCheck2.proprietaire._id) {
              dbOwnerId = unitCheck2.proprietaire._id.toString().trim();
            } else {
              dbOwnerId = String(unitCheck2.proprietaire).trim();
            }
            
            // Utiliser ObjectId.equals pour comparaison stricte
            try {
              const ownerObjectId = new mongoose.Types.ObjectId(dbOwnerId);
              isOwner = userObjectId.equals(ownerObjectId);
            } catch (oidError) {
              // Fallback à comparaison de chaînes
              isOwner = userId === dbOwnerId;
            }
            
            console.log('[PUBLIC UNIT] ✅ Vérification BD (comparaison IDs):', {
              userId,
              dbOwnerId,
              isOwner,
              match: userId === dbOwnerId
            });
          }
        }
      } catch (dbError) {
        console.error('[PUBLIC UNIT] ❌ Erreur vérification BD:', dbError.message);
      }
      
      // Fallback: Utiliser proprietaireId si disponible et pas encore vérifié
      if (!isOwner && proprietaireId) {
        const ownerIdStr = String(proprietaireId).trim();
        isOwner = userId === ownerIdStr;
        
        console.log('[PUBLIC UNIT] Fallback 1 (proprietaireId):', {
          userId,
          proprietaireId: ownerIdStr,
          isOwner
        });
      }
      
      // Fallback 2: Utiliser unit.proprietaire directement
      if (!isOwner && unit.proprietaire) {
        let ownerIdStr = null;
        
        if (typeof unit.proprietaire === 'object' && unit.proprietaire._id) {
          ownerIdStr = unit.proprietaire._id.toString().trim();
        } else if (typeof unit.proprietaire === 'object' && unit.proprietaire.toString) {
          ownerIdStr = unit.proprietaire.toString().trim();
        } else {
          ownerIdStr = String(unit.proprietaire).trim();
        }
        
        if (ownerIdStr) {
          isOwner = userId === ownerIdStr;
          
          console.log('[PUBLIC UNIT] Fallback 2 (unit.proprietaire):', {
            userId,
            ownerId: ownerIdStr,
            isOwner
          });
        }
      }
      
      console.log('[PUBLIC UNIT] ✅ Résultat final vérification propriétaire:', {
        userId,
        isOwner,
        hasProprietaireId: !!proprietaireId,
        hasUnitProprietaire: !!unit.proprietaire
      });
    } else {
      console.log('[PUBLIC UNIT] ⚠️ Pas de vérification propriétaire:', {
        hasCurrentUser: !!currentUser,
        hasUserId: !!userId,
        hasUnitId: !!unit._id
      });
    }
    
    // Vérifier si l'utilisateur est locataire en utilisant locataireId déjà extrait
    let isTenant = false;
    if (currentUser && locataireId) {
      const userId = currentUser._id ? currentUser._id.toString() : String(currentUser._id);
      isTenant = userId === locataireId;
      
      console.log('[PUBLIC UNIT] Vérification locataire:', {
        userId,
        locataireId,
        isTenant,
        match: userId === locataireId
      });
    }
    
    const isAdmin = currentUser && currentUser.role === 'admin';

    console.log('[PUBLIC UNIT] Permissions:', {
      isAvailable,
      isOwner,
      isTenant,
      isAdmin,
      status: unit.status,
      hasCurrentUser: !!currentUser,
      currentUserRole: currentUser?.role,
      hasProprietaire: !!unit.proprietaire,
      hasLocataire: !!unit.locataire
    });

    // Si l'unité n'est pas disponible publiquement, vérifier les permissions
    // MAIS permettre l'accès en lecture seule pour tous les utilisateurs authentifiés (même visiteurs)
    // pour qu'ils puissent voir les informations de l'unité même si elle est louée/vendue
    if (!isAvailable) {
      if (!isOwner && !isTenant && !isAdmin && !currentUser) {
        // Seulement bloquer si l'utilisateur n'est pas authentifié
        console.log('[PUBLIC UNIT] ❌ Accès refusé - unité non disponible et utilisateur non authentifié');
        console.log('[PUBLIC UNIT] Détails du refus:', {
          status: unit.status,
          isAvailable,
          isOwner,
          isTenant,
          isAdmin,
          hasCurrentUser: !!currentUser,
          currentUserId: currentUser?._id?.toString(),
          currentUserRole: currentUser?.role,
          proprietaireId,
          locataireId,
          unitProprietaire: unit.proprietaire,
          unitLocataire: unit.locataire
        });
        return res.status(404).json({
          success: false,
          message: 'Unité non disponible'
        });
      } else {
        // Autoriser l'accès pour les utilisateurs authentifiés (même visiteurs)
        // et pour les propriétaires/locataires/admins
        console.log('[PUBLIC UNIT] ✅ Accès autorisé:', {
          isOwner: isOwner ? '✅ Propriétaire' : '',
          isTenant: isTenant ? '✅ Locataire' : '',
          isAdmin: isAdmin ? '✅ Admin' : '',
          isAuthenticated: currentUser ? '✅ Utilisateur authentifié' : ''
        });
      }
    } else {
      console.log('[PUBLIC UNIT] ✅ Accès public autorisé - unité disponible');
    }

    // S'assurer que l'unité a une image
    const unitWithImage = {
      ...unit,
      images: unit.images || [],
      imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit),
      building: unit.building ? {
        ...unit.building,
        imageUrl: unit.building.image || getBuildingImageUrl(unit.building)
      } : null
    };

    res.status(200).json({
      success: true,
      data: unitWithImage
    });
  } catch (error) {
    console.error('[PUBLIC UNIT] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de l\'unité'
    });
  }
});

// @desc    Géocoder une adresse (fallback pour le frontend)
// @route   POST /api/public/geocode
// @access  Public
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || !address.city) {
      return res.status(400).json({
        success: false,
        message: 'Adresse invalide - ville requise'
      });
    }

    console.log('[PUBLIC GEOCODE] Géocodage de l\'adresse:', address);
    
    const coordinates = await geocodeAddress(address);
    
    if (coordinates) {
      console.log('[PUBLIC GEOCODE] ✅ Coordonnées trouvées:', coordinates);
      return res.status(200).json({
        success: true,
        coordinates
      });
    } else {
      console.warn('[PUBLIC GEOCODE] ⚠️ Impossible de géocoder l\'adresse');
      // Retourner les coordonnées par défaut pour Montréal
      return res.status(200).json({
        success: true,
        coordinates: { lat: 45.5017, lng: -73.5673 }
      });
    }
  } catch (error) {
    console.error('[PUBLIC GEOCODE] ❌ Erreur:', error);
    // Même en cas d'erreur, retourner les coordonnées par défaut
    return res.status(200).json({
      success: true,
      coordinates: { lat: 45.5017, lng: -73.5673 }
    });
  }
});

console.log('[PUBLIC ROUTES] ✅ Routes publiques chargées');

module.exports = router;

