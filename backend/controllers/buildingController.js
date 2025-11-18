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

