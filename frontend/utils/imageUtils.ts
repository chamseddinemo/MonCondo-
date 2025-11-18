/**
 * Utilitaires pour la gestion des images locales
 * Toutes les images doivent être dans /public/images/
 */

// Liste des images disponibles (mise à jour automatiquement si nécessaire)
const AVAILABLE_UNIT_IMAGES = [
  'unites1.jpg',
  'image2.jpeg',
  'image3.jpeg'
]

const AVAILABLE_BUILDING_IMAGES = [
  'imme1.jpeg',
  'imme2.jpeg',
  'imme3.jpg',
  'imme4.png'
]

/**
 * Obtient le chemin d'image local pour une unité
 * @param unit - Objet unité avec _id, imageUrl ou images
 * @returns Chemin local vers l'image ou placeholder par défaut
 */
export function getUnitImagePath(unit: {
  _id?: string
  imageUrl?: string
  images?: string[]
  unitNumber?: string
}): string {
  // Si imageUrl existe et semble être un nom de fichier local
  if (unit.imageUrl && !unit.imageUrl.startsWith('http')) {
    // Vérifier si c'est un chemin relatif vers /images/unites/
    if (unit.imageUrl.includes('unites/') || unit.imageUrl.startsWith('unites/')) {
      const filename = unit.imageUrl.split('/').pop() || unit.imageUrl
      return `/images/unites/${filename}`
    }
    // Si c'est juste un nom de fichier
    return `/images/unites/${unit.imageUrl}`
  }

  // Si imageUrl est une URL Unsplash, la retourner directement (sera gérée par next.config.js)
  if (unit.imageUrl && unit.imageUrl.includes('unsplash.com')) {
    return unit.imageUrl
  }

  // Si images[0] existe et semble être un nom de fichier local
  if (unit.images && unit.images.length > 0) {
    const firstImage = unit.images[0]
    if (!firstImage.startsWith('http')) {
      if (firstImage.includes('unites/') || firstImage.startsWith('unites/')) {
        const filename = firstImage.split('/').pop() || firstImage
        return `/images/unites/${filename}`
      }
      return `/images/unites/${firstImage}`
    }
    // Si c'est une URL Unsplash, la retourner directement
    if (firstImage.includes('unsplash.com')) {
      return firstImage
    }
  }

  // Si on a un _id mais pas d'image locale, essayer de mapper avec les images disponibles
  if (unit._id) {
    // Utiliser un hash simple basé sur l'ID pour sélectionner une image de manière cohérente
    const unitId = unit._id.toString()
    const hash = unitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const imageIndex = hash % AVAILABLE_UNIT_IMAGES.length
    const selectedImage = AVAILABLE_UNIT_IMAGES[imageIndex]
    
    if (selectedImage) {
      return `/images/unites/${selectedImage}`
    }
  }

  // Fallback : utiliser la première image disponible ou placeholder
  if (AVAILABLE_UNIT_IMAGES.length > 0) {
    return `/images/unites/${AVAILABLE_UNIT_IMAGES[0]}`
  }

  // Fallback vers placeholder
  return '/images/default/placeholder.jpg'
}

/**
 * Obtient le chemin d'image local pour un immeuble
 * @param building - Objet immeuble avec _id, image ou imageUrl
 * @returns Chemin local vers l'image ou placeholder par défaut
 */
export function getBuildingImagePath(building: {
  _id?: string
  image?: string
  imageUrl?: string
}): string {
  // Si image existe et semble être un nom de fichier local
  if (building.image && !building.image.startsWith('http')) {
    if (building.image.includes('immeubles/') || building.image.startsWith('immeubles/')) {
      const filename = building.image.split('/').pop() || building.image
      return `/images/immeubles/${filename}`
    }
    return `/images/immeubles/${building.image}`
  }

  // Si image est une URL Unsplash, la retourner directement
  if (building.image && building.image.includes('unsplash.com')) {
    return building.image
  }

  // Si imageUrl existe et semble être un nom de fichier local
  if (building.imageUrl && !building.imageUrl.startsWith('http')) {
    if (building.imageUrl.includes('immeubles/') || building.imageUrl.startsWith('immeubles/')) {
      const filename = building.imageUrl.split('/').pop() || building.imageUrl
      return `/images/immeubles/${filename}`
    }
    return `/images/immeubles/${building.imageUrl}`
  }

  // Si imageUrl est une URL Unsplash, la retourner directement
  if (building.imageUrl && building.imageUrl.includes('unsplash.com')) {
    return building.imageUrl
  }

  // Si on a un _id mais pas d'image locale, essayer de mapper avec les images disponibles
  if (building._id) {
    // Utiliser un hash simple basé sur l'ID pour sélectionner une image de manière cohérente
    const buildingId = building._id.toString()
    const hash = buildingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const imageIndex = hash % AVAILABLE_BUILDING_IMAGES.length
    const selectedImage = AVAILABLE_BUILDING_IMAGES[imageIndex]
    
    if (selectedImage) {
      return `/images/immeubles/${selectedImage}`
    }
  }

  // Fallback : utiliser la première image disponible ou placeholder
  if (AVAILABLE_BUILDING_IMAGES.length > 0) {
    return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[0]}`
  }

  // Fallback vers placeholder
  return '/images/default/placeholder.jpg'
}

