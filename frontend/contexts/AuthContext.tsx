import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { authenticatedAxios, publicAxios } from '../utils/axiosInstances'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'admin' | 'proprietaire' | 'locataire' | 'visiteur'
  isActive?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Configuration de l'URL de l'API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialiser l'authentification
  useEffect(() => {
    // Récupérer le token depuis localStorage au démarrage
    const storedToken = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('currentUser')

    if (storedToken) {
      setToken(storedToken)
      // NE PAS configurer axios.defaults.headers.common globalement
      // Utiliser authenticatedAxios à la place
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error)
        localStorage.removeItem('currentUser')
      }
    }

    // Vérifier l'authentification
    checkAuth().finally(() => setLoading(false))
  }, [])

  /**
   * Connexion de l'utilisateur
   */
  const login = async (email: string, password: string) => {
    try {
      // Utiliser publicAxios pour le login (pas encore authentifié)
      const response = await publicAxios.post('/auth/login', {
        email,
        password
      }, {
        timeout: 10000 // 10 secondes de timeout
      })

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data
        
        // Sauvegarder le token et l'utilisateur
        localStorage.setItem('authToken', newToken)
        localStorage.setItem('currentUser', JSON.stringify(userData))
        
        setToken(newToken)
        setUser(userData)
        
        // NE PAS configurer axios.defaults.headers.common globalement
        // L'instance authenticatedAxios gère automatiquement le token
      } else {
        throw new Error(response.data.message || 'Erreur de connexion')
      }
    } catch (error: any) {
      let errorMessage = 'Erreur de connexion'
      
      // Détecter les erreurs de connexion réseau
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED') || 
          (error.request && !error.response)) {
        // Vérifier la santé du backend avant d'afficher l'erreur
        try {
          const healthCheck = await publicAxios.get('/health', { timeout: 3000 })
          if (healthCheck.data.success) {
            errorMessage = 'Erreur de connexion. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande.'
          } else {
            errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.\n\nSolution :\n1. Ouvrez un terminal PowerShell\n2. Naviguez vers le dossier backend : cd backend\n3. Démarrez le serveur : npm start\n4. Attendez le message "Server running on port 5000"\n5. Réessayez de vous connecter'
          }
        } catch (healthError) {
          errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.\n\nSolution :\n1. Ouvrez un terminal PowerShell\n2. Naviguez vers le dossier backend : cd backend\n3. Démarrez le serveur : npm start\n4. Attendez le message "Server running on port 5000"\n5. Réessayez de vous connecter'
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré et fonctionne correctement.'
      } else if (error.response) {
        // Erreur HTTP avec réponse
        if (error.response.status === 401) {
          errorMessage = 'Email ou mot de passe incorrect.'
        } else if (error.response.status === 403) {
          errorMessage = 'Accès refusé. Votre compte peut être désactivé.'
        } else if (error.response.status >= 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
        } else {
          errorMessage = error.response.data?.message || `Erreur ${error.response.status}: ${error.response.statusText}`
        }
      } else {
        // Autres erreurs
        errorMessage = error.message || 'Erreur de connexion'
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Déconnexion de l'utilisateur
   */
  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
    setToken(null)
    setUser(null)
    // NE PAS modifier axios.defaults.headers.common
    router.push('/login')
  }

  /**
   * Vérifier l'authentification actuelle
   */
  const checkAuth = async () => {
    const storedToken = localStorage.getItem('authToken')
    
    if (!storedToken) {
      setUser(null)
      setToken(null)
      return
    }

    try {
      // Vérifier le token avec le backend en utilisant authenticatedAxios
      const response = await authenticatedAxios.get('/me')

      if (response.data.success) {
        const userData = response.data.data
        setUser(userData)
        setToken(storedToken)
        // NE PAS configurer axios.defaults.headers.common globalement
        // L'instance authenticatedAxios gère automatiquement le token
        
        // Mettre à jour localStorage
        localStorage.setItem('currentUser', JSON.stringify(userData))
      } else {
        throw new Error('Token invalide')
      }
    } catch (error: any) {
      // Token invalide ou expiré
      console.error('Erreur de vérification auth:', error)
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      setUser(null)
      setToken(null)
      // NE PAS modifier axios.defaults.headers.common
    }
  }

  /**
   * Vérifier si l'utilisateur a un des rôles requis
   * Les administrateurs ont toujours accès à tout
   */
  const hasRole = (roles: string[]): boolean => {
    if (!user) return false
    // Les administrateurs ont accès à tout
    if (user.role === 'admin') return true
    return roles.includes(user.role)
  }

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user && !!token,
    hasRole
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook pour utiliser le contexte d'authentification
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}



