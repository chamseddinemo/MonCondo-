'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { publicAxios } from '../utils/axiosInstances'
import { useRouter } from 'next/router'

interface Unit {
  _id: string
  unitNumber: string
  type: string
  surface: number
  bedrooms: number
  rentPrice?: number
  salePrice?: number
  status: string
  images?: string[]
  imageUrl?: string
  building?: {
    _id: string
    name: string
  }
}

export default function FeaturedUnits() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const response = await publicAxios.get('/public/units')
        if (response.data.success) {
          // Prendre les 6 premières unités disponibles pour l'affichage
          const availableUnits = (response.data.data || [])
            .filter((u: Unit) => u.status === 'disponible' || u.status === 'Disponible')
            .slice(0, 6)
          setUnits(availableUnits)
        }
      } catch (error) {
        console.error('Erreur chargement unités:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUnits()
  }, [])

  // Fonction pour obtenir le chemin de l'image
  const getImagePath = (unit: Unit) => {
    if (unit.images && unit.images.length > 0) {
      const firstImage = unit.images[0]
      // Si c'est un chemin local, le retourner tel quel
      if (firstImage.startsWith('/images/')) {
        return firstImage
      }
      // Si c'est une URL externe, la retourner
      if (firstImage.startsWith('http')) {
        return firstImage
      }
      // Sinon, construire le chemin
      return `/images/unites/${firstImage}`
    }
    if (unit.imageUrl) {
      if (unit.imageUrl.startsWith('http')) {
        return unit.imageUrl
      }
      if (unit.imageUrl.startsWith('/images/')) {
        return unit.imageUrl
      }
      return `/images/unites/${unit.imageUrl}`
    }
    // Fallback vers une image par défaut
    return '/images/default/placeholder.jpg'
  }

  // Formater le prix
  const formatPrice = (unit: Unit) => {
    if (unit.rentPrice && unit.rentPrice > 0) {
      return `$${unit.rentPrice.toLocaleString()}/mois`
    }
    if (unit.salePrice && unit.salePrice > 0) {
      return `$${unit.salePrice.toLocaleString()}`
    }
    return 'Prix sur demande'
  }

  // Obtenir le type de transaction
  const getTransactionType = (unit: Unit) => {
    if (unit.rentPrice && unit.rentPrice > 0) {
      return 'À louer'
    }
    if (unit.salePrice && unit.salePrice > 0) {
      return 'À vendre'
    }
    return 'Disponible'
  }

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Chargement des unités...</p>
          </div>
        </div>
      </section>
    )
  }

  if (units.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🏠 Unités Disponibles
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Découvrez notre sélection d'unités à louer et à vendre
          </p>
          <Link 
            href="/explorer"
            className="inline-block btn-primary text-lg px-8 py-3"
          >
            Voir toutes les unités
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {units.map((unit) => (
            <div
              key={unit._id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
              onClick={() => router.push('/explorer')}
            >
              {/* Image */}
              <div className="relative h-64 bg-gradient-to-br from-primary-400 to-primary-600">
                <Image
                  src={getImagePath(unit)}
                  alt={`Unité ${unit.unitNumber}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    // Fallback si l'image ne charge pas
                    const target = e.target as HTMLImageElement
                    target.src = '/images/default/placeholder.jpg'
                  }}
                />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${
                  getTransactionType(unit) === 'À louer' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {getTransactionType(unit)}
                </div>
                <div className="absolute top-4 left-4 bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                  Disponible
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Unité {unit.unitNumber}
                </h3>
                {unit.building && (
                  <p className="text-sm text-gray-600 mb-3">
                    📍 {unit.building.name}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Surface</p>
                    <p className="text-lg font-semibold text-gray-900">{unit.surface} m²</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Chambres</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {unit.bedrooms || unit.type?.replace('br', '') || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Prix</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {formatPrice(unit)}
                  </p>
                </div>

                {/* Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/explorer')
                  }}
                  className="w-full mt-4 btn-primary"
                >
                  En savoir plus
                </button>
              </div>
            </div>
          ))}
        </div>

        {units.length >= 6 && (
          <div className="text-center mt-12">
            <Link 
              href="/explorer"
              className="inline-block btn-secondary text-lg px-8 py-3"
            >
              Voir toutes les unités ({units.length}+)
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

