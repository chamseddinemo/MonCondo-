const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Configuration du transporteur email (seulement si les credentials sont fournis)
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour les autres ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('[EMAIL] ✅ Service email initialisé avec succès');
  } catch (error) {
    console.warn('[EMAIL] ⚠️  Erreur lors de l\'initialisation du service email:', error.message);
    transporter = null;
  }
} else {
  console.warn('[EMAIL] ⚠️  SMTP_USER ou SMTP_PASS non définis - Les emails sont désactivés');
}

/**
 * Envoie un email de confirmation de paiement
 * @param {Object} payment - Paiement avec toutes les informations
 * @param {String} receiptPath - Chemin vers le reçu PDF
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function sendPaymentConfirmationEmail(payment, receiptPath = null) {
  if (!transporter) {
    console.warn('[EMAIL] Service email non configuré - Email de confirmation non envoyé');
    return {
      success: false,
      error: 'Service email non configuré. Veuillez définir SMTP_USER et SMTP_PASS dans les variables d\'environnement.'
    };
  }

  try {
    const payerName = `${payment.payer.firstName} ${payment.payer.lastName}`;
    const buildingName = payment.building.name;
    const unitNumber = payment.unit.unitNumber;
    const amount = payment.amount.toFixed(2);
    const paymentDate = new Date(payment.paidDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"MonCondo+" <${process.env.SMTP_USER}>`,
      to: payment.payer.email,
      subject: 'Confirmation de paiement - MonCondo+',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            .info-box {
              background-color: white;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
              border-left: 4px solid #2563eb;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Paiement Confirmé</h1>
            </div>
            <div class="content">
              <p>Bonjour ${payerName},</p>
              <p>Votre paiement a été confirmé avec succès.</p>
              
              <div class="info-box">
                <h3>Détails du paiement</h3>
                <p><strong>Montant:</strong> ${amount} $CAD</p>
                <p><strong>Date:</strong> ${paymentDate}</p>
                <p><strong>Propriété:</strong> ${buildingName} - Unité ${unitNumber}</p>
                <p><strong>Type:</strong> ${payment.type}</p>
                ${payment.transactionId ? `<p><strong>ID de transaction:</strong> ${payment.transactionId}</p>` : ''}
              </div>

              <p>Un reçu PDF a été généré et est disponible en pièce jointe.</p>
              <p>Vous pouvez également consulter votre historique de paiements dans votre tableau de bord.</p>
              
              <p>Merci de votre confiance,<br>L'équipe MonCondo+</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: receiptPath ? [
        {
          filename: path.basename(receiptPath),
          path: receiptPath
        }
      ] : []
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi email confirmation paiement:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envoie un email de rappel de paiement
 * @param {Object} payment - Paiement en retard
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
async function sendPaymentReminderEmail(payment) {
  if (!transporter) {
    console.warn('[EMAIL] Service email non configuré - Email de rappel non envoyé');
    return {
      success: false,
      error: 'Service email non configuré. Veuillez définir SMTP_USER et SMTP_PASS dans les variables d\'environnement.'
    };
  }

  try {
    const payerName = `${payment.payer.firstName} ${payment.payer.lastName}`;
    const buildingName = payment.building.name;
    const unitNumber = payment.unit.unitNumber;
    const amount = payment.amount.toFixed(2);
    const dueDate = new Date(payment.dueDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const daysOverdue = Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: `"MonCondo+" <${process.env.SMTP_USER}>`,
      to: payment.payer.email,
      subject: `Rappel: Paiement en retard - ${daysOverdue} jour(s)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #dc2626;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            .warning-box {
              background-color: #fef2f2;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
              border-left: 4px solid #dc2626;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Rappel de Paiement</h1>
            </div>
            <div class="content">
              <p>Bonjour ${payerName},</p>
              <p>Nous vous rappelons que vous avez un paiement en retard.</p>
              
              <div class="warning-box">
                <h3>Détails du paiement</h3>
                <p><strong>Montant:</strong> ${amount} $CAD</p>
                <p><strong>Date d'échéance:</strong> ${dueDate}</p>
                <p><strong>Jours de retard:</strong> ${daysOverdue} jour(s)</p>
                <p><strong>Propriété:</strong> ${buildingName} - Unité ${unitNumber}</p>
                <p><strong>Type:</strong> ${payment.type}</p>
              </div>

              <p>Veuillez effectuer le paiement dès que possible pour éviter des frais supplémentaires.</p>
              <p>Vous pouvez payer directement en ligne depuis votre tableau de bord.</p>
              
              <p>Merci de votre compréhension,<br>L'équipe MonCondo+</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi email rappel paiement:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendPaymentConfirmationEmail,
  sendPaymentReminderEmail
};


