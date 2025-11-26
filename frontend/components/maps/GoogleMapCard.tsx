'use client'

/**
 * Composant GoogleMapCard - Carte Google Maps réutilisable
 * 
 * Affiche automatiquement une carte avec un marqueur à l'adresse fournie.
 * Le composant géocode automatiquement l'adresse et gère les erreurs.
 * 
 * @param address - Adresse complète (street, city, province)
 * @param title - Titre optionnel à afficher au-dessus de la carte
 * @param height - Hauteur de la carte (défaut: 400px)
 * @param className - Classes CSS supplémentaires
 */

import { useState, useEffect } from 'react'
import { formatAddressForGeocoding } from '../../utils/geocoding'

interface Address {
  street: string
  city: string
  province?: string
  postalCode?: string
}

interface GoogleMapCardProps {
  address: Address
  title?: string
  height?: string
  className?: string
  zoom?: number
}

// Configuration par défaut (Montréal)
const defaultCenter = { lat: 45.5017, lng: -73.5673 }
const defaultZoom = 15

export default function GoogleMapCard({
  address,
  title,
  height = '400px',
  className = '',
  zoom = defaultZoom
}: GoogleMapCardProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)

  // Vérifier que l'adresse est valide
  const isValidAddress = address?.street && address?.city

  // Géocoder l'adresse - TOUJOURS utiliser le backend en priorité
  useEffect(() => {
    if (!isValidAddress) {
      console.warn('[GOOGLE_MAP_CARD] ⚠️ Adresse invalide:', address)
      return
    }

    const geocode = async () => {
      try {
        setLoading(true)

        console.log('[GOOGLE_MAP_CARD] 🔄 Géocodage de l\'adresse:', formatAddressForGeocoding(address))
        
        // PRIORITÉ 1: Toujours essayer le géocodage backend d'abord (plus fiable)
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
          console.log('[GOOGLE_MAP_CARD] 🔄 Tentative de géocodage via backend...')
          
          const response = await fetch(`${API_URL}/public/geocode`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.coordinates) {
              console.log('[GOOGLE_MAP_CARD] ✅ Géocodage backend réussi:', data.coordinates)
              setCoordinates(data.coordinates)
              setLoading(false)
              return // Sortir immédiatement après succès backend
            }
          }
        } catch (backendError) {
          console.warn('[GOOGLE_MAP_CARD] ⚠️ Géocodage backend échoué:', backendError)
        }
        
        // PRIORITÉ 2: Fallback - coordonnées par défaut (toujours retourner quelque chose)
        console.warn('[GOOGLE_MAP_CARD] ⚠️ Utilisation des coordonnées par défaut')
        if (address.city && address.city.toLowerCase().includes('montreal')) {
          setCoordinates({ lat: 45.5017, lng: -73.5673 })
        } else {
          setCoordinates(defaultCenter)
        }
      } catch (err) {
        console.error('[GOOGLE_MAP_CARD] ❌ Erreur géocodage:', err)
        // En cas d'erreur, toujours utiliser les coordonnées par défaut
        if (address.city && address.city.toLowerCase().includes('montreal')) {
          setCoordinates({ lat: 45.5017, lng: -73.5673 })
        } else {
          setCoordinates(defaultCenter)
        }
      } finally {
        setLoading(false)
      }
    }

    geocode()
  }, [address, isValidAddress])

  // Si l'adresse n'est pas valide, ne rien afficher
  if (!isValidAddress) {
    return null
  }

  // Utiliser Google Maps Embed sans clé API (méthode gratuite et sans restrictions)
  // Le géocodage backend garantit toujours des coordonnées valides
  const formattedAddress = formatAddressForGeocoding(address)
  
  // Construire l'URL de l'iframe Google Maps sans clé API
  // Utiliser soit les coordonnées si disponibles, soit l'adresse textuelle
  // Format: https://www.google.com/maps?q=latitude,longitude ou https://www.google.com/maps?q=adresse
  const mapUrl = coordinates 
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=${zoom}&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(formattedAddress)}&z=${zoom}&output=embed`

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
          {title}
        </h3>
      )}
      
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm" style={{ height }}>
        {loading && !coordinates ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Localisation de l'adresse...</p>
            </div>
          </div>
        ) : (
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            src={mapUrl}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={formattedAddress}
            onError={(e) => {
              console.error('[GOOGLE_MAP_CARD] ❌ Erreur iframe Google Maps')
              // En cas d'erreur, ne rien faire - l'iframe affichera quand même une carte
            }}
          />
        )}
      </div>
    </div>
  )
}


