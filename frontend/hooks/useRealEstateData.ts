/**
 * Hook centralisé pour la récupération des données immeubles et unités
 * Avec synchronisation en temps réel via Socket.io (si disponible)
 * Toutes les pages doivent utiliser ce hook pour garantir la cohérence
 */

import { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react'
import {
  getAllBuildings,
  getAllUnits,
  getAvailableUnits,
  getGlobalStats,
  getUnitsStats,
  loadAllRealEstateData,
  type Building,
  type Unit,
  type GlobalStats,
  type UnitsStats
} from '../services/realEstateService'

// Importer SocketContext de manière sécurisée
let SocketContext: React.Context<any>
try {
  const socketModule = require('../contexts/SocketContext')
  SocketContext = socketModule.SocketContext || createContext(undefined)
} catch (error) {
  // Socket context non disponible - créer un contexte par défaut
  SocketContext = createContext(undefined)
}

interface UseRealEstateDataReturn {
  // Données
  buildings: Building[]
  units: Unit[]
  availableUnits: Unit[]
  stats: GlobalStats
  unitsStats: UnitsStats | null
  
  // États
  loading: boolean
  error: string | null
  
  // Fonctions
  refreshData: () => Promise<void>
  refreshStats: () => Promise<void>
}

interface UseRealEstateDataOptions {
  autoRefresh?: boolean
  refreshInterval?: number // en millisecondes
  enableSocketSync?: boolean
  filters?: {
    building?: string
    status?: string
  }
}

/**
 * Hook principal pour récupérer toutes les données immobilières
 * Avec synchronisation automatique et gestion d'erreur robuste
 */
export function useRealEstateData(options: UseRealEstateDataOptions = {}): UseRealEstateDataReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 secondes par défaut
    enableSocketSync = true, // Activé par défaut si Socket.io est disponible
    filters = {}
  } = options

  // Récupérer le socket depuis le contexte
  // useContext doit être appelé de manière inconditionnelle (règle des hooks)
  const socketContext = useContext(SocketContext)
  
  // Extraire socket et isConnected si le contexte est disponible
  let socket: any = null
  let isConnected = false
  
  if (enableSocketSync && socketContext) {
    socket = socketContext.socket || null
    isConnected = socketContext.isConnected || false
  }

  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([])
  const [stats, setStats] = useState<GlobalStats>({
    totalBuildings: 0,
    totalUnits: 0,
    availableUnits: 0,
    rentedUnits: 0,
    soldUnits: 0,
    monthlyRevenue: 0,
    occupancyRate: 0
  })
  const [unitsStats, setUnitsStats] = useState<UnitsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  /**
   * Fonction pour charger toutes les données
   */
  const loadData = useCallback(async (isRetry = false) => {
    try {
      setError(null)
      
      if (!isRetry) {
        setLoading(true)
      }

      // Utiliser la fonction globale pour charger toutes les données
      const data = await loadAllRealEstateData()

      // Mettre à jour les états
      setBuildings(data.buildings)
      
      // Filtrer les unités selon les filtres
      let filteredUnits = data.units
      if (filters.building) {
        filteredUnits = filteredUnits.filter(u => u.building._id === filters.building)
      }
      if (filters.status) {
        filteredUnits = filteredUnits.filter(u => u.status === filters.status)
      }
      setUnits(filteredUnits)

      // Charger les unités disponibles séparément pour avoir la liste complète
      try {
        const available = await getAvailableUnits()
        setAvailableUnits(available)
      } catch (availableError) {
        console.warn('[useRealEstateData] Erreur chargement unités disponibles, utilisation des unités filtrées')
        setAvailableUnits(filteredUnits.filter(u => 
          u.status === 'disponible' || 
          (u.isAvailable !== false && !u.locataire)
        ))
      }

      // Mettre à jour les stats
      setStats(data.stats)

      // Charger les stats détaillées des unités
      try {
        const detailedStats = await getUnitsStats()
        setUnitsStats(detailedStats)
      } catch (statsError) {
        console.warn('[useRealEstateData] Erreur chargement stats détaillées')
      }

      // Réinitialiser le compteur de retry en cas de succès
      retryCountRef.current = 0
      setLoading(false)
    } catch (err: any) {
      console.error('[useRealEstateData] Erreur chargement données:', err)
      
      retryCountRef.current++
      
      // Si erreur et retry < maxRetries, réessayer automatiquement
      if (retryCountRef.current < maxRetries && !isRetry) {
        console.log(`[useRealEstateData] Tentative de reconnexion ${retryCountRef.current}/${maxRetries}...`)
        setTimeout(() => {
          loadData(true)
        }, 2000 * retryCountRef.current) // Délai exponentiel
        return // Ne pas mettre loading à false ici
      }

      // Si toutes les tentatives ont échoué, afficher une erreur mais continuer
      setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des données')
      setLoading(false)
      
      // Ne pas réinitialiser les données existantes en cas d'erreur
      // Cela permet de garder les anciennes données affichées
    }
  }, [filters.building, filters.status])

  /**
   * Fonction pour rafraîchir toutes les données
   */
  const refreshData = useCallback(async () => {
    await loadData(false)
  }, [loadData])

  /**
   * Fonction pour rafraîchir seulement les statistiques
   */
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await getGlobalStats()
      setStats(newStats)
      
      const newUnitsStats = await getUnitsStats()
      setUnitsStats(newUnitsStats)
    } catch (err: any) {
      console.error('[useRealEstateData] Erreur refresh stats:', err)
    }
  }, [])

  // Charger les données au montage
  useEffect(() => {
    loadData(false)
  }, [loadData])

  // Configurer le rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      // Nettoyer le timer précédent
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }

      // Créer un nouveau timer
      refreshTimerRef.current = setInterval(() => {
        console.log('[useRealEstateData] Rafraîchissement automatique des données')
        refreshStats()
      }, refreshInterval)

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refreshStats])

  // Synchronisation Socket.io pour temps réel
  useEffect(() => {
    if (enableSocketSync && socket && isConnected) {
      const handleUnitUpdated = (data: { unit?: Unit }) => {
        console.log('[useRealEstateData] 📢 Événement unit:updated reçu via Socket.io')
        // Rafraîchir toutes les données pour avoir les dernières valeurs
        refreshData()
      }

      const handleBuildingUpdated = (data: { building?: Building }) => {
        console.log('[useRealEstateData] 📢 Événement building:updated reçu via Socket.io')
        // Rafraîchir toutes les données pour avoir les dernières valeurs
        refreshData()
      }

      const handleUnitCreated = (data: { unit?: Unit }) => {
        console.log('[useRealEstateData] 📢 Événement unit:created reçu via Socket.io')
        refreshData()
      }

      const handleBuildingCreated = (data: { building?: Building }) => {
        console.log('[useRealEstateData] 📢 Événement building:created reçu via Socket.io')
        refreshData()
      }

      const handleUnitDeleted = (data: { unitId?: string }) => {
        console.log('[useRealEstateData] 📢 Événement unit:deleted reçu via Socket.io')
        refreshData()
      }

      const handleBuildingDeleted = (data: { buildingId?: string }) => {
        console.log('[useRealEstateData] 📢 Événement building:deleted reçu via Socket.io')
        refreshData()
      }

      // Écouter les événements de mise à jour
      socket.on('unit:updated', handleUnitUpdated)
      socket.on('building:updated', handleBuildingUpdated)
      socket.on('unit:created', handleUnitCreated)
      socket.on('building:created', handleBuildingCreated)
      socket.on('unit:deleted', handleUnitDeleted)
      socket.on('building:deleted', handleBuildingDeleted)

      // Nettoyer les écouteurs lors du démontage
      return () => {
        socket.off('unit:updated', handleUnitUpdated)
        socket.off('building:updated', handleBuildingUpdated)
        socket.off('unit:created', handleUnitCreated)
        socket.off('building:created', handleBuildingCreated)
        socket.off('unit:deleted', handleUnitDeleted)
        socket.off('building:deleted', handleBuildingDeleted)
      }
    }
  }, [enableSocketSync, socket, isConnected, refreshData])

  return {
    buildings,
    units,
    availableUnits,
    stats,
    unitsStats,
    loading,
    error,
    refreshData,
    refreshStats
  }
}

