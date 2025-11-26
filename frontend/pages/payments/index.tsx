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
        router.replace('/login')
        return
      }

      // Rediriger selon le rôle (utiliser replace pour éviter les retours)
      if (user?.role === 'locataire') {
        router.replace('/payments/locataire')
      } else if (user?.role === 'proprietaire') {
        router.replace('/payments/proprietaire')
      } else if (user?.role === 'admin') {
        router.replace('/payments/admin')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [user, isAuthenticated, loading, router])

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
      <Footer />
    </>
  )
}

