/**
 * Utilitaires pour la gestion des images locales
 * Toutes les images doivent être dans /public/images/
 */

// Liste complète des images disponibles dans frontend/public/images
const AVAILABLE_UNIT_IMAGES = [
  'unites1.jpg',
  'image2.jpeg',
  'image3.jpeg',
  'unite16.jpeg',
  'unite17.jpeg',
  'unite5.jpg',
  'unites11.jpg',
  'unites12.jpeg',
  'unites13.jpg',
  'unites14.jpeg',
  'unites15.jpg',
  'unites6.jpg',
  'unites7.jpg',
  'unites8.jpg',
  'unites9.jpg'
]

const AVAILABLE_BUILDING_IMAGES = [
  'imme1.jpeg',
  'imme2.jpeg',
  'imme3.jpg',
  'imme4.png',
  'immeb 5.jpg',
  'immeb 6.jpg',
  'immeb 7.jpg',
  'immeb 9.png',
  'immeub 8.jpg'
]

/**
 * Valide qu'un chemin d'image est valide et existe
 * @param imagePath - Chemin de l'image à valider
 * @param fallback - Chemin de fallback si invalide
 * @returns Chemin validé ou fallback
 */
export function validateImagePath(
  imagePath: string | null | undefined,
  fallback: string = '/images/default/placeholder.jpg'
): string {
  // Vérifier null/undefined
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined') {
    console.warn('[IMAGE UTILS] ⚠️ Chemin d\'image null/undefined, utilisation du fallback');
    return fallback;
  }

  // Vérifier chaîne vide
  if (typeof imagePath !== 'string' || imagePath.trim() === '') {
    console.warn('[IMAGE UTILS] ⚠️ Chemin d\'image vide, utilisation du fallback');
    return fallback;
  }

  // Vérifier si c'est une URL externe (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath; // URLs externes sont toujours valides
  }

  // Vérifier si le chemin commence par / (chemin absolu)
  if (!imagePath.startsWith('/')) {
    const correctedPath = `/${imagePath}`;
    console.warn(`[IMAGE UTILS] ⚠️ Chemin relatif corrigé: "${imagePath}" → "${correctedPath}"`);
    return correctedPath;
  }

  // Vérifier les patterns connus de chemins invalides
  const invalidPatterns = [
    '/placeholder-building.jpg',
    '/placeholder-unit.jpg',
    'placeholder-building.jpg',
    'placeholder-unit.jpg'
  ];

  if (invalidPatterns.includes(imagePath)) {
    console.warn(`[IMAGE UTILS] ⚠️ Chemin placeholder invalide détecté: "${imagePath}", utilisation du fallback`);
    return fallback;
  }

  return imagePath;
}

/**
 * Vérifie si une image existe côté client (approximation)
 * Note: Cette fonction ne peut pas vraiment vérifier l'existence du fichier,
 * mais peut détecter les patterns invalides connus
 */
export function checkImageExists(imagePath: string): boolean {
  // Pour les URLs externes, toujours considérer comme valides
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return true;
  }

  // Vérifier les patterns invalides
  const invalidPatterns = [
    '/placeholder-building.jpg',
    '/placeholder-unit.jpg',
    'placeholder-building.jpg',
    'placeholder-unit.jpg',
    'null',
    'undefined'
  ];

  return !invalidPatterns.some(pattern => imagePath.includes(pattern));
}

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
  // Priorité à imageUrl si elle existe et n'est pas vide
  if (unit.imageUrl && typeof unit.imageUrl === 'string' && unit.imageUrl.trim() !== '') {
    const validatedPath = validateImagePath(unit.imageUrl);
    
    if (validatedPath.startsWith('http')) {
      return validatedPath;
    }
    
    if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
      return `/${validatedPath.startsWith('/') ? validatedPath.substring(1) : validatedPath}`;
    }
    
    if (validatedPath.includes('unites/') || validatedPath.startsWith('unites/')) {
      const filename = validatedPath.split('/').pop() || validatedPath;
      return `/images/unites/${filename}`;
    }
    
    if (validatedPath.includes('/')) {
      return `/${validatedPath}`;
    }
    
    return `/images/unites/${validatedPath}`;
  }

  // Si images[0] existe et semble être un nom de fichier local
  if (unit.images && unit.images.length > 0) {
    const firstImage = validateImagePath(unit.images[0]);
    
    if (firstImage.startsWith('http')) {
      return firstImage;
    }
    
    if (firstImage.includes('uploads/') || firstImage.startsWith('uploads/')) {
      return `/${firstImage.startsWith('/') ? firstImage.substring(1) : firstImage}`;
    }
    
    if (firstImage.includes('unites/') || firstImage.startsWith('unites/')) {
      const filename = firstImage.split('/').pop() || firstImage;
      return `/images/unites/${filename}`;
    }
    
    if (firstImage.includes('/')) {
      return `/${firstImage}`;
    }
    
    return `/images/unites/${firstImage}`;
  }

  // Si imageUrl existe et semble être un nom de fichier local (ancien code pour compatibilité)
  if (unit.imageUrl && !unit.imageUrl.startsWith('http')) {
    // Si c'est un chemin vers uploads (images uploadées du backend)
    if (unit.imageUrl.includes('uploads/') || unit.imageUrl.startsWith('uploads/')) {
      return `/${unit.imageUrl.startsWith('/') ? unit.imageUrl.substring(1) : unit.imageUrl}`
    }
    // Vérifier si c'est un chemin relatif vers /images/unites/
    if (unit.imageUrl.includes('unites/') || unit.imageUrl.startsWith('unites/')) {
      const filename = unit.imageUrl.split('/').pop() || unit.imageUrl
      return `/images/unites/${filename}`
    }
    // Si c'est juste un nom de fichier, vérifier d'abord dans uploads
    if (unit.imageUrl.includes('/')) {
      return `/${unit.imageUrl}`
    }
    return `/images/unites/${unit.imageUrl}`
  }

  // Ne plus utiliser Unsplash - utiliser une image locale à la place
  if (unit.imageUrl && unit.imageUrl.includes('unsplash.com')) {
    // Utiliser une image locale au lieu d'Unsplash
    if (unit._id) {
      const unitId = unit._id.toString()
      const hash = unitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const imageIndex = hash % AVAILABLE_UNIT_IMAGES.length
      return `/images/unites/${AVAILABLE_UNIT_IMAGES[imageIndex]}`
    }
    return `/images/unites/${AVAILABLE_UNIT_IMAGES[0]}`
  }

  // Si images[0] existe et semble être un nom de fichier local
  if (unit.images && unit.images.length > 0) {
    const firstImage = unit.images[0]
    if (!firstImage.startsWith('http')) {
      // Si c'est un chemin vers uploads (images uploadées du backend)
      if (firstImage.includes('uploads/') || firstImage.startsWith('uploads/')) {
        return `/${firstImage.startsWith('/') ? firstImage.substring(1) : firstImage}`
      }
      if (firstImage.includes('unites/') || firstImage.startsWith('unites/')) {
        const filename = firstImage.split('/').pop() || firstImage
        return `/images/unites/${filename}`
      }
      // Si le chemin contient un slash, c'est probablement un chemin complet
      if (firstImage.includes('/')) {
        return `/${firstImage}`
      }
      return `/images/unites/${firstImage}`
    }
    // Ne plus utiliser Unsplash - utiliser une image locale à la place
    if (firstImage.includes('unsplash.com')) {
      // Utiliser une image locale au lieu d'Unsplash
      if (unit._id) {
        const unitId = unit._id.toString()
        const hash = unitId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const imageIndex = hash % AVAILABLE_UNIT_IMAGES.length
        return `/images/unites/${AVAILABLE_UNIT_IMAGES[imageIndex]}`
      }
      return `/images/unites/${AVAILABLE_UNIT_IMAGES[0]}`
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
  // Priorité à imageUrl si elle existe et n'est pas vide
  if (building.imageUrl && typeof building.imageUrl === 'string' && building.imageUrl.trim() !== '') {
    const validatedPath = validateImagePath(building.imageUrl);
    
    if (validatedPath.startsWith('http')) {
      return validatedPath;
    }
    
    if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
      return `/${validatedPath.startsWith('/') ? validatedPath.substring(1) : validatedPath}`;
    }
    
    if (validatedPath.includes('immeubles/') || validatedPath.startsWith('immeubles/')) {
      const filename = validatedPath.split('/').pop() || validatedPath;
      return `/images/immeubles/${filename}`;
    }
    
    if (validatedPath.includes('/')) {
      return `/${validatedPath}`;
    }
    
    return `/images/immeubles/${validatedPath}`;
  }

  // Ensuite, vérifier le champ 'image'
  if (building.image && typeof building.image === 'string' && building.image.trim() !== '' && building.image !== 'null' && building.image !== 'undefined') {
    const validatedPath = validateImagePath(building.image);
    
    if (validatedPath.startsWith('http')) {
      return validatedPath;
    }
    
    if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
      return `/${validatedPath.startsWith('/') ? validatedPath.substring(1) : validatedPath}`;
    }
    
    if (validatedPath.includes('immeubles/') || validatedPath.startsWith('immeubles/')) {
      const filename = validatedPath.split('/').pop() || validatedPath;
      return `/images/immeubles/${filename}`;
    }
    
    if (validatedPath.includes('/')) {
      return `/${validatedPath}`;
    }
    
    return `/images/immeubles/${validatedPath}`;
  }

  // Si imageUrl existe et semble être un nom de fichier local (ancien code pour compatibilité)
  if (building.imageUrl && !building.imageUrl.startsWith('http')) {
    // Si c'est un chemin vers uploads (images uploadées du backend)
    if (building.imageUrl.includes('uploads/') || building.imageUrl.startsWith('uploads/')) {
      return `/${building.imageUrl.startsWith('/') ? building.imageUrl.substring(1) : building.imageUrl}`
    }
    if (building.imageUrl.includes('immeubles/') || building.imageUrl.startsWith('immeubles/')) {
      const filename = building.imageUrl.split('/').pop() || building.imageUrl
      return `/images/immeubles/${filename}`
    }
    // Si le chemin contient un slash, c'est probablement un chemin complet
    if (building.imageUrl.includes('/')) {
      return `/${building.imageUrl}`
    }
    return `/images/immeubles/${building.imageUrl}`
  }

  // Si image existe et semble être un nom de fichier local
  if (building.image && building.image !== 'null' && building.image !== 'undefined' && !building.image.startsWith('http')) {
    // Si c'est un chemin vers uploads (images uploadées du backend)
    if (building.image.includes('uploads/') || building.image.startsWith('uploads/')) {
      return `/${building.image.startsWith('/') ? building.image.substring(1) : building.image}`
    }
    if (building.image.includes('immeubles/') || building.image.startsWith('immeubles/')) {
      const filename = building.image.split('/').pop() || building.image
      return `/images/immeubles/${filename}`
    }
    // Si le chemin contient un slash, c'est probablement un chemin complet
    if (building.image.includes('/')) {
      return `/${building.image}`
    }
    return `/images/immeubles/${building.image}`
  }

  // Ne plus utiliser Unsplash - utiliser une image locale à la place
  if (building.image && building.image.includes('unsplash.com')) {
    // Utiliser une image locale au lieu d'Unsplash
    if (building._id) {
      const buildingId = building._id.toString()
      const hash = buildingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const imageIndex = hash % AVAILABLE_BUILDING_IMAGES.length
      return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[imageIndex]}`
    }
    return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[0]}`
  }

  // Si imageUrl existe et semble être un nom de fichier local
  if (building.imageUrl && !building.imageUrl.startsWith('http')) {
    // Si c'est un chemin vers uploads (images uploadées du backend)
    if (building.imageUrl.includes('uploads/') || building.imageUrl.startsWith('uploads/')) {
      return `/${building.imageUrl.startsWith('/') ? building.imageUrl.substring(1) : building.imageUrl}`
    }
    if (building.imageUrl.includes('immeubles/') || building.imageUrl.startsWith('immeubles/')) {
      const filename = building.imageUrl.split('/').pop() || building.imageUrl
      return `/images/immeubles/${filename}`
    }
    // Si le chemin contient un slash, c'est probablement un chemin complet
    if (building.imageUrl.includes('/')) {
      return `/${building.imageUrl}`
    }
    return `/images/immeubles/${building.imageUrl}`
  }

  // Ne plus utiliser Unsplash - utiliser une image locale à la place
  if (building.imageUrl && building.imageUrl.includes('unsplash.com')) {
    // Utiliser une image locale au lieu d'Unsplash
    if (building._id) {
      const buildingId = building._id.toString()
      const hash = buildingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const imageIndex = hash % AVAILABLE_BUILDING_IMAGES.length
      return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[imageIndex]}`
    }
    return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[0]}`
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

