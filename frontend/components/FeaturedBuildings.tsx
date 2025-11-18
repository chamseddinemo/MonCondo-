'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { publicAxios } from '../utils/axiosInstances'
import { useRouter } from 'next/router'

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
  image?: string
  totalUnits: number
  availableUnits: number
  yearBuilt?: number
}

export default function FeaturedBuildings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const response = await publicAxios.get('/public/buildings')
        if (response.data.success) {
          // Prendre les 6 premiers immeubles pour l'affichage
          setBuildings((response.data.data || []).slice(0, 6))
        }
      } catch (error) {
        console.error('Erreur chargement immeubles:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBuildings()
  }, [])

  // Fonction pour obtenir le chemin de l'image
  const getImagePath = (building: Building) => {
    if (building.image) {
      // Si c'est un chemin local, le retourner tel quel
      if (building.image.startsWith('/images/')) {
        return building.image
      }
      // Sinon, construire le chemin
      return `/images/immeubles/${building.image}`
    }
    if (building.imageUrl) {
      if (building.imageUrl.startsWith('http')) {
        return building.imageUrl
      }
      if (building.imageUrl.startsWith('/images/')) {
        return building.imageUrl
      }
      return `/images/immeubles/${building.imageUrl}`
    }
    // Fallback vers une image par défaut
    return '/images/default/placeholder.jpg'
  }

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Chargement des immeubles...</p>
          </div>
        </div>
      </section>
    )
  }

  if (buildings.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🏢 Nos Immeubles
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Découvrez notre sélection d'immeubles résidentiels modernes
          </p>
          <Link 
            href="/explorer"
            className="inline-block btn-primary text-lg px-8 py-3"
          >
            Voir tous les immeubles
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {buildings.map((building) => (
            <div
              key={building._id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
              onClick={() => router.push('/explorer')}
            >
              {/* Image */}
              <div className="relative h-64 bg-gradient-to-br from-primary-400 to-primary-600">
                <Image
                  src={getImagePath(building)}
                  alt={building.name.replace('[EXEMPLE]', '').trim()}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    // Fallback si l'image ne charge pas
                    const target = e.target as HTMLImageElement
                    target.src = '/images/default/placeholder.jpg'
                  }}
                />
                {building.name.includes('[EXEMPLE]') && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Exemple
                  </div>
                )}
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
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
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
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/explorer')
                  }}
                  className="w-full mt-4 btn-primary"
                >
                  Voir les unités
                </button>
              </div>
            </div>
          ))}
        </div>

        {buildings.length >= 6 && (
          <div className="text-center mt-12">
            <Link 
              href="/explorer"
              className="inline-block btn-secondary text-lg px-8 py-3"
            >
              Voir tous les immeubles ({buildings.length}+)
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

