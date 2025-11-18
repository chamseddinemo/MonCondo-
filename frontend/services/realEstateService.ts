/**
 * Service centralisé pour la récupération des données immeubles et unités
 * Toutes les pages doivent utiliser ce service pour garantir la cohérence des données
 */

import { authenticatedAxios, publicAxios } from '../utils/axiosInstances'

// ============================================
// TYPES
// ============================================

export interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province?: string
    postalCode?: string
  }
  totalUnits?: number
  yearBuilt?: number
  isActive: boolean
  image?: string
  imageUrl?: string
  admin?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
  updatedAt?: string
}

export interface Unit {
  _id: string
  unitNumber: string
  floor?: number
  type: string
  size: number
  bedrooms: number
  bathrooms?: number
  status: string
  rentPrice?: number
  salePrice?: number
  monthlyCharges?: number
  availableFrom?: string
  description?: string
  images?: string[]
  imageUrl?: string
  isAvailable?: boolean
  building: {
    _id: string
    name: string
    image?: string
    imageUrl?: string
    address: {
      street: string
      city: string
      province?: string
      postalCode?: string
    }
  }
  proprietaire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  locataire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
}

export interface GlobalStats {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  soldUnits: number
  monthlyRevenue: number
  occupancyRate: number
}

export interface UnitsStats {
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  onSaleUnits: number
  soldUnits: number
  monthlyRevenue: number
  occupancyRate: number
}

// ============================================
// FONCTIONS DE RÉCUPÉRATION
// ============================================

/**
 * Récupère tous les immeubles
 * Utilise GET /api/buildings
 */
export async function getAllBuildings(): Promise<Building[]> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const fullUrl = `${API_BASE_URL}/buildings`
    
    console.log('[realEstateService] 📡 Chargement immeubles depuis:', fullUrl)
    console.log('[realEstateService] 📋 Token présent:', !!localStorage.getItem('authToken'))
    
    const response = await authenticatedAxios.get('/buildings', {
      validateStatus: (status) => status < 500 // Accepter 4xx pour les traiter manuellement
    })
    
    // Vérifier le statut de la réponse
    if (response.status === 404) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      console.error('[realEstateService] ❌ Route non trouvée (404)', {
        url: `${apiUrl}/buildings`,
        status: 404,
        statusText: response.statusText,
        data: response.data
      })
      throw new Error(
        `Route non trouvée (404). ` +
        `URL appelée: ${apiUrl}/buildings. ` +
        `Vérifiez que le backend est démarré sur le port 5000 et que la route /api/buildings existe.`
      )
    }
    
    if (response.status === 401) {
      console.error('[realEstateService] ❌ Authentification requise (401)')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    if (response.status === 403) {
      console.error('[realEstateService] ❌ Accès refusé (403)')
      throw new Error('Accès refusé. Vous n\'avez pas les permissions nécessaires.')
    }
    
    console.log('[realEstateService] ✅ Réponse reçue:', {
      status: response.status,
      statusText: response.statusText,
      success: response.data?.success,
      count: response.data?.count,
      hasData: !!response.data?.data,
      dataIsArray: Array.isArray(response.data?.data),
      message: response.data?.message
    })
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      console.log('[realEstateService] ✅ Immeubles chargés:', response.data.data.length)
      return response.data.data
    } else if (Array.isArray(response.data?.data)) {
      console.log('[realEstateService] ⚠️ Format alternatif détecté:', response.data.data.length)
      return response.data.data
    } else if (Array.isArray(response.data)) {
      console.log('[realEstateService] ⚠️ Format direct détecté:', response.data.length)
      return response.data
    }
    
    console.warn('[realEstateService] ⚠️ Format de réponse inattendu:', response.data)
    return []
  } catch (error: any) {
    console.error('[realEstateService] ❌ Erreur getAllBuildings:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      request: error.request ? 'Oui' : 'Non'
    })
    
    // Si erreur 401, ne pas retry avec publicAxios (cette route nécessite auth)
    if (error.response?.status === 401) {
      console.error('[realEstateService] ❌ Authentification requise pour /buildings')
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    // Si erreur 404, donner un message plus clair avec détails
    if (error.response?.status === 404) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      console.error('[realEstateService] ❌ Route non trouvée (404)', {
        url: `${apiUrl}/buildings`,
        status: 404,
        message: error.response?.data?.message,
        config: error.config?.url
      })
      throw new Error(
        `Route non trouvée (404). ` +
        `URL appelée: ${apiUrl}/buildings. ` +
        `Vérifiez que le backend est démarré sur le port 5000 et que la route /api/buildings existe.`
      )
    }
    
    // Si pas de réponse (backend non démarré)
    if (!error.response && error.request) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      console.error('[realEstateService] ❌ Impossible de se connecter au backend', {
        url: `${apiUrl}/buildings`,
        code: error.code,
        message: error.message,
        request: error.request
      })
      throw new Error(
        `Impossible de se connecter au serveur. ` +
        `URL: ${apiUrl}/buildings. ` +
        `Vérifiez que le backend est démarré (port 5000). ` +
        `Code d'erreur: ${error.code || 'UNKNOWN'}`
      )
    }
    
    // Si l'erreur a déjà un message, le propager
    if (error.message) {
      throw error
    }
    
    // Sinon, créer une nouvelle erreur avec les détails
    throw new Error(
      error.response?.data?.message || 
      `Erreur ${error.response?.status || 'inconnue'}: ${error.message || 'Erreur lors du chargement des immeubles'}`
    )
  }
}

/**
 * Récupère toutes les unités
 * Utilise GET /api/units
 */
export async function getAllUnits(params?: { building?: string; status?: string }): Promise<Unit[]> {
  try {
    const response = await authenticatedAxios.get('/units', { params })
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      return normalizeUnits(response.data.data)
    } else if (Array.isArray(response.data?.data)) {
      return normalizeUnits(response.data.data)
    } else if (Array.isArray(response.data)) {
      return normalizeUnits(response.data)
    }
    
    return []
  } catch (error: any) {
    console.error('[realEstateService] Erreur getAllUnits:', error)
    throw error
  }
}

/**
 * Récupère les unités disponibles
 * Utilise GET /api/units/available
 */
export async function getAvailableUnits(): Promise<Unit[]> {
  try {
    const response = await publicAxios.get('/units/available')
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      return normalizeUnits(response.data.data)
    } else if (Array.isArray(response.data?.data)) {
      return normalizeUnits(response.data.data)
    } else if (Array.isArray(response.data)) {
      return normalizeUnits(response.data)
    }
    
    return []
  } catch (error: any) {
    console.error('[realEstateService] Erreur getAvailableUnits:', error)
    // Fallback sur getAllUnits si la route available échoue
    try {
      const allUnits = await getAllUnits()
      return allUnits.filter(u => 
        u.status === 'disponible' || 
        (u.isAvailable !== false && !u.locataire)
      )
    } catch (fallbackError) {
      console.error('[realEstateService] Erreur getAvailableUnits (fallback):', fallbackError)
      return []
    }
  }
}

/**
 * Récupère les statistiques globales
 * Utilise GET /api/dashboard/admin/stats (prioritaire) ou GET /api/units/stats
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    // Essayer d'abord la route dashboard/admin/stats (la plus complète)
    try {
      const response = await authenticatedAxios.get('/dashboard/admin/stats')
      if (response.data?.success && response.data.data?.stats) {
        const stats = response.data.data.stats
        const totalOccupables = stats.totalUnits || 0
        const occupied = stats.occupiedUnits || ((stats.totalUnits || 0) - (stats.availableUnits || 0))
        const occupancyRate = totalOccupables > 0 
          ? Math.round((occupied / totalOccupables) * 100) 
          : 0

        return {
          totalBuildings: stats.totalBuildings || 0,
          totalUnits: stats.totalUnits || 0,
          availableUnits: stats.availableUnits || 0,
          rentedUnits: stats.occupiedUnits || 0,
          soldUnits: 0, // Pas dans admin stats
          monthlyRevenue: stats.currentMonthRevenue || 0,
          occupancyRate
        }
      }
    } catch (adminStatsError) {
      console.log('[realEstateService] Route /dashboard/admin/stats non disponible, tentative /units/stats')
    }

    // Sinon, utiliser /units/stats
    try {
      const response = await authenticatedAxios.get('/units/stats')
      if (response.data?.success && response.data.data) {
        const stats = response.data.data
        return {
          totalBuildings: stats.totalBuildings || 0,
          totalUnits: stats.totalUnits || 0,
          availableUnits: stats.availableUnits || 0,
          rentedUnits: stats.rentedUnits || 0,
          soldUnits: stats.soldUnits || 0,
          monthlyRevenue: stats.monthlyRevenue || 0,
          occupancyRate: stats.occupancyRate || 0
        }
      }
    } catch (unitsStatsError) {
      console.log('[realEstateService] Route /units/stats non disponible, calcul depuis listes')
    }

    // Fallback : calculer depuis les listes
    const [buildings, units] = await Promise.all([
      getAllBuildings().catch(() => []),
      getAllUnits().catch(() => [])
    ])

    return calculateStatsFromLists(buildings, units)
  } catch (error: any) {
    console.error('[realEstateService] Erreur getGlobalStats:', error)
    // Retourner des stats par défaut mais ne pas lancer d'erreur
    return {
      totalBuildings: 0,
      totalUnits: 0,
      availableUnits: 0,
      rentedUnits: 0,
      soldUnits: 0,
      monthlyRevenue: 0,
      occupancyRate: 0
    }
  }
}

/**
 * Récupère les statistiques des immeubles
 * Utilise GET /api/buildings/stats
 */
export async function getBuildingsStats(): Promise<{
  totalBuildings: number
  activeBuildings: number
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  soldUnits: number
  monthlyRevenue: number
  occupancyRate: number
}> {
  try {
    console.log('[realEstateService] 📊 Chargement stats immeubles depuis /buildings/stats')
    const response = await authenticatedAxios.get('/buildings/stats')
    
    console.log('[realEstateService] ✅ Stats reçues:', {
      status: response.status,
      success: response.data?.success,
      hasData: !!response.data?.data
    })
    
    if (response.data?.success && response.data.data) {
      console.log('[realEstateService] ✅ Stats calculées:', response.data.data)
      return response.data.data
    }
    
    console.warn('[realEstateService] ⚠️ Format stats inattendu, calcul depuis listes')
    // Fallback : calculer depuis la liste des immeubles
    const buildings = await getAllBuildings().catch(() => [])
    const units = await getAllUnits().catch(() => [])
    
    const totalBuildings = buildings.length
    const activeBuildings = buildings.filter(b => b.isActive !== false).length
    
    const totalUnits = units.length
    const availableUnits = units.filter(u => 
      u.status === 'disponible' || 
      (u.isAvailable !== false && !u.locataire)
    ).length
    const rentedUnits = units.filter(u => 
      u.status === 'loue' || 
      u.status === 'en_location' ||
      (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length
    const soldUnits = units.filter(u => 
      u.status === 'vendu' || u.status === 'Vendu' || u.status === 'vendue'
    ).length
    
    const monthlyRevenue = units
      .filter(u => u.locataire && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0)
    
    const occupancyRate = totalUnits > 0 
      ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) 
      : 0
    
    return {
      totalBuildings,
      activeBuildings,
      totalUnits,
      availableUnits,
      rentedUnits,
      soldUnits,
      monthlyRevenue,
      occupancyRate
    }
  } catch (error: any) {
    console.error('[realEstateService] ❌ Erreur getBuildingsStats:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    })
    
    // Si erreur 401, ne pas retourner des stats vides silencieusement
    if (error.response?.status === 401) {
      throw new Error('Session expirée. Veuillez vous reconnecter.')
    }
    
    // Si erreur 404, donner un message plus clair
    if (error.response?.status === 404) {
      console.warn('[realEstateService] ⚠️ Route /buildings/stats non trouvée, utilisation fallback')
    }
    
    // Retourner des stats par défaut seulement si l'erreur n'est pas critique
    if (!error.response || error.response?.status >= 500) {
      return {
        totalBuildings: 0,
        activeBuildings: 0,
        totalUnits: 0,
        availableUnits: 0,
        rentedUnits: 0,
        soldUnits: 0,
        monthlyRevenue: 0,
        occupancyRate: 0
      }
    }
    
    // Pour les autres erreurs (401, 403, 404), re-lancer l'erreur
    throw error
  }
}

/**
 * Récupère les statistiques détaillées des unités
 * Utilise GET /api/units/stats
 */
export async function getUnitsStats(): Promise<UnitsStats> {
  try {
    const response = await authenticatedAxios.get('/units/stats')
    
    if (response.data?.success && response.data.data) {
      return response.data.data
    }
    
    // Fallback : calculer depuis la liste des unités
    const units = await getAllUnits()
    const buildings = await getAllBuildings()
    const stats = calculateStatsFromLists(buildings, units)
    
    // Calculer onSaleUnits
    const onSaleUnits = units.filter(u => 
      u.status === 'en_vente' || u.status === 'En vente' || u.status === 'negociation'
    ).length
    
    return {
      ...stats,
      onSaleUnits
    }
  } catch (error: any) {
    console.error('[realEstateService] Erreur getUnitsStats:', error)
    // Fallback
    const units = await getAllUnits().catch(() => [])
    const buildings = await getAllBuildings().catch(() => [])
    const stats = calculateStatsFromLists(buildings, units)
    
    const onSaleUnits = units.filter(u => 
      u.status === 'en_vente' || u.status === 'En vente' || u.status === 'negociation'
    ).length
    
    return {
      ...stats,
      onSaleUnits
    }
  }
}

/**
 * Récupère toutes les données immobilières en une seule fois
 * Fonction globale utilisée par toutes les pages
 */
export async function loadAllRealEstateData() {
  try {
    const [buildings, units, stats] = await Promise.all([
      getAllBuildings().catch(() => []),
      getAllUnits().catch(() => []),
      getGlobalStats().catch(() => ({
        totalBuildings: 0,
        totalUnits: 0,
        availableUnits: 0,
        rentedUnits: 0,
        soldUnits: 0,
        monthlyRevenue: 0,
        occupancyRate: 0
      }))
    ])

    return {
      buildings,
      units,
      stats
    }
  } catch (error: any) {
    console.error('[realEstateService] Erreur loadAllRealEstateData:', error)
    throw error
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Normalise les unités pour garantir la cohérence des données
 */
function normalizeUnits(units: any[]): Unit[] {
  return units.map((unit: any) => ({
    ...unit,
    building: unit.building ? {
      ...unit.building,
      address: typeof unit.building.address === 'string' 
        ? { street: unit.building.address, city: '', province: '', postalCode: '' }
        : {
            street: unit.building.address?.street || '',
            city: unit.building.address?.city || '',
            province: unit.building.address?.province || '',
            postalCode: unit.building.address?.postalCode || ''
          }
    } : null
  })).filter((u: Unit) => u.building !== null)
}

/**
 * Calcule les statistiques depuis les listes d'immeubles et d'unités
 * Utilisé comme fallback si les routes stats ne fonctionnent pas
 */
function calculateStatsFromLists(buildings: Building[], units: Unit[]): GlobalStats {
  const totalBuildings = buildings.length
  
  const totalUnits = units.length
  
  const availableUnits = units.filter(u => 
    u.status === 'disponible' || u.status === 'Disponible' || 
    (u.isAvailable !== false && !u.locataire)
  ).length
  
  const rentedUnits = units.filter(u => 
    u.status === 'loue' || u.status === 'Loué' || u.status === 'en_location' ||
    (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
  ).length
  
  const soldUnits = units.filter(u => 
    u.status === 'vendu' || u.status === 'Vendu' || u.status === 'vendue'
  ).length

  // Calculer les revenus mensuels
  const monthlyRevenue = units
    .filter(u => u.locataire && u.rentPrice)
    .reduce((sum, u) => sum + (u.rentPrice || 0), 0)

  // Calculer le taux d'occupation
  const occupiedCount = rentedUnits + soldUnits
  const occupancyRate = totalUnits > 0 
    ? Math.round((occupiedCount / totalUnits) * 100) 
    : 0

  return {
    totalBuildings,
    totalUnits,
    availableUnits,
    rentedUnits,
    soldUnits,
    monthlyRevenue,
    occupancyRate
  }
}

