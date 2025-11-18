'use client'

import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { publicAxios } from '../utils/axiosInstances'
import { useSocket } from '../contexts/SocketContext'

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
    imageUrl?: string
  }
}

export default function Explorer() {
  const { socket, isConnected } = useSocket()
  const [activeTab, setActiveTab] = useState<'buildings' | 'units'>('buildings')
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [cityFilter, setCityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'rent' | 'sale'>('all')
  const [bedroomsFilter, setBedroomsFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // Charger les immeubles
  const loadBuildings = async () => {
    try {
      setError(null)
      const response = await publicAxios.get('/public/buildings')
      if (response.data.success) {
        setBuildings(response.data.data || [])
      } else {
        setError('Erreur lors du chargement des immeubles')
      }
    } catch (err: any) {
      console.error('Erreur chargement immeubles:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des immeubles'
      setError(errorMessage)
    }
  }

  // Charger les unités
  const loadUnits = async () => {
    try {
      setError(null)
      let url = '/public/units'
      const params: any = {}

      if (typeFilter === 'rent') {
        url = '/public/units/rent'
      } else if (typeFilter === 'sale') {
        url = '/public/units/sale'
      }

      if (cityFilter) params.city = cityFilter
      if (bedroomsFilter) params.bedrooms = bedroomsFilter
      if (minPrice) params.minPrice = minPrice
      if (maxPrice) params.maxPrice = maxPrice

      const response = await publicAxios.get(url, { params })
      if (response.data.success) {
        setUnits(response.data.data || [])
      } else {
        setError('Erreur lors du chargement des unités')
      }
    } catch (err: any) {
      console.error('Erreur chargement unités:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des unités'
      setError(errorMessage)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadBuildings(), loadUnits()])
      } catch (err) {
        console.error('Erreur lors du chargement initial:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Recharger les unités quand les filtres changent
  useEffect(() => {
    if (!loading && buildings.length >= 0) {
      loadUnits()
    }
  }, [cityFilter, typeFilter, bedroomsFilter, minPrice, maxPrice])

  // Synchronisation en temps réel (optionnelle, si Socket.io est disponible)
  useEffect(() => {
    if (!socket || !isConnected) {
      return
    }

    console.log('[Explorer] 🔌 Socket connecté, écoute des événements...')

    const handleBuildingUpdated = () => {
      console.log('[Explorer] 📡 Événement building:updated reçu')
      loadBuildings()
    }

    const handleBuildingCreated = () => {
      console.log('[Explorer] 📡 Événement building:created reçu')
      loadBuildings()
    }

    const handleUnitUpdated = () => {
      console.log('[Explorer] 📡 Événement unit:updated reçu')
      loadUnits()
    }

    const handleUnitCreated = () => {
      console.log('[Explorer] 📡 Événement unit:created reçu')
      loadUnits()
    }

    socket.on('building:updated', handleBuildingUpdated)
    socket.on('building:created', handleBuildingCreated)
    socket.on('unit:updated', handleUnitUpdated)
    socket.on('unit:created', handleUnitCreated)

    return () => {
      socket.off('building:updated', handleBuildingUpdated)
      socket.off('building:created', handleBuildingCreated)
      socket.off('unit:updated', handleUnitUpdated)
      socket.off('unit:created', handleUnitCreated)
    }
  }, [socket, isConnected])

  // Filtrer les unités par type
  const filteredUnits = useMemo(() => {
    let filtered = units

    // Séparer par type de transaction
    if (typeFilter === 'rent') {
      filtered = filtered.filter(u => u.rentPrice && u.rentPrice > 0)
    } else if (typeFilter === 'sale') {
      filtered = filtered.filter(u => u.salePrice && u.salePrice > 0)
    }

    return filtered
  }, [units, typeFilter])

  // Unités à louer
  const rentUnits = useMemo(() => {
    return filteredUnits.filter(u => u.rentPrice && u.rentPrice > 0)
  }, [filteredUnits])

  // Unités à vendre
  const saleUnits = useMemo(() => {
    return filteredUnits.filter(u => u.salePrice && u.salePrice > 0)
  }, [filteredUnits])

  // Villes uniques pour le filtre
  const cities = useMemo(() => {
    const citySet = new Set<string>()
    buildings.forEach(b => {
      if (b.address?.city) citySet.add(b.address.city)
    })
    units.forEach(u => {
      if (u.building?.address?.city) citySet.add(u.building.address.city)
    })
    return Array.from(citySet).sort()
  }, [buildings, units])

  // Scroll vers une section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <Head>
        <title>Explorer - Immeubles et Unités | MonCondo+</title>
        <meta name="description" content="Découvrez nos immeubles et unités disponibles à louer ou à vendre" />
      </Head>

      <Header />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🏢 Explorer nos Immeubles & Unités
            </h1>
            <p className="text-xl text-primary-100">
              Découvrez notre sélection d'immeubles et d'unités disponibles
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex space-x-4 border-b border-gray-200 mb-8">
            <button
              onClick={() => {
                setActiveTab('buildings')
                scrollToSection('buildings-section')
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'buildings'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              🏢 Immeubles
            </button>
            <button
              onClick={() => {
                setActiveTab('units')
                scrollToSection('units-section')
              }}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'units'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              🏠 Unités
            </button>
          </div>

          {/* Section Immeubles */}
          <section id="buildings-section" className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Nos Immeubles</h2>
              <span className="text-gray-600">{buildings.length} immeuble{buildings.length > 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-600">Chargement des immeubles...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : buildings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Aucun immeuble disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildings.map((building) => (
                  <div
                    key={building._id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600">
                      {(() => {
                        // Déterminer le chemin de l'image
                        let imageSrc = building.imageUrl
                        if (building.image) {
                          if (building.image.startsWith('/images/')) {
                            imageSrc = building.image
                          } else {
                            imageSrc = `/images/immeubles/${building.image}`
                          }
                        }
                        
                        if (imageSrc) {
                          return (
                            <Image
                              src={imageSrc}
                              alt={building.name.replace('[EXEMPLE]', '').trim()}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/default/placeholder.jpg'
                              }}
                            />
                          )
                        }
                        return (
                          <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                            🏢
                          </div>
                        )
                      })()}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {building.name.replace('[EXEMPLE]', '').trim()}
                        </h3>
                        {building.name.includes('[EXEMPLE]') && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                            Exemple
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600 mb-4 space-y-1">
                        <p className="flex items-center">
                          <span className="mr-2">📍</span>
                          {building.address?.street || 'Adresse non renseignée'}
                        </p>
                        <p className="flex items-center">
                          <span className="mr-2">🏙️</span>
                          {building.address?.city || 'Ville non renseignée'}
                          {building.address?.province && `, ${building.address.province}`}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200">
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
                        onClick={() => {
                          setActiveTab('units')
                          scrollToSection('units-section')
                        }}
                        className="w-full btn-primary"
                      >
                        Voir les unités de cet immeuble
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section Unités */}
          <section id="units-section" className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Unités Disponibles</h2>
              <span className="text-gray-600">{filteredUnits.length} unité{filteredUnits.length > 1 ? 's' : ''}</span>
            </div>

            {/* Filtres */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">🔍 Filtres</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Toutes les villes</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'all' | 'rent' | 'sale')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Tous</option>
                    <option value="rent">À louer</option>
                    <option value="sale">À vendre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chambres</label>
                  <select
                    value={bedroomsFilter}
                    onChange={(e) => setBedroomsFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Toutes</option>
                    <option value="1">1 chambre</option>
                    <option value="2">2 chambres</option>
                    <option value="3">3 chambres</option>
                    <option value="4">4+ chambres</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix min</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix max</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="1000000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-600">Chargement des unités...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : (
              <>
                {/* Unités à louer */}
                {typeFilter !== 'sale' && rentUnits.length > 0 && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="mr-2">🔑</span>
                      À Louer ({rentUnits.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rentUnits.map((unit) => (
                        <div
                          key={unit._id}
                          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                        >
                          <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600">
                            {(() => {
                              // Déterminer le chemin de l'image
                              let imageSrc = unit.imageUrl
                              if (unit.images && unit.images.length > 0) {
                                const firstImage = unit.images[0]
                                if (firstImage.startsWith('/images/')) {
                                  imageSrc = firstImage
                                } else if (firstImage.startsWith('http')) {
                                  imageSrc = firstImage
                                } else {
                                  imageSrc = `/images/unites/${firstImage}`
                                }
                              }
                              
                              if (imageSrc) {
                                return (
                                  <Image
                                    src={imageSrc}
                                    alt={`Unité ${unit.unitNumber}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = '/images/default/placeholder.jpg'
                                    }}
                                  />
                                )
                              }
                              return (
                                <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                                  🏠
                                </div>
                              )
                            })()}
                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Disponible
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-lg font-bold text-gray-900">Unité {unit.unitNumber}</h4>
                              <span className="text-sm text-gray-500">{unit.type}</span>
                            </div>
                            
                            <p className="text-gray-600 mb-4">
                              📍 {unit.building?.name || 'Immeuble'} - {unit.building?.address?.city || 'N/A'}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-gray-500">Surface:</span>
                                <span className="font-semibold ml-2">{unit.size} m²</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Chambres:</span>
                                <span className="font-semibold ml-2">{unit.bedrooms}</span>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-2xl font-bold text-primary-600">
                                ${unit.rentPrice?.toLocaleString() || 'N/A'}/mois
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/units/${unit._id}`}
                                className="flex-1 btn-secondary text-center"
                              >
                                En savoir plus
                              </Link>
                              <Link
                                href={`/request?unit=${unit._id}`}
                                className="flex-1 btn-primary text-center"
                              >
                                Faire une demande
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unités à vendre */}
                {typeFilter !== 'rent' && saleUnits.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <span className="mr-2">💰</span>
                      À Vendre ({saleUnits.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {saleUnits.map((unit) => (
                        <div
                          key={unit._id}
                          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                        >
                          <div className="relative h-48 bg-gradient-to-br from-purple-400 to-purple-600">
                            {(() => {
                              // Déterminer le chemin de l'image
                              let imageSrc = unit.imageUrl
                              if (unit.images && unit.images.length > 0) {
                                const firstImage = unit.images[0]
                                if (firstImage.startsWith('/images/')) {
                                  imageSrc = firstImage
                                } else if (firstImage.startsWith('http')) {
                                  imageSrc = firstImage
                                } else {
                                  imageSrc = `/images/unites/${firstImage}`
                                }
                              }
                              
                              if (imageSrc) {
                                return (
                                  <Image
                                    src={imageSrc}
                                    alt={`Unité ${unit.unitNumber}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = '/images/default/placeholder.jpg'
                                    }}
                                  />
                                )
                              }
                              return (
                                <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                                  🏠
                                </div>
                              )
                            })()}
                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Disponible
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-lg font-bold text-gray-900">Unité {unit.unitNumber}</h4>
                              <span className="text-sm text-gray-500">{unit.type}</span>
                            </div>
                            
                            <p className="text-gray-600 mb-4">
                              📍 {unit.building?.name || 'Immeuble'} - {unit.building?.address?.city || 'N/A'}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-gray-500">Surface:</span>
                                <span className="font-semibold ml-2">{unit.size} m²</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Chambres:</span>
                                <span className="font-semibold ml-2">{unit.bedrooms}</span>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-2xl font-bold text-primary-600">
                                ${unit.salePrice?.toLocaleString() || 'N/A'}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/units/${unit._id}`}
                                className="flex-1 btn-secondary text-center"
                              >
                                En savoir plus
                              </Link>
                              <Link
                                href={`/request?unit=${unit._id}`}
                                className="flex-1 btn-primary text-center"
                              >
                                Faire une demande
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredUnits.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Aucune unité disponible avec ces critères.</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </>
  )
}

