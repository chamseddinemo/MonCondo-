const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

// @desc    Envoyer un message de contact
// @route   POST /api/contact
// @access  Public (pas d'authentification requise)
exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, message, subject, phone } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Le nom, l\'email et le message sont requis'
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    // Récupérer tous les administrateurs
    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.warn('[CONTACT] Aucun administrateur trouvé pour recevoir le message');
      return res.status(200).json({
        success: true,
        message: 'Message reçu. Nous vous répondrons dans les plus brefs délais.'
      });
    }

    // Créer une notification pour chaque administrateur
    const notifications = [];
    for (const admin of admins) {
      try {
        const notification = await createNotification({
          user: admin._id,
          type: 'system',
          title: `📧 Nouveau message de contact${subject ? ` - ${subject}` : ''}`,
          content: `Message reçu de ${name} (${email})${phone ? ` - Téléphone: ${phone}` : ''}\n\n${message}`,
          sender: null
        });
        notifications.push(notification.data);
      } catch (notifError) {
        console.error(`[CONTACT] Erreur création notification pour admin ${admin._id}:`, notifError);
      }
    }

    // Émettre un événement Socket.io si disponible pour notifier les admins en temps réel
    if (req.io) {
      // Notifier tous les admins connectés
      req.io.emit('notification:new', {
        type: 'system',
        title: `📧 Nouveau message de contact${subject ? ` - ${subject}` : ''}`,
        message: `Message reçu de ${name} (${email})`
      });
      
      // Émettre aussi l'événement spécifique pour le contact
      req.io.emit('contact:new', {
        name,
        email,
        message,
        subject,
        phone,
        timestamp: new Date()
      });
    }

    console.log(`[CONTACT] Message reçu de ${name} (${email}) - ${notifications.length} notification(s) créée(s)`);

    res.status(200).json({
      success: true,
      message: 'Message envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
      notificationsCreated: notifications.length
    });
  } catch (error) {
    console.error('[CONTACT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'envoi du message'
    });
  }
};

