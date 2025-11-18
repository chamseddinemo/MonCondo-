import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function PaymentsIndex() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      // Rediriger selon le rôle
      if (user?.role === 'locataire') {
        router.push('/payments/locataire')
      } else if (user?.role === 'proprietaire') {
        router.push('/payments/proprietaire')
      } else if (user?.role === 'admin') {
        router.push('/payments/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, isAuthenticated, loading, router])

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
      <Footer />
    </>
  )
}

