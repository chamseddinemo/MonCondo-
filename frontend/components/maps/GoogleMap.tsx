'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../../contexts/AuthContext'
import BuildingInfoWindow from './BuildingInfoWindow'
import { Building } from '../../services/realEstateService'
import { geocodeAddress } from '../../utils/geocoding'

// Types pour les bibliothèques Google Maps
const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'geometry']

interface GoogleMapProps {
  buildings: Building[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onBuildingClick?: (building: Building) => void
  selectedBuildingId?: string
  showFilters?: boolean
  filters?: {
    status?: string
    city?: string
    minPrice?: number
    maxPrice?: number
  }
  enableDirections?: boolean
  enableClustering?: boolean
}

// Styles de carte personnalisés
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  }
]

// Configuration par défaut
const defaultCenter = { lat: 45.5017, lng: -73.5673 } // Montréal
const defaultZoom = 12

export default function GoogleMapComponent({
  buildings,
  center = defaultCenter,
  zoom = defaultZoom,
  height = '600px',
  onBuildingClick,
  selectedBuildingId,
  showFilters = false,
  filters = {},
  enableDirections = true,
  enableClustering = true
}: GoogleMapProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const [showDirections, setShowDirections] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)

  // Clé API Google Maps depuis les variables d'environnement
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Filtrer les immeubles selon les filtres
  const filteredBuildings = useMemo(() => {
    let filtered = buildings

    if (filters.status) {
      if (filters.status === 'available') {
        filtered = filtered.filter(b => (b.totalUnits || 0) - (b.availableUnits || 0) < (b.totalUnits || 0))
      } else if (filters.status === 'full') {
        filtered = filtered.filter(b => (b.availableUnits || 0) === 0)
      }
    }

    if (filters.city) {
      filtered = filtered.filter(b => 
        b.address?.city?.toLowerCase().includes(filters.city!.toLowerCase())
      )
    }

    return filtered
  }, [buildings, filters])

  // Cache des coordonnées géocodées
  const [coordinatesCache, setCoordinatesCache] = useState<Map<string, { lat: number; lng: number }>>(new Map())

  // Obtenir les coordonnées d'un immeuble
  const getBuildingCoordinates = useCallback((building: Building): { lat: number; lng: number } | null => {
    if (!building.address) return null

    const addressKey = `${building.address.street}, ${building.address.city}, ${building.address.province || ''} ${building.address.postalCode || ''}`
    
    // Si on a déjà des coordonnées en cache, les utiliser
    if (coordinatesCache.has(addressKey)) {
      return coordinatesCache.get(addressKey) || null
    }

    // Si on a des coordonnées dans l'objet building
    if ((building as any).coordinates) {
      return (building as any).coordinates
    }

    return null
  }, [coordinatesCache])

  // Charger les coordonnées de tous les immeubles (seulement quand l'API est chargée)
  useEffect(() => {
    if (!isGoogleMapsLoaded) return

    const loadCoordinates = async () => {
      // Vérifier que l'API est bien chargée et que Geocoder est disponible
      if (!window.google || !window.google.maps || typeof window.google.maps.Geocoder !== 'function') {
        console.warn('Google Maps API ou Geocoder non disponible')
        return
      }

      const newCache = new Map(coordinatesCache)

      for (const building of filteredBuildings) {
        if (!building.address) continue

        const addressKey = `${building.address.street}, ${building.address.city}, ${building.address.province || ''} ${building.address.postalCode || ''}`
        
        // Si déjà en cache, passer au suivant
        if (newCache.has(addressKey)) continue

        // Si déjà dans l'objet building
        if ((building as any).coordinates) {
          newCache.set(addressKey, (building as any).coordinates)
          continue
        }

        // Géocoder via l'utilitaire importé
        const coords = await geocodeAddress(building.address)
        if (coords) {
          newCache.set(addressKey, coords)
          // Délai pour éviter de dépasser les limites de l'API
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (newCache.size > coordinatesCache.size) {
        setCoordinatesCache(newCache)
      }
    }

    if (filteredBuildings.length > 0) {
      loadCoordinates()
    }
  }, [filteredBuildings, coordinatesCache, isGoogleMapsLoaded])

  // Callback quand l'API Google Maps est chargée
  const handleLoadScript = useCallback(() => {
    // Vérifier que l'API est bien chargée
    if (window.google && window.google.maps && typeof window.google.maps.Geocoder === 'function') {
      setIsGoogleMapsLoaded(true)
    }
  }, [])

  // Callback en cas d'erreur de chargement
  const handleLoadError = useCallback((error: Error) => {
    console.error('Erreur de chargement Google Maps:', error)
    setIsGoogleMapsLoaded(false)
  }, [])

  // Obtenir la position de l'utilisateur
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Erreur géolocalisation:', error)
        }
      )
    }
  }, [])

  // Calculer l'itinéraire
  const calculateRoute = useCallback(async (destination: { lat: number; lng: number }) => {
    if (!userLocation || !directionsService || !directionsRenderer || !map) return

    directionsService.route(
      {
        origin: userLocation,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result)
          setShowDirections(true)
        } else {
          console.error('Erreur calcul itinéraire:', status)
        }
      }
    )
  }, [userLocation, directionsService, directionsRenderer, map])

  // Gérer le clic sur un marqueur
  const handleMarkerClick = useCallback((building: Building) => {
    setSelectedBuilding(building)
    if (onBuildingClick) {
      onBuildingClick(building)
    }
  }, [onBuildingClick])

  // Fermer l'info-bulle
  const handleCloseInfoWindow = useCallback(() => {
    setSelectedBuilding(null)
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] })
      setShowDirections(false)
    }
  }, [directionsRenderer])

  // Initialiser les services d'itinéraire
  useEffect(() => {
    if (map && window.google && window.google.maps) {
      const service = new window.google.maps.DirectionsService()
      const renderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true
      })
      setDirectionsService(service)
      setDirectionsRenderer(renderer)
    }
  }, [map])

  // Centrer la carte sur l'immeuble sélectionné
  useEffect(() => {
    if (selectedBuildingId && map) {
      const building = buildings.find(b => b._id === selectedBuildingId)
      if (building) {
        const coords = getBuildingCoordinates(building)
        if (coords) {
          map.setCenter(coords)
          map.setZoom(15)
        }
      }
    }
  }, [selectedBuildingId, buildings, map, getBuildingCoordinates])

  // Obtenir l'icône du marqueur selon le statut
  const getMarkerIcon = useCallback((building: Building): string => {
    const availableUnits = building.availableUnits || 0
    const totalUnits = building.totalUnits || 0
    
    if (availableUnits === 0) {
      // Rouge - Complet
      return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    } else if (availableUnits < totalUnits / 2) {
      // Orange - Peu de disponibilités
      return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png'
    } else {
      // Vert - Disponible
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    }
  }, [])

  // Si pas de clé API, afficher un message informatif avec instructions
  if (!googleMapsApiKey || googleMapsApiKey === 'votre_cle_api_google_maps_ici' || googleMapsApiKey.trim() === '') {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-dashed border-gray-300">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">Carte Google Maps</h3>
          <p className="text-gray-600 mb-4">
            Pour afficher la carte interactive, configurez votre clé API Google Maps.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">📋 Instructions rapides :</p>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>
                <strong>Obtenez une clé API gratuite</strong> sur{' '}
                <a 
                  href="https://console.cloud.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Google Cloud Console
                </a>
                {' '}($200 de crédit gratuit/mois)
              </li>
              <li>
                Créez ou éditez le fichier <code className="bg-blue-100 px-1 rounded text-xs">frontend/.env.local</code>
              </li>
              <li>
                Ajoutez : <code className="bg-blue-100 px-1 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle</code>
              </li>
              <li>Redémarrez le serveur Next.js</li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left mb-4">
            <p className="text-xs text-yellow-800">
              <strong>💡 Guide détaillé :</strong> Consultez{' '}
              <code className="bg-yellow-100 px-1 rounded">QUICK_START_GOOGLE_MAPS.md</code>
              {' '}ou{' '}
              <code className="bg-yellow-100 px-1 rounded">CONFIGURATION_GOOGLE_MAPS.md</code>
              {' '}pour les instructions complètes.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left">
            <p className="text-xs text-green-800">
              <strong>✨ Note :</strong> Google Maps offre $200 de crédit gratuit par mois, 
              largement suffisant pour le développement et les tests !
            </p>
          </div>
          {/* Liste des immeubles en mode dégradé */}
          {buildings.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                📍 Immeubles disponibles ({buildings.length}) :
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {buildings.map((building) => {
                  const availableUnits = building.availableUnits || 0
                  const totalUnits = building.totalUnits || 0
                  const isAvailable = availableUnits > 0
                  
                  return (
                    <div 
                      key={building._id} 
                      className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow text-left border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900 text-base">{building.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              isAvailable 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {isAvailable ? '✓ Disponible' : '✗ Complet'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            {building.address?.street && (
                              <p className="flex items-center gap-1">
                                <span>📍</span>
                                <span>
                                  {building.address.street}
                                  {building.address.city && `, ${building.address.city}`}
                                  {building.address.province && `, ${building.address.province}`}
                                  {building.address.postalCode && ` ${building.address.postalCode}`}
                                </span>
                              </p>
                            )}
                            
                            {totalUnits > 0 && (
                              <p className="flex items-center gap-1">
                                <span>🏠</span>
                                <span>
                                  <span className="font-semibold text-gray-900">{availableUnits}</span> 
                                  {' '}sur{' '}
                                  <span className="font-semibold text-gray-900">{totalUnits}</span> 
                                  {' '}unité{totalUnits > 1 ? 's' : ''} disponible{availableUnits > 1 ? 's' : ''}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {building._id ? (
                        onBuildingClick ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!building._id) {
                                console.warn('[GOOGLE_MAP] ⚠️ Tentative de navigation avec ID manquant')
                                return
                              }
                              onBuildingClick(building)
                            }}
                            className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            Voir les détails →
                          </button>
                        ) : (
                          <Link
                            href={`/buildings/${building._id}`}
                            className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm block text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Voir les détails →
                          </Link>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="mt-3 w-full bg-gray-400 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed opacity-50 text-sm"
                          title="ID d'immeuble manquant"
                          onClick={() => console.warn('[GOOGLE_MAP] ⚠️ ID manquant pour navigation')}
                        >
                          Voir les détails →
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <LoadScript 
      googleMapsApiKey={googleMapsApiKey} 
      libraries={libraries}
      onLoad={handleLoadScript}
      onError={handleLoadError}
      loadingElement={
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de la carte...</p>
          </div>
        </div>
      }
    >
      <div className="relative" style={{ height }}>
        {/* Contrôles de la carte */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Bouton type de carte */}
          <button
            onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
            className="bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium"
          >
            {mapType === 'roadmap' ? '🗺️ Plan' : '🛰️ Satellite'}
          </button>

          {/* Bouton géolocalisation */}
          {enableDirections && (
            <button
              onClick={getUserLocation}
              className="bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium"
            >
              📍 Ma position
            </button>
          )}

          {/* Bouton effacer itinéraire */}
          {showDirections && (
            <button
              onClick={() => {
                if (directionsRenderer) {
                  directionsRenderer.setDirections({ routes: [] })
                  setShowDirections(false)
                }
              }}
              className="bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 text-sm font-medium"
            >
              ✖️ Effacer itinéraire
            </button>
          )}
        </div>

        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={zoom}
          options={{
            styles: mapStyles,
            mapTypeId: mapType,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: true,
            mapTypeControl: true,
            fullscreenControl: true
          }}
          onLoad={setMap}
        >
          {/* Marqueur pour la position de l'utilisateur */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(32, 32)
              }}
              title="Ma position"
            />
          )}

          {/* Marqueurs des immeubles avec clusterisation */}
          {enableClustering && filteredBuildings.length > 5 ? (
            <MarkerClusterer>
              {(clusterer) => (
                <>
                  {filteredBuildings.map((building) => {
                    const coords = getBuildingCoordinates(building)
                    if (!coords) return null

                    return (
                      <Marker
                        key={building._id}
                        position={coords}
                        icon={getMarkerIcon(building)}
                        clusterer={clusterer}
                        onClick={() => handleMarkerClick(building)}
                        title={building.name}
                      />
                    )
                  })}
                </>
              )}
            </MarkerClusterer>
          ) : (
            filteredBuildings.map((building) => {
              const coords = getBuildingCoordinates(building)
              if (!coords) return null

              return (
                <Marker
                  key={building._id}
                  position={coords}
                  icon={getMarkerIcon(building)}
                  onClick={() => handleMarkerClick(building)}
                  title={building.name}
                />
              )
            })
          )}

          {/* Info-bulle pour l'immeuble sélectionné */}
          {selectedBuilding && (() => {
            const coords = getBuildingCoordinates(selectedBuilding)
            if (!coords) return null

            return (
              <InfoWindow
                position={coords}
                onCloseClick={handleCloseInfoWindow}
              >
                <BuildingInfoWindow
                  building={selectedBuilding}
                  userRole={user?.role}
                  onGetDirections={enableDirections && userLocation ? () => {
                    calculateRoute(coords)
                  } : undefined}
                />
              </InfoWindow>
            )
          })()}
        </GoogleMap>
      </div>
    </LoadScript>
  )
}

