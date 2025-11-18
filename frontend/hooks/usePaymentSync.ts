import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Hook centralisé pour la synchronisation automatique des paiements
 * Toutes les pages qui affichent des paiements doivent utiliser ce hook
 * 
 * @param refreshCallback - Fonction à appeler pour recharger les données
 * @param dependencies - Dépendances pour le callback (ex: [userId, unitId])
 */
export function usePaymentSync(
  refreshCallback: () => void | Promise<void>,
  dependencies: any[] = []
) {
  const router = useRouter();

  // Écouter les événements de synchronisation globale
  useEffect(() => {
    const handlePaymentListRefresh = async (event: any) => {
      const { paymentId, status, unitId, payerId } = event.detail || {};
      console.log('[USE PAYMENT SYNC] Événement de synchronisation reçu:', { paymentId, status, unitId, payerId });
      
      // Attendre un court délai pour que le backend soit synchronisé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE PAYMENT SYNC] Erreur rechargement:', error);
      }
    };

    const handlePaymentProcessed = async (event: any) => {
      const { requestId, paymentId } = event.detail || {};
      console.log('[USE PAYMENT SYNC] Paiement traité:', { requestId, paymentId });
      
      // Attendre un court délai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE PAYMENT SYNC] Erreur rechargement:', error);
      }
    };

    const handlePaymentStatusUpdated = async (event: any) => {
      const { requestId, status } = event.detail || {};
      console.log('[USE PAYMENT SYNC] Statut paiement mis à jour:', { requestId, status });
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE PAYMENT SYNC] Erreur rechargement:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('paymentListRefresh', handlePaymentListRefresh);
      window.addEventListener('paymentProcessed', handlePaymentProcessed);
      window.addEventListener('paymentStatusUpdated', handlePaymentStatusUpdated);
      
      return () => {
        window.removeEventListener('paymentListRefresh', handlePaymentListRefresh);
        window.removeEventListener('paymentProcessed', handlePaymentProcessed);
        window.removeEventListener('paymentStatusUpdated', handlePaymentStatusUpdated);
      };
    }
  }, [refreshCallback, ...dependencies]);

  // Fonction pour forcer un rechargement manuel
  const forceRefresh = useCallback(async () => {
    try {
      await refreshCallback();
    } catch (error) {
      console.error('[USE PAYMENT SYNC] Erreur rechargement forcé:', error);
    }
  }, [refreshCallback]);

  return { forceRefresh };
}

