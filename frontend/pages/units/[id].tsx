import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { getUnitImagePath } from '../../utils/imageUtils'
import { publicAxios, authenticatedAxios } from '../../utils/axiosInstances'
import GoogleMapCard from '../../components/maps/GoogleMapCard'
import OptimizedImage from '../../components/OptimizedImage'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Unit {
  _id: string
  unitNumber: string
  floor: number
  type: string
  size: number
  bedrooms: number
  bathrooms: number
  status: string
  rentPrice?: number
  salePrice?: number
  monthlyCharges?: number
  description?: string
  features?: string[]
  availableFrom?: string
  images?: string[]
  imageUrl?: string
  building: {
    _id: string
    name: string
    image?: string
    imageUrl?: string
    address: {
      street: string
      city: string
      province: string
      postalCode: string
    }
  }
  proprietaire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  locataire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface Request {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  createdAt: string
}

interface Document {
  _id: string
  type: string
  filename: string
  path: string
  signed: boolean
  signedAt?: string
}

export default function UnitsDetail() {
  const router = useRouter()
  const { id } = router.query
  
  // Validation de l'ID
  const unitId = id as string | undefined
  const { user, isAuthenticated } = useAuth()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [similarUnits, setSimilarUnits] = useState<Unit[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [isOwnerOrTenant, setIsOwnerOrTenant] = useState(false)

  useEffect(() => {
    // Attendre que le router soit prêt
    if (!router.isReady) return
    
    // Valider l'ID avant de charger
    if (!unitId || typeof unitId !== 'string' || unitId.trim() === '') {
      setError('ID d\'unité invalide')
      setLoading(false)
      return
    }
    
    loadUnit()
  }, [unitId, router.isReady, user])

  const loadUnit = async () => {
    // Validation de l'ID avant de charger
    if (!unitId || typeof unitId !== 'string' || unitId.trim() === '') {
      setError('ID d\'unité invalide')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      console.log('[UNIT DETAIL] Chargement unité:', { unitId, isAuthenticated, userId: user?._id || user?.id, userRole: user?.role })
      
      let unitData = null
      let response = null
      
      // Stratégie de chargement :
      // 1. Si utilisateur authentifié, essayer d'abord la route authentifiée (accès complet)
      // 2. Sinon, essayer la route publique
      // 3. Si échec avec 404 et utilisateur authentifié, réessayer avec route authentifiée
      
      if (isAuthenticated) {
        try {
          // Essayer d'abord la route authentifiée pour avoir accès complet
          console.log('[UNIT DETAIL] Tentative avec route authentifiée /units/${unitId}')
          response = await authenticatedAxios.get(`/units/${unitId}`)
          if (response.data.success) {
            unitData = response.data.data
            console.log('[UNIT DETAIL] ✅ Unité chargée via route authentifiée')
          }
        } catch (authError: any) {
          console.log('[UNIT DETAIL] Route authentifiée échouée, essai route publique:', authError.response?.status)
          // Si la route authentifiée échoue, essayer la route publique
          try {
            response = await publicAxios.get(`/public/units/${unitId}`)
            if (response.data.success) {
              unitData = response.data.data
              console.log('[UNIT DETAIL] ✅ Unité chargée via route publique')
            }
          } catch (publicError: any) {
            // Si les deux échouent, lancer l'erreur publique
            throw publicError
          }
        }
      } else {
        // Utilisateur non authentifié, utiliser route publique
        console.log('[UNIT DETAIL] Tentative avec route publique /public/units/${unitId}')
        response = await publicAxios.get(`/public/units/${unitId}`)
        if (response.data.success) {
          unitData = response.data.data
          console.log('[UNIT DETAIL] ✅ Unité chargée via route publique')
        }
      }
      
      if (unitData) {
        setUnit(unitData)
        
        console.log('[UNIT DETAIL] Unité chargée:', { 
          unitId: unitData._id, 
          status: unitData.status,
          proprietaire: unitData.proprietaire?._id || unitData.proprietaire,
          locataire: unitData.locataire?._id || unitData.locataire
        })
        
        // Vérifier si l'utilisateur est propriétaire ou locataire
        const userId = user?._id || user?.id
        const ownerId = unitData.proprietaire?._id || unitData.proprietaire?.toString()
        const tenantId = unitData.locataire?._id || unitData.locataire?.toString()
        const userIdStr = userId?.toString()
        
        const isOwner = userIdStr && ownerId && userIdStr === ownerId
        const isTenant = userIdStr && tenantId && userIdStr === tenantId
        
        console.log('[UNIT DETAIL] Vérification propriétaire/locataire:', { 
          userId: userIdStr, 
          ownerId, 
          tenantId, 
          isOwner, 
          isTenant,
          userRole: user?.role
        })
        
        setIsOwnerOrTenant(isOwner || isTenant || user?.role === 'admin')
        
        // Charger les données supplémentaires si l'utilisateur est propriétaire ou locataire
        if (isAuthenticated && (isOwner || isTenant || user?.role === 'admin')) {
          await Promise.all([
            loadRequests(),
            loadDocuments(),
            loadSimilarUnits(unitData)
          ])
        }
      } else {
        setError('Unité non trouvée')
        // Rediriger vers explorer après 3 secondes si l'unité n'existe pas
        setTimeout(() => {
          router.push('/explorer')
        }, 3000)
      }
    } catch (error: any) {
      console.error('[UNIT DETAIL] ❌ Erreur chargement unité:', error)
      console.error('[UNIT DETAIL] Détails erreur:', { 
        status: error.response?.status, 
        message: error.response?.data?.message,
        url: error.config?.url,
        isAuthenticated,
        hasToken: !!localStorage.getItem('authToken'),
        userRole: user?.role
      })
      
      // Gestion des erreurs avec messages appropriés
      if (error.response?.status === 404) {
        setError('Unité non trouvée. Elle a peut-être été supprimée ou déplacée.')
        // Rediriger vers explorer après 3 secondes
        setTimeout(() => {
          router.push('/explorer')
        }, 3000)
      } else if (error.response?.status === 401) {
        setError('Vous devez être connecté pour voir les détails de cette unité.')
        setTimeout(() => {
          router.push(`/login?redirect=/units/${unitId}`)
        }, 2000)
      } else {
        setError(error.response?.data?.message || 'Erreur lors du chargement de l\'unité. Veuillez réessayer.')
      }
      
      if (error.response?.status === 404) {
        const errorMessage = error.response?.data?.message || 'Unité non trouvée ou non disponible'
        
        // Si l'utilisateur est authentifié, réessayer avec la route authentifiée
        if (isAuthenticated) {
          console.log('[UNIT DETAIL] Réessai avec route authentifiée après 404')
          try {
            const retryResponse = await authenticatedAxios.get(`/units/${id}`)
            if (retryResponse.data.success) {
              console.log('[UNIT DETAIL] ✅ Réessai réussi avec route authentifiée')
              const unitData = retryResponse.data.data
              setUnit(unitData)
              
              const userId = user?._id || user?.id
              const ownerId = unitData.proprietaire?._id || unitData.proprietaire?.toString()
              const tenantId = unitData.locataire?._id || unitData.locataire?.toString()
              const userIdStr = userId?.toString()
              const isOwner = userIdStr && ownerId && userIdStr === ownerId
              const isTenant = userIdStr && tenantId && userIdStr === tenantId
              
              setIsOwnerOrTenant(isOwner || isTenant || user?.role === 'admin')
              setError('')
              
              // Charger les données supplémentaires
              if (isOwner || isTenant || user?.role === 'admin') {
                await Promise.all([
                  loadRequests(),
                  loadDocuments(),
                  loadSimilarUnits(unitData)
                ])
              }
              return
            }
          } catch (retryError: any) {
            console.error('[UNIT DETAIL] ❌ Réessai échoué:', retryError)
          }
        }
        
        setError(errorMessage)
      } else {
        setError('Erreur lors du chargement de l\'unité. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    if (!isAuthenticated || !unitId) return
    
    try {
      setLoadingRequests(true)
      const response = await authenticatedAxios.get(`/requests`, {
        params: { unit: unitId }
      })
      
      if (response.data.success) {
        setRequests(response.data.data || [])
      }
    } catch (error: any) {
      console.error('Erreur chargement demandes:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const loadDocuments = async () => {
    if (!isAuthenticated || !unitId) return
    
    try {
      setLoadingDocuments(true)
      // Charger les documents depuis les demandes acceptées liées à cette unité
      const response = await authenticatedAxios.get(`/requests`, {
        params: { unit: unitId, status: 'accepte' }
      })
      
      if (response.data.success) {
        const acceptedRequests = response.data.data || []
        const allDocuments: Document[] = []
        
        acceptedRequests.forEach((req: any) => {
          if (req.generatedDocuments && req.generatedDocuments.length > 0) {
            allDocuments.push(...req.generatedDocuments)
          }
        })
        
        setDocuments(allDocuments)
      }
    } catch (error: any) {
      console.error('Erreur chargement documents:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const loadSimilarUnits = async (currentUnit: Unit) => {
    if (!currentUnit) return
    
    try {
      const response = await publicAxios.get('/public/units', {
        params: {
          building: currentUnit.building._id,
          status: 'disponible',
          type: currentUnit.type
        }
      })
      
      if (response.data.success) {
        const units = response.data.data || []
        // Exclure l'unité actuelle et limiter à 4 unités similaires
        const similar = units
          .filter((u: Unit) => u._id !== currentUnit._id)
          .slice(0, 4)
        setSimilarUnits(similar)
      }
    } catch (error: any) {
      console.error('Erreur chargement unités similaires:', error)
    }
  }

  const handleRequest = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!unitId) {
      console.error('[UNIT DETAIL] ID manquant pour la demande')
      return
    }
    router.push(`/request?unitId=${unitId}`)
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'studio': 'Studio',
      '1br': '1 chambre',
      '2br': '2 chambres',
      '3br': '3 chambres',
      '4br': '4+ chambres',
      'penthouse': 'Penthouse',
      'commercial': 'Commercial'
    }
    return labels[type] || type
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'disponible': 'Disponible',
      'loue': 'Loué',
      'vendu': 'Vendu',
      'maintenance': 'En maintenance'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'disponible': 'bg-green-100 text-green-800',
      'loue': 'bg-blue-100 text-blue-800',
      'vendu': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getRequestStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'en_attente': 'bg-yellow-100 text-yellow-800',
      'accepte': 'bg-green-100 text-green-800',
      'refuse': 'bg-red-100 text-red-800',
      'termine': 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getRequestTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'location': 'Location',
      'achat': 'Achat',
      'maintenance': 'Maintenance',
      'service': 'Service',
      'reclamation': 'Réclamation'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des détails de l'unité...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !unit) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Unité non trouvée</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cette unité n\'existe pas ou n\'est plus disponible.'}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/explorer" className="btn-primary">
                  Voir toutes les unités
                </Link>
                <Link href="/" className="btn-secondary">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
          <div className="container mx-auto px-4">
            <Link href="/explorer" className="inline-flex items-center text-white hover:text-gray-200 mb-4 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour à l'explorateur
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Unité {unit.unitNumber}</h1>
            <p className="text-xl text-primary-100">{unit.building.name}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenu principal */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image/Vue */}
              <div className="card overflow-hidden">
                <div className="aspect-[4/3] relative bg-gray-200 rounded-lg overflow-hidden">
                  {(() => {
                    let imageSrc = getUnitImagePath(unit)
                    if (unit.images && unit.images.length > 0) {
                      const firstImage = unit.images[0]
                      if (firstImage.startsWith('/images/')) {
                        imageSrc = firstImage
                      } else if (firstImage.startsWith('http')) {
                        imageSrc = firstImage
                      } else {
                        imageSrc = `/images/unites/${firstImage}`
                      }
                    } else if (unit.imageUrl) {
                      if (unit.imageUrl.startsWith('/images/')) {
                        imageSrc = unit.imageUrl
                      } else if (unit.imageUrl.startsWith('http')) {
                        imageSrc = unit.imageUrl
                      } else {
                        imageSrc = `/images/unites/${unit.imageUrl}`
                      }
                    }
                    
                    return (
                      <OptimizedImage
                        src={imageSrc}
                        alt={`Unité ${unit.unitNumber} - ${unit.building.name}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          const fallback = '/images/default/placeholder.jpg'
                          console.warn(`[UNITS] ⚠️ Erreur chargement image: ${target.src}, utilisation fallback`)
                          if (!target.src.includes('placeholder.jpg')) {
                            target.src = fallback
                          }
                        }}
                      />
                    )
                  })()}
                </div>
              </div>

              {/* Description */}
              {unit.description && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Description</h2>
                  <p className="text-gray-700 leading-relaxed">{unit.description}</p>
                </div>
              )}

              {/* Caractéristiques */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-6">Caractéristiques</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Superficie</p>
                    <p className="text-xl font-bold">{unit.size || 'N/A'} m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Étage</p>
                    <p className="text-xl font-bold">{unit.floor || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Chambres</p>
                    <p className="text-xl font-bold">{unit.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Salles de bain</p>
                    <p className="text-xl font-bold">{unit.bathrooms}</p>
                  </div>
                </div>
              </div>

              {/* Carte Google Maps */}
              {unit.building?.address && (
                <div className="card p-6">
                  <GoogleMapCard
                    address={unit.building.address}
                    title="Localisation"
                    height="400px"
                  />
                </div>
              )}

              {/* Équipements */}
              {unit.features && unit.features.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Équipements inclus</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unit.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Demandes liées à l'unité */}
              {isAuthenticated && isOwnerOrTenant && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Demandes liées</h2>
                    {id && typeof id === 'string' ? (
                      <Link href={`/request?unitId=${id}`} className="btn-primary text-sm">
                        + Nouvelle demande
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn-primary text-sm opacity-50 cursor-not-allowed"
                        title="ID d'unité invalide"
                        onClick={() => console.warn('[UNIT_DETAIL] ⚠️ ID invalide pour nouvelle demande')}
                      >
                        + Nouvelle demande
                      </button>
                    )}
                  </div>
                  {loadingRequests ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className="text-gray-600 mt-2">Chargement des demandes...</p>
                    </div>
                  ) : requests.length > 0 ? (
                    <div className="space-y-4">
                      {requests.map((req) => (
                        req._id ? (
                          <Link
                            key={req._id}
                            href={user?.role === 'proprietaire' ? `/proprietaire/requests/${req._id}` : `/locataire/requests/${req._id}`}
                            className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{req.title}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRequestStatusColor(req.status)}`}>
                                    {req.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {getRequestTypeLabel(req.type)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(req.createdAt).toLocaleDateString('fr-CA')}
                                  </span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <div
                            key={req._id || Math.random()}
                            className="block bg-gray-50 rounded-lg p-4 opacity-50"
                          >
                            <p className="text-sm text-gray-500">Demande avec ID manquant</p>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Aucune demande liée à cette unité</p>
                      {id && typeof id === 'string' ? (
                        <Link href={`/request?unitId=${id}`} className="text-primary-600 hover:text-primary-700 font-semibold mt-2 inline-block">
                          Créer une demande
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="text-primary-600 hover:text-primary-700 font-semibold mt-2 inline-block opacity-50 cursor-not-allowed"
                          onClick={() => console.warn('[UNIT_DETAIL] ⚠️ ID invalide pour créer demande')}
                        >
                          Créer une demande
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Documents */}
              {isAuthenticated && isOwnerOrTenant && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Documents</h2>
                    <Link href={`/documents?unit=${id}`} className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      Voir tous →
                    </Link>
                  </div>
                  {loadingDocuments ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className="text-gray-600 mt-2">Chargement des documents...</p>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.slice(0, 5).map((doc, index) => (
                        <div key={doc._id || index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">📄</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{doc.filename}</p>
                              <p className="text-sm text-gray-600">
                                {doc.type === 'bail' ? 'Bail de location' : doc.type === 'contrat_vente' ? 'Contrat de vente' : 'Document'}
                                {doc.signed && (
                                  <span className="ml-2 text-green-600">✓ Signé</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`${API_URL.replace('/api', '')}/uploads/${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-sm"
                          >
                            Télécharger
                          </a>
                        </div>
                      ))}
                      {documents.length > 5 && (
                        <Link href={`/documents?unit=${id}`} className="block text-center text-primary-600 hover:text-primary-700 font-semibold mt-4">
                          Voir tous les documents ({documents.length})
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Aucun document disponible</p>
                    </div>
                  )}
                </div>
              )}

              {/* Services appliqués (exemple avec les demandes de type service) */}
              {isAuthenticated && isOwnerOrTenant && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-6">Services appliqués</h2>
                  <div className="space-y-4">
                    {requests.filter(req => req.type === 'service' || req.type === 'maintenance').length > 0 ? (
                      requests.filter(req => req.type === 'service' || req.type === 'maintenance').map((req) => (
                        <div key={req._id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{req.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${getRequestStatusColor(req.status)}`}>
                                {req.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Aucun service appliqué sur cette unité</p>
                        <Link href={`/request?unitId=${id}&type=service`} className="text-primary-600 hover:text-primary-700 font-semibold mt-2 inline-block">
                          Demander un service
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unités similaires */}
              {similarUnits.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-6">Unités similaires disponibles</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {similarUnits.map((similarUnit) => (
                      <Link
                        key={similarUnit._id}
                        href={`/units/${similarUnit._id}`}
                        className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="aspect-video relative bg-gray-200">
                          <Image
                            src={getUnitImagePath(similarUnit)}
                            alt={`Unité ${similarUnit.unitNumber}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg">Unité {similarUnit.unitNumber}</h3>
                          <p className="text-sm text-gray-600">{similarUnit.building.name}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-600">
                              {similarUnit.bedrooms} ch. • {similarUnit.size} m²
                            </span>
                            {similarUnit.rentPrice && (
                              <span className="font-bold text-primary-600">
                                ${similarUnit.rentPrice.toLocaleString()}/mois
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Informations sur l'immeuble */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-4">À propos de l'immeuble</h2>
                <div className="space-y-2">
                  <p className="text-gray-700"><strong>Nom:</strong> {unit.building.name}</p>
                  <p className="text-gray-700">
                    <strong>Adresse:</strong> {unit.building.address.street}, {unit.building.address.city}, {unit.building.address.province} {unit.building.address.postalCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Carte de résumé */}
              <div className="card p-6 sticky top-24">
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(unit.status)}`}>
                    {getStatusLabel(unit.status)}
                  </span>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Type</p>
                  <p className="text-xl font-bold">{getTypeLabel(unit.type)}</p>
                </div>

                {/* Prix */}
                {unit.rentPrice && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Prix de location</p>
                    <p className="text-3xl font-bold text-primary-600">${unit.rentPrice.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">par mois</p>
                  </div>
                )}

                {unit.salePrice && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Prix de vente</p>
                    <p className="text-3xl font-bold text-primary-600">${unit.salePrice.toLocaleString()}</p>
                  </div>
                )}

                {unit.monthlyCharges && unit.monthlyCharges > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Charges mensuelles</p>
                    <p className="text-xl font-semibold">${unit.monthlyCharges.toLocaleString()}</p>
                  </div>
                )}

                {unit.availableFrom && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-1">Disponible à partir de</p>
                    <p className="font-semibold">{new Date(unit.availableFrom).toLocaleDateString('fr-CA')}</p>
                  </div>
                )}

                {/* Propriétaire/Locataire (si affiché) */}
                {isOwnerOrTenant && unit.proprietaire && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Propriétaire</p>
                    <p className="font-semibold">{unit.proprietaire.firstName} {unit.proprietaire.lastName}</p>
                  </div>
                )}

                {isOwnerOrTenant && unit.locataire && (
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Locataire</p>
                    <p className="font-semibold">{unit.locataire.firstName} {unit.locataire.lastName}</p>
                  </div>
                )}

                {/* Boutons d'action */}
                {unit.status === 'disponible' && (
                  <div className="space-y-3">
                    <button
                      onClick={handleRequest}
                      disabled={requestLoading}
                      className="w-full btn-primary"
                    >
                      {requestLoading ? 'Chargement...' : 'Faire une demande'}
                    </button>
                    <Link href="/contact" className="block w-full btn-secondary text-center">
                      Nous contacter
                    </Link>
                  </div>
                )}

                {(unit.status !== 'disponible' && !isOwnerOrTenant) && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-2">Cette unité n'est pas disponible pour le moment</p>
                    <Link href="/explorer" className="text-primary-600 hover:text-primary-700 font-semibold">
                      Voir d'autres unités
                    </Link>
                  </div>
                )}

                {isOwnerOrTenant && (
                  <div className="space-y-3">
                    <Link href={`/documents?unit=${id}`} className="block w-full btn-secondary text-center">
                      📄 Voir les documents
                    </Link>
                    <Link href={`/request?unitId=${id}`} className="block w-full btn-secondary text-center">
                      + Nouvelle demande
                    </Link>
                    {user?.role === 'proprietaire' && unit.locataire && (
                      <Link 
                        href={`/messages?contact=${unit.locataire._id || unit.locataire}`}
                        className="block w-full btn-primary text-center"
                      >
                        💬 Contacter le locataire
                      </Link>
                    )}
                    {user?.role === 'locataire' && unit.proprietaire && (
                      <Link 
                        href={`/messages?contact=${unit.proprietaire._id || unit.proprietaire}`}
                        className="block w-full btn-primary text-center"
                      >
                        💬 Contacter le propriétaire
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Contact rapide */}
              <div className="card p-6 bg-primary-50">
                <h3 className="font-bold mb-3">Besoin d'aide ?</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Notre équipe est là pour répondre à toutes vos questions sur cette unité.
                </p>
                <Link href="/contact" className="block w-full btn-secondary text-center">
                  Contactez-nous
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
