import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { buildApiUrl, getApiConfig, getAuthToken } from '../../utils/api'
import { validateImagePath } from '../../utils/imageUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province?: string
    postalCode?: string
  }
  imageUrl?: string
  totalUnits: number
  availableUnits: number
  yearBuilt?: number
}

interface Unit {
  _id: string
  unitNumber: string
  type: string
  size: number
  bedrooms: number
  bathrooms?: number
  status: string
  rentPrice?: number
  salePrice?: number
  imageUrl?: string
  description?: string
  availableFrom?: string
  building: {
    _id: string
    name: string
    address: {
      street: string
      city: string
    }
  }
}

export default function VisiteurDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'buildings' | 'units' | 'requests' | 'payments'>('buildings')
  const [dashboardData, setDashboardData] = useState<any>(null)

  const loadBuildings = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page.')
        setLoading(false)
        return
      }

      const url = buildApiUrl('buildings')
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.data.success) {
        setBuildings(response.data.data || [])
      }
    } catch (err: any) {
      console.error('Erreur chargement immeubles:', err)
      setError('Erreur lors du chargement des immeubles')
    }
  }

  const loadUnits = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        return
      }

      const url = buildApiUrl('units/available')
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.data.success) {
        setUnits(response.data.data || [])
      }
    } catch (err: any) {
      console.error('Erreur chargement unités:', err)
    }
  }

  const loadDashboardData = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        return
      }

      const url = buildApiUrl('visiteur/dashboard')
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.data.success) {
        setDashboardData(response.data.data)
      }
    } catch (err: any) {
      console.error('Erreur chargement données dashboard:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadBuildings(), loadUnits(), loadDashboardData()])
      } catch (err) {
        console.error('Erreur lors du chargement initial:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getImagePath = (item: Building | Unit) => {
    if (item.imageUrl) {
      const validatedPath = validateImagePath(item.imageUrl)
      if (validatedPath.startsWith('http')) {
        return validatedPath
      }
      // Si c'est un chemin relatif vers uploads, construire l'URL complète
      if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
        return `${API_URL.replace('/api', '')}${validatedPath.startsWith('/') ? validatedPath : `/${validatedPath}`}`
      }
      return validatedPath
    }
    return '/images/default/placeholder.jpg'
  }

  return (
    <ProtectedRoute requiredRoles={['visiteur']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Bienvenue, {user?.firstName} {user?.lastName} 👋
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Explorez nos immeubles et unités disponibles
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                <span className="font-semibold">💡 Astuce :</span> Pour faire une demande de location ou d'achat, cliquez sur une unité et utilisez le bouton "Faire une demande".
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600 mb-1">Documents à signer</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.stats?.documentsToSign || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600 mb-1">Paiements en attente</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboardData.stats?.pendingPayments || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600 mb-1">Demandes acceptées</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.stats?.acceptedRequests || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600 mb-1">Total demandes</p>
                <p className="text-2xl font-bold text-primary-600">{dashboardData.stats?.totalRequests || 0}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('buildings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'buildings'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏢 Immeubles ({buildings.length})
              </button>
              <button
                onClick={() => setActiveTab('units')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'units'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏠 Unités ({units.length})
              </button>
              {dashboardData && dashboardData.acceptedRequestsWithDocs && dashboardData.acceptedRequestsWithDocs.length > 0 && (
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'requests'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📝 Documents à signer ({dashboardData.stats?.documentsToSign || 0})
                </button>
              )}
              {dashboardData && dashboardData.pendingPayments && dashboardData.pendingPayments.length > 0 && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'payments'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  💳 Paiements ({dashboardData.pendingPayments.length})
                </button>
              )}
            </nav>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          )}

          {/* Buildings Tab */}
          {!loading && activeTab === 'buildings' && (
            <div>
              {buildings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-600">Aucun immeuble disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {buildings.map((building) => (
                    <div
                      key={building._id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                    >
                      {/* Image */}
                      <div className="relative h-64 bg-gradient-to-br from-primary-400 to-primary-600">
                        <Image
                          src={getImagePath(building)}
                          alt={building.name}
                          fill
                          className="object-cover"
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/images/default/placeholder.jpg'
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {building.name.replace('[EXEMPLE]', '').trim()}
                        </h3>
                        <div className="text-gray-600 mb-4 space-y-1">
                          <p className="flex items-center text-sm">
                            <span className="mr-2">📍</span>
                            {building.address?.street || 'Adresse non renseignée'}
                          </p>
                          <p className="flex items-center text-sm">
                            <span className="mr-2">🏙️</span>
                            {building.address?.city || 'Ville non renseignée'}
                            {building.address?.province && `, ${building.address.province}`}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Total unités</p>
                            <p className="text-2xl font-bold text-primary-600">{building.totalUnits}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Disponibles</p>
                            <p className="text-2xl font-bold text-green-600">{building.availableUnits}</p>
                          </div>
                        </div>

                        {/* Button */}
                        {building._id ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              
                              if (!building._id || building._id === 'undefined' || building._id === 'null') {
                                console.error('[VISITEUR_DASHBOARD] ❌ ID invalide:', building._id)
                                alert(`Erreur: ID d'immeuble invalide. Veuillez contacter le support.`)
                                return
                              }
                              
                              const targetUrl = `/buildings/${building._id}`
                              console.log('[VISITEUR_DASHBOARD] 🚀 Navigation vers:', targetUrl, 'Building ID:', building._id)
                              
                              // Utiliser window.location.href directement pour forcer la navigation
                              const navPromise = router.push(targetUrl)
                              const timeout = setTimeout(() => {
                                console.warn('[VISITEUR_DASHBOARD] ⏱️ Timeout navigation, utilisation window.location')
                                window.location.href = targetUrl
                              }, 500)
                              
                              try {
                                await navPromise
                                clearTimeout(timeout)
                                console.log('[VISITEUR_DASHBOARD] ✅ Navigation réussie avec router.push()')
                              } catch (err) {
                                clearTimeout(timeout)
                                console.error('[VISITEUR_DASHBOARD] ❌ Erreur router.push():', err)
                                console.log('[VISITEUR_DASHBOARD] 🔄 Fallback: window.location.href')
                                window.location.href = targetUrl
                              }
                            }}
                            className="w-full btn-primary block text-center"
                          >
                            Voir les détails
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full btn-primary block text-center opacity-50 cursor-not-allowed"
                            title="ID d'immeuble manquant"
                            onClick={() => console.warn('[VISITEUR_DASHBOARD] ⚠️ ID manquant pour navigation')}
                          >
                            Voir les détails
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Units Tab */}
          {!loading && activeTab === 'units' && (
            <div>
              {units.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-600">Aucune unité disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {units.map((unit) => (
                    <div
                      key={unit._id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                    >
                      {/* Image */}
                      <div className="relative h-64 bg-gradient-to-br from-primary-400 to-primary-600">
                        <Image
                          src={getImagePath(unit)}
                          alt={`Unité ${unit.unitNumber}`}
                          fill
                          className="object-cover"
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/images/default/placeholder.jpg'
                          }}
                        />
                        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-lg">
                          <span className="text-sm font-bold text-primary-600">
                            {unit.rentPrice ? `$${unit.rentPrice}/mois` : unit.salePrice ? `$${unit.salePrice}` : 'Prix sur demande'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Unité {unit.unitNumber}
                        </h3>
                        <p className="text-gray-600 mb-2 text-sm">
                          📍 {unit.building?.name || 'Immeuble'} - {unit.building?.address?.city || 'Ville'}
                        </p>
                        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                          <span>🛏️ {unit.bedrooms} chambres</span>
                          <span>🛁 {unit.bathrooms || 'N/A'} salles de bain</span>
                          <span>📐 {unit.size} pi²</span>
                        </div>

                        <div className="pt-4 border-t border-gray-200 flex gap-2">
                          {unit._id ? (
                            <>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  
                                  if (!unit._id || unit._id === 'undefined' || unit._id === 'null') {
                                    console.error('[VISITEUR_DASHBOARD] ❌ ID invalide:', unit._id)
                                    alert(`Erreur: ID d'unité invalide. Veuillez contacter le support.`)
                                    return
                                  }
                                  
                                  const targetUrl = `/units/${unit._id}`
                                  console.log('[VISITEUR_DASHBOARD] 🚀 Navigation vers:', targetUrl, 'Unit ID:', unit._id)
                                  
                                  // Utiliser window.location.href directement pour forcer la navigation
                                  const navPromise = router.push(targetUrl)
                                  const timeout = setTimeout(() => {
                                    console.warn('[VISITEUR_DASHBOARD] ⏱️ Timeout navigation, utilisation window.location')
                                    window.location.href = targetUrl
                                  }, 500)
                                  
                                  try {
                                    await navPromise
                                    clearTimeout(timeout)
                                    console.log('[VISITEUR_DASHBOARD] ✅ Navigation réussie avec router.push()')
                                  } catch (err) {
                                    clearTimeout(timeout)
                                    console.error('[VISITEUR_DASHBOARD] ❌ Erreur router.push():', err)
                                    console.log('[VISITEUR_DASHBOARD] 🔄 Fallback: window.location.href')
                                    window.location.href = targetUrl
                                  }
                                }}
                                className="flex-1 btn-secondary text-center"
                              >
                                Voir les détails
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  
                                  if (!unit._id || unit._id === 'undefined' || unit._id === 'null') {
                                    console.error('[VISITEUR_DASHBOARD] ❌ ID invalide:', unit._id)
                                    alert(`Erreur: ID d'unité invalide. Veuillez contacter le support.`)
                                    return
                                  }
                                  
                                  const targetUrl = `/request?unitId=${unit._id}`
                                  console.log('[VISITEUR_DASHBOARD] 🚀 Navigation vers:', targetUrl, 'Unit ID:', unit._id)
                                  
                                  // Utiliser window.location.href directement pour forcer la navigation
                                  const navPromise = router.push(targetUrl)
                                  const timeout = setTimeout(() => {
                                    console.warn('[VISITEUR_DASHBOARD] ⏱️ Timeout navigation, utilisation window.location')
                                    window.location.href = targetUrl
                                  }, 500)
                                  
                                  try {
                                    await navPromise
                                    clearTimeout(timeout)
                                    console.log('[VISITEUR_DASHBOARD] ✅ Navigation réussie avec router.push()')
                                  } catch (err) {
                                    clearTimeout(timeout)
                                    console.error('[VISITEUR_DASHBOARD] ❌ Erreur router.push():', err)
                                    console.log('[VISITEUR_DASHBOARD] 🔄 Fallback: window.location.href')
                                    window.location.href = targetUrl
                                  }
                                }}
                                className="flex-1 btn-primary text-center"
                              >
                                Faire une demande
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled
                                className="flex-1 btn-secondary text-center opacity-50 cursor-not-allowed"
                                title="ID d'unité manquant"
                                onClick={() => console.warn('[VISITEUR_DASHBOARD] ⚠️ ID manquant pour navigation unité')}
                              >
                                Voir les détails
                              </button>
                              <button
                                type="button"
                                disabled
                                className="flex-1 btn-primary text-center opacity-50 cursor-not-allowed"
                                title="ID d'unité manquant"
                                onClick={() => console.warn('[VISITEUR_DASHBOARD] ⚠️ ID manquant pour demande')}
                              >
                                Faire une demande
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents à signer Tab */}
          {!loading && activeTab === 'requests' && dashboardData && (
            <div>
              {dashboardData.acceptedRequestsWithDocs && dashboardData.acceptedRequestsWithDocs.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.acceptedRequestsWithDocs.map((request: any) => {
                    const unsignedDocs = request.generatedDocuments?.filter((doc: any) => !doc.signed || doc.signed === false) || [];
                    if (unsignedDocs.length === 0) return null;
                    
                    return (
                      <div key={request._id} className="bg-white rounded-lg p-6 border-2 border-orange-300 shadow-md">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-2">
                              {request.type === 'location' ? '📍 Location' : '🏠 Achat'} - Unité {request.unit?.unitNumber}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              {request.building?.name && <p><strong>Immeuble:</strong> {request.building.name}</p>}
                              <p><strong>Acceptée le:</strong> {new Date(request.approvedAt).toLocaleDateString('fr-CA')}</p>
                            </div>
                          </div>
                          <Link
                            href={`/locataire/requests/${request._id}`}
                            className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                          >
                            Voir et signer →
                          </Link>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Documents en attente de signature:</p>
                          <div className="space-y-2">
                            {unsignedDocs.map((doc: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{doc.filename}</span>
                                <span className="text-xs text-orange-600 font-semibold">⏳ En attente</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-600">Aucun document à signer pour le moment.</p>
                </div>
              )}
            </div>
          )}

          {/* Paiements en attente Tab */}
          {!loading && activeTab === 'payments' && dashboardData && (
            <div>
              {dashboardData.pendingPayments && dashboardData.pendingPayments.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.pendingPayments.map((payment: any) => (
                    <div key={payment._id} className="bg-white rounded-lg p-6 border-2 border-yellow-300 shadow-md">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">
                            💳 Paiement pour {payment.requestId?.type === 'location' ? 'Location' : 'Achat'} - Unité {payment.unit?.unitNumber}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Montant:</strong> ${payment.amount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
                            <p><strong>Date d'échéance:</strong> {new Date(payment.dueDate).toLocaleDateString('fr-CA')}</p>
                            {payment.description && <p><strong>Description:</strong> {payment.description}</p>}
                          </div>
                        </div>
                        <Link
                          href={`/payments/${payment._id}/pay`}
                          className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
                        >
                          Payer maintenant →
                        </Link>
                      </div>
                      {payment.status === 'en_retard' && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800 font-semibold">⚠️ Paiement en retard</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-600">Aucun paiement en attente pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

