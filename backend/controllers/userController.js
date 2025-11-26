const User = require('../models/User');

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir un utilisateur par ID
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions (admin peut voir tout, sinon seulement son propre profil)
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer un utilisateur
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un utilisateur
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions (admin peut modifier tout, sinon seulement son propre profil)
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Empêcher la modification du rôle sauf par admin
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }

    // Ne pas permettre la modification du mot de passe ici (utiliser updatePassword)
    if (req.body.password) {
      delete req.body.password;
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Synchroniser le profil dans toutes les demandes qui référencent cet utilisateur
    try {
      const Request = require('../models/Request');
      const { syncAllRequestViews } = require('../services/requestSyncService');
      
      // Trouver toutes les demandes créées par cet utilisateur
      const userRequests = await Request.find({ createdBy: req.params.id }).select('_id');
      
      // Synchroniser chaque demande pour mettre à jour le profil
      await Promise.all(userRequests.map(req => 
        syncAllRequestViews(req._id).catch(err => 
          console.error(`[USER UPDATE] Erreur sync demande ${req._id}:`, err)
        )
      ));
      
      // Émettre un événement de synchronisation global via Socket.io
      const profileData = {
        userId: req.params.id,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        timestamp: new Date().toISOString()
      };
      
      if (typeof global !== 'undefined' && global.io) {
        global.io.emit('userProfileSync', profileData);
      }
      
      // Émettre aussi un événement DOM pour le frontend (si en environnement browser)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userProfileSync', {
          detail: profileData
        }));
      }
      
      console.log(`[USER UPDATE] ✅ Profil synchronisé dans ${userRequests.length} demande(s)`);
    } catch (syncError) {
      console.error('[USER UPDATE] ⚠️  Erreur synchronisation profil (non bloquante):', syncError);
      // Ne pas faire échouer la mise à jour si la synchronisation échoue
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Ne pas supprimer physiquement, désactiver plutôt
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Utilisateur désactivé',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Promouvoir un utilisateur (visiteur -> propriétaire ou locataire, locataire -> propriétaire)
// @route   PUT /api/users/:id/promote
// @access  Private/Admin
exports.promoteToOwner = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Déterminer le nouveau rôle
    let newRole = role;

    // Si aucun rôle n'est fourni, utiliser la logique par défaut (locataire -> propriétaire)
    if (!newRole) {
      if (user.role === 'locataire') {
        newRole = 'proprietaire';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Rôle cible requis pour cette promotion'
        });
      }
    }

    // Valider le nouveau rôle
    if (!['proprietaire', 'locataire'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide. Les rôles autorisés sont: proprietaire, locataire'
      });
    }

    // Vérifier les transitions autorisées
    if (user.role === 'visiteur' && ['proprietaire', 'locataire'].includes(newRole)) {
      // Visiteur peut devenir propriétaire ou locataire
      user.role = newRole;
    } else if (user.role === 'locataire' && newRole === 'proprietaire') {
      // Locataire peut devenir propriétaire
      user.role = newRole;
    } else {
      return res.status(400).json({
        success: false,
        message: `Transition non autorisée: ${user.role} -> ${newRole}`
      });
    }

    await user.save();

    const roleLabel = newRole === 'proprietaire' ? 'propriétaire' : 'locataire';

    res.status(200).json({
      success: true,
      message: `Utilisateur promu ${roleLabel} avec succès`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

