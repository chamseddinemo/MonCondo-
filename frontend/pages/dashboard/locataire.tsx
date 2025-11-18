import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { usePaymentSync } from '../../hooks/usePaymentSync'
import UnitCard from '../../components/locataire/UnitCard'
import QuickActionCard from '../../components/locataire/QuickActionCard'
import NewUnitsBar from '../../components/locataire/NewUnitsBar'
import RequestCard from '../../components/locataire/RequestCard'
import { Unit } from '../../types/unit'
import { Payment } from '../../types/payment'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Request {
  _id: string
  title: string
  type: string
  status: string
  createdAt: string
}

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface Document {
  _id: string
  filename: string
  originalName: string
  category: string
  createdAt: string
  unit?: {
    unitNumber: string
  }
}

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  myUnit: Unit | null
  myRequests: Request[]
  myPayments: Payment[]
  notifications?: Notification[]
  documents?: Document[]
  stats: {
    totalRequests: number
    pendingRequests: number
    inProgressRequests: number
    completedRequests: number
    totalPayments: number
    pendingPayments: number
    overduePayments: number
    paidPayments: number
    unreadMessages: number
  }
}

export default function LocataireDashboard() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextDuePayment, setNextDuePayment] = useState<Payment | null>(null)
  const [paymentStats, setPaymentStats] = useState<any>(null)

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page.')
        setLoading(false)
        return
      }

      console.log('[LOCATAIRE DASHBOARD] 🔄 Chargement des données depuis:', `${API_URL}/locataire/dashboard`)
      
      // Charger les données du dashboard
      const [dashboardResponse, nextPaymentResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/locataire/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }),
        axios.get(`${API_URL}/payments/next-due`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }).catch(() => {
          console.log('[LOCATAIRE DASHBOARD] ⚠️  Erreur récupération prochain paiement (non bloquant)')
          return { data: { success: true, data: null } }
        }),
        axios.get(`${API_URL}/payments/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 5000
        }).catch(() => {
          console.log('[LOCATAIRE DASHBOARD] ⚠️  Erreur récupération stats paiements (non bloquant)')
          return { data: { success: true, data: null } }
        })
      ])

      console.log('[LOCATAIRE DASHBOARD] ✅ Réponses reçues')
      
      // Traiter la réponse principale même si certaines données sont manquantes
      const dashboardData = dashboardResponse.data?.data || {}
      
      if (dashboardResponse.data?.success) {
        // Initialiser avec des valeurs par défaut si certaines données sont manquantes
        setDashboardData({
          user: dashboardData.user || {
            id: authUser?.id || '',
            name: authUser?.firstName && authUser?.lastName ? `${authUser.firstName} ${authUser.lastName}` : 'Utilisateur',
            email: authUser?.email || '',
            role: authUser?.role || 'locataire'
          },
          myUnit: dashboardData.myUnit || null,
          myRequests: dashboardData.myRequests || [],
          myPayments: dashboardData.myPayments || [],
          notifications: dashboardData.notifications || [],
          documents: dashboardData.documents || [],
          stats: dashboardData.stats || {
            totalRequests: 0,
            pendingRequests: 0,
            inProgressRequests: 0,
            completedRequests: 0,
            totalPayments: 0,
            pendingPayments: 0,
            overduePayments: 0,
            paidPayments: 0,
            unreadMessages: 0
          }
        })
        console.log('[LOCATAIRE DASHBOARD] ✨ Données du dashboard chargées')
      } else {
        console.warn('[LOCATAIRE DASHBOARD] ⚠️  Réponse sans success, initialisation avec valeurs par défaut')
        // Initialiser avec des valeurs par défaut
        setDashboardData({
          user: {
            id: authUser?.id || '',
            name: authUser?.firstName && authUser?.lastName ? `${authUser.firstName} ${authUser.lastName}` : 'Utilisateur',
            email: authUser?.email || '',
            role: authUser?.role || 'locataire'
          },
          myUnit: null,
          myRequests: [],
          myPayments: [],
          notifications: [],
          documents: [],
          stats: {
            totalRequests: 0,
            pendingRequests: 0,
            inProgressRequests: 0,
            completedRequests: 0,
            totalPayments: 0,
            pendingPayments: 0,
            overduePayments: 0,
            paidPayments: 0,
            unreadMessages: 0
          }
        })
      }

      if (nextPaymentResponse.data?.success && nextPaymentResponse.data.data) {
        setNextDuePayment(nextPaymentResponse.data.data)
      }

      if (statsResponse.data?.success && statsResponse.data.data) {
        setPaymentStats(statsResponse.data.data)
      }
    } catch (err: any) {
      console.error('[LOCATAIRE DASHBOARD] ❌ Erreur:', err)
      
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        router.push('/login')
        return
      } else {
        setError('Erreur lors du chargement des données. Veuillez réessayer.')
      }
      
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setDashboardData({
        user: {
          id: authUser?.id || '',
          name: authUser?.firstName && authUser?.lastName ? `${authUser.firstName} ${authUser.lastName}` : 'Utilisateur',
          email: authUser?.email || '',
          role: authUser?.role || 'locataire'
        },
        myUnit: null,
        myRequests: [],
        myPayments: [],
        notifications: [],
        documents: [],
        stats: {
          totalRequests: 0,
          pendingRequests: 0,
          inProgressRequests: 0,
          completedRequests: 0,
          totalPayments: 0,
          pendingPayments: 0,
          overduePayments: 0,
          paidPayments: 0,
          unreadMessages: 0
        }
      })
    } finally {
      setLoading(false)
      console.log('[LOCATAIRE DASHBOARD] ✅ Chargement terminé, loading = false')
    }
  }

  // Fonction de refresh sans afficher le loading (pour les synchronisations automatiques)
  const refreshDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const [dashboardResponse, nextPaymentResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/locataire/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }),
        axios.get(`${API_URL}/payments/next-due`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { success: true, data: null } })),
        axios.get(`${API_URL}/payments/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }).catch(() => ({ data: { success: true, data: null } }))
      ])

      const dashboardData = dashboardResponse.data?.data || {}
      if (dashboardResponse.data?.success) {
        setDashboardData({
          user: dashboardData.user || {
            id: authUser?.id || '',
            name: authUser?.firstName && authUser?.lastName ? `${authUser.firstName} ${authUser.lastName}` : 'Utilisateur',
            email: authUser?.email || '',
            role: authUser?.role || 'locataire'
          },
          myUnit: dashboardData.myUnit || null,
          myRequests: dashboardData.myRequests || [],
          myPayments: dashboardData.myPayments || [],
          notifications: dashboardData.notifications || [],
          documents: dashboardData.documents || [],
          stats: dashboardData.stats || {
            totalRequests: 0,
            pendingRequests: 0,
            inProgressRequests: 0,
            completedRequests: 0,
            totalPayments: 0,
            pendingPayments: 0,
            overduePayments: 0,
            paidPayments: 0,
            unreadMessages: 0
          }
        })
      }

      if (nextPaymentResponse.data?.success && nextPaymentResponse.data.data) {
        setNextDuePayment(nextPaymentResponse.data.data)
      }

      if (statsResponse.data?.success && statsResponse.data.data) {
        setPaymentStats(statsResponse.data.data)
      }
    } catch (error) {
      console.error('[LOCATAIRE DASHBOARD] Erreur refresh silencieux:', error)
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleViewContract = () => {
    router.push('/documents')
  }

  const handleViewRequest = (requestId: string) => {
    router.push(`/locataire/requests/${requestId}`)
  }

  const handlePayRent = () => {
    if (nextDuePayment) {
      router.push(`/payments/${nextDuePayment._id}/pay`)
    } else {
      router.push('/payments/locataire')
    }
  }

  const handleContactOwner = () => {
    if (dashboardData?.myUnit?.proprietaire) {
      router.push(`/messages?contact=${dashboardData.myUnit.proprietaire._id}`)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Utiliser le hook de synchronisation centralisé (sans afficher le loading)
  usePaymentSync(refreshDashboardData, [authUser?._id])

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement du tableau de bord...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  // S'assurer que dashboardData est toujours initialisé
  if (!dashboardData) {
    return (
      <ProtectedRoute requiredRoles={['locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2">Aucune donnée disponible</h2>
            <p className="text-gray-600 mb-6">
              Impossible de charger les données du tableau de bord.
            </p>
            <button
              onClick={() => {
                setLoading(true)
                loadDashboardData()
              }}
              className="btn-primary"
            >
              Réessayer
            </button>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['locataire']}>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* En-tête personnalisé avec photo/avatar */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg backdrop-blur-sm border-4 border-white border-opacity-30">
                    {authUser?.firstName?.charAt(0) || 'U'}{authUser?.lastName?.charAt(0) || ''}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      {authUser?.firstName} {authUser?.lastName}
                    </h1>
                    <p className="text-primary-100 text-lg mb-1">
                      {authUser?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        dashboardData?.myUnit 
                          ? 'bg-green-500 bg-opacity-30 text-white border border-white border-opacity-30'
                          : 'bg-yellow-500 bg-opacity-30 text-white border border-white border-opacity-30'
                      }`}>
                        {dashboardData?.myUnit 
                          ? '✅ Actif' 
                          : dashboardData?.myRequests?.some(r => r.type === 'location' && r.status === 'en_attente')
                          ? '⏳ En attente d\'approbation'
                          : '🏠 Candidat à la location'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link 
                  href="/locataire/profile" 
                  className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-white font-semibold backdrop-blur-sm border border-white border-opacity-30"
                >
                  ⚙️ Modifier mon profil
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button onClick={loadDashboardData} className="mt-2 btn-primary text-sm">
                Réessayer
              </button>
            </div>
          )}

          {dashboardData && (
            <div className="space-y-6">
              {/* Résumé de situation - Paiements */}
              {nextDuePayment && (
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-xl p-6 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Prochain paiement dû</h2>
                      <div className="space-y-1">
                        <p className="text-3xl font-bold">{nextDuePayment.amount.toFixed(2)} $CAD</p>
                        <p className="text-primary-100">
                          Date d'échéance: {new Date(nextDuePayment.dueDate).toLocaleDateString('fr-CA', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                        {getDaysUntilDue(nextDuePayment.dueDate) > 0 ? (
                          <p className="text-sm text-primary-100">
                            {getDaysUntilDue(nextDuePayment.dueDate)} jour(s) restant(s)
                          </p>
                        ) : (
                          <p className="text-sm text-red-200 font-semibold">
                            ⚠️ {Math.abs(getDaysUntilDue(nextDuePayment.dueDate))} jour(s) de retard
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handlePayRent}
                      className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-lg"
                    >
                      💳 Payer maintenant
                    </button>
                  </div>
                </div>
              )}

              {/* Raccourcis visuels */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionCard
                  icon="💳"
                  title="Paiements"
                  description="Gérer mes factures"
                  href="/payments/locataire"
                  color="green"
                  badge={dashboardData.stats?.overduePayments > 0 ? dashboardData.stats.overduePayments : undefined}
                />
                <QuickActionCard
                  icon="🔧"
                  title="Maintenance"
                  description="Demandes de réparation"
                  href="/locataire/services"
                  color="orange"
                  badge={dashboardData.stats?.pendingRequests > 0 ? dashboardData.stats.pendingRequests : undefined}
                />
                <QuickActionCard
                  icon="👥"
                  title="Communauté"
                  description="Événements et discussions"
                  href="/community"
                  color="blue"
                />
                <QuickActionCard
                  icon="⚙️"
                  title="Paramètres"
                  description="Mon profil et préférences"
                  href="/locataire/settings"
                  color="purple"
                />
              </div>

              {/* Section Mon Unité */}
              {dashboardData.myUnit ? (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <span className="mr-3 text-3xl">🏠</span>
                    Mon Unité
                  </h2>
                  <UnitCard
                    unit={dashboardData.myUnit}
                    onViewContract={handleViewContract}
                    onPayRent={handlePayRent}
                    onContactOwner={handleContactOwner}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                  <div className="text-6xl mb-4">🏠</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucune unité assignée</h2>
                  <p className="text-gray-600 mb-4">Vous n'avez pas encore d'unité assignée.</p>
                  <Link href="/units" className="btn-primary">
                    Voir les unités disponibles
                  </Link>
                </div>
              )}

              {/* Statistiques rapides */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Demandes en attente</p>
                    <span className="text-2xl">⏳</span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-600">
                    {dashboardData.stats?.pendingRequests || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Paiements en retard</p>
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">
                    {dashboardData.stats?.overduePayments || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm">Messages non lus</p>
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {dashboardData.stats?.unreadMessages || 0}
                  </p>
                </div>
              </div>

              {/* Section 2 - Services & Maintenance */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3 text-3xl">🔧</span>
                    Services & Maintenance
                  </h2>
                  <Link href="/locataire/services" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Voir tout →
                  </Link>
                </div>
                
                {/* Indicateurs interactifs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Link 
                    href="/locataire/services?action=new"
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200 hover:border-green-400 transition-all cursor-pointer text-center"
                  >
                    <div className="text-3xl mb-2">➕</div>
                    <p className="font-semibold text-gray-900">Nouvelle demande</p>
                  </Link>
                  <Link 
                    href="/locataire/services?status=en_attente"
                    className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-200 hover:border-yellow-400 transition-all cursor-pointer text-center"
                  >
                    <div className="text-3xl mb-2">📋</div>
                    <p className="font-semibold text-gray-900">
                      En attente ({dashboardData.stats?.pendingRequests || 0})
                    </p>
                  </Link>
                  <Link 
                    href="/locataire/services?status=en_cours"
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer text-center"
                  >
                    <div className="text-3xl mb-2">⏳</div>
                    <p className="font-semibold text-gray-900">
                      En cours ({dashboardData.stats?.inProgressRequests || 0})
                    </p>
                  </Link>
                  <Link 
                    href="/locataire/services?status=termine"
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer text-center"
                  >
                    <div className="text-3xl mb-2">🔄</div>
                    <p className="font-semibold text-gray-900">
                      Terminées ({dashboardData.stats?.completedRequests || 0})
                    </p>
                  </Link>
                </div>

                {/* Liste des demandes récentes */}
                {dashboardData.myRequests && dashboardData.myRequests.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.myRequests.slice(0, 5).map((request) => (
                      <RequestCard
                        key={request._id}
                        request={request}
                        onViewDetails={() => router.push(`/locataire/requests/${request._id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">Aucune demande pour le moment</p>
                    <Link href="/locataire/services?action=new" className="text-primary-600 hover:text-primary-700 font-semibold">
                      Créer une nouvelle demande →
                    </Link>
                  </div>
                )}
              </div>

              {/* Section 3 - Communauté */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3 text-3xl">👥</span>
                    Communauté
                  </h2>
                  <Link href="/community" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Voir tout →
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-bold text-lg mb-2">Assemblée générale annuelle</h3>
                    <p className="text-sm text-gray-600 mb-2">15 Janvier 2024 - 19h00</p>
                    <p className="text-sm text-gray-600 mb-3">Salle communautaire</p>
                    <Link href="/community" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      Participer →
                    </Link>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <h3 className="font-bold text-lg mb-2">Soirée de bienvenue</h3>
                    <p className="text-sm text-gray-600 mb-2">22 Janvier 2024 - 18h00</p>
                    <p className="text-sm text-gray-600 mb-3">Jardin communautaire</p>
                    <Link href="/community" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      Participer →
                    </Link>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <h3 className="font-bold text-lg mb-2">Nettoyage printanier</h3>
                    <p className="text-sm text-gray-600 mb-2">5 Février 2024 - 10h00</p>
                    <p className="text-sm text-gray-600 mb-3">Espaces communs</p>
                    <Link href="/community" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      Participer →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Section 4 - Notifications & Documents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Notifications */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                      <span className="mr-2">📬</span>
                      Notifications
                    </h2>
                    <Link href="/notifications" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                      Voir tout →
                    </Link>
                  </div>
                  {dashboardData.notifications && dashboardData.notifications.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {dashboardData.notifications.map((notification) => (
                        <div 
                          key={notification._id} 
                          className={`p-3 rounded-lg border-l-4 ${
                            notification.isRead 
                              ? 'bg-gray-50 border-gray-300' 
                              : 'bg-blue-50 border-blue-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString('fr-CA')}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Aucune notification</p>
                  )}
                </div>

                {/* Documents */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                      <span className="mr-2">📄</span>
                      Documents
                    </h2>
                    <Link href="/documents" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                      Voir tout →
                    </Link>
                  </div>
                  {dashboardData.documents && dashboardData.documents.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {dashboardData.documents.map((doc) => (
                        <Link
                          key={doc._id}
                          href={`/documents/${doc._id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {doc.category === 'contrat' ? '📄' :
                               doc.category === 'facture' ? '🧾' :
                               doc.category === 'reglement' ? '📋' :
                               '📎'}
                            </span>
                            <div>
                              <p className="font-semibold text-sm">{doc.originalName}</p>
                              <p className="text-xs text-gray-500">
                                {doc.unit ? `Unité ${doc.unit.unitNumber}` : 'Document général'} • {new Date(doc.createdAt).toLocaleDateString('fr-CA')}
                              </p>
                            </div>
                          </div>
                          <span className="text-primary-600">→</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Aucun document disponible</p>
                  )}
                </div>
              </div>

              {/* Barre des nouvelles unités - Toujours visible même si le locataire a une unité */}
              <div>
                <NewUnitsBar />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}
