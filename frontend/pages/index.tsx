import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Features from '../components/Features'
import FeaturedBuildings from '../components/FeaturedBuildings'
import FeaturedUnits from '../components/FeaturedUnits'
import Testimonials from '../components/Testimonials'
import Community from '../components/Community'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { authenticatedAxios } from '../utils/axiosInstances'
import Link from 'next/link'

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [quickStats, setQuickStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Rediriger automatiquement les propriétaires et locataires vers leur dashboard
    if (isAuthenticated && user) {
      if (user.role === 'proprietaire' || user.role === 'locataire') {
        router.push('/dashboard')
        return
      }
    }
  }, [isAuthenticated, user, router])

  const loadProprietaireData = async () => {
    setLoading(true)
    try {
      // Utiliser authenticatedAxios pour les routes protégées
      const [dashboardRes, unitsRes] = await Promise.all([
        authenticatedAxios.get('/proprietaire/dashboard'),
        authenticatedAxios.get('/proprietaire/my-units')
      ])

      if (dashboardRes.data.success) {
        setQuickStats({
          totalUnits: unitsRes.data.data?.length || 0,
          pendingRequests: dashboardRes.data.data?.pendingRequests?.length || 0,
          availableUnits: unitsRes.data.data?.filter((u: any) => u.status === 'disponible').length || 0
        })
      }
    } catch (error) {
      console.error('Erreur chargement données propriétaire:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>MonCondo+ - Gestion moderne de condominiums</title>
        <meta name="description" content="Plateforme moderne pour gérer votre condo ou trouver votre logement idéal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen">
        <Header />
        <main>
          {/* Contenu principal - Visible uniquement pour les visiteurs non authentifiés et les admins */}
          {!isAuthenticated || user?.role === 'admin' ? (
            <>
              <Hero />
              <FeaturedBuildings />
              <FeaturedUnits />
              <Features />
              <Testimonials />
              <Community />
            </>
          ) : (
            // Si propriétaire ou locataire, afficher un message de redirection
            <div className="min-h-screen pt-20 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600">Redirection vers votre tableau de bord...</p>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  )
}

