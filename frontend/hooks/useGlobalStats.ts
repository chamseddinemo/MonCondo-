/**
 * Hook global pour récupérer et synchroniser les statistiques globales
 * Utilisé partout dans l'application pour afficher les mêmes données
 * 
 * NOTE: Ce hook est maintenant un wrapper autour de useRealEstateData
 * pour maintenir la compatibilité avec le code existant
 */

import { useState, useEffect, useCallback } from 'react'
import { authenticatedAxios } from '../utils/axiosInstances'
import { getGlobalStats, loadAllRealEstateData } from '../services/realEstateService'

export interface GlobalStats {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  soldUnits: number
  monthlyRevenue: number
  occupancyRate: number
}

interface UseGlobalStatsReturn {
  stats: GlobalStats
  loading: boolean
  error: string | null
  refreshStats: () => Promise<void>
}

const defaultStats: GlobalStats = {
  totalBuildings: 0,
  totalUnits: 0,
  availableUnits: 0,
  rentedUnits: 0,
  soldUnits: 0,
  monthlyRevenue: 0,
  occupancyRate: 0
}

/**
 * Hook global pour récupérer les statistiques centralisées
 * Toutes les pages doivent utiliser ce hook pour avoir les mêmes données
 */
export function useGlobalStats(): UseGlobalStatsReturn {
  const [stats, setStats] = useState<GlobalStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fonction pour récupérer les statistiques depuis le backend
   * Utilise maintenant le service centralisé realEstateService
   */
  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      // Utiliser le service centralisé qui gère toutes les routes et fallbacks
      const newStats = await getGlobalStats()
      
      // Ne mettre à jour que si on a des valeurs > 0 ou si c'est la première fois
      if (newStats.totalUnits > 0 || stats.totalUnits === 0) {
        setStats(newStats)
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('[useGlobalStats] Erreur récupération stats:', err)
      
      // Ne pas écraser les stats existantes si elles sont bonnes
      // Cela permet de garder les anciennes données affichées en cas d'erreur temporaire
      if (stats.totalUnits === 0) {
        setError(err.response?.data?.message || err.message || 'Erreur lors de la récupération des statistiques')
        setStats(defaultStats)
      } else {
        console.warn('[useGlobalStats] Erreur mais conservation des stats existantes')
      }
      
      setLoading(false)
    }
  }, [stats.totalUnits])

  // Charger les stats au montage
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  }
}

