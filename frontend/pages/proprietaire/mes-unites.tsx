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
  images?: string[]
  imageUrl?: string
  building: {
    _id: string
    name: string
    address: {
      street: string
      city: string
      province: string
    }
  }
  locataire?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function MesUnites() {
  const { user } = useAuth()
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    building: ''
  })

  useEffect(() => {
    loadMyUnits()
  }, [])

  const loadMyUnits = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/proprietaire/my-units`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.data.success) {
        setUnits(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement mes unités:', error)
    } finally {
      setLoading(false)
    }
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

  const filteredUnits = units.filter(unit => {
    if (filters.status && unit.status !== filters.status) return false
    if (filters.building && unit.building._id !== filters.building) return false
    return true
  })

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Mes Unités</h1>
            <p className="text-xl text-primary-100">
              Gérez toutes vos unités en un seul endroit
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Filtres</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="disponible">Disponible</option>
                  <option value="loue">Loué</option>
                  <option value="vendu">Vendu</option>
                  <option value="maintenance">En maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immeuble
                </label>
                <select
                  value={filters.building}
                  onChange={(e) => setFilters({...filters, building: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les immeubles</option>
                  {Array.from(new Set(units.map(u => u.building._id))).map((buildingId) => {
                    const building = units.find(u => u.building._id === buildingId)?.building
                    return (
                      <option key={buildingId} value={buildingId}>
                        {building?.name}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Résumé */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-primary-600">{units.length}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">
                {units.filter(u => u.status === 'disponible').length}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Louées</p>
              <p className="text-2xl font-bold text-blue-600">
                {units.filter(u => u.status === 'loue').length}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">En maintenance</p>
              <p className="text-2xl font-bold text-orange-600">
                {units.filter(u => u.status === 'maintenance').length}
              </p>
            </div>
          </div>

          {/* Liste des unités */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredUnits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUnits.map((unit) => (
                <div key={unit._id} className="card hover:shadow-xl transition-shadow overflow-hidden">
                  {/* Image de l'unité */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                    {(() => {
                      // Déterminer le chemin de l'image
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
                        <Image
                          src={imageSrc}
                          alt={`Unité ${unit.unitNumber} - ${unit.building.name}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/images/default/placeholder.jpg'
                          }}
                        />
                      )
                    })()}
                    {/* Badge de statut sur l'image */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-90 ${getStatusColor(unit.status)}`}>
                        {getStatusLabel(unit.status)}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Unité {unit.unitNumber}
                      </h3>
                      <p className="text-gray-600">{unit.building.name}</p>
                      <p className="text-sm text-gray-500">
                        {unit.building.address.city}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold">{getTypeLabel(unit.type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Étage</p>
                        <p className="font-semibold">{unit.floor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Superficie</p>
                        <p className="font-semibold">{unit.size} m²</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Chambres</p>
                        <p className="font-semibold">{unit.bedrooms}</p>
                      </div>
                    </div>

                    {unit.rentPrice && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Loyer mensuel</p>
                        <p className="text-xl font-bold text-primary-600">
                          ${unit.rentPrice.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {unit.locataire && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Locataire actuel</p>
                        <p className="font-semibold">
                          {unit.locataire.firstName} {unit.locataire.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{unit.locataire.email}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/units/${unit._id}`}
                        className="flex-1 btn-secondary text-center"
                      >
                        Voir détails
                      </Link>
                      {unit.status === 'disponible' && (
                        <button className="btn-primary">
                          Gérer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-2xl font-bold mb-2">Aucune unité</h3>
              <p className="text-gray-600 mb-6">
                {units.length === 0
                  ? "Vous n'avez pas encore d'unités assignées."
                  : "Aucune unité ne correspond à vos critères de recherche."}
              </p>
              {units.length === 0 && (
                <Link href="/contact" className="btn-primary">
                  Contacter l'administration
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}



