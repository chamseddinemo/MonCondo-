import { useEffect, useCallback } from 'react';

/**
 * Hook centralisé pour la synchronisation automatique des messages
 * Toutes les pages qui affichent des messages doivent utiliser ce hook
 * 
 * @param refreshCallback - Fonction à appeler pour recharger les données
 * @param dependencies - Dépendances pour le callback (ex: [userId])
 */
export function useMessageSync(
  refreshCallback: () => void | Promise<void>,
  dependencies: any[] = []
) {
  // Écouter les événements de synchronisation globale
  useEffect(() => {
    const handleMessageListRefresh = async (event: any) => {
      const { messageId, action, receiverId, senderId } = event.detail || {};
      console.log('[USE MESSAGE SYNC] Événement de synchronisation reçu:', { messageId, action, receiverId, senderId });
      
      // Attendre un court délai pour que le backend soit synchronisé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE MESSAGE SYNC] Erreur rechargement:', error);
      }
    };

    const handleMessageProcessed = async (event: any) => {
      const { messageId, action } = event.detail || {};
      console.log('[USE MESSAGE SYNC] Message traité:', { messageId, action });
      
      // Attendre un court délai
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE MESSAGE SYNC] Erreur rechargement:', error);
      }
    };

    const handleMessageStatusUpdated = async (event: any) => {
      const { messageId, isRead } = event.detail || {};
      console.log('[USE MESSAGE SYNC] Statut message mis à jour:', { messageId, isRead });
      
      // Recharger les données
      try {
        await refreshCallback();
      } catch (error) {
        console.error('[USE MESSAGE SYNC] Erreur rechargement:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('messageSync', handleMessageListRefresh);
      window.addEventListener('messageListRefresh', handleMessageListRefresh);
      window.addEventListener('messageProcessed', handleMessageProcessed);
      window.addEventListener('messageStatusUpdated', handleMessageStatusUpdated);
      
      return () => {
        window.removeEventListener('messageSync', handleMessageListRefresh);
        window.removeEventListener('messageListRefresh', handleMessageListRefresh);
        window.removeEventListener('messageProcessed', handleMessageProcessed);
        window.removeEventListener('messageStatusUpdated', handleMessageStatusUpdated);
      };
    }
  }, [refreshCallback, ...dependencies]);

  // Fonction pour forcer un rechargement manuel
  const forceRefresh = useCallback(async () => {
    try {
      await refreshCallback();
    } catch (error) {
      console.error('[USE MESSAGE SYNC] Erreur rechargement forcé:', error);
    }
  }, [refreshCallback]);

  return { forceRefresh };
}

