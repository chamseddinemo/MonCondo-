import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { authenticatedAxios } from '../../utils/axiosInstances'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { getBuildingImagePath, getUnitImagePath } from '../../utils/imageUtils'
import { getAllBuildings, getAllUnits, type Building, type Unit } from '../../services/realEstateService'

interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province: string
    postalCode: string
    country?: string
  }
  totalUnits: number
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

interface Unit {
  _id: string
  unitNumber: string
  type: string
  status: string
  rentPrice?: number
  salePrice?: number
}

export default function BuildingDetail() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [building, setBuilding] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      loadBuilding()
      loadUnits()
    }
  }, [id])

  const loadBuilding = async () => {
    try {
      // Utiliser le service centralisé pour récupérer tous les immeubles
      const buildings = await getAllBuildings()
      const foundBuilding = buildings.find((b: Building) => b._id === id)
      
      if (foundBuilding) {
        setBuilding(foundBuilding)
        setError('')
      } else {
        // Fallback : essayer directement avec axios si le service ne trouve pas
        try {
          const response = await authenticatedAxios.get(`/buildings/${id}`)
          if (response.data && response.data.success) {
            setBuilding(response.data.data)
            setError('')
          } else {
            setError('Immeuble non trouvé')
          }
        } catch (fallbackError: any) {
          setError('Immeuble non trouvé')
        }
      }
    } catch (error: any) {
      console.error('Erreur chargement immeuble:', error)
      setError(error.response?.data?.message || error.message || 'Erreur lors du chargement de l\'immeuble')
    } finally {
      setLoading(false)
    }
  }

  const loadUnits = async () => {
    try {
      // Utiliser le service centralisé pour récupérer les unités
      const allUnits = await getAllUnits({ building: id as string })
      setUnits(allUnits)
    } catch (error: any) {
      console.error('Erreur chargement unités:', error)
      // Ne pas afficher d'erreur si c'est juste un problème de récupération
      setUnits([])
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des détails de l'immeuble...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  if (error || !building) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Immeuble non trouvé</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cet immeuble n\'existe pas.'}</p>
              <Link href="/admin/units" className="btn-primary">
                Retour à la liste des immeubles
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  const formatAddress = () => {
    const addr = building.address
    return `${addr.street}, ${addr.city}, ${addr.province} ${addr.postalCode}`
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link href="/admin/units" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
              ← Retour à la liste des immeubles
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{building.name}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    building.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {building.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
                  <Link href={`/admin/units?building=${building._id}`} className="btn-primary">
                ✏️ Modifier
              </Link>
            </div>
          </div>

          {/* Image principale de l'immeuble */}
          <div className="mb-8">
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-gray-200 shadow-lg">
              <Image
                src={getBuildingImagePath(building)}
                alt={building.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/images/default/placeholder.jpg'
                }}
              />
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${building.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {building.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations de l'immeuble */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-4">Informations de l'immeuble</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <p className="text-gray-900">{building.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <p className="text-gray-900">
                      <span className="font-semibold">📍</span> {formatAddress()}
                    </p>
                  </div>
                  {building.yearBuilt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Année de construction</label>
                      <p className="text-gray-900">
                        <span className="font-semibold">📅</span> {building.yearBuilt}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'unités</label>
                    <p className="text-gray-900">
                      <span className="font-semibold">🏠</span> {building.totalUnits || 0} unités
                    </p>
                  </div>
                  {building.admin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Administrateur assigné</label>
                      <p className="text-gray-900">
                        {building.admin.firstName} {building.admin.lastName}
                        <span className="text-gray-500 ml-2">({building.admin.email})</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                    <p className="text-gray-900">{new Date(building.createdAt).toLocaleDateString('fr-CA')}</p>
                  </div>
                </div>
              </div>

              {/* Liste des unités */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Unités de l'immeuble</h2>
                  <Link href={`/units?building=${building._id}`} className="btn-secondary text-sm">
                    Voir toutes les unités →
                  </Link>
                </div>
                {units.length > 0 ? (
                  <div className="space-y-3">
                    {units.map((unit: any) => (
                      <div key={unit._id} className="bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-all hover:shadow-md">
                        <div className="flex gap-4">
                          {/* Miniature de l'unité */}
                          <div className="relative w-24 h-24 flex-shrink-0 bg-gray-200 overflow-hidden rounded-lg">
                            <Image
                              src={getUnitImagePath(unit as any)}
                              alt={`Unité ${unit.unitNumber}`}
                              fill
                              className="object-cover"
                              sizes="96px"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/default/placeholder.jpg'
                              }}
                            />
                          </div>
                          
                          <div className="flex-1 flex items-center justify-between p-4">
                            <div>
                              <h3 className="font-semibold">Unité {unit.unitNumber}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span>Type: {unit.type}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  unit.status === 'disponible' ? 'bg-green-100 text-green-800' :
                                  unit.status === 'loue' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {unit.status === 'disponible' ? 'Disponible' :
                                   unit.status === 'loue' ? 'Loué' : unit.status}
                                </span>
                                {unit.rentPrice && (
                                  <span>Prix: ${unit.rentPrice.toLocaleString()}/mois</span>
                                )}
                              </div>
                            </div>
                            <Link href={`/units/${unit._id}`} className="btn-secondary text-sm">
                              Voir détails
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune unité dans cet immeuble</p>
                    <Link href={`/units?building=${building._id}&action=add`} className="btn-primary mt-4 inline-block">
                      ➕ Ajouter une unité
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions rapides */}
              <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
                <div className="space-y-2">
                  <Link href={`/admin/units?building=${building._id}`} className="btn-primary w-full text-center block">
                    🏢 Voir dans la gestion des unités
                  </Link>
                  <Link href={`/units?building=${building._id}&action=add`} className="btn-secondary w-full text-center block">
                    ➕ Ajouter une unité
                  </Link>
                  <Link href={`/units?building=${building._id}`} className="btn-secondary w-full text-center block">
                    🏠 Gérer les unités
                  </Link>
                </div>
              </div>

              {/* Statistiques */}
              <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">Statistiques</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total unités</span>
                    <span className="font-bold">{units.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disponibles</span>
                    <span className="font-bold text-green-600">
                      {units.filter(u => u.status === 'disponible').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Louées</span>
                    <span className="font-bold text-blue-600">
                      {units.filter(u => u.status === 'loue').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

