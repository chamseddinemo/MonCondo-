import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { usePaymentSync } from '../../hooks/usePaymentSync'
import { useRealEstateData } from '../../hooks/useRealEstateData'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  totalBuildings: number
  totalUnits: number
  availableUnits: number
  occupiedUnits: number
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  totalPayments: number
  overduePayments?: number
  currentMonthRevenue?: number
  usersByRole?: { [key: string]: number }
  paymentsByStatus?: {
    paye?: { count: number; total: number }
    en_attente?: { count: number; total: number }
    en_retard?: { count: number; total: number }
  }
}

interface RecentUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface RecentRequest {
  id: string
  type: string
  title?: string
  status: string
  user: {
    firstName: string
    lastName: string
    email: string
  } | null
  createdAt: string
}

interface RecentPayment {
  id: string
  amount: number
  status: string
  payer?: {
    firstName: string
    lastName: string
    email: string
  }
  unit?: {
    unitNumber: string
  }
  createdAt: string
}

interface RecentMessage {
  id: string
  subject?: string
  sender?: {
    firstName: string
    lastName: string
    email: string
  }
  receiver?: {
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
}

export default function AdminDashboard() {
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  // Utiliser le hook centralisé pour toutes les données immobilières
  const { 
    stats: globalStats, 
    loading: statsLoading, 
    refreshStats,
    refreshData 
  } = useRealEstateData({
    autoRefresh: true,
    refreshInterval: 30000 // Rafraîchir toutes les 30 secondes
  })
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats
    recentUsers: RecentUser[]
    recentRequests: RecentRequest[]
    recentPayments?: RecentPayment[]
    recentMessages?: RecentMessage[]
  }>({
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      totalBuildings: 0,
      totalUnits: 0,
      availableUnits: 0,
      occupiedUnits: 0,
      totalRequests: 0,
      pendingRequests: 0,
      completedRequests: 0,
      totalPayments: 0,
      overduePayments: 0,
      currentMonthRevenue: 0,
      usersByRole: {},
      paymentsByStatus: {
        paye: { count: 0, total: 0 },
        en_attente: { count: 0, total: 0 },
        en_retard: { count: 0, total: 0 }
      }
    },
    recentUsers: [],
    recentRequests: [],
    recentPayments: [],
    recentMessages: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const loadDashboardData = async (retry = false) => {
    try {
      setError(null)
      setLoading(true)
      
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        setError('Vous devez être connecté pour accéder à cette page')
        setLoading(false)
        router.push('/login')
        return
      }

      console.log('[ADMIN DASHBOARD] 🔄 Chargement des données depuis:', `${API_URL}/admin/dashboard`)
      console.log('[ADMIN DASHBOARD] 🔑 Token présent:', !!token)

      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      })
      
      console.log('[ADMIN DASHBOARD] ✅ Réponse reçue:', response.status)
      
      // Traiter la réponse même si certaines données sont manquantes
      const data = response.data?.data || {}
      console.log('[ADMIN DASHBOARD] 📊 Données reçues:', data)
      
      // Rafraîchir les stats globales d'abord pour avoir les dernières valeurs
      await refreshStats()
      
      // Utiliser les stats globales pour les bâtiments et unités (synchronisées)
      // Les autres stats viennent du dashboard admin
      const processedData = {
        stats: {
          totalUsers: data.stats?.totalUsers ?? 0,
          activeUsers: data.stats?.activeUsers ?? 0,
          inactiveUsers: (data.stats?.totalUsers ?? 0) - (data.stats?.activeUsers ?? 0),
          // Utiliser les stats globales synchronisées (prioritaires)
          totalBuildings: globalStats.totalBuildings > 0 ? globalStats.totalBuildings : (data.stats?.totalBuildings ?? 0),
          totalUnits: globalStats.totalUnits > 0 ? globalStats.totalUnits : (data.stats?.totalUnits ?? 0),
          availableUnits: globalStats.availableUnits > 0 ? globalStats.availableUnits : (data.stats?.availableUnits ?? 0),
          occupiedUnits: globalStats.rentedUnits > 0 ? globalStats.rentedUnits : ((data.stats?.totalUnits ?? 0) - (data.stats?.availableUnits ?? 0)),
          totalRequests: data.stats?.totalRequests ?? 0,
          pendingRequests: data.stats?.pendingRequests ?? 0,
          completedRequests: data.stats?.completedRequests ?? 0,
          totalPayments: data.stats?.totalPayments ?? 0,
          overduePayments: data.stats?.overduePayments ?? 0,
          currentMonthRevenue: globalStats.monthlyRevenue > 0 ? globalStats.monthlyRevenue : (data.stats?.currentMonthRevenue ?? 0),
          usersByRole: data.stats?.usersByRole ?? {},
          paymentsByStatus: {
            paye: data.stats?.paymentsByStatus?.paye ?? { count: 0, total: 0 },
            en_attente: data.stats?.paymentsByStatus?.en_attente ?? { count: 0, total: 0 },
            en_retard: data.stats?.paymentsByStatus?.en_retard ?? { count: 0, total: 0 }
          }
        },
        recentUsers: data.recentUsers || [],
        recentRequests: data.recentRequests || [],
        recentPayments: data.recentPayments || [],
        recentMessages: data.recentMessages || []
      }
      
      console.log('[ADMIN DASHBOARD] ✨ Données traitées:', processedData)
      console.log('[ADMIN DASHBOARD] 📈 Statistiques:', {
        users: processedData.stats.totalUsers,
        buildings: processedData.stats.totalBuildings,
        units: processedData.stats.totalUnits,
        requests: processedData.stats.totalRequests
      })
      
      setDashboardData(processedData)
      setBackendConnected(true)
      setRetryCount(0)
      setLoading(false)
    } catch (error: any) {
      console.error('[ADMIN DASHBOARD] ❌ Erreur:', error)
      
      if (error.response) {
        console.error('[ADMIN DASHBOARD] 📡 Status:', error.response.status)
        console.error('[ADMIN DASHBOARD] 📄 Data:', error.response.data)
        
        if (error.response.status === 401) {
          setError('Session expirée. Redirection vers la page de connexion...')
          setLoading(false)
          setTimeout(() => router.push('/login'), 2000)
          return
        } else if (error.response.status === 403) {
          setError('Accès refusé. Vous n\'avez pas les permissions nécessaires.')
        } else if (error.response.status === 404) {
          setError('Route non trouvée. Vérifiez que le backend est démarré et que la route /api/admin/dashboard existe.')
        } else {
          setError(`Erreur serveur: ${error.response.status} - ${error.response.data?.message || 'Erreur inconnue'}`)
        }
      } else if (error.request) {
        console.error('[ADMIN DASHBOARD] 🔌 Pas de réponse du backend')
        setError('Le serveur backend ne répond pas. Assurez-vous qu\'il est démarré sur le port 5000.')
        
        // Retry automatique si pas de réponse
        if (!retry && retryCount < 3) {
          console.log(`[ADMIN DASHBOARD] 🔄 Tentative de reconnexion ${retryCount + 1}/3...`)
          setRetryCount(c => c + 1)
          setTimeout(() => loadDashboardData(true), 3000)
          return // Ne pas mettre loading à false ici, on va réessayer
        } else {
          // Après 3 tentatives, initialiser avec des données vides
          setDashboardData({
            stats: {
              totalUsers: 0,
              activeUsers: 0,
              inactiveUsers: 0,
              totalBuildings: 0,
              totalUnits: 0,
              availableUnits: 0,
              occupiedUnits: 0,
              totalRequests: 0,
              pendingRequests: 0,
              completedRequests: 0,
              totalPayments: 0,
              overduePayments: 0,
              currentMonthRevenue: 0,
              usersByRole: {},
              paymentsByStatus: {
                paye: { count: 0, total: 0 },
                en_attente: { count: 0, total: 0 },
                en_retard: { count: 0, total: 0 }
              }
            },
            recentUsers: [],
            recentRequests: [],
            recentPayments: [],
            recentMessages: []
          })
          setLoading(false)
        }
      } else {
        setError(`Erreur: ${error.message}`)
        // Initialiser avec des données vides en cas d'erreur
        setDashboardData({
          stats: {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            totalBuildings: 0,
            totalUnits: 0,
            availableUnits: 0,
            occupiedUnits: 0,
            totalRequests: 0,
            pendingRequests: 0,
            completedRequests: 0,
            totalPayments: 0,
            overduePayments: 0,
            currentMonthRevenue: 0,
            usersByRole: {},
            paymentsByStatus: {
              paye: { count: 0, total: 0 },
              en_attente: { count: 0, total: 0 },
              en_retard: { count: 0, total: 0 }
            }
          },
          recentUsers: [],
          recentRequests: [],
          recentPayments: [],
          recentMessages: []
        })
        setLoading(false)
      }
      
      setBackendConnected(false)
    }
  }

  // Fonction de refresh sans afficher le loading (pour les synchronisations automatiques)
  const refreshDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      // Rafraîchir les stats globales d'abord
      await refreshStats()

      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      })
      
      if (response.data?.data) {
        const data = response.data.data
        const processedData = {
          stats: {
            totalUsers: data.stats?.totalUsers ?? 0,
            activeUsers: data.stats?.activeUsers ?? 0,
            inactiveUsers: (data.stats?.totalUsers ?? 0) - (data.stats?.activeUsers ?? 0),
            // Utiliser les stats globales synchronisées (prioritaires)
            totalBuildings: globalStats.totalBuildings > 0 ? globalStats.totalBuildings : (data.stats?.totalBuildings ?? 0),
            totalUnits: globalStats.totalUnits > 0 ? globalStats.totalUnits : (data.stats?.totalUnits ?? 0),
            availableUnits: globalStats.availableUnits > 0 ? globalStats.availableUnits : (data.stats?.availableUnits ?? 0),
            occupiedUnits: globalStats.rentedUnits > 0 ? globalStats.rentedUnits : ((data.stats?.totalUnits ?? 0) - (data.stats?.availableUnits ?? 0)),
            totalRequests: data.stats?.totalRequests ?? 0,
            pendingRequests: data.stats?.pendingRequests ?? 0,
            completedRequests: data.stats?.completedRequests ?? 0,
            totalPayments: data.stats?.totalPayments ?? 0,
            overduePayments: data.stats?.overduePayments ?? 0,
            currentMonthRevenue: globalStats.monthlyRevenue > 0 ? globalStats.monthlyRevenue : (data.stats?.currentMonthRevenue ?? 0),
            usersByRole: data.stats?.usersByRole ?? {},
            paymentsByStatus: {
              paye: data.stats?.paymentsByStatus?.paye ?? { count: 0, total: 0 },
              en_attente: data.stats?.paymentsByStatus?.en_attente ?? { count: 0, total: 0 },
              en_retard: data.stats?.paymentsByStatus?.en_retard ?? { count: 0, total: 0 }
            }
          },
          recentUsers: data.recentUsers || [],
          recentRequests: data.recentRequests || [],
          recentPayments: data.recentPayments || [],
          recentMessages: data.recentMessages || []
        }
        setDashboardData(processedData)
        setBackendConnected(true)
      }
    } catch (error) {
      console.error('[ADMIN DASHBOARD] Erreur refresh silencieux:', error)
    }
  }

  // Charger les données seulement après vérification de l'authentification
  useEffect(() => {
    // Attendre que l'authentification soit vérifiée avant de charger les données
    if (authLoading) return
    
    // Si non authentifié, ne pas charger les données (ProtectedRoute gère la redirection)
    if (!isAuthenticated || !authUser) return
    
    // Charger les données seulement si l'utilisateur est authentifié et admin
    if (authUser && authUser.role === 'admin') {
      loadDashboardData()
    }
  }, [authLoading, isAuthenticated, authUser])

  // Utiliser le hook de synchronisation centralisé (sans afficher le loading)
  usePaymentSync(refreshDashboardData, [authUser?._id])

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'en_attente': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'termine': 'bg-green-100 text-green-800',
      'accepte': 'bg-green-100 text-green-800',
      'refuse': 'bg-red-100 text-red-800',
      'paye': 'bg-green-100 text-green-800',
      'en_retard': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'en_cours': 'En cours',
      'termine': 'Terminée',
      'accepte': 'Acceptée',
      'refuse': 'Refusée',
      'paye': 'Payé',
      'en_retard': 'En retard'
    }
    return labels[status] || status
  }

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      'admin': 'Administrateur',
      'proprietaire': 'Propriétaire',
      'locataire': 'Locataire',
      'visiteur': 'Visiteur'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'admin': 'bg-purple-100 text-purple-800',
      'proprietaire': 'bg-blue-100 text-blue-800',
      'locataire': 'bg-green-100 text-green-800',
      'visiteur': 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  // Afficher un loader pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Ne rien afficher si non authentifié (ProtectedRoute gère la redirection)
  if (!isAuthenticated || !authUser) {
    return null
  }

  // Vérifier que l'utilisateur a le bon rôle
  if (authUser.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des données depuis la base de données...</p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">Tentative {retryCount}/3</p>
            )}
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Tableau de Bord Administrateur</h1>
            {authUser && (
              <p className="text-gray-600">
                Bienvenue, <span className="font-semibold">{authUser.firstName} {authUser.lastName}</span>
              </p>
            )}
            
            {/* Indicateur de connexion */}
            {backendConnected ? (
              <div className="mt-2 bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-sm text-green-800 flex items-center">
                  <span className="mr-2">✅</span>
                  <span>Connecté au backend - Données en temps réel de la base de données</span>
                </p>
              </div>
            ) : error && (
              <div className="mt-2 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="text-xl mr-3">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800 mb-1">Erreur de connexion</h3>
                    <p className="text-sm text-red-700 mb-2">{error}</p>
                    <button
                      onClick={() => loadDashboardData()}
                      className="btn-primary text-sm mt-2"
                    >
                      🔄 Réessayer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alertes importantes */}
          {dashboardData.stats.pendingRequests > 0 && (
            <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="text-2xl mr-3">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-800">Demandes en attente</h3>
                  <p className="text-yellow-700">
                    {dashboardData.stats.pendingRequests} demande(s) nécessitent votre attention
                  </p>
                </div>
                <Link href="/admin/requests" className="btn-primary text-sm">
                  Voir les demandes
                </Link>
              </div>
            </div>
          )}
          
          {dashboardData.stats.overduePayments && dashboardData.stats.overduePayments > 0 && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="text-2xl mr-3">🔴</div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800">Paiements en retard</h3>
                  <p className="text-red-700">
                    {dashboardData.stats.overduePayments} paiement(s) en retard nécessitent un suivi
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[ADMIN DASHBOARD] Navigation vers paiements en retard');
                    window.location.href = '/payments/admin?status=en_retard';
                  }}
                  className="btn-primary text-sm cursor-pointer"
                >
                  Voir les paiements
                </button>
              </div>
            </div>
          )}

          {/* Statistiques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/admin/users" className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Utilisateurs</p>
                  <p className="text-3xl font-bold">{dashboardData.stats.totalUsers}</p>
                  <p className="text-blue-100 text-xs mt-1">{dashboardData.stats.activeUsers} actifs</p>
                </div>
                <div className="text-4xl opacity-80">👥</div>
              </div>
            </Link>

            <Link href="/admin/buildings" className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Immeubles</p>
                  <p className="text-3xl font-bold">{dashboardData.stats.totalBuildings}</p>
                  <p className="text-green-100 text-xs mt-1">En gestion</p>
                </div>
                <div className="text-4xl opacity-80">🏢</div>
              </div>
            </Link>

            <Link href="/admin/units" className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Unités</p>
                  <p className="text-3xl font-bold">{dashboardData.stats.totalUnits}</p>
                  <p className="text-purple-100 text-xs mt-1">{dashboardData.stats.availableUnits} disponibles</p>
                </div>
                <div className="text-4xl opacity-80">🏠</div>
              </div>
            </Link>

            <Link href="/admin/requests" className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Demandes</p>
                  <p className="text-3xl font-bold">{dashboardData.stats.totalRequests}</p>
                  <p className="text-orange-100 text-xs mt-1">{dashboardData.stats.pendingRequests} en attente</p>
                </div>
                <div className="text-4xl opacity-80">📋</div>
              </div>
            </Link>
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/admin/users" className="card p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">👥</span>
                Utilisateurs
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-lg">{dashboardData.stats.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Actifs</span>
                  <span className="font-semibold text-green-600">{dashboardData.stats.activeUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Inactifs</span>
                  <span className="font-semibold text-gray-500">{dashboardData.stats.inactiveUsers}</span>
                </div>
              </div>
              <div className="mt-4 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                Voir tous les utilisateurs →
              </div>
            </Link>

            <Link href="/admin/units" className="card p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">🏠</span>
                Unités
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-lg">{dashboardData.stats.totalUnits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Disponibles</span>
                  <span className="font-semibold text-green-600">{dashboardData.stats.availableUnits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Occupées</span>
                  <span className="font-semibold text-blue-600">{dashboardData.stats.occupiedUnits}</span>
                </div>
              </div>
              <div className="mt-4 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                Gérer les unités →
              </div>
            </Link>

            <Link href="/admin/requests" className="card p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="mr-2">📋</span>
                Demandes
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-lg">{dashboardData.stats.totalRequests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">En attente</span>
                  <span className="font-semibold text-yellow-600">{dashboardData.stats.pendingRequests}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Complétées</span>
                  <span className="font-semibold text-green-600">{dashboardData.stats.completedRequests}</span>
                </div>
              </div>
              <div className="mt-4 text-primary-600 hover:text-primary-700 font-semibold text-sm">
                Voir toutes les demandes →
              </div>
            </Link>
          </div>

          {/* Statistiques financières */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Revenus ce mois</p>
                  <p className="text-2xl font-bold">${(dashboardData.stats.currentMonthRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="text-4xl opacity-80">💵</div>
              </div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Paiements payés</p>
                  <p className="text-2xl font-bold">{dashboardData.stats.paymentsByStatus?.paye?.count || 0}</p>
                  <p className="text-green-100 text-xs mt-1">${((dashboardData.stats.paymentsByStatus?.paye?.total) || 0).toLocaleString()}</p>
                </div>
                <div className="text-4xl opacity-80">✅</div>
              </div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm mb-1">Paiements en attente</p>
                  <p className="text-2xl font-bold">{dashboardData.stats.paymentsByStatus?.en_attente?.count || 0}</p>
                  <p className="text-red-100 text-xs mt-1">${((dashboardData.stats.paymentsByStatus?.en_attente?.total) || 0).toLocaleString()}</p>
                </div>
                <div className="text-4xl opacity-80">⏳</div>
              </div>
            </div>
          </div>

          {/* Répartition des utilisateurs par rôle */}
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Répartition des utilisateurs par rôle</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dashboardData.stats.usersByRole && Object.keys(dashboardData.stats.usersByRole).length > 0 ? (
                Object.entries(dashboardData.stats.usersByRole).map(([role, count]) => (
                  <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">{getRoleLabel(role)}</p>
                    <p className="text-2xl font-bold">{count as number}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Administrateurs</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.usersByRole?.admin || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Propriétaires</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.usersByRole?.proprietaire || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Locataires</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.usersByRole?.locataire || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Visiteurs</p>
                    <p className="text-2xl font-bold">{dashboardData.stats.usersByRole?.visiteur || 0}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Activité récente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Utilisateurs récents</h2>
                <Link href="/admin/users" className="text-sm text-primary-600 hover:text-primary-700">
                  Voir tout
                </Link>
              </div>
              {dashboardData.recentUsers.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(user.createdAt).toLocaleDateString('fr-CA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun utilisateur récent</p>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Demandes récentes</h2>
                <Link href="/admin/requests" className="text-sm text-primary-600 hover:text-primary-700">
                  Voir tout
                </Link>
              </div>
              {dashboardData.recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentRequests.map((request) => (
                    <div key={request.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => router.push(`/admin/requests`)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold capitalize text-primary-600">{request.type === 'location' ? '📍 Location' : request.type === 'achat' ? '💰 Achat' : request.type === 'maintenance' ? '🔧 Maintenance' : request.type}</span>
                            {request.unit && (
                              <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">Unité {request.unit.unitNumber}</span>
                            )}
                          </div>
                          {request.title && (
                            <p className="text-sm font-semibold text-gray-900 mb-1">{request.title}</p>
                          )}
                          {request.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">{request.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            {request.user && (
                              <span>Par: {request.user.firstName} {request.user.lastName}</span>
                            )}
                            {request.building && (
                              <span>• {request.building.name}</span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)} whitespace-nowrap ml-2`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(request.createdAt).toLocaleDateString('fr-CA', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucune demande récente</p>
              )}
            </div>
          </div>

          {/* Paiements et messages récents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Paiements récents</h2>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[ADMIN DASHBOARD] Navigation vers tous les paiements');
                    window.location.href = '/payments/admin';
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  Voir tout
                </button>
              </div>
              {dashboardData.recentPayments && dashboardData.recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                          <span className="font-semibold">${payment.amount.toLocaleString()}</span>
                        </div>
                        {payment.payer && (
                          <p className="text-sm text-gray-600">{payment.payer.firstName} {payment.payer.lastName}</p>
                        )}
                        {payment.unit && (
                          <p className="text-xs text-gray-500">Unité {payment.unit.unitNumber}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun paiement récent</p>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Messages récents</h2>
                <Link href="/messages" className="text-sm text-primary-600 hover:text-primary-700">
                  Voir tout
                </Link>
              </div>
              {dashboardData.recentMessages && dashboardData.recentMessages.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentMessages.slice(0, 5).map((message) => (
                    <div key={message.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{message.subject || 'Sans sujet'}</p>
                          {message.sender && message.receiver && (
                            <p className="text-sm text-gray-600 mt-1">
                              {message.sender.firstName} → {message.receiver.firstName}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleDateString('fr-CA', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun message récent</p>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card p-6 bg-primary-50">
            <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/users" className="btn-primary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-2xl mb-2">👥</div>
                <div>Gérer les utilisateurs</div>
              </Link>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <Link href="/admin/buildings" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <div className="text-2xl mb-2">🏢</div>
                  <div>Gérer les immeubles</div>
                </Link>
                <Link href="/admin/units" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  <div className="text-2xl mb-2">🏠</div>
                  <div>Gérer les unités</div>
                </Link>
              </div>
              <Link href="/admin/requests" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-2xl mb-2">📋</div>
                <div>Gérer les demandes</div>
              </Link>
            </div>
          </div>
          
          {/* Actions supplémentaires */}
          <div className="mt-6 card p-6">
            <h2 className="text-xl font-bold mb-4">Autres actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[ADMIN DASHBOARD] Navigation vers gestion des paiements');
                  window.location.href = '/payments/admin';
                }}
                className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer w-full"
              >
                <div className="text-2xl mb-2">💳</div>
                <div>Gérer les paiements</div>
              </button>
              <Link href="/documents" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-2xl mb-2">📄</div>
                <div>Gérer les documents</div>
              </Link>
              <Link href="/messages" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-2xl mb-2">💬</div>
                <div>Gérer les messages</div>
              </Link>
              <Link href="/analytics" className="btn-secondary text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-2xl mb-2">📊</div>
                <div>Statistiques avancées</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}
