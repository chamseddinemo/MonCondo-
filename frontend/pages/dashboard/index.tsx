import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const getDashboardRoute = () => {
    if (!user) return '/login'
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin'
      case 'proprietaire':
        return '/dashboard/proprietaire'
      case 'locataire':
        return '/dashboard/locataire'
      default:
        return '/'
    }
  }

  // Rediriger vers le dashboard approprié selon le rôle
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (user && user.role !== 'visiteur') {
      const route = getDashboardRoute()
      if (route !== router.pathname) {
        router.push(route)
      } else {
        setLoading(false)
      }
    } else if (user && user.role === 'visiteur') {
      router.push('/')
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [user, isAuthenticated, router])

  return (
    <ProtectedRoute requiredRoles={['admin', 'proprietaire', 'locataire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {loading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-bold mb-8">Mon Tableau de Bord</h1>
              {user && (
                <p className="text-xl text-gray-600 mb-8">
                  Bienvenue, {user.firstName} {user.lastName}
                </p>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <p className="text-yellow-800">
                  Redirection vers votre tableau de bord spécifique...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

