import { useEffect, useCallback } from 'react';

/**
 * Hook centralisé pour la synchronisation globale automatique
 * Écoute les événements de synchronisation pour les paiements ET les demandes
 * Toutes les pages qui affichent des paiements ou des demandes doivent utiliser ce hook
 * 
 * @param refreshCallback - Fonction à appeler pour recharger les données
 * @param dependencies - Dépendances pour le callback (ex: [userId, unitId])
 */
export function useGlobalSync(
  refreshCallback: () => void | Promise<void>,
  dependencies: any[] = []
) {
  // Écouter les événements de synchronisation globale
  useEffect(() => {
    const handleGlobalSync = async (event: any) => {
      const { paymentId, requestId, timestamp } = event.detail || {};
      console.log('[USE GLOBAL SYNC] Événement de synchronisation globale reçu:', { paymentId, requestId, timestamp });
      
      // Attendre un court délai pour que le backend soit synchronisé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE GLOBAL SYNC] Erreur rechargement:', error);
      }
    };

    const handlePaymentSync = async (event: any) => {
      const { paymentId, status, unitId, payerId } = event.detail || {};
      console.log('[USE GLOBAL SYNC] Événement de synchronisation paiement reçu:', { paymentId, status, unitId, payerId });
      
      // Attendre un court délai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE GLOBAL SYNC] Erreur rechargement:', error);
      }
    };

    const handleRequestSync = async (event: any) => {
      const { requestId, status, unitId, createdById } = event.detail || {};
      console.log('[USE GLOBAL SYNC] Événement de synchronisation demande reçu:', { requestId, status, unitId, createdById });
      
      // Attendre un court délai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE GLOBAL SYNC] Erreur rechargement:', error);
      }
    };

    const handleStatsUpdated = async (event: any) => {
      const { payments, requests, timestamp } = event.detail || {};
      console.log('[USE GLOBAL SYNC] Statistiques mises à jour:', { payments, requests, timestamp });
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE GLOBAL SYNC] Erreur rechargement:', error);
      }
    };

    // Écouter les événements globaux
    if (typeof window !== 'undefined') {
      window.addEventListener('globalSync', handleGlobalSync);
      window.addEventListener('globalPaymentSync', handlePaymentSync);
      window.addEventListener('globalRequestSync', handleRequestSync);
      window.addEventListener('globalStatsUpdated', handleStatsUpdated);
      
      // Écouter aussi les événements spécifiques pour compatibilité
      window.addEventListener('paymentListRefresh', handlePaymentSync);
      window.addEventListener('requestListRefresh', handleRequestSync);
      window.addEventListener('paymentProcessed', handlePaymentSync);
      window.addEventListener('requestProcessed', handleRequestSync);
      window.addEventListener('paymentStatusUpdated', handlePaymentSync);
      window.addEventListener('requestStatusUpdated', handleRequestSync);
      
      return () => {
        window.removeEventListener('globalSync', handleGlobalSync);
        window.removeEventListener('globalPaymentSync', handlePaymentSync);
        window.removeEventListener('globalRequestSync', handleRequestSync);
        window.removeEventListener('globalStatsUpdated', handleStatsUpdated);
        window.removeEventListener('paymentListRefresh', handlePaymentSync);
        window.removeEventListener('requestListRefresh', handleRequestSync);
        window.removeEventListener('paymentProcessed', handlePaymentSync);
        window.removeEventListener('requestProcessed', handleRequestSync);
        window.removeEventListener('paymentStatusUpdated', handlePaymentSync);
        window.removeEventListener('requestStatusUpdated', handleRequestSync);
      };
    }
  }, [refreshCallback, ...dependencies]);

  // Fonction pour forcer un rechargement manuel
  const forceRefresh = useCallback(async () => {
    try {
      await refreshCallback();
    } catch (error) {
      console.error('[USE GLOBAL SYNC] Erreur rechargement forcé:', error);
    }
  }, [refreshCallback]);

  return { forceRefresh };
}

