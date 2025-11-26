/**
 * Helper pour obtenir les URLs d'images uploadées par l'admin
 * Ne génère plus d'URLs Unsplash - utilise uniquement les images uploadées
 */

/**
 * Obtient l'image d'un immeuble (uniquement images uploadées)
 * @param {Object} building - Objet immeuble avec _id et image
 * @returns {String|null} URL de l'image ou null
 */
function getBuildingImageUrl(building) {
  // Retourner uniquement l'image uploadée par l'admin
  if (building && building.image) {
    return building.image;
  }
  // Pas d'image - retourner null pour utiliser un placeholder
  return null;
}

/**
 * Obtient l'image d'une unité (uniquement images uploadées)
 * @param {Object} unit - Objet unité avec _id, images et type
 * @returns {String|null} URL de l'image ou null
 */
function getUnitImageUrl(unit) {
  // Retourner uniquement les images uploadées par l'admin
  if (unit && unit.images && unit.images.length > 0) {
    return unit.images[0];
  }
  // Pas d'image - retourner null pour utiliser un placeholder
  return null;
}

module.exports = {
  getBuildingImageUrl,
  getUnitImageUrl
};
