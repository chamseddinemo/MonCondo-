'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { getUnitImagePath, getBuildingImagePath } from '../../utils/imageUtils'
import { authenticatedAxios } from '../../utils/axiosInstances'
import { getAllBuildings } from '../../services/realEstateService'

interface Unit {
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

interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province?: string
    postalCode?: string
  }
  totalUnits?: number
  isActive: boolean
}

export default function AdminUnits() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  // États locaux pour les filtres (doivent être définis avant useRealEstateData)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  
  // États pour les stats des unités (UNIQUEMENT unités)
  const [unitsStats, setUnitsStats] = useState({
    totalUnits: 0,
    availableUnits: 0,
    rentedUnits: 0,
    onSaleUnits: 0,
    soldUnits: 0,
    monthlyRevenue: 0,
    occupancyRate: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  
  // États locaux pour les unités
  const [allUnits, setAllUnits] = useState<Unit[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  
  // Utiliser les unités filtrées selon les filtres locaux
  const units = useMemo(() => {
    // S'assurer que allUnits est un tableau
    if (!Array.isArray(allUnits)) {
      return []
    }
    
    let filtered = allUnits
    
    // Filtre par immeuble
    if (selectedBuilding) {
      filtered = filtered.filter(u => u?.building?._id === selectedBuilding)
    }
    
    return filtered
  }, [allUnits, selectedBuilding])
  
  // Charger les stats des unités (UNIQUEMENT endpoint units/stats)
  const loadUnitsStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const response = await authenticatedAxios.get('/units/stats')
      
      if (response.data?.success && response.data.data) {
        setUnitsStats({
          totalUnits: response.data.data.totalUnits || 0,
          availableUnits: response.data.data.availableUnits || 0,
          rentedUnits: response.data.data.rentedUnits || 0,
          onSaleUnits: response.data.data.onSaleUnits || 0,
          soldUnits: response.data.data.soldUnits || 0,
          monthlyRevenue: response.data.data.monthlyRevenue || 0,
          occupancyRate: response.data.data.occupancyRate || 0
        })
      }
    } catch (err: any) {
      console.error('[AdminUnits] Error loading units stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])
  
  // Charger les unités (UNIQUEMENT endpoint units)
  const loadUnits = useCallback(async () => {
    try {
      setDataLoading(true)
      setDataError(null)
      
      // Charger les unités
      const unitsResponse = await authenticatedAxios.get('/units')
      let units: Unit[] = []
      if (unitsResponse.data?.success && Array.isArray(unitsResponse.data.data)) {
        units = unitsResponse.data.data
      } else if (Array.isArray(unitsResponse.data?.data)) {
        units = unitsResponse.data.data
      } else if (Array.isArray(unitsResponse.data)) {
        units = unitsResponse.data
      }
      setAllUnits(units)
      
      // Charger les immeubles UNIQUEMENT pour les filtres (pas pour les stats)
      // Utiliser le service centralisé pour uniformiser les appels API
      try {
        const buildingsList = await getAllBuildings()
        setBuildings(buildingsList)
      } catch (buildingsError) {
        console.warn('[AdminUnits] Error loading buildings for filters:', buildingsError)
        setBuildings([])
      }
      
      // Charger les stats des unités séparément
      await loadUnitsStats()
    } catch (err: any) {
      console.error('[AdminUnits] Error loading units:', err)
      setDataError('Erreur lors du chargement des unités')
      setAllUnits([])
    } finally {
      setDataLoading(false)
    }
  }, [loadUnitsStats])
  
  // Fonction pour recharger toutes les données
  const loadData = useCallback(async () => {
    await loadUnits()
  }, [loadUnits])
  
  // Charger au montage
  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  // Filtrer les unités
  const filteredUnits = useMemo(() => {
    // S'assurer que units est un tableau
    if (!Array.isArray(units)) {
      return []
    }
    
    return units.filter(unit => {
      // Vérifier que unit existe et a les propriétés nécessaires
      if (!unit || !unit.building) {
        return false
      }
      // Recherche globale
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          unit.unitNumber.toLowerCase().includes(search) ||
          unit.building.name.toLowerCase().includes(search) ||
          unit.building.address.street.toLowerCase().includes(search) ||
          unit.building.address.city.toLowerCase().includes(search) ||
          (unit.proprietaire && `${unit.proprietaire.firstName} ${unit.proprietaire.lastName}`.toLowerCase().includes(search)) ||
          (unit.proprietaire && unit.proprietaire.email.toLowerCase().includes(search)) ||
          (unit.locataire && `${unit.locataire.firstName} ${unit.locataire.lastName}`.toLowerCase().includes(search)) ||
          (unit.locataire && unit.locataire.email.toLowerCase().includes(search))
        
        if (!matchesSearch) return false
      }

      // Filtre par immeuble
      if (selectedBuilding && unit.building._id !== selectedBuilding) {
        return false
      }

      // Filtre par statut
      if (selectedStatus) {
        const statusMap: { [key: string]: string[] } = {
          'disponible': ['disponible', 'Disponible'],
          'loue': ['loue', 'Loué', 'en_location'],
          'en_vente': ['en_vente', 'En vente', 'negociation'],
          'vendu': ['vendu', 'Vendu', 'vendue']
        }
        
        if (selectedStatus !== 'tous') {
          const allowedStatuses = statusMap[selectedStatus] || [selectedStatus]
          if (!allowedStatuses.includes(unit.status)) {
            // Vérifier aussi par locataire/proprietaire
            if (selectedStatus === 'disponible' && unit.locataire) return false
            if (selectedStatus === 'loue' && !unit.locataire) return false
            if (!allowedStatuses.includes(unit.status)) return false
          }
        }
      }

      // Filtre par ville
      if (selectedCity && unit.building.address.city !== selectedCity) {
        return false
      }

      // Filtre par prix
      if (priceMin && unit.rentPrice && unit.rentPrice < Number(priceMin)) {
        return false
      }
      if (priceMax && unit.rentPrice && unit.rentPrice > Number(priceMax)) {
        return false
      }

      return true
    })
  }, [units, searchTerm, selectedBuilding, selectedStatus, selectedCity, priceMin, priceMax])

  // Utiliser les statistiques des unités (UNIQUEMENT stats unités)
  // Si aucun filtre n'est appliqué, utiliser les stats depuis l'endpoint units/stats
  // Sinon, calculer les stats pour les unités filtrées
  const stats = useMemo(() => {
    // Si aucun filtre n'est appliqué, utiliser les stats des unités depuis l'endpoint
    const hasFilters = searchTerm || selectedBuilding || selectedStatus !== '' || selectedCity || priceMin || priceMax
    
    if (!hasFilters && !statsLoading && unitsStats.totalUnits > 0) {
      return {
        totalUnits: unitsStats.totalUnits,
        disponibles: unitsStats.availableUnits,
        enLocation: unitsStats.rentedUnits,
        enVente: unitsStats.onSaleUnits || 0,
        vendues: unitsStats.soldUnits,
        revenusMensuels: unitsStats.monthlyRevenue,
        tauxOccupation: unitsStats.occupancyRate
      }
    }
    
    // Sinon, calculer les stats pour les unités filtrées
    const filtered = filteredUnits
    
    // Compter les statuts
    const disponibles = filtered.filter(u => 
      u.status === 'disponible' || u.status === 'Disponible' || 
      (u.isAvailable !== false && !u.locataire)
    ).length
    
    const enLocation = filtered.filter(u => 
      u.status === 'loue' || u.status === 'Loué' || u.status === 'en_location' ||
      (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length
    
    const enVente = filtered.filter(u => 
      u.status === 'en_vente' || u.status === 'En vente' || u.status === 'negociation'
    ).length
    
    const vendues = filtered.filter(u => 
      u.status === 'vendu' || u.status === 'Vendu' || u.status === 'vendue'
    ).length

    // Calculer les revenus mensuels (somme des loyers des unités louées)
    const revenusMensuels = filtered
      .filter(u => u.locataire && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0)

    // Calculer le taux d'occupation
    const totalOccupables = filtered.length
    const occupees = filtered.filter(u => u.locataire).length
    const tauxOccupation = totalOccupables > 0 
      ? Math.round((occupees / totalOccupables) * 100) 
      : 0

    // Obtenir les immeubles uniques
    const uniqueBuildings = new Set(filtered.map(u => u.building._id))
    
    return {
      totalUnits: filtered.length,
      disponibles,
      enLocation,
      enVente,
      vendues,
      revenusMensuels,
      tauxOccupation
    }
  }, [filteredUnits, searchTerm, selectedBuilding, selectedStatus, selectedCity, priceMin, priceMax, unitsStats, statsLoading])

  // Obtenir les villes uniques
  const uniqueCities = useMemo(() => {
    const cities = new Set(units.map(u => u.building.address.city).filter(Boolean))
    return Array.from(cities).sort()
  }, [units])

  // Obtenir le statut d'affichage
  const getStatusDisplay = (unit: Unit) => {
    if (unit.status === 'vendu' || unit.status === 'Vendu' || unit.status === 'vendue') {
      return { text: 'Vendue', color: 'text-red-600', bg: 'bg-red-100', emoji: '🔴' }
    }
    if (unit.status === 'en_vente' || unit.status === 'En vente' || unit.status === 'negociation') {
      return { text: 'En vente', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '🔵' }
    }
    if (unit.locataire || unit.status === 'loue' || unit.status === 'Loué' || unit.status === 'en_location') {
      return { text: 'En location', color: 'text-yellow-600', bg: 'bg-yellow-100', emoji: '🟡' }
    }
    return { text: 'Disponible', color: 'text-green-600', bg: 'bg-green-100', emoji: '🟢' }
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedBuilding('')
    setSelectedStatus('')
    setSelectedCity('')
    setPriceMin('')
    setPriceMax('')
  }

  // Utiliser le loading du hook centralisé
  const loading = dataLoading
  const error = dataError

  if (loading && units.length === 0 && buildings.length === 0) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des données...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">🏠 Gestion des Unités</h1>
                <p className="text-gray-600">Vue complète et gestion de toutes les unités</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadData}
                  className="btn-secondary"
                >
                  🔄 Actualiser
                </button>
                <Link href="/admin/units?action=add" className="btn-primary">
                  ➕ Ajouter une unité
                </Link>
              </div>
            </div>
          </div>

          {/* Statistiques (UNIQUEMENT unités) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total unités</p>
              <p className="text-2xl font-bold">{stats.totalUnits}</p>
              <p className="text-2xl mt-1">🏠</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
              <p className="text-2xl mt-1">🟢</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">En location</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.enLocation}</p>
              <p className="text-2xl mt-1">🟡</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">En vente</p>
              <p className="text-2xl font-bold text-blue-600">{stats.enVente}</p>
              <p className="text-2xl mt-1">🔵</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Vendues</p>
              <p className="text-2xl font-bold text-red-600">{stats.vendues}</p>
              <p className="text-2xl mt-1">🔴</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Revenus mensuels</p>
              <p className="text-xl font-bold text-primary-600">
                ${stats.revenusMensuels.toLocaleString()}
              </p>
              <p className="text-2xl mt-1">💰</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Taux d'occupation</p>
              <p className="text-2xl font-bold text-primary-600">{stats.tauxOccupation}%</p>
              <p className="text-2xl mt-1">📉</p>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Filtres et recherche</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche globale
                </label>
                <input
                  type="text"
                  placeholder="Unité, immeuble, adresse, propriétaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immeuble
                </label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tous les immeubles</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  État
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="tous">Tous les états</option>
                  <option value="disponible">Disponible</option>
                  <option value="loue">En location</option>
                  <option value="en_vente">En vente</option>
                  <option value="vendu">Vendue</option>
                </select>
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
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix min
                </label>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix max
                </label>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={resetFilters}
                className="btn-secondary"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Résultats */}
          <div className="mb-4">
            <p className="text-gray-600">
              <strong>{filteredUnits.length}</strong> unité(s) trouvée(s)
              {unitsStats.totalUnits > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (Total: {unitsStats.totalUnits} unités)
                </span>
              )}
            </p>
          </div>

          {/* Tableau des unités */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
              <button
                onClick={refreshData}
                className="mt-2 btn-secondary text-sm"
              >
                🔄 Réessayer
              </button>
            </div>
          )}
          
          {!error && units.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
              <p>Aucune unité trouvée dans la base de données.</p>
              <p className="text-sm mt-1">Créez votre première unité pour commencer.</p>
            </div>
          )}

          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Liste des unités</h2>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm">
                  📤 Exporter Excel
                </button>
                <button className="btn-secondary text-sm">
                  📄 Exporter PDF
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Unité ↑
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Immeuble
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locataire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Surface
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambres
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((unit) => {
                    const statusDisplay = getStatusDisplay(unit)
                    return (
                      <tr key={unit._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                            {(unit.imageUrl || (unit.images && unit.images.length > 0)) ? (
                              <Image
                                src={unit.imageUrl || unit.images?.[0] || getUnitImagePath(unit)}
                                alt={`Unité ${unit.unitNumber}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🏠
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {unit.unitNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.building.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {unit.building.address.street}
                          <br />
                          <span className="text-gray-500">
                            {unit.building.address.city}, {unit.building.address.province || 'QC'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.proprietaire ? (
                            <>
                              {unit.proprietaire.firstName} {unit.proprietaire.lastName}
                              <br />
                              <span className="text-gray-500 text-xs">{unit.proprietaire.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Non assigné</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.locataire ? (
                            <>
                              {unit.locataire.firstName} {unit.locataire.lastName}
                              <br />
                              <span className="text-gray-500 text-xs">{unit.locataire.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Vacant</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                            {statusDisplay.emoji} {statusDisplay.text}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.rentPrice ? `$${unit.rentPrice.toLocaleString()}/mois` : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.size} m²
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.bedrooms} {unit.bedrooms === 1 ? 'chambre' : 'chambres'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/admin/units/${unit._id}`)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Voir détails"
                            >
                              🔍
                            </button>
                            <button
                              onClick={() => router.push(`/admin/units?building=${unit.building._id}&edit=${unit._id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              title="Supprimer"
                            >
                              ❌
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      Aucune unité trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

