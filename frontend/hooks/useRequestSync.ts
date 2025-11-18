import { useEffect, useCallback } from 'react';

/**
 * Hook centralisé pour la synchronisation automatique des demandes
 * Toutes les pages qui affichent des demandes doivent utiliser ce hook
 * 
 * @param refreshCallback - Fonction à appeler pour recharger les données
 * @param dependencies - Dépendances pour le callback (ex: [userId, unitId])
 */
export function useRequestSync(
  refreshCallback: () => void | Promise<void>,
  dependencies: any[] = []
) {
  // Écouter les événements de synchronisation globale
  useEffect(() => {
    const handleRequestListRefresh = async (event: any) => {
      const { requestId, status, unitId, createdById } = event.detail || {};
      console.log('[USE REQUEST SYNC] Événement de synchronisation reçu:', { requestId, status, unitId, createdById });
      
      // Attendre un court délai pour que le backend soit synchronisé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE REQUEST SYNC] Erreur rechargement:', error);
      }
    };

    const handleRequestProcessed = async (event: any) => {
      const { requestId, status } = event.detail || {};
      console.log('[USE REQUEST SYNC] Demande traitée:', { requestId, status });
      
      // Attendre un court délai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE REQUEST SYNC] Erreur rechargement:', error);
      }
    };

    const handleRequestStatusUpdated = async (event: any) => {
      const { requestId, status } = event.detail || {};
      console.log('[USE REQUEST SYNC] Statut demande mis à jour:', { requestId, status });
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE REQUEST SYNC] Erreur rechargement:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('requestListRefresh', handleRequestListRefresh);
      window.addEventListener('requestProcessed', handleRequestProcessed);
      window.addEventListener('requestStatusUpdated', handleRequestStatusUpdated);
      
      return () => {
        window.removeEventListener('requestListRefresh', handleRequestListRefresh);
        window.removeEventListener('requestProcessed', handleRequestProcessed);
        window.removeEventListener('requestStatusUpdated', handleRequestStatusUpdated);
      };
    }
  }, [refreshCallback, ...dependencies]);

  // Fonction pour forcer un rechargement manuel
  const forceRefresh = useCallback(async () => {
    try {
      await refreshCallback();
    } catch (error) {
      console.error('[USE REQUEST SYNC] Erreur rechargement forcé:', error);
    }
  }, [refreshCallback]);

  return { forceRefresh };
}

