const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Obtenir toutes les conversations de l'utilisateur
// @route   GET /api/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isArchived: false
    })
      .populate('participants', 'firstName lastName email role')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender receiver',
          select: 'firstName lastName email'
        }
      })
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .sort('-lastMessageAt');

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir une conversation par ID
// @route   GET /api/conversations/:id
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'firstName lastName email role phone')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer ou récupérer une conversation directe
// @route   POST /api/conversations/direct
// @access  Private
exports.createOrGetDirectConversation = async (req, res) => {
  try {
    const { receiverId, unitId, buildingId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Destinataire requis'
      });
    }

    // Vérifier que le destinataire existe
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Destinataire non trouvé'
      });
    }

    // Chercher une conversation existante
    const participants = [req.user._id.toString(), receiverId].sort();
    let conversation = await Conversation.findOne({
      participants: { $all: participants },
      type: 'direct'
    });

    // Créer une nouvelle conversation si elle n'existe pas
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, receiverId],
        type: 'direct',
        unit: unitId || null,
        building: buildingId || null,
        unreadCount: new Map()
      });
    }

    await conversation.populate('participants', 'firstName lastName email role phone');
    if (conversation.unit) await conversation.populate('unit', 'unitNumber');
    if (conversation.building) await conversation.populate('building', 'name');

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer une conversation de groupe (unité)
// @route   POST /api/conversations/unit
// @access  Private
exports.createUnitConversation = async (req, res) => {
  try {
    const { unitId, requestId } = req.body;

    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'Unité requise'
      });
    }

    const Unit = require('../models/Unit');
    const unit = await Unit.findById(unitId)
      .populate('proprietaire', '_id')
      .populate('locataire', '_id')
      .populate('building', 'admin');

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Créer la liste des participants (propriétaire, locataire, admin du bâtiment)
    const participants = [];
    if (unit.proprietaire) participants.push(unit.proprietaire._id);
    if (unit.locataire) participants.push(unit.locataire._id);
    if (unit.building && unit.building.admin) participants.push(unit.building.admin._id);

    // Vérifier si une conversation existe déjà pour cette unité
    let conversation = await Conversation.findOne({
      unit: unitId,
      type: 'unit'
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        type: 'unit',
        unit: unitId,
        building: unit.building?._id || null,
        request: requestId || null,
        unreadCount: new Map()
      });
    }

    await conversation.populate('participants', 'firstName lastName email role phone');
    await conversation.populate('unit', 'unitNumber');
    if (conversation.building) await conversation.populate('building', 'name');

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Archiver une conversation
// @route   PUT /api/conversations/:id/archive
// @access  Private
exports.archiveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Ajouter l'utilisateur à la liste des archivages
    if (!conversation.archivedBy) {
      conversation.archivedBy = [];
    }

    const alreadyArchived = conversation.archivedBy.some(
      a => a.user.toString() === req.user._id.toString()
    );

    if (!alreadyArchived) {
      conversation.archivedBy.push({
        user: req.user._id,
        archivedAt: new Date()
      });
    }

    // Si tous les participants ont archivé, marquer comme archivée
    if (conversation.archivedBy.length === conversation.participants.length) {
      conversation.isArchived = true;
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Conversation archivée',
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les contacts disponibles
// @route   GET /api/conversations/contacts
// @access  Private
exports.getContacts = async (req, res) => {
  try {
    const { search, role, limit: limitParam } = req.query;
    const query = {};

    // Filtrer par rôle si spécifié
    if (role) {
      query.role = role;
    }

    // Recherche par nom ou email
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    // Exclure l'utilisateur actuel
    query._id = { $ne: req.user._id };

    // Augmenter la limite par défaut à 200, ou utiliser le paramètre fourni
    const limit = limitParam ? parseInt(limitParam) : 200;

    // Charger les contacts avec populate pour building si disponible
    const contacts = await User.find(query)
      .select('firstName lastName email role phone')
      .sort({ firstName: 1, lastName: 1 }) // Trier par nom pour affichage cohérent
      .limit(limit)
      .lean(); // Utiliser lean() pour améliorer les performances

    // Enrichir avec les informations de building/unit si disponibles (OPTIMISÉ)
    const Unit = require('../models/Unit');
    
    // Récupérer toutes les unités en une seule requête (plus efficace)
    const contactIds = contacts.map(c => c._id);
    const units = await Unit.find({
      $or: [
        { proprietaire: { $in: contactIds } },
        { locataire: { $in: contactIds } }
      ]
    })
      .populate('building', 'name _id')
      .select('unitNumber building proprietaire locataire')
      .lean();

    // Créer une map pour accès rapide
    const unitMap = new Map();
    units.forEach(unit => {
      if (unit.proprietaire) {
        const id = unit.proprietaire.toString();
        if (!unitMap.has(id)) {
          unitMap.set(id, unit);
        }
      }
      if (unit.locataire) {
        const id = unit.locataire.toString();
        if (!unitMap.has(id)) {
          unitMap.set(id, unit);
        }
      }
    });

    // Enrichir les contacts avec les données d'unité/building
    const enrichedContacts = contacts.map((contact) => {
      const contactObj = { ...contact };
      const unit = unitMap.get(contact._id.toString());
      
      if (unit && unit.building) {
        contactObj.building = {
          _id: unit.building._id,
          name: unit.building.name
        };
        contactObj.unit = {
          _id: unit._id,
          unitNumber: unit.unitNumber
        };
      }

      return contactObj;
    });

    res.status(200).json({
      success: true,
      count: enrichedContacts.length,
      data: enrichedContacts
    });
  } catch (error) {
    console.error('[getContacts] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les messages d'une conversation
// @route   GET /api/conversations/:id/messages
// @access  Private
exports.getConversationMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Vérifier que la conversation existe et que l'utilisateur y a accès
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer les messages
    const messages = await Message.find({
      conversation: req.params.id
    })
      .populate('sender', 'firstName lastName email role')
      .populate('receiver', 'firstName lastName email role')
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Message.countDocuments({ conversation: req.params.id });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: messages.reverse() // Inverser pour avoir les plus anciens en premier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

