/**
 * Utilitaire centralisé pour la construction d'URLs API
 * Garantit que toutes les URLs sont correctement formatées et sans espaces
 */

// Configuration de l'URL de base de l'API
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  // Nettoyer l'URL : enlever les espaces et les slashes finaux
  let baseUrl = String(envUrl).trim().replace(/\s+/g, '')
  
  // S'assurer qu'on a bien "localhost" et non "ocalhost" ou autre
  if (baseUrl.includes('ocalhost') && !baseUrl.includes('localhost')) {
    baseUrl = baseUrl.replace('ocalhost', 'localhost')
  }
  
  // Enlever les slashes finaux
  baseUrl = baseUrl.replace(/\/+$/, '')
  
  // Vérifier que l'URL commence par http:// ou https://
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    console.warn('[API] URL ne commence pas par http:// ou https://, utilisation de http://localhost:5000/api par défaut')
    baseUrl = 'http://localhost:5000/api'
  }
  
  return baseUrl
}

const API_BASE_URL = getApiBaseUrl()

/**
 * Construit une URL API de manière sécurisée
 * @param endpoint - Le endpoint de l'API (ex: 'requests/123/accept')
 * @returns L'URL complète et validée
 */
export const buildApiUrl = (endpoint: string): string => {
  try {
    // Nettoyer l'endpoint
    let cleanEndpoint = String(endpoint || '').trim().replace(/\s+/g, '')
    
    // Enlever les slashes au début
    cleanEndpoint = cleanEndpoint.replace(/^\/+/, '')
    
    if (!cleanEndpoint || cleanEndpoint.length === 0) {
      throw new Error('Endpoint vide')
    }
    
    // Construire l'URL
    const url = `${API_BASE_URL}/${cleanEndpoint}`
    
    // Vérifier que l'URL ne contient pas d'espaces
    if (url.includes(' ')) {
      console.error('[BUILD API URL] ERREUR: URL contient des espaces!', {
        url,
        baseUrl: API_BASE_URL,
        endpoint: cleanEndpoint,
        originalEndpoint: endpoint
      })
      throw new Error(`URL invalide contenant des espaces: ${url}`)
    }
    
    // Vérifier que l'URL est valide
    try {
      new URL(url)
    } catch (error) {
      console.error('[BUILD API URL] ERREUR: URL invalide!', {
        url,
        baseUrl: API_BASE_URL,
        endpoint: cleanEndpoint,
        error
      })
      throw new Error(`URL invalide: ${url}`)
    }
    
    return url
  } catch (error) {
    console.error('[BUILD API URL] Erreur lors de la construction de l\'URL:', error)
    throw error
  }
}

/**
 * Construit une URL API avec un ID encodé
 * @param resource - La ressource (ex: 'requests')
 * @param id - L'ID de la ressource
 * @param action - L'action optionnelle (ex: 'accept' ou 'documents/123/sign')
 * @returns L'URL complète et validée
 */
export const buildApiUrlWithId = (resource: string, id: string | number | undefined | null, action?: string): string => {
  try {
    // Nettoyer et valider l'ID
    if (!id) {
      throw new Error(`ID manquant pour la ressource ${resource}`)
    }
    
    const cleanId = String(id).trim().replace(/\s+/g, '')
    
    if (!cleanId || cleanId.length === 0) {
      throw new Error(`ID invalide pour la ressource ${resource}`)
    }
    
    // Encoder l'ID pour éviter les problèmes d'URL
    const encodedId = encodeURIComponent(cleanId)
    
    // Construire le chemin
    let path = `${resource}/${encodedId}`
    if (action) {
      // Nettoyer l'action et la diviser en segments si nécessaire
      const cleanAction = String(action).trim().replace(/\s+/g, '')
      
      // Si l'action contient des slashes, traiter chaque segment
      if (cleanAction.includes('/')) {
        const segments = cleanAction.split('/').filter(s => s && s.length > 0)
        // Encoder chaque segment qui pourrait être un ID
        const encodedSegments = segments.map(segment => {
          const cleanSegment = segment.trim().replace(/\s+/g, '')
          // Si le segment ressemble à un ID (longueur > 10 ou format MongoDB ObjectId), l'encoder
          if (cleanSegment.length > 10 || /^[a-f0-9]{24}$/i.test(cleanSegment)) {
            return encodeURIComponent(cleanSegment)
          }
          return cleanSegment
        })
        path = `${path}/${encodedSegments.join('/')}`
      } else {
        // Action simple sans slash
        path = `${path}/${cleanAction}`
      }
    }
    
    // Construire l'URL finale et vérifier qu'elle ne contient pas d'espaces
    const url = buildApiUrl(path)
    
    // Double vérification : s'assurer qu'il n'y a pas d'espaces
    if (url.includes(' ')) {
      console.error('[BUILD API URL WITH ID] ERREUR: URL finale contient des espaces!', {
        url,
        resource,
        id,
        cleanId,
        encodedId,
        action,
        path
      })
      throw new Error(`URL invalide contenant des espaces: ${url}`)
    }
    
    return url
  } catch (error) {
    console.error('[BUILD API URL WITH ID] Erreur:', error)
    throw error
  }
}

/**
 * Configuration axios par défaut
 */
export const getApiConfig = (token?: string | null) => {
  const config: any = {
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: function (status: number) {
      // Ne pas traiter les erreurs 4xx comme des erreurs pour pouvoir logger
      return status < 500
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
}

/**
 * Récupère le token d'authentification depuis localStorage
 */
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken')
  } catch (error) {
    console.error('[GET AUTH TOKEN] Erreur:', error)
    return null
  }
}

/**
 * Exporter l'URL de base pour utilisation dans d'autres fichiers si nécessaire
 */
export const API_URL = API_BASE_URL

/**
 * Log les détails d'une requête API pour le débogage
 */
export const logApiRequest = (method: string, url: string, data?: any) => {
  // Toujours logger en développement, et aussi en production pour les erreurs
  console.log(`[API ${method}] Requête API:`, {
    url,
    urlLength: url.length,
    urlHasSpaces: url.includes(' '),
    urlValid: url.startsWith('http'),
    timestamp: new Date().toISOString(),
    data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data) : undefined
  })
  
  // Vérifier que l'URL ne contient pas d'espaces
  if (url.includes(' ')) {
    console.error(`[API ${method}] ⚠️ ERREUR: URL contient des espaces!`, {
      url,
      urlWithSpaces: url.split(' ').join('[SPACE]')
    })
  }
}

/**
 * Log les détails d'une réponse API pour le débogage
 */
export const logApiResponse = (method: string, url: string, status: number, data?: any) => {
  // Toujours logger pour le diagnostic
  const isSuccess = status >= 200 && status < 300
  const logLevel = isSuccess ? 'log' : 'error'
  
  console[logLevel](`[API ${method} Response] Réponse API:`, {
    url,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Error',
    success: isSuccess,
    timestamp: new Date().toISOString(),
    message: data?.message || data?.error || '',
    data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : data) : undefined
  })
  
  // Log détaillé pour les erreurs
  if (!isSuccess) {
    console.error(`[API ${method} Response] ⚠️ Erreur détectée:`, {
      url,
      status,
      message: data?.message || data?.error || 'Erreur inconnue',
      suggestion: status === 404 ? 'Vérifiez que la route existe et que le serveur backend est démarré' : 
                  status === 401 ? 'Vérifiez que le token est valide' :
                  status === 403 ? 'Vérifiez que l\'utilisateur a les permissions nécessaires' :
                  'Vérifiez les logs du serveur backend'
    })
  }
}

/**
 * Traite les erreurs API et retourne un message utilisateur convivial
 * @param error - L'erreur axios
 * @param defaultMessage - Message par défaut si l'erreur ne peut pas être traitée
 * @returns Message utilisateur convivial
 */
export const getErrorMessage = (error: any, defaultMessage: string = 'Une erreur est survenue. Veuillez réessayer plus tard.'): string => {
  // Erreur de réseau (pas de réponse du serveur)
  if (error.request && !error.response) {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.'
  }

  // Erreur de réponse du serveur
  if (error.response) {
    const status = error.response.status
    const message = error.response.data?.message || error.response.data?.error || ''

    switch (status) {
      case 400:
        return message || 'Les données fournies sont invalides. Veuillez vérifier et réessayer.'
      case 401:
        return 'Votre session a expiré. Veuillez vous reconnecter.'
      case 403:
        return message || 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.'
      case 404:
        // Ne pas afficher "Route non trouvée" à l'utilisateur, mais un message plus convivial
        return message || 'La ressource demandée est introuvable. Elle a peut-être été supprimée ou déplacée.'
      case 409:
        return message || 'Un conflit est survenu. Cette action a peut-être déjà été effectuée.'
      case 422:
        return message || 'Les données fournies ne sont pas valides. Veuillez vérifier et réessayer.'
      case 500:
        return 'Une erreur serveur est survenue. Veuillez réessayer plus tard ou contacter le support.'
      case 503:
        return 'Le service est temporairement indisponible. Veuillez réessayer plus tard.'
      default:
        return message || defaultMessage
    }
  }

  // Erreur inconnue
  return error.message || defaultMessage
}

/**
 * Affiche une notification de succès
 * @param message - Message de succès
 */
export const showSuccessMessage = (message: string) => {
  // Pour l'instant, utiliser alert. Plus tard, on pourra utiliser un système de toast
  alert(`✅ ${message}`)
}

/**
 * Affiche une notification d'erreur
 * @param message - Message d'erreur
 */
export const showErrorMessage = (message: string) => {
  // Pour l'instant, utiliser alert. Plus tard, on pourra utiliser un système de toast
  alert(`❌ ${message}`)
}

