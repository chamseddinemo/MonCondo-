'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { getBuildingImagePath } from '../../utils/imageUtils'
import { getAllBuildings, getBuildingsStats, createBuilding, type Building } from '../../services/realEstateService'
import { useSocket } from '../../contexts/SocketContext'
import GoogleMapComponent from '../../components/maps/GoogleMap'
import MapFilters from '../../components/maps/MapFilters'

interface BuildingsStats {
  totalBuildings: number
  activeBuildings: number
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  monthlyRevenue: number
  occupancyRate: number
}

export default function AdminBuildings() {
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { socket, isConnected } = useSocket()
  
  // États pour les stats des immeubles
  const [buildingsStats, setBuildingsStats] = useState<BuildingsStats>({
    totalBuildings: 0,
    activeBuildings: 0,
    totalUnits: 0,
    availableUnits: 0,
    rentedUnits: 0,
    monthlyRevenue: 0,
    occupancyRate: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  
  // États locaux
  const [buildingsList, setBuildingsList] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  
  // État pour la carte
  const [showMap, setShowMap] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>()
  const [mapFilters, setMapFilters] = useState({
    status: undefined as string | undefined,
    city: undefined as string | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined
  })
  
  // Modal d'ajout d'immeuble
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada'
    },
    yearBuilt: '',
    description: '',
    isActive: true
  })
  
  // Charger les stats des immeubles
  const loadBuildingsStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      console.log('[AdminBuildings] 📊 Chargement des stats...')
      const stats = await getBuildingsStats()
      
      console.log('[AdminBuildings] ✅ Stats loaded:', stats)
      
      setBuildingsStats({
        totalBuildings: stats.totalBuildings || 0,
        activeBuildings: stats.activeBuildings || 0,
        totalUnits: stats.totalUnits || 0,
        availableUnits: stats.availableUnits || 0,
        rentedUnits: stats.rentedUnits || 0,
        monthlyRevenue: stats.monthlyRevenue || 0,
        occupancyRate: stats.occupancyRate || 0
      })
    } catch (err: any) {
      console.error('[AdminBuildings] ❌ Error loading buildings stats:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      })
      // Ne pas afficher d'erreur si les stats échouent, on garde les valeurs par défaut
      // Mais logguer pour diagnostic
    } finally {
      setStatsLoading(false)
    }
  }, [])
  
  // Vérifier la santé du backend avant de charger
  const checkBackendHealth = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const healthUrl = baseUrl.replace('/api', '') + '/api/health'
      console.log('[AdminBuildings] 🔍 Vérification santé backend:', healthUrl)
      
      // Créer un AbortController pour le timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[AdminBuildings] ✅ Backend health check OK:', data)
        return true
      } else {
        console.warn('[AdminBuildings] ⚠️ Backend health check failed:', response.status)
        return false
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[AdminBuildings] ❌ Backend health check timeout')
      } else {
        console.error('[AdminBuildings] ❌ Backend health check error:', {
          message: error.message,
          name: error.name
        })
      }
      return false
    }
  }, [])

  // Charger les immeubles
  const loadBuildings = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      // Vérifier la santé du backend d'abord
      const isBackendHealthy = await checkBackendHealth()
      if (!isBackendHealthy) {
        throw new Error('Le backend ne répond pas. Vérifiez qu\'il est démarré sur le port 5000.')
      }
      
      console.log('[AdminBuildings] 🔄 Chargement des immeubles...')
      
      // Charger les immeubles via le service
      const buildings = await getAllBuildings()
      
      console.log('[AdminBuildings] ✅ Buildings loaded:', buildings.length)
      
      if (buildings.length === 0) {
        console.warn('[AdminBuildings] ⚠️ Aucun immeuble trouvé dans la base de données')
        // Ne pas afficher d'erreur si la liste est vide, c'est normal
        setBuildingsList([])
      } else {
        setBuildingsList(buildings)
      }
      
      // Charger les stats séparément
      await loadBuildingsStats()
    } catch (err: any) {
      console.error('[AdminBuildings] ❌ Error loading buildings:', err)
      console.error('[AdminBuildings] Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        code: err.code,
        request: err.request ? 'Oui' : 'Non'
      })
      
      // Message d'erreur détaillé - PRIORITÉ au message de l'erreur
      let errorMessage = 'Erreur lors du chargement des immeubles'
      
      // 1. Utiliser le message de l'erreur si disponible (depuis realEstateService)
      if (err.message && err.message.length > 0 && err.message !== 'Erreur lors du chargement des immeubles') {
        errorMessage = err.message
      }
      // 2. Vérifier le statut HTTP
      else if (err.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.'
      } else if (err.response?.status === 403) {
        errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.'
      } else if (err.response?.status === 404) {
        errorMessage = 'Route non trouvée. Vérifiez que le backend est démarré et que la route /api/buildings existe.'
      } else if (err.response?.status === 500) {
        errorMessage = `Erreur serveur (500): ${err.response?.data?.message || 'Erreur interne du serveur'}`
      }
      // 3. Vérifier les codes d'erreur réseau
      else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré sur le port 5000.'
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_CONNECTION_REFUSED') {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 5000).'
      } else if (err.request && !err.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 5000).'
      }
      // 4. Utiliser le message de la réponse si disponible
      else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      // 5. Utiliser le message de l'erreur en dernier recours
      else if (err.message) {
        errorMessage = err.message
      }
      
      console.error('[AdminBuildings] ❌ Erreur finale affichée:', errorMessage)
      console.error('[AdminBuildings] ❌ Détails complets de l\'erreur:', {
        name: err.name,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        hasRequest: !!err.request,
        hasResponse: !!err.response
      })
      setError(errorMessage)
      setBuildingsList([])
      
      // Essayer de charger les stats quand même
      try {
        await loadBuildingsStats()
      } catch (statsError) {
        console.error('[AdminBuildings] Error loading stats:', statsError)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loadBuildingsStats, checkBackendHealth])
  
  // Charger au montage - UNIQUEMENT si authentifié
  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (authLoading) {
      console.log('[AdminBuildings] ⏳ Attente de la vérification d\'authentification...')
      return
    }
    
    // Si non authentifié, ne pas charger les données
    if (!isAuthenticated || !authUser) {
      console.log('[AdminBuildings] ❌ Non authentifié, redirection en cours...')
      return
    }
    
    // Vérifier que l'utilisateur est admin
    if (authUser.role !== 'admin') {
      console.log('[AdminBuildings] ❌ Utilisateur non admin, redirection...')
      router.push('/unauthorized')
      return
    }
    
    // Charger les données seulement si authentifié en tant qu'admin
    console.log('[AdminBuildings] ✅ Utilisateur authentifié (admin), chargement des données...')
    loadBuildings()
  }, [authLoading, isAuthenticated, authUser, loadBuildings, router])
  
  // Détecter le paramètre action=add dans l'URL
  useEffect(() => {
    if (router.isReady && router.query.action === 'add') {
      setShowAddModal(true)
      // Nettoyer l'URL
      router.replace('/admin/buildings', undefined, { shallow: true })
    }
  }, [router.isReady, router.query.action, router])
  
  // Synchronisation Socket.io en temps réel
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[AdminBuildings] Socket non connecté, synchronisation temps réel désactivée')
      return
    }
    
    console.log('[AdminBuildings] 🔌 Socket connecté, écoute des événements...')
    
    // Écouter les événements de mise à jour des immeubles
    const handleBuildingUpdated = (data: { building: Building }) => {
      console.log('[AdminBuildings] 📡 Événement building:updated reçu:', data.building._id)
      // Recharger la liste des immeubles
      loadBuildings(true) // Utiliser refreshing au lieu de loading
    }
    
    const handleBuildingCreated = (data: { building: Building }) => {
      console.log('[AdminBuildings] 📡 Événement building:created reçu:', data.building._id)
      // Recharger la liste des immeubles
      loadBuildings(true)
    }
    
    const handleBuildingDeleted = (data: { buildingId: string }) => {
      console.log('[AdminBuildings] 📡 Événement building:deleted reçu:', data.buildingId)
      // Recharger la liste des immeubles
      loadBuildings(true)
    }
    
    const handleStatsUpdated = () => {
      console.log('[AdminBuildings] 📡 Événement stats:updated reçu')
      // Recharger uniquement les stats
      loadBuildingsStats()
    }
    
    // S'abonner aux événements
    socket.on('building:updated', handleBuildingUpdated)
    socket.on('building:created', handleBuildingCreated)
    socket.on('building:deleted', handleBuildingDeleted)
    socket.on('stats:updated', handleStatsUpdated)
    
    // Nettoyage
    return () => {
      console.log('[AdminBuildings] 🧹 Nettoyage des listeners Socket.io')
      socket.off('building:updated', handleBuildingUpdated)
      socket.off('building:created', handleBuildingCreated)
      socket.off('building:deleted', handleBuildingDeleted)
      socket.off('stats:updated', handleStatsUpdated)
    }
  }, [socket, isConnected, loadBuildings, loadBuildingsStats])
  
  // Filtrer les immeubles
  const filteredBuildings = useMemo(() => {
    if (!Array.isArray(buildingsList)) {
      return []
    }
    
    return buildingsList.filter(building => {
      // Recherche globale
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          building.name?.toLowerCase().includes(search) ||
          building.address?.street?.toLowerCase().includes(search) ||
          building.address?.city?.toLowerCase().includes(search) ||
          (building.address?.postalCode && building.address.postalCode.toLowerCase().includes(search))
        
        if (!matchesSearch) return false
      }
      
      // Filtre par ville
      if (selectedCity && building.address?.city !== selectedCity) {
        return false
      }
      
      // Filtre par statut
      if (selectedStatus) {
        if (selectedStatus === 'active' && building.isActive === false) return false
        if (selectedStatus === 'inactive' && building.isActive !== false) return false
      }
      
      return true
    })
  }, [buildingsList, searchTerm, selectedCity, selectedStatus])
  
  // Obtenir les villes uniques
  const uniqueCities = useMemo(() => {
    if (!Array.isArray(buildingsList)) return []
    const cities = new Set(buildingsList.map(b => b.address?.city).filter(Boolean))
    return Array.from(cities).sort() as string[]
  }, [buildingsList])
  
  // Statistiques des immeubles filtrés
  const stats = useMemo(() => {
    // Si aucun filtre, utiliser les stats globales
    const hasFilters = searchTerm || selectedCity || selectedStatus
    
    if (!hasFilters && !statsLoading && buildingsStats.totalBuildings > 0) {
      return buildingsStats
    }
    
    // Sinon, calculer depuis les immeubles filtrés
    const filtered = filteredBuildings
    
    const totalBuildings = filtered.length
    const totalUnits = filtered.reduce((sum, b) => sum + ((b as any).totalUnits || 0), 0)
    const availableUnits = filtered.reduce((sum, b) => sum + ((b as any).availableUnits || 0), 0)
    const rentedUnits = filtered.reduce((sum, b) => sum + ((b as any).rentedUnits || 0), 0)
    const monthlyRevenue = filtered.reduce((sum, b) => sum + ((b as any).monthlyRevenue || 0), 0)
    
    const occupancyRate = totalUnits > 0 
      ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) 
      : 0
    const activeBuildings = filtered.filter(b => b.isActive !== false).length
    
    return {
      totalBuildings,
      activeBuildings,
      totalUnits,
      availableUnits,
      rentedUnits,
      monthlyRevenue,
      occupancyRate
    }
  }, [filteredBuildings, searchTerm, selectedCity, selectedStatus, buildingsStats, statsLoading])
  
  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCity('')
    setSelectedStatus('')
  }
  
  // Gérer l'ouverture/fermeture du modal
  const handleOpenAddModal = () => {
    setShowAddModal(true)
    setFormError(null)
    setFormData({
      name: '',
      address: {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'Canada'
      },
      yearBuilt: '',
      description: '',
      isActive: true
    })
  }
  
  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setFormError(null)
    setFormData({
      name: '',
      address: {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'Canada'
      },
      yearBuilt: '',
      description: '',
      isActive: true
    })
  }
  
  // Gérer la soumission du formulaire
  const handleSubmitAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Le nom de l\'immeuble est requis')
      }
      if (!formData.address.street.trim()) {
        throw new Error('L\'adresse est requise')
      }
      if (!formData.address.city.trim()) {
        throw new Error('La ville est requise')
      }
      if (!formData.address.province.trim()) {
        throw new Error('La province est requise')
      }
      if (!formData.address.postalCode.trim()) {
        throw new Error('Le code postal est requis')
      }
      
      // Préparer les données
      const buildingData: any = {
        name: formData.name.trim(),
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          province: formData.address.province.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country || 'Canada'
        },
        isActive: formData.isActive
      }
      
      if (formData.yearBuilt) {
        const year = parseInt(formData.yearBuilt)
        if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear()) {
          buildingData.yearBuilt = year
        }
      }
      
      if (formData.description.trim()) {
        buildingData.description = formData.description.trim()
      }
      
      // Créer l'immeuble
      await createBuilding(buildingData)
      
      // Fermer le modal et recharger la liste
      handleCloseAddModal()
      await loadBuildings(true)
      await loadBuildingsStats()
      
      // Afficher un message de succès (optionnel)
      console.log('[AdminBuildings] ✅ Immeuble créé avec succès')
    } catch (err: any) {
      console.error('[AdminBuildings] ❌ Erreur création immeuble:', err)
      setFormError(err.message || 'Erreur lors de la création de l\'immeuble')
    } finally {
      setSaving(false)
    }
  }
  
  // Gérer les changements dans le formulaire
  const handleFormChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '')
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }
  
  if (loading && buildingsList.length === 0) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des immeubles...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }
  
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">🏢 Gestion des Immeubles</h1>
                <p className="text-gray-600">Vue complète et gestion de tous les immeubles</p>
                {isConnected && (
                  <p className="text-sm text-green-600 mt-1">🟢 Synchronisation temps réel active</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => loadBuildings(true)}
                  disabled={refreshing}
                  className="btn-secondary"
                >
                  {refreshing ? '🔄 Actualisation...' : '🔄 Actualiser'}
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="btn-primary"
                >
                  ➕ Ajouter un immeuble
                </button>
              </div>
            </div>
          </div>
          
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total immeubles</p>
              <p className="text-2xl font-bold">{stats.totalBuildings}</p>
              <p className="text-2xl mt-1">🏢</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Immeubles actifs</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeBuildings}</p>
              <p className="text-2xl mt-1">✅</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total unités</p>
              <p className="text-2xl font-bold">{stats.totalUnits}</p>
              <p className="text-2xl mt-1">🏠</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{stats.availableUnits}</p>
              <p className="text-2xl mt-1">🟢</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Occupées</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.rentedUnits}</p>
              <p className="text-2xl mt-1">🟡</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Taux occupation</p>
              <p className="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</p>
              <p className="text-2xl mt-1">📊</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Revenus mensuels</p>
              <p className="text-xl font-bold text-green-600">
                ${(stats.monthlyRevenue / 1000).toFixed(1)}k
              </p>
              <p className="text-2xl mt-1">💰</p>
            </div>
          </div>
          
          {/* Filtres et recherche */}
          <div className="card p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, adresse, ville..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Toutes les villes</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full btn-secondary"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
          
          {/* Onglets */}
          <div className="mb-6 flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => {
                setShowMap(false)
                const element = document.getElementById('buildings-list')
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                !showMap
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              📋 Liste
            </button>
            <button
              onClick={() => {
                setShowMap(true)
                const element = document.getElementById('map-section')
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                showMap
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              🗺️ Carte
            </button>
          </div>

          {/* Section Carte */}
          {showMap && (
            <section id="map-section" className="mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Carte des immeubles</h2>
                <MapFilters
                  filters={mapFilters}
                  cities={uniqueCities}
                  onFilterChange={setMapFilters}
                />
              </div>
              
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <GoogleMapComponent
                  buildings={filteredBuildings}
                  height="600px"
                  selectedBuildingId={selectedBuildingId}
                  showFilters={true}
                  filters={mapFilters}
                  enableDirections={true}
                  enableClustering={true}
                  onBuildingClick={(building) => {
                    setSelectedBuildingId(building._id)
                    setShowMap(false)
                    const element = document.getElementById('buildings-list')
                    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                />
              </div>
            </section>
          )}
          
          {/* Résultats */}
          <div id="buildings-list" className="mb-4">
            <p className="text-gray-600">
              <strong>{filteredBuildings.length}</strong> immeuble(s) trouvé(s)
              {buildingsStats.totalBuildings > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (Total: {buildingsStats.totalBuildings} immeubles)
                </span>
              )}
            </p>
          </div>
          
          {/* Messages d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-semibold mb-1">Erreur de chargement</p>
                  <p className="text-sm whitespace-pre-line">{error}</p>
                  <button
                    onClick={() => loadBuildings()}
                    className="mt-2 btn-secondary text-sm"
                  >
                    🔄 Réessayer
                  </button>
                  {(error.includes('backend') || error.includes('serveur') || error.includes('port 5000')) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-semibold mb-2 text-blue-800">💡 Solution rapide :</p>
                      <div className="space-y-1">
                        <div className="flex items-start">
                          <span className="font-bold text-blue-600 mr-2">1.</span>
                          <span>Ouvrez un terminal PowerShell</span>
                        </div>
                        <div className="flex items-start">
                          <span className="font-bold text-blue-600 mr-2">2.</span>
                          <span>Naviguez vers le dossier backend : <code className="bg-blue-100 px-2 py-1 rounded font-mono">cd backend</code></span>
                        </div>
                        <div className="flex items-start">
                          <span className="font-bold text-blue-600 mr-2">3.</span>
                          <span>Démarrez le serveur : <code className="bg-blue-100 px-2 py-1 rounded font-mono">npm start</code></span>
                        </div>
                        <div className="flex items-start">
                          <span className="font-bold text-blue-600 mr-2">4.</span>
                          <span>Attendez le message <code className="bg-blue-100 px-2 py-1 rounded font-mono">"Server running on port 5000"</code></span>
                        </div>
                        <div className="flex items-start">
                          <span className="font-bold text-blue-600 mr-2">5.</span>
                          <span>Réessayez de charger les immeubles</span>
                        </div>
                      </div>
                      <p className="mt-2 text-blue-700 text-xs italic">💻 Ou utilisez le script : <code className="bg-blue-100 px-1 rounded">.\start-backend-robust.ps1</code></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!error && buildingsList.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-xl">ℹ️</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-semibold mb-1">Aucun immeuble trouvé</p>
                  <p className="text-sm mt-1">La base de données ne contient aucun immeuble pour le moment.</p>
                  <p className="text-sm mt-2">
                    <Link href="/admin/buildings?action=add" className="text-yellow-800 underline font-semibold">
                      ➕ Créer votre premier immeuble
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Grille des immeubles */}
          {filteredBuildings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBuildings.map((building) => (
                <div key={building._id} className="card overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  {/* Photo de l'immeuble */}
                  <div className="relative h-48 bg-gray-200">
                    {building.imageUrl || building.image ? (
                      <Image
                        src={building.imageUrl || building.image || getBuildingImagePath(building)}
                        alt={building.name || 'Immeuble'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-white text-6xl">
                        🏢
                      </div>
                    )}
                    {building.isActive === false && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        Inactif
                      </div>
                    )}
                  </div>
                  
                  {/* Contenu */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{building.name || 'Sans nom'}</h3>
                    <div className="text-gray-600 mb-4 space-y-1">
                      <p className="flex items-center">
                        <span className="mr-2">📍</span>
                        {building.address?.street || 'Adresse non renseignée'}
                      </p>
                      <p className="flex items-center">
                        <span className="mr-2">🏙️</span>
                        {building.address?.city || 'Ville non renseignée'}
                        {building.address?.province && `, ${building.address.province}`}
                        {building.address?.postalCode && ` ${building.address.postalCode}`}
                      </p>
                    </div>
                    
                    {/* Stats de l'immeuble */}
                    <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-600">{(building as any).totalUnits || 0}</p>
                        <p className="text-xs text-gray-500">Unités</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{(building as any).availableUnits || 0}</p>
                        <p className="text-xs text-gray-500">Disponibles</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{(building as any).rentedUnits || 0}</p>
                        <p className="text-xs text-gray-500">Occupées</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{(building as any).occupancyRate || 0}%</p>
                        <p className="text-xs text-gray-500">Occupation</p>
                      </div>
                    </div>
                    
                    {/* Revenus */}
                    {((building as any).monthlyRevenue || 0) > 0 && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Revenus mensuels</p>
                        <p className="text-lg font-bold text-green-600">
                          ${(((building as any).monthlyRevenue || 0) / 1000).toFixed(1)}k
                        </p>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/buildings/${building._id}`}
                        className="flex-1 btn-primary text-center"
                      >
                        🔍 Voir détails
                      </Link>
                      <Link
                        href={`/admin/units?building=${building._id}`}
                        className="flex-1 btn-secondary text-center"
                      >
                        🏠 Unités
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal d'ajout d'immeuble */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">➕ Ajouter un immeuble</h2>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={saving}
                >
                  ×
                </button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmitAddBuilding}>
                <div className="space-y-4">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'immeuble <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  {/* Adresse */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse (rue) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleFormChange('address.street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Ville */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => handleFormChange('address.city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={saving}
                      />
                    </div>
                    
                    {/* Province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address.province}
                        onChange={(e) => handleFormChange('address.province', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>
                  
                  {/* Code postal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code postal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) => handleFormChange('address.postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  {/* Année de construction */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Année de construction
                    </label>
                    <input
                      type="number"
                      value={formData.yearBuilt}
                      onChange={(e) => handleFormChange('yearBuilt', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1800"
                      max={new Date().getFullYear()}
                      disabled={saving}
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      disabled={saving}
                    />
                  </div>
                  
                  {/* Statut actif */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={saving}
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Immeuble actif
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? '⏳ Création...' : '✅ Créer l\'immeuble'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </ProtectedRoute>
  )
}
