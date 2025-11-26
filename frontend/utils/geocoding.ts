/**
 * Utilitaires pour le géocodage d'adresses
 */

interface Coordinates {
  lat: number
  lng: number
}

interface Address {
  street: string
  city: string
  province?: string
  postalCode?: string
}

/**
 * Formate une adresse pour le géocodage
 * Optimisé pour les adresses canadiennes (Montréal)
 */
export function formatAddressForGeocoding(address: Address): string {
  const parts: string[] = []
  
  // Ajouter la rue si elle existe
  if (address.street && address.street.trim()) {
    parts.push(address.street.trim())
  }
  
  // Ajouter la ville si elle existe
  if (address.city && address.city.trim()) {
    // Normaliser le nom de la ville
    let city = address.city.trim()
    if (city.toLowerCase().includes('montreal')) {
      city = 'Montréal'
    }
    if (address.province) {
      city = `${city}, ${address.province}`
    } else {
      city = `${city}, QC` // Par défaut QC si pas de province
    }
    parts.push(city)
  } else if (address.province) {
    // Si pas de ville mais province, ajouter la province
    parts.push(address.province.trim())
  }
  
  // Ajouter "Canada" pour améliorer le géocodage
  parts.push('Canada')
  
  // Ajouter le code postal si il existe (format canadien: H1A 1A1)
  if (address.postalCode && address.postalCode.trim()) {
    const postalCode = address.postalCode.trim().toUpperCase()
    // Formater le code postal canadien si nécessaire
    if (postalCode.length === 6 && !postalCode.includes(' ')) {
      // Format: H1A1A1 -> H1A 1A1
      const formattedPostal = `${postalCode.substring(0, 3)} ${postalCode.substring(3)}`
      parts.push(formattedPostal)
    } else {
      parts.push(postalCode)
    }
  }
  
  // Si aucune partie n'est disponible, retourner une chaîne vide
  if (parts.length === 0) {
    console.warn('[GEOCODING] ⚠️ Aucune partie d\'adresse valide:', address)
    return ''
  }
  
  const formatted = parts.join(', ')
  console.log(`[GEOCODING] 📍 Adresse formatée: "${formatted}"`)
  return formatted
}

/**
 * Géocode une adresse via l'API Google Maps (côté client)
 * Note: Pour un usage en production, il est recommandé de géocoder côté serveur
 */
/**
 * Retourne des coordonnées par défaut pour Montréal si le géocodage échoue
 */
function getDefaultCoordinatesForMontreal(): Coordinates {
  // Centre de Montréal
  return { lat: 45.5017, lng: -73.5673 }
}

/**
 * Géocode une adresse via l'API backend (fallback si le géocodage côté client échoue)
 */
async function geocodeAddressViaBackend(address: Address): Promise<Coordinates | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const formattedAddress = formatAddressForGeocoding(address)
    
    console.log(`[GEOCODING] 🔄 Tentative de géocodage via backend: "${formattedAddress}"`)
    
    const response = await fetch(`${API_URL}/public/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    })

    if (!response.ok) {
      console.error(`[GEOCODING] ❌ Erreur backend: ${response.status}`)
      // Même en cas d'erreur HTTP, retourner les coordonnées par défaut
      return getDefaultCoordinatesForMontreal()
    }

    const data = await response.json()
    
    if (data.success && data.coordinates) {
      console.log(`[GEOCODING] ✅ Géocodage backend réussi:`, data.coordinates)
      return data.coordinates
    }
    
    // Si pas de coordonnées, retourner les coordonnées par défaut
    return getDefaultCoordinatesForMontreal()
  } catch (error) {
    console.error('[GEOCODING] ❌ Erreur lors du géocodage backend:', error)
    // Même en cas d'erreur, retourner les coordonnées par défaut
    return getDefaultCoordinatesForMontreal()
  }
}

export async function geocodeAddress(address: Address, retries = 3): Promise<Coordinates | null> {
  // Protection contre les erreurs - vérifier que l'adresse est valide
  if (!address || !address.city) {
    console.warn('[GEOCODING] ⚠️ Adresse invalide fournie')
    if (address && address.city && address.city.toLowerCase().includes('montreal')) {
      return getDefaultCoordinatesForMontreal()
    }
    return null
  }

  try {
    // Vérifier que l'API Google Maps est chargée et que Geocoder est disponible
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.warn('[GEOCODING] ⚠️ Google Maps API non chargée ou Geocoder non disponible')
      if (retries > 0) {
        console.log(`[GEOCODING] 🔄 Nouvelle tentative dans 500ms... (${retries} tentatives restantes)`)
        await new Promise(resolve => setTimeout(resolve, 500))
        return geocodeAddress(address, retries - 1)
      }
      
    // Essayer le backend comme fallback
    console.log('[GEOCODING] 🔄 Tentative de géocodage via backend...')
    const backendCoords = await geocodeAddressViaBackend(address)
    if (backendCoords) {
      return backendCoords
    }
    
    // Si Montréal, retourner coordonnées par défaut
    if (address.city && address.city.toLowerCase().includes('montreal')) {
      console.log('[GEOCODING] 📍 Utilisation des coordonnées par défaut pour Montréal (API non disponible)')
      return getDefaultCoordinatesForMontreal()
    }
    
    return getDefaultCoordinatesForMontreal() // Toujours retourner quelque chose
    }

    // Vérifier que Geocoder est bien un constructeur
    if (typeof window.google.maps.Geocoder !== 'function') {
      console.warn('[GEOCODING] ⚠️ Geocoder n\'est pas un constructeur valide')
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return geocodeAddress(address, retries - 1)
      }
      
    // Essayer le backend comme fallback
    const backendCoords = await geocodeAddressViaBackend(address)
    if (backendCoords) {
      return backendCoords
    }
    
    // Si Montréal, retourner coordonnées par défaut
    if (address.city && address.city.toLowerCase().includes('montreal')) {
      return getDefaultCoordinatesForMontreal()
    }
    
    return getDefaultCoordinatesForMontreal() // Toujours retourner quelque chose
    }

    const formattedAddress = formatAddressForGeocoding(address)
    console.log(`[GEOCODING] 🔍 Géocodage de l'adresse: "${formattedAddress}"`)
    
    return new Promise((resolve) => {
      try {
        const geocoder = new window.google.maps.Geocoder()
        
        // Essayer d'abord avec l'adresse complète
        geocoder.geocode({ address: formattedAddress }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location
            const coords = {
              lat: location.lat(),
              lng: location.lng()
            }
            console.log(`[GEOCODING] ✅ Adresse géocodée avec succès:`, coords)
            resolve(coords)
            return
          }
          
          console.error(`[GEOCODING] ❌ Erreur géocodage - Status: ${status}`)
          
          if (status === 'ZERO_RESULTS') {
            console.error(`[GEOCODING] ❌ Aucun résultat pour l'adresse: "${formattedAddress}"`)
            
            // Essayer avec des variantes de l'adresse
            // Variante 1: Sans code postal
            if (address.postalCode) {
              const addressWithoutPostal = formatAddressForGeocoding({ ...address, postalCode: undefined })
              console.log(`[GEOCODING] 🔄 Tentative variante 1 (sans code postal): "${addressWithoutPostal}"`)
              
              geocoder.geocode({ address: addressWithoutPostal }, (results2, status2) => {
                if (status2 === 'OK' && results2 && results2[0]) {
                  const location = results2[0].geometry.location
                  resolve({ lat: location.lat(), lng: location.lng() })
                  return
                }
                
                // Variante 2: Seulement ville + province
                const cityOnly = `${address.city}, ${address.province || 'QC'}, Canada`
                console.log(`[GEOCODING] 🔄 Tentative variante 2 (ville seulement): "${cityOnly}"`)
                
                geocoder.geocode({ address: cityOnly }, (results3, status3) => {
                  if (status3 === 'OK' && results3 && results3[0]) {
                    const location = results3[0].geometry.location
                    resolve({ lat: location.lat(), lng: location.lng() })
                  } else {
                    // Dernier recours: coordonnées par défaut pour Montréal
                    console.log('[GEOCODING] 📍 Utilisation des coordonnées par défaut pour Montréal')
                    resolve(getDefaultCoordinatesForMontreal())
                  }
                })
              })
            } else {
              // Si pas de code postal, essayer seulement ville
              const cityOnly = `${address.city}, ${address.province || 'QC'}, Canada`
              console.log(`[GEOCODING] 🔄 Tentative avec ville seulement: "${cityOnly}"`)
              
              geocoder.geocode({ address: cityOnly }, (results2, status2) => {
                if (status2 === 'OK' && results2 && results2[0]) {
                  const location = results2[0].geometry.location
                  resolve({ lat: location.lat(), lng: location.lng() })
                } else {
                  // Dernier recours: coordonnées par défaut pour Montréal
                  console.log('[GEOCODING] 📍 Utilisation des coordonnées par défaut pour Montréal')
                  resolve(getDefaultCoordinatesForMontreal())
                }
              })
            }
          } else if (status === 'OVER_QUERY_LIMIT') {
            console.error(`[GEOCODING] ❌ Limite de requêtes dépassée`)
            // Retry si possible
            if (retries > 0) {
              setTimeout(async () => {
                const result = await geocodeAddress(address, retries - 1)
                resolve(result || getDefaultCoordinatesForMontreal())
              }, 2000)
            } else {
              resolve(getDefaultCoordinatesForMontreal())
            }
          } else if (status === 'REQUEST_DENIED') {
            console.error(`[GEOCODING] ❌ Requête refusée - Vérifiez la clé API`)
            // Utiliser coordonnées par défaut pour Montréal
            resolve(getDefaultCoordinatesForMontreal())
          } else if (status === 'INVALID_REQUEST') {
            console.error(`[GEOCODING] ❌ Requête invalide - Adresse: "${formattedAddress}"`)
            // Essayer avec une adresse simplifiée
            const simpleAddress = `${address.street || ''}, ${address.city}, ${address.province || 'QC'}, Canada`.replace(/^,\s*/, '')
            console.log(`[GEOCODING] 🔄 Tentative avec adresse simplifiée: "${simpleAddress}"`)
            
            geocoder.geocode({ address: simpleAddress }, (results2, status2) => {
              if (status2 === 'OK' && results2 && results2[0]) {
                const location = results2[0].geometry.location
                resolve({ lat: location.lat(), lng: location.lng() })
              } else {
                resolve(getDefaultCoordinatesForMontreal())
              }
            })
          } else {
            // Essayer le backend comme fallback
            console.log('[GEOCODING] 🔄 Tentative de géocodage via backend...')
            geocodeAddressViaBackend(address).then(backendCoords => {
              if (backendCoords) {
                resolve(backendCoords)
              } else {
                // Retry si possible
                if (retries > 0) {
                  console.log(`[GEOCODING] 🔄 Nouvelle tentative... (${retries} tentatives restantes)`)
                  setTimeout(async () => {
                    const result = await geocodeAddress(address, retries - 1)
                    resolve(result || getDefaultCoordinatesForMontreal())
                  }, 1000)
                } else {
                  // Dernier recours: coordonnées par défaut pour Montréal
                  resolve(getDefaultCoordinatesForMontreal())
                }
              }
            })
          }
        })
      } catch (error) {
        console.error('[GEOCODING] ❌ Erreur lors de la création du Geocoder:', error)
        if (retries > 0) {
          setTimeout(async () => {
            const result = await geocodeAddress(address, retries - 1)
            resolve(result || getDefaultCoordinatesForMontreal())
          }, 1000)
        } else {
          // Dernier recours: coordonnées par défaut pour Montréal
          resolve(getDefaultCoordinatesForMontreal())
        }
      }
    })
  } catch (error) {
    console.error('[GEOCODING] ❌ Erreur critique dans geocodeAddress:', error)
    // En cas d'erreur critique, retourner les coordonnées par défaut pour Montréal
    if (address && address.city && address.city.toLowerCase().includes('montreal')) {
      return getDefaultCoordinatesForMontreal()
    }
    return getDefaultCoordinatesForMontreal() // Toujours retourner quelque chose
  }
}

/**
 * Géocode plusieurs adresses en batch
 */
export async function geocodeAddresses(addresses: Address[]): Promise<Map<string, Coordinates>> {
  const results = new Map<string, Coordinates>()
  
  for (const address of addresses) {
    const coords = await geocodeAddress(address)
    if (coords) {
      const key = formatAddressForGeocoding(address)
      results.set(key, coords)
    }
    // Délai pour éviter de dépasser les limites de l'API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

