/**
 * Service de synchronisation globale
 * Orchestre la synchronisation des paiements, des demandes et des messages
 * Assure que toute modification se répercute automatiquement partout
 */

const { syncAllPaymentViews, emitPaymentSyncEvent } = require('./paymentSyncService');
const { syncAllRequestViews, emitRequestSyncEvent } = require('./requestSyncService');
const { syncAllMessageViews, emitMessageSyncEvent } = require('./messageSyncService');

/**
 * Synchronise toutes les vues après une modification de paiement
 * Appelle le service de synchronisation des paiements et émet les événements nécessaires
 */
async function syncPaymentGlobally(paymentId) {
  try {
    console.log('[GLOBAL SYNC] 🔄 Synchronisation globale paiement:', paymentId);
    
    // Synchroniser via le service de paiements
    const syncEvent = await syncAllPaymentViews(paymentId);
    
    // Émettre un événement global pour le frontend
    if (typeof global !== 'undefined' && global.io) {
      // Si WebSocket est disponible, émettre l'événement
      global.io.emit('paymentSync', {
        paymentId,
        timestamp: new Date().toISOString(),
        ...syncEvent
      });
    }
    
    // Émettre aussi un événement DOM pour le frontend (si en environnement browser)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalPaymentSync', {
        detail: {
          paymentId,
          timestamp: new Date().toISOString(),
          ...syncEvent
        }
      }));
    }
    
    console.log('[GLOBAL SYNC] ✅ Synchronisation globale paiement terminée:', paymentId);
    return syncEvent;
  } catch (error) {
    console.error('[GLOBAL SYNC] ❌ Erreur synchronisation globale paiement:', error);
    throw error;
  }
}

/**
 * Synchronise toutes les vues après une modification de demande
 * Appelle le service de synchronisation des demandes et émet les événements nécessaires
 */
async function syncRequestGlobally(requestId) {
  try {
    console.log('[GLOBAL SYNC] 🔄 Synchronisation globale demande:', requestId);
    
    // Synchroniser via le service de demandes
    const syncEvent = await syncAllRequestViews(requestId);
    
    // Émettre un événement global pour le frontend
    if (typeof global !== 'undefined' && global.io) {
      // Si WebSocket est disponible, émettre l'événement
      global.io.emit('requestSync', {
        requestId,
        timestamp: new Date().toISOString(),
        ...syncEvent
      });
    }
    
    // Émettre aussi un événement DOM pour le frontend (si en environnement browser)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalRequestSync', {
        detail: {
          requestId,
          timestamp: new Date().toISOString(),
          ...syncEvent
        }
      }));
    }
    
    console.log('[GLOBAL SYNC] ✅ Synchronisation globale demande terminée:', requestId);
    return syncEvent;
  } catch (error) {
    console.error('[GLOBAL SYNC] ❌ Erreur synchronisation globale demande:', error);
    throw error;
  }
}

/**
 * Synchronise toutes les vues après une modification simultanée de paiement et demande
 * Utile quand un paiement est lié à une demande (ex: paiement initial)
 */
async function syncPaymentAndRequestGlobally(paymentId, requestId) {
  try {
    console.log('[GLOBAL SYNC] 🔄 Synchronisation globale paiement + demande:', { paymentId, requestId });
    
    // Synchroniser les deux en parallèle
    const [paymentSync, requestSync] = await Promise.all([
      paymentId ? syncPaymentGlobally(paymentId).catch(err => {
        console.error('[GLOBAL SYNC] Erreur sync paiement:', err);
        return null;
      }) : Promise.resolve(null),
      requestId ? syncRequestGlobally(requestId).catch(err => {
        console.error('[GLOBAL SYNC] Erreur sync demande:', err);
        return null;
      }) : Promise.resolve(null)
    ]);
    
    // Émettre un événement global combiné
    if (typeof global !== 'undefined' && global.io) {
      // Émettre un événement globalSync
      global.io.emit('globalSync', {
        paymentId,
        requestId,
        type: 'payment',
        action: paymentSync?.status === 'paye' ? 'paid' : 'updated',
        timestamp: new Date().toISOString(),
        paymentSync,
        requestSync
      });
      
      // Si le paiement est payé, émettre aussi un événement paymentPaid spécifique
      if (paymentSync && paymentSync.status === 'paye') {
        global.io.emit('paymentPaid', {
          paymentId: paymentSync.paymentId,
          requestId: requestId,
          status: 'paye',
          amount: paymentSync.amount,
          paymentMethod: paymentSync.paymentMethod,
          transactionId: paymentSync.transactionId,
          paidDate: paymentSync.paidDate,
          timestamp: new Date().toISOString()
        });
        console.log('[GLOBAL SYNC] 📡 Événement paymentPaid émis pour requestId:', requestId);
      }
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalSync', {
        detail: {
          paymentId,
          requestId,
          timestamp: new Date().toISOString(),
          paymentSync,
          requestSync
        }
      }));
    }
    
    console.log('[GLOBAL SYNC] ✅ Synchronisation globale combinée terminée');
    return { paymentSync, requestSync };
  } catch (error) {
    console.error('[GLOBAL SYNC] ❌ Erreur synchronisation globale combinée:', error);
    throw error;
  }
}

/**
 * Recalcule toutes les statistiques globales
 * Utile pour forcer une synchronisation complète du système
 */
async function recalculateAllStats() {
  try {
    console.log('[GLOBAL SYNC] 🔄 Recalcul de toutes les statistiques');
    
    const { calculatePaymentStats } = require('./paymentSyncService');
    const { calculateRequestStats } = require('./requestSyncService');
    const { calculateMessageStats } = require('./messageSyncService');
    
    // Calculer les statistiques globales
    const [paymentStats, requestStats, messageStats] = await Promise.all([
      calculatePaymentStats({}),
      calculateRequestStats({}),
      calculateMessageStats(null, {}) // Calculer pour tous les utilisateurs (sera filtré par utilisateur dans les dashboards)
    ]);
    
    const globalStats = {
      payments: paymentStats,
      requests: requestStats,
      messages: messageStats,
      timestamp: new Date().toISOString()
    };
    
    // Émettre un événement avec les statistiques
    if (typeof global !== 'undefined' && global.io) {
      global.io.emit('statsUpdated', globalStats);
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('globalStatsUpdated', {
        detail: globalStats
      }));
    }
    
    console.log('[GLOBAL SYNC] ✅ Recalcul des statistiques terminé');
    return globalStats;
  } catch (error) {
    console.error('[GLOBAL SYNC] ❌ Erreur recalcul statistiques:', error);
    throw error;
  }
}

/**
 * Émet un événement de synchronisation globale
 * À utiliser quand plusieurs entités doivent être synchronisées
 */
function emitGlobalSyncEvent(data) {
  const event = {
    type: 'GLOBAL_SYNC',
    timestamp: new Date().toISOString(),
    ...data
  };
  
  console.log('[GLOBAL SYNC] 📡 Événement global émis:', event);
  
  // Émettre via WebSocket si disponible
  if (typeof global !== 'undefined' && global.io) {
    global.io.emit('globalSync', event);
  }
  
  // Émettre via DOM si en environnement browser
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('globalSync', {
      detail: event
    }));
  }
  
  return event;
}

module.exports = {
  syncPaymentGlobally,
  syncRequestGlobally,
  syncPaymentAndRequestGlobally,
  recalculateAllStats,
  emitGlobalSyncEvent
};

