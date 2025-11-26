import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  redirectTo?: string
}

/**
 * Composant ProtectedRoute pour protéger les pages selon l'authentification et les rôles
 * 
 * @param children - Le contenu à afficher si l'accès est autorisé
 * @param requiredRoles - Les rôles autorisés (optionnel). Si non spécifié, seul l'authentification est requise
 * @param redirectTo - Route de redirection si non autorisé (défaut: '/login')
 * 
 * @example
 * // Protection simple (authentification requise)
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // Protection par rôle
 * <ProtectedRoute requiredRoles={['admin']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 * 
 * // Protection multi-rôles
 * <ProtectedRoute requiredRoles={['admin', 'proprietaire']}>
 *   <ManagementPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isAuthenticated, loading, hasRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (loading) return

    // Si non authentifié, rediriger vers login (utiliser replace pour éviter les retours)
    // Vérifier que nous ne sommes pas déjà sur la page de redirection pour éviter les boucles
    if (!isAuthenticated || !user) {
      // Éviter les redirections multiples en vérifiant la route actuelle et l'état de navigation
      const currentPath = router.pathname || router.asPath
      const isAlreadyOnRedirectPage = currentPath === redirectTo || currentPath.includes(redirectTo)
      
      if (!isAlreadyOnRedirectPage) {
        // Utiliser window.location.href au lieu de router.replace pour éviter les conflits
        // Cela force une navigation complète et évite les problèmes d'abort
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo
        }
      }
      return
    }

    // Permettre aux visiteurs d'accéder à /locataire/requests/[id] pour signer leurs documents
    const isRequestDetailPage = router.pathname.startsWith('/locataire/requests/');
    if (isRequestDetailPage && user.role === 'visiteur') {
      // Les visiteurs peuvent accéder pour signer leurs documents
      return;
    }

    // Permettre aux propriétaires d'accéder à /locataire/requests/[id] s'ils ont créé la demande
    // (car ils étaient visiteur au moment de la création)
    if (isRequestDetailPage && user.role === 'proprietaire') {
      // Les propriétaires peuvent accéder pour signer leurs documents de demande
      return;
    }

    // Les administrateurs ont accès à tout, peu importe les rôles requis
    if (user.role === 'admin') {
      // Admin a accès, continuer
    } else if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      // Si des rôles sont requis et que l'utilisateur n'est pas admin, vérifier le rôle
      router.replace('/unauthorized')
      return
    }
  }, [loading, isAuthenticated, user, requiredRoles, hasRole, router, redirectTo])

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Ne rien afficher pendant la redirection
  if (!isAuthenticated || !user) {
    return null
  }

  // Permettre aux visiteurs d'accéder à /locataire/requests/[id] pour signer leurs documents
  const isRequestDetailPage = router.pathname.startsWith('/locataire/requests/');
  if (isRequestDetailPage && (user.role === 'visiteur' || user.role === 'proprietaire')) {
    // Les visiteurs et propriétaires peuvent accéder pour signer leurs documents
    // (les propriétaires peuvent avoir été visiteur au moment de la création de la demande)
  } else if (user.role === 'admin') {
    // Les administrateurs ont accès à tout, peu importe les rôles requis
    // Admin a accès, continuer
  } else if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    // Si des rôles sont requis et que l'utilisateur n'est pas admin, vérifier le rôle
    return null
  }

  // Afficher le contenu protégé
  return <>{children}</>
}



