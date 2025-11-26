/**
 * Utilitaires pour le géocodage d'adresses côté serveur
 * Utilise l'API Google Maps Geocoding
 */

const axios = require('axios')

/**
 * Formate une adresse pour le géocodage
 */
function formatAddressForGeocoding(address) {
  const parts = []
  
  // Ajouter la rue si elle existe
  if (address.street && address.street.trim()) {
    parts.push(address.street.trim())
  }
  
  // Ajouter la ville si elle existe
  if (address.city && address.city.trim()) {
    let city = address.city.trim()
    // Normaliser Montréal
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
    parts.push(address.province.trim())
  }
  
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
  
  // Ajouter "Canada" pour améliorer le géocodage
  parts.push('Canada')
  
  const formatted = parts.join(', ')
  console.log(`[BACKEND GEOCODING] 📍 Adresse formatée: "${formatted}"`)
  return formatted
}

/**
 * Géocode une adresse via l'API Google Maps
 * @param {Object} address - Objet avec street, city, province, postalCode
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    console.warn('[BACKEND GEOCODING] ⚠️ Clé API Google Maps non configurée')
    // Retourner les coordonnées par défaut pour Montréal
    return { lat: 45.5017, lng: -73.5673 }
  }

  const formattedAddress = formatAddressForGeocoding(address)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${apiKey}`

  try {
    console.log(`[BACKEND GEOCODING] 🔍 Géocodage de l'adresse: "${formattedAddress}"`)
    const response = await axios.get(url, { timeout: 10000 })
    
    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location
      const coords = {
        lat: location.lat,
        lng: location.lng
      }
      console.log(`[BACKEND GEOCODING] ✅ Coordonnées trouvées:`, coords)
      return coords
    } else {
      console.error(`[BACKEND GEOCODING] ❌ Erreur géocodage - Status: ${response.data.status}`)
      
      // Essayer avec des variantes si ZERO_RESULTS
      if (response.data.status === 'ZERO_RESULTS') {
        // Variante 1: Sans code postal
        if (address.postalCode) {
          const addressWithoutPostal = formatAddressForGeocoding({ ...address, postalCode: undefined })
          console.log(`[BACKEND GEOCODING] 🔄 Tentative variante (sans code postal): "${addressWithoutPostal}"`)
          
          const url2 = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressWithoutPostal)}&key=${apiKey}`
          const response2 = await axios.get(url2, { timeout: 10000 })
          
          if (response2.data.status === 'OK' && response2.data.results && response2.data.results.length > 0) {
            const location = response2.data.results[0].geometry.location
            return { lat: location.lat, lng: location.lng }
          }
        }
        
        // Variante 2: Seulement ville + province
        const cityOnly = `${address.city}, ${address.province || 'QC'}, Canada`
        console.log(`[BACKEND GEOCODING] 🔄 Tentative variante (ville seulement): "${cityOnly}"`)
        
        const url3 = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityOnly)}&key=${apiKey}`
        const response3 = await axios.get(url3, { timeout: 10000 })
        
        if (response3.data.status === 'OK' && response3.data.results && response3.data.results.length > 0) {
          const location = response3.data.results[0].geometry.location
          return { lat: location.lat, lng: location.lng }
        }
      }
      
      // Si toutes les tentatives échouent, retourner les coordonnées par défaut pour Montréal
      console.log('[BACKEND GEOCODING] 📍 Utilisation des coordonnées par défaut pour Montréal')
      return { lat: 45.5017, lng: -73.5673 }
    }
  } catch (error) {
    console.error('[BACKEND GEOCODING] ❌ Erreur requête:', error.message)
    // Même en cas d'erreur, retourner les coordonnées par défaut
    return { lat: 45.5017, lng: -73.5673 }
  }
}

/**
 * Géocode plusieurs adresses en batch
 */
async function geocodeAddresses(addresses) {
  const results = []
  
  for (const address of addresses) {
    const coords = await geocodeAddress(address)
    if (coords) {
      results.push({
        address: formatAddressForGeocoding(address),
        coordinates: coords
      })
    }
    // Délai pour éviter de dépasser les limites de l'API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

module.exports = {
  geocodeAddress,
  geocodeAddresses,
  formatAddressForGeocoding
}

