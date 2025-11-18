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

    // Si non authentifié, rediriger vers login
    if (!isAuthenticated || !user) {
      router.push(redirectTo)
      return
    }

    // Les administrateurs ont accès à tout, peu importe les rôles requis
    if (user.role === 'admin') {
      // Admin a accès, continuer
    } else if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      // Si des rôles sont requis et que l'utilisateur n'est pas admin, vérifier le rôle
      router.push('/unauthorized')
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

  // Les administrateurs ont accès à tout, peu importe les rôles requis
  if (user.role === 'admin') {
    // Admin a accès, continuer
  } else if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    // Si des rôles sont requis et que l'utilisateur n'est pas admin, vérifier le rôle
    return null
  }

  // Afficher le contenu protégé
  return <>{children}</>
}



