/**
 * Système centralisé d'instances axios
 * Évite les problèmes de configuration globale qui affecte toutes les requêtes
 */

import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

/**
 * Instance axios pour les requêtes publiques (sans authentification)
 * Cette instance ne contient JAMAIS de header Authorization
 * IMPORTANT: Cette instance est créée AVANT toute configuration globale d'axios
 * 
 * CRITIQUE: Cette instance DOIT être complètement isolée de toute configuration globale
 */
export const publicAxios: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
    // NE JAMAIS ajouter Authorization ici
  }
})

// CRITIQUE: S'assurer que cette instance n'hérite d'aucun header par défaut
// Supprimer explicitement tout header Authorization qui pourrait être hérité
if (publicAxios.defaults && publicAxios.defaults.headers) {
  delete publicAxios.defaults.headers.common?.Authorization
  delete publicAxios.defaults.headers.common?.authorization
}

// Intercepteur pour s'assurer qu'aucun header Authorization n'est ajouté
// Cet intercepteur est PRIORITAIRE et s'exécute en PREMIER
// IMPORTANT: Cet intercepteur DOIT supprimer le header même si axios.defaults est modifié
publicAxios.interceptors.request.use(
  (config) => {
    // CRITIQUE: Supprimer explicitement le header Authorization si présent
    // Cette instance est pour les requêtes publiques, JAMAIS de token
    
    // Étape 1: Supprimer depuis config.headers directement
    if (config.headers) {
      // Supprimer toutes les variantes possibles
      delete config.headers.Authorization
      delete config.headers.authorization
      delete config.headers['Authorization']
      delete config.headers['authorization']
      
      // Étape 2: Forcer undefined pour être absolument sûr
      config.headers.Authorization = undefined
      config.headers.authorization = undefined
      
      // Étape 3: Supprimer depuis axios.defaults.headers.common si présent
      // (même si on ne devrait pas le modifier, on le nettoie au cas où)
      if (axios.defaults && axios.defaults.headers && axios.defaults.headers.common) {
        delete axios.defaults.headers.common.Authorization
        delete axios.defaults.headers.common.authorization
      }
      
      // Étape 4: Supprimer depuis config.headers.common si présent
      if (config.headers.common) {
        delete config.headers.common.Authorization
        delete config.headers.common.authorization
      }
      
      // Étape 5: Vérification finale et log
      const authHeader = config.headers.Authorization || config.headers.authorization
      if (authHeader) {
        console.error('[publicAxios] ⚠️ CRITICAL: Authorization header still present!', {
          header: authHeader,
          allHeaders: Object.keys(config.headers),
          url: config.url,
          hasDefaults: !!axios.defaults.headers?.common?.Authorization
        })
        // Forcer la suppression une dernière fois
        config.headers.Authorization = undefined
        config.headers.authorization = undefined
      } else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[publicAxios] ✅ Request to', config.url || config.baseURL, '- No Authorization header')
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse pour publicAxios
// Transforme les erreurs 401 en erreurs plus génériques pour les routes publiques
publicAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Pour les routes publiques, une erreur 401 ne devrait JAMAIS arriver
    // Si elle arrive, c'est un problème de configuration backend
    if (error.response?.status === 401) {
      console.error('[publicAxios] ⚠️ Erreur 401 sur route publique - Problème de configuration backend')
      // Transformer l'erreur en une erreur plus générique
      const genericError = new Error('Erreur de configuration serveur. La route publique nécessite un token, ce qui ne devrait pas arriver.')
      genericError.name = 'PublicRouteAuthError'
      // Modifier la réponse pour masquer le message "Token manquant"
      if (error.response) {
        error.response.data = {
          ...error.response.data,
          message: 'Erreur de configuration serveur. Veuillez réessayer plus tard.',
          originalMessage: error.response.data?.message
        }
      }
      return Promise.reject(error)
    }
    return Promise.reject(error)
  }
)

/**
 * Instance axios pour les requêtes authentifiées
 * Cette instance ajoute automatiquement le token depuis localStorage
 */
export const authenticatedAxios: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour ajouter le token automatiquement
authenticatedAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Ne JAMAIS utiliser axios.defaults.headers.common
  return config
}, (error) => {
  return Promise.reject(error)
})

// Intercepteur de réponse pour gérer les erreurs 401
authenticatedAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalide ou expiré
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      // Rediriger vers login si on est dans le navigateur
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Fonction helper pour obtenir une instance axios selon le contexte
 * @param requireAuth - Si true, retourne authenticatedAxios, sinon publicAxios
 */
export const getAxiosInstance = (requireAuth: boolean = false): AxiosInstance => {
  return requireAuth ? authenticatedAxios : publicAxios
}

