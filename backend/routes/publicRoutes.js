const express = require('express');
const router = express.Router();
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const { getBuildingImageUrl, getUnitImageUrl } = require('../utils/imageHelper');

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
        imageUrl: building.image || getBuildingImageUrl(building),
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
        imageUrl: building.image || getBuildingImageUrl(building),
        totalUnits,
        availableUnits,
        units: units.map(unit => ({
          ...unit,
          imageUrl: (unit.images && unit.images.length > 0) ? unit.images[0] : getUnitImageUrl(unit)
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
      transactionType // 'location' ou 'vente'
    } = req.query;

    const query = {
      $or: [
        { status: 'disponible' },
        { status: 'negociation' }
      ],
      isAvailable: { $ne: false }
    };

    // Ne pas inclure les unités avec locataire
    query.locataire = { $exists: false };

    // Filtres
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
// @access  Public
// IMPORTANT: Cette route doit être définie APRÈS les routes spécifiques (/units/rent, /units/sale)
router.get('/units/:id', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate({
        path: 'building',
        select: 'name address image imageUrl'
      })
      .select('unitNumber type size surface bedrooms bathrooms status rentPrice salePrice images imageUrl description availableFrom monthlyCharges floor features building')
      .lean();

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Vérifier que l'unité est disponible ou en négociation
    if (unit.status !== 'disponible' && unit.status !== 'Disponible' && unit.status !== 'negociation') {
      return res.status(404).json({
        success: false,
        message: 'Unité non disponible'
      });
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

console.log('[PUBLIC ROUTES] ✅ Routes publiques chargées');

module.exports = router;

