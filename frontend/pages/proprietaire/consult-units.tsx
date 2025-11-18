import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { getUnitImagePath } from '../../utils/imageUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Unit {
  _id: string
  titre?: string
  unitNumber: string
  ville?: string
  quartier?: string
  prix?: number
  transactionType?: 'vente' | 'location'
  etatRenovation?: string
  nombrePieces?: number
  status: string
  images?: string[]
  imageUrl?: string
  datePublication?: string
  isPremium?: boolean
  building: {
    name: string
    image?: string
    imageUrl?: string
    address?: {
      street: string
      city: string
    }
  }
  description?: string
}

export default function ConsultUnits() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    ville: '',
    quartier: '',
    transactionType: '',
    minPrix: '',
    maxPrix: '',
    etatRenovation: '',
    minPieces: '',
    maxPieces: '',
    status: '',
    sortBy: 'datePublication',
    order: 'desc'
  })

  useEffect(() => {
    if (isAuthenticated && user?.role === 'proprietaire') {
      loadUnits()
    }
  }, [isAuthenticated, user, filters])

  const loadUnits = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      
      // Construire les paramètres de requête
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await axios.get(`${API_URL}/units?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        setUnits(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement unités:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      ville: '',
      quartier: '',
      transactionType: '',
      minPrix: '',
      maxPrix: '',
      etatRenovation: '',
      minPieces: '',
      maxPieces: '',
      status: '',
      sortBy: 'datePublication',
      order: 'desc'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; color: string; icon: string } } = {
      'disponible': { label: 'Disponible', color: 'bg-green-100 text-green-800', icon: '🟢' },
      'negociation': { label: 'En négociation', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      'vendue_louee': { label: 'Vendue/Louée', color: 'bg-red-100 text-red-800', icon: '🔴' },
      'loue': { label: 'Loué', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      'vendu': { label: 'Vendu', color: 'bg-gray-100 text-gray-800', icon: '⚫' },
      'maintenance': { label: 'Maintenance', color: 'bg-orange-100 text-orange-800', icon: '🔧' }
    }
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: '⚪' }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    )
  }

  const getRenovationLabel = (etat?: string) => {
    const labels: { [key: string]: string } = {
      'renovation_complete': 'Rénovation complète',
      'renovation_partielle': 'Rénovation partielle',
      'acceptable': 'Acceptable'
    }
    return labels[etat || ''] || etat || 'N/A'
  }

  const formatPrice = (prix?: number) => prix ? `$${prix.toLocaleString()}` : 'N/A'

  if (!isAuthenticated || user?.role !== 'proprietaire') {
    return (
      <ProtectedRoute requiredRoles={['proprietaire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600">Cette page est réservée aux propriétaires.</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Consultation des Unités Disponibles</h1>
            <p className="text-xl text-primary-100">
              Explorez toutes les unités publiées par l'administration
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Filtres */}
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Filtres de recherche</h2>
              <button onClick={resetFilters} className="text-sm text-primary-600 hover:text-primary-700">
                Réinitialiser
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                <input
                  type="text"
                  value={filters.ville}
                  onChange={(e) => handleFilterChange('ville', e.target.value)}
                  placeholder="Montréal, Québec..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quartier</label>
                <input
                  type="text"
                  value={filters.quartier}
                  onChange={(e) => handleFilterChange('quartier', e.target.value)}
                  placeholder="Centre-ville, Plateau..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="vente">Vente</option>
                  <option value="location">Location</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="disponible">Disponible</option>
                  <option value="negociation">En négociation</option>
                  <option value="vendue_louee">Vendue/Louée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix min ($)</label>
                <input
                  type="number"
                  value={filters.minPrix}
                  onChange={(e) => handleFilterChange('minPrix', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix max ($)</label>
                <input
                  type="number"
                  value={filters.maxPrix}
                  onChange={(e) => handleFilterChange('maxPrix', e.target.value)}
                  placeholder="1000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">État de rénovation</label>
                <select
                  value={filters.etatRenovation}
                  onChange={(e) => handleFilterChange('etatRenovation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="renovation_complete">Rénovation complète</option>
                  <option value="renovation_partielle">Rénovation partielle</option>
                  <option value="acceptable">Acceptable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de pièces</label>
                <input
                  type="number"
                  value={filters.minPieces}
                  onChange={(e) => handleFilterChange('minPieces', e.target.value)}
                  placeholder="Min"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tri par</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="datePublication">Date de publication</option>
                  <option value="prix">Prix</option>
                  <option value="nombrePieces">Nombre de pièces</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ordre</label>
                <select
                  value={filters.order}
                  onChange={(e) => handleFilterChange('order', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="desc">Décroissant</option>
                  <option value="asc">Croissant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {loading ? 'Chargement...' : `${units.length} unité(s) trouvée(s)`}
            </h2>
            <button
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  sortBy: 'datePublication',
                  order: 'desc'
                }))
              }}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Voir les plus récentes →
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : units.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {units.map((unit) => (
                <div key={unit._id} className="card hover:shadow-xl transition-shadow">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={getUnitImagePath(unit)}
                      alt={unit.titre || `Unité ${unit.unitNumber}`}
                      fill
                      className="object-cover rounded-t-lg"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/images/default/placeholder.jpg'
                      }}
                    />
                    {unit.isPremium && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                        ⭐ Premium
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {getStatusBadge(unit.status)}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">
                      {unit.titre || `Unité ${unit.unitNumber}`}
                    </h3>
                    <div className="space-y-2 mb-4">
                      {unit.ville && unit.quartier && (
                        <p className="text-gray-600 flex items-center">
                          <span className="mr-2">📍</span>
                          {unit.quartier}, {unit.ville}
                        </p>
                      )}
                      {unit.building && (
                        <p className="text-sm text-gray-500">
                          {unit.building.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary-600">
                          {formatPrice(unit.prix)}
                        </span>
                        {unit.transactionType && (
                          <span className="text-sm text-gray-500 capitalize">
                            {unit.transactionType === 'vente' ? 'À vendre' : 'À louer'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {unit.nombrePieces !== undefined && unit.nombrePieces > 0 && (
                          <span>{unit.nombrePieces} pièce(s)</span>
                        )}
                        {unit.etatRenovation && (
                          <span>{getRenovationLabel(unit.etatRenovation)}</span>
                        )}
                      </div>
                      {unit.datePublication && (
                        <p className="text-xs text-gray-400">
                          Publié le {new Date(unit.datePublication).toLocaleDateString('fr-CA')}
                        </p>
                      )}
                    </div>
                    <Link 
                      href={`/units/${unit._id}`}
                      className="btn-primary w-full text-center block"
                    >
                      Voir les détails
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">Aucune unité trouvée</h3>
              <p className="text-gray-600 mb-6">
                Aucune unité ne correspond à vos critères de recherche.
              </p>
              <button onClick={resetFilters} className="btn-primary">
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

