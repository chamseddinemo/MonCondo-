import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRedirectedRef = useRef(false) // Utiliser un ref pour éviter les redirections multiples

  const getDashboardRoute = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin'
      case 'proprietaire':
        return '/dashboard/proprietaire'
      case 'locataire':
        return '/dashboard/locataire'
      case 'visiteur':
        return '/dashboard/visiteur'
      default:
        return '/login'
    }
  }

  // Rediriger immédiatement vers le dashboard approprié selon le rôle
  useEffect(() => {
    // Attendre que l'authentification soit chargée
    if (authLoading) return

    // Éviter les redirections multiples avec un ref
    if (hasRedirectedRef.current) return

    if (!isAuthenticated) {
      // Ne rediriger que si on n'est pas déjà sur la page de login
      if (router.pathname !== '/login' && router.asPath !== '/login') {
        hasRedirectedRef.current = true
        setIsRedirecting(true)
        router.replace('/login').catch(() => {
          // Si la navigation échoue, réinitialiser le flag
          hasRedirectedRef.current = false
          setIsRedirecting(false)
        })
      }
      return
    }

    if (user) {
      const route = getDashboardRoute()
      // Utiliser replace au lieu de push pour éviter les retours en arrière
      // Ne rediriger que si nécessaire et si on n'est pas déjà en train de rediriger
      if (route && route !== router.pathname && route !== router.asPath && route !== '/login') {
        hasRedirectedRef.current = true
        setIsRedirecting(true)
        // Redirection immédiate sans setTimeout pour éviter les conflits
        router.replace(route).catch(() => {
          // Si la navigation échoue, réinitialiser le flag
          hasRedirectedRef.current = false
          setIsRedirecting(false)
        })
      } else if (route === router.pathname || route === router.asPath) {
        // Si on est déjà sur la bonne route, réinitialiser
        hasRedirectedRef.current = false
        setIsRedirecting(false)
      }
    }
  }, [user, isAuthenticated, authLoading, router])

  // Afficher un loader pendant le chargement de l'authentification ou la redirection
  if (authLoading || isRedirecting || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Vérification de l\'authentification...' : 'Chargement...'}
          </p>
        </div>
      </div>
    )
  }

  // Si on arrive ici, l'utilisateur est authentifié mais la redirection n'a pas fonctionné
  // Ne pas forcer la redirection ici pour éviter les conflits - laisser le useEffect gérer
  const route = getDashboardRoute()
  if (route && route !== router.pathname && route !== '/login' && !isRedirecting) {
    // Le useEffect va gérer la redirection, juste afficher un loader
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Ne devrait jamais arriver ici, mais au cas où
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}

