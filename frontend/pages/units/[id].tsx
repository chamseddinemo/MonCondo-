import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { getUnitImagePath } from '../../utils/imageUtils'
import { publicAxios } from '../../utils/axiosInstances'

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
    firstName: string
    lastName: string
    email: string
  }
  locataire?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function UnitsDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user, isAuthenticated } = useAuth()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadUnit()
    }
  }, [id])

  const loadUnit = async () => {
    try {
      // Essayer d'abord avec la route publique
      const response = await publicAxios.get(`/public/units/${id}`)
      if (response.data.success) {
        setUnit(response.data.data)
      } else {
        setError('Unité non trouvée')
      }
    } catch (error: any) {
      console.error('Erreur chargement unité:', error)
      // Si erreur 404, l'unité n'existe pas ou n'est pas disponible
      if (error.response?.status === 404) {
        setError('Unité non trouvée ou non disponible')
      } else {
        setError('Erreur lors du chargement de l\'unité')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    router.push(`/request?unitId=${id}`)
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
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/images/default/placeholder.jpg'
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
                    <p className="text-xl font-bold">{unit.size || unit.surface || 'N/A'} m²</p>
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

                {unit.status !== 'disponible' && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-2">Cette unité n'est pas disponible pour le moment</p>
                    <Link href="/explorer" className="text-primary-600 hover:text-primary-700 font-semibold">
                      Voir d'autres unités
                    </Link>
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
