/**
 * Helper pour générer automatiquement des URLs d'images depuis Unsplash
 * Utilise l'ID de l'entité pour générer une URL d'image cohérente et stable
 */

// Catégories d'images Unsplash pour immeubles résidentiels modernes
const BUILDING_IMAGES = [
  'architecture,building',
  'apartment,building',
  'condominium,residential',
  'modern,building',
  'residential,architecture',
  'city,building',
  'urban,building',
  'housing,architecture'
];

// Catégories d'images Unsplash pour unités/appartements
const UNIT_IMAGES = [
  'apartment,interior',
  'living-room,modern',
  'bedroom,interior',
  'home,interior',
  'apartment,home',
  'room,modern',
  'house,interior',
  'residential,interior'
];

/**
 * Génère une URL d'image Unsplash pour un immeuble
 * @param {String} buildingId - ID de l'immeuble (pour cohérence)
 * @param {Number} width - Largeur de l'image (défaut: 800)
 * @param {Number} height - Hauteur de l'image (défaut: 600)
 * @returns {String} URL de l'image
 */
function getBuildingImage(buildingId, width = 800, height = 600) {
  if (!buildingId) {
    // Image par défaut si pas d'ID
    const seed = Math.floor(Math.random() * BUILDING_IMAGES.length);
    return `https://source.unsplash.com/${width}x${height}/?${BUILDING_IMAGES[seed]}`;
  }

  // Utiliser l'ID pour obtenir une image cohérente pour le même immeuble
  // Convertir l'ID en nombre pour sélectionner une catégorie
  const idHash = buildingId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageIndex = idHash % BUILDING_IMAGES.length;
  const category = BUILDING_IMAGES[imageIndex];
  
  // Utiliser source.unsplash.com avec un seed basé sur l'ID pour cohérence
  // Le seed permet d'obtenir la même image pour le même ID
  const seed = idHash % 1000;
  return `https://source.unsplash.com/${width}x${height}/?${category}&sig=${seed}`;
}

/**
 * Génère une URL d'image Unsplash pour une unité
 * @param {String} unitId - ID de l'unité (pour cohérence)
 * @param {String} unitType - Type d'unité (studio, 1br, 2br, etc.)
 * @param {Number} width - Largeur de l'image (défaut: 800)
 * @param {Number} height - Hauteur de l'image (défaut: 600)
 * @returns {String} URL de l'image
 */
function getUnitImage(unitId, unitType = 'apartment', width = 800, height = 600) {
  if (!unitId) {
    // Image par défaut si pas d'ID
    const seed = Math.floor(Math.random() * UNIT_IMAGES.length);
    return `https://source.unsplash.com/${width}x${height}/?${UNIT_IMAGES[seed]}`;
  }

  // Adapter la recherche selon le type d'unité
  let category = 'apartment,interior';
  
  if (unitType === 'studio') {
    category = 'studio,apartment';
  } else if (unitType === 'penthouse') {
    category = 'penthouse,luxury,apartment';
  } else if (unitType === 'commercial') {
    category = 'office,commercial';
  } else {
    // Pour 1br, 2br, 3br, 4br
    const bedroomCount = unitType.replace('br', '');
    category = `bedroom,${bedroomCount}br,apartment`;
  }

  // Utiliser l'ID pour obtenir une image cohérente
  const idHash = unitId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageIndex = idHash % UNIT_IMAGES.length;
  const finalCategory = idHash % 2 === 0 ? category : UNIT_IMAGES[imageIndex];
  
  // Utiliser source.unsplash.com avec un seed basé sur l'ID pour cohérence
  // Le seed permet d'obtenir la même image pour le même ID
  const seed = idHash % 1000;
  return `https://source.unsplash.com/${width}x${height}/?${finalCategory}&sig=${seed}`;
}

/**
 * Obtient l'image d'un immeuble, en utilisant l'image stockée ou en générant une nouvelle
 * @param {Object} building - Objet immeuble avec _id et image
 * @returns {String} URL de l'image
 */
function getBuildingImageUrl(building) {
  if (building && building.image) {
    return building.image;
  }
  
  if (building && building._id) {
    return getBuildingImage(building._id.toString());
  }
  
  return getBuildingImage(null);
}

/**
 * Obtient l'image d'une unité, en utilisant les images stockées ou en générant une nouvelle
 * @param {Object} unit - Objet unité avec _id, images, et type
 * @returns {String} URL de l'image (première image si disponible)
 */
function getUnitImageUrl(unit) {
  if (unit && unit.images && unit.images.length > 0) {
    // Retourner la première image si disponible
    return unit.images[0];
  }
  
  if (unit && unit._id) {
    return getUnitImage(unit._id.toString(), unit.type);
  }
  
  return getUnitImage(null);
}

module.exports = {
  getBuildingImage,
  getUnitImage,
  getBuildingImageUrl,
  getUnitImageUrl
};

