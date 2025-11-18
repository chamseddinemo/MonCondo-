const Notification = require('../models/Notification');
const { protect } = require('../middlewares/auth');

// @desc    Obtenir toutes les notifications de l'utilisateur
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { type, date } = req.query;
    const query = { user: req.user._id };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (date === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: today };
    } else if (date === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query.createdAt = { $gte: weekAgo };
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName email')
      .populate('conversation', '_id')
      .sort('-createdAt')
      .limit(100);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Marquer une notification comme lue
// @route   PATCH /api/notifications/read/:id
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Marquer toutes les notifications comme lues
// @route   PATCH /api/notifications/read/all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer une notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Exporter l'historique des notifications
// @route   GET /api/notifications/export/:format
// @access  Private
exports.exportHistory = async (req, res) => {
  try {
    const { format } = req.params;
    const notifications = await Notification.find({ user: req.user._id })
      .populate('sender', 'firstName lastName email')
      .sort('-createdAt');

    if (format === 'txt') {
      let content = 'Historique des notifications\n';
      content += '============================\n\n';
      
      notifications.forEach(notif => {
        content += `[${new Date(notif.createdAt).toLocaleString('fr-CA')}] ${notif.type.toUpperCase()}\n`;
        content += `${notif.title}\n`;
        content += `${notif.content}\n`;
        if (notif.sender) {
          content += `De: ${notif.sender.firstName} ${notif.sender.lastName}\n`;
        }
        content += `Statut: ${notif.isRead ? 'Lu' : 'Non lu'}\n`;
        content += '\n---\n\n';
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=notifications_${Date.now()}.txt`);
      res.send(content);
    } else if (format === 'pdf') {
      // Pour PDF, vous pouvez utiliser une bibliothèque comme pdfkit ou puppeteer
      // Pour l'instant, retournons un JSON formaté
      res.status(200).json({
        success: true,
        message: 'Export PDF non implémenté. Utilisez TXT pour l\'instant.',
        data: notifications
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Format non supporté. Utilisez "txt" ou "pdf"'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

