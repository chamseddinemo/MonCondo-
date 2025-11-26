import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { usePayment } from '../../contexts/PaymentContext'
import { usePaymentSync } from '../../hooks/usePaymentSync'
import { useGlobalSync } from '../../hooks/useGlobalSync'
import { useSocket } from '../../contexts/SocketContext'
import ApplicationCard from '../../components/proprietaire/ApplicationCard'
import { getUnitImagePath } from '../../utils/imageUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DashboardStats {
  totalUnits: number
  availableUnits: number
  rentedUnits: number
  occupancyRate: number
  totalRequests: number
  pendingRequests: number
  acceptedRequests: number
  documentsToSign: number
  pendingInitialPayments: number
  monthlyRevenue: number
  receivedThisMonth: number
  overdueCount: number
  alertsCount: number
}

interface Unit {
  _id: string
  unitNumber: string
  type: string
  status: string
  rentPrice?: number
  images?: string[]
  imageUrl?: string
  building: {
    name: string
    image?: string
    imageUrl?: string
  }
  locataire?: {
    firstName: string
    lastName: string
    email: string
  }
  paidThisMonth?: number
  pendingPayment?: {
    amount: number
    dueDate: string
  }
  hasOverdue?: boolean
  hasMaintenance?: boolean
}

interface OverduePayment {
  id: string
  amount: number
  dueDate: string
  unit: {
    unitNumber: string
  }
  payer: {
    firstName: string
    lastName: string
  }
}

interface MaintenanceRequest {
  id: string
  type: string
  title: string
  status: string
  unit?: {
    unitNumber: string
  }
  createdAt: string
}

interface Application {
  _id: string
  title: string
  description: string
  type: 'location' | 'achat'
  status: string
  createdAt: string
  createdBy: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  unit: {
    _id: string
    unitNumber: string
  }
  building?: {
    name: string
  }
}

interface AcceptedRequest {
  _id: string
  type: 'location' | 'achat'
  title: string
  status: string
  createdAt: string
  approvedAt: string
  unit: {
    _id: string
    unitNumber: string
  }
  building?: {
    name: string
  }
  createdBy: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  approvedBy?: {
    firstName: string
    lastName: string
  }
  generatedDocuments: Array<{
    _id?: string
    type: string
    filename: string
    path: string
    signed: boolean
    generatedAt?: string
  }>
  initialPayment?: {
    amount: number
    status: string
  }
}

interface PendingInitialPayment {
  _id: string
  type: 'location' | 'achat'
  title: string
  status: string
  createdAt: string
  approvedAt: string
  unit: {
    _id: string
    unitNumber: string
  }
  building?: {
    name: string
  }
  createdBy: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  initialPayment: {
    amount: number
    status: string
  }
}

export default function ProprietaireDashboard() {
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth()
  const { refreshPaymentStatus } = usePayment()
  const { socket, isConnected } = useSocket()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats
    unitsWithDetails: Unit[]
    receivedPayments?: any[]
    overduePayments: OverduePayment[]
    maintenanceRequests: MaintenanceRequest[]
    applications?: Application[]
    acceptedRequestsWithDocs?: AcceptedRequest[]
    pendingInitialPayments?: PendingInitialPayment[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const loadDashboardData = async () => {
    setLoading(true)
    setConnectionError(null)
    
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.error('[PROPRIETAIRE DASHBOARD] ❌ Aucun token d\'authentification trouvé')
        setLoading(false)
        return
      }

      console.log('[PROPRIETAIRE DASHBOARD] 🔄 Chargement des données depuis:', `${API_URL}/proprietaire/dashboard`)
      
      const response = await axios.get(`${API_URL}/proprietaire/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000 // 15 secondes de timeout
      })
      
      console.log('[PROPRIETAIRE DASHBOARD] ✅ Réponse reçue:', response.status)
      
      // Réinitialiser l'erreur si la connexion réussit
      setConnectionError(null)
      
      // Traiter la réponse même si certaines données sont manquantes
      const data = response.data?.data || {}
      console.log('[PROPRIETAIRE DASHBOARD] 📊 Données reçues:', data)
      
      // Initialiser avec des valeurs par défaut si certaines données sont manquantes
      setDashboardData({
        stats: data.stats || {
          totalUnits: 0,
          availableUnits: 0,
          rentedUnits: 0,
          occupancyRate: 0,
          totalRequests: 0,
          pendingRequests: 0,
          acceptedRequests: 0,
          documentsToSign: 0,
          pendingInitialPayments: 0,
          monthlyRevenue: 0,
          receivedThisMonth: 0,
          overdueCount: 0,
          alertsCount: 0
        },
        unitsWithDetails: data.unitsWithDetails || [],
        receivedPayments: data.receivedPayments || [],
        overduePayments: data.overduePayments || [],
        maintenanceRequests: data.maintenanceRequests || [],
        applications: data.applications || [],
        acceptedRequestsWithDocs: data.acceptedRequestsWithDocs || [],
        pendingInitialPayments: data.pendingInitialPayments || []
      })
      
      console.log('[PROPRIETAIRE DASHBOARD] ✨ Données traitées et chargées')
      setLoading(false)
    } catch (error: any) {
      console.error('[PROPRIETAIRE DASHBOARD] ❌ Erreur:', error)
      
      // Gestion d'erreur plus détaillée
      let errorMessage = 'Erreur de connexion'
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré sur le port 5000.'
      } else if (error.request && !error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 5000) et votre connexion internet.'
      } else if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Data:', error.response.data)
        
        if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.'
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else if (error.response.status === 403) {
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.'
        } else if (error.response.status === 404) {
          errorMessage = 'Route non trouvée. Vérifiez que le backend est démarré et que la route /api/proprietaire/dashboard existe.'
        } else if (error.response.status >= 500) {
          const serverMessage = error.response.data?.message || error.response.data?.error || '';
          if (serverMessage.includes('Le serveur est en cours d\'exécution')) {
            errorMessage = serverMessage;
          } else {
            errorMessage = `Erreur serveur (${error.response.status}): ${serverMessage || 'Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande. Veuillez vérifier les logs du serveur backend.'}`;
          }
        } else {
          errorMessage = error.response.data?.message || `Erreur ${error.response.status}: ${error.response.statusText}`
        }
      }
      
      // Afficher l'erreur à l'utilisateur
      setConnectionError(errorMessage)
      console.error('Erreur:', errorMessage)
      
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setDashboardData({
        stats: {
          totalUnits: 0,
          availableUnits: 0,
          rentedUnits: 0,
          occupancyRate: 0,
          totalRequests: 0,
          pendingRequests: 0,
          acceptedRequests: 0,
          documentsToSign: 0,
          pendingInitialPayments: 0,
          monthlyRevenue: 0,
          receivedThisMonth: 0,
          overdueCount: 0,
          alertsCount: 0
        },
        unitsWithDetails: [],
        receivedPayments: [],
        overduePayments: [],
        maintenanceRequests: [],
        applications: [],
        acceptedRequestsWithDocs: [],
        pendingInitialPayments: []
      })
    } finally {
      setLoading(false)
    }
  }

  // Charger les données seulement après vérification de l'authentification
  useEffect(() => {
    // Attendre que l'authentification soit vérifiée avant de charger les données
    if (authLoading) return
    
    // Si non authentifié, ne pas charger les données (ProtectedRoute gère la redirection)
    if (!isAuthenticated || !authUser) return
    
    // Charger les données seulement si l'utilisateur est authentifié
    if (authUser && authUser.role === 'proprietaire') {
      loadDashboardData()
    }
  }, [authLoading, isAuthenticated, authUser])

  // Fonction de refresh sans afficher le loading (pour les synchronisations automatiques)
  const refreshDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await axios.get(`${API_URL}/proprietaire/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      })
      
      if (response.data?.data) {
        const data = response.data.data
        setDashboardData({
          stats: data.stats || {
            totalUnits: 0,
            availableUnits: 0,
            rentedUnits: 0,
            occupancyRate: 0,
            totalRequests: 0,
            pendingRequests: 0,
            acceptedRequests: 0,
            documentsToSign: 0,
            pendingInitialPayments: 0,
            monthlyRevenue: 0,
            receivedThisMonth: 0,
            overdueCount: 0,
            alertsCount: 0
          },
          unitsWithDetails: data.unitsWithDetails || [],
          receivedPayments: data.receivedPayments || [],
          overduePayments: data.overduePayments || [],
          maintenanceRequests: data.maintenanceRequests || [],
          applications: data.applications || [],
          acceptedRequestsWithDocs: data.acceptedRequestsWithDocs || [],
          pendingInitialPayments: data.pendingInitialPayments || []
        })
        setConnectionError(null)
      }
    } catch (error) {
      console.error('[PROPRIETAIRE DASHBOARD] Erreur refresh silencieux:', error)
    }
  }

  // Utiliser le hook de synchronisation centralisé pour les paiements
  usePaymentSync(refreshDashboardData, [authUser?._id])

  // Utiliser le hook de synchronisation globale pour les demandes et profils
  useGlobalSync(async () => {
    await refreshDashboardData()
  }, [authUser?._id])

  // Écouter les événements Socket.io pour la synchronisation en temps réel
  useEffect(() => {
    if (!socket || !isConnected || !authUser?._id) {
      return
    }

    console.log('[PROPRIETAIRE DASHBOARD] 🔌 Socket connecté, écoute des événements...')

    // Écouter les événements de synchronisation de demande
    const handleRequestSync = (data: any) => {
      console.log('[PROPRIETAIRE DASHBOARD] 📡 Événement requestSync reçu:', data.requestId)
      // Attendre un court délai pour que le backend soit synchronisé
      setTimeout(() => {
        refreshDashboardData()
      }, 500)
    }

    // Écouter les événements globaux de synchronisation
    const handleGlobalRequestSync = (event: any) => {
      const data = event.detail || event
      console.log('[PROPRIETAIRE DASHBOARD] 📡 Événement globalRequestSync reçu pour demande:', data.requestId)
      setTimeout(() => {
        refreshDashboardData()
      }, 500)
    }

    // Écouter les événements de paiement
    const handlePaymentCreated = (event: any) => {
      const data = event.detail || event
      console.log('[PROPRIETAIRE DASHBOARD] 📡 Événement paymentCreated reçu:', data.paymentId, data.requestId)
      setTimeout(() => {
        refreshDashboardData()
      }, 500)
    }

    // Écouter les événements de synchronisation du profil utilisateur
    const handleUserProfileSync = (event: any) => {
      const data = event.detail || event
      // Synchroniser si le profil concerne une demande liée à ce propriétaire
      console.log('[PROPRIETAIRE DASHBOARD] 📡 Événement userProfileSync reçu pour utilisateur:', data.userId)
      setTimeout(() => {
        refreshDashboardData()
      }, 500)
    }

    // S'abonner aux événements Socket.io
    socket.on('requestSync', handleRequestSync)
    
    // S'abonner aux événements DOM
    if (typeof window !== 'undefined') {
      window.addEventListener('globalRequestSync', handleGlobalRequestSync)
      window.addEventListener('paymentCreated', handlePaymentCreated)
      window.addEventListener('paymentStatusUpdated', handlePaymentCreated)
      window.addEventListener('userProfileSync', handleUserProfileSync)
      window.addEventListener('requestSync', handleGlobalRequestSync)
    }

    // Nettoyage
    return () => {
      socket.off('requestSync', handleRequestSync)
      if (typeof window !== 'undefined') {
        window.removeEventListener('globalRequestSync', handleGlobalRequestSync)
        window.removeEventListener('paymentCreated', handlePaymentCreated)
        window.removeEventListener('paymentStatusUpdated', handlePaymentCreated)
        window.removeEventListener('userProfileSync', handleUserProfileSync)
        window.removeEventListener('requestSync', handleGlobalRequestSync)
      }
    }
  }, [socket, isConnected, authUser?._id])

  // Recharger automatiquement le dashboard toutes les 15 secondes pour garantir la synchronisation
  useEffect(() => {
    if (!authUser?._id) {
      return
    }

    const interval = setInterval(() => {
      console.log('[PROPRIETAIRE DASHBOARD] 🔄 Rechargement automatique du dashboard')
      refreshDashboardData()
    }, 15000) // Recharger toutes les 15 secondes

    return () => clearInterval(interval)
  }, [authUser?._id])

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'disponible': 'bg-green-100 text-green-800',
      'loue': 'bg-blue-100 text-blue-800',
      'vendu': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'disponible': 'Disponible',
      'loue': 'Loué',
      'vendu': 'Vendu',
      'maintenance': 'En maintenance'
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'studio': 'Studio',
      '1br': '1 chambre',
      '2br': '2 chambres',
      '3br': '3 chambres',
      '4br': '4+ chambres',
      'penthouse': 'Penthouse',
      'commercial': 'Commercial'
    }
    return labels[type] || type
  }

  const formatPrice = (price?: number) => price ? `$${price.toLocaleString()}` : 'N/A'
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
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
  if (authUser.role !== 'proprietaire' && authUser.role !== 'admin') {
    return null
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['proprietaire']}>
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
      <ProtectedRoute requiredRoles={['proprietaire']}>
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
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* Message d'erreur de connexion */}
          {connectionError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Erreur de connexion</h3>
                  <p className="text-red-700">{connectionError}</p>
                  <div className="mt-3 text-sm text-red-600">
                    <p><strong>Vérifications à faire :</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Le backend est-il démarré sur le port 5000 ?</li>
                      <li>Votre connexion internet fonctionne-t-elle ?</li>
                      <li>Votre session est-elle toujours valide ?</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConnectionError(null)
                    loadDashboardData()
                  }}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* En-tête personnalisé */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg backdrop-blur-sm border-4 border-white border-opacity-30">
                    {authUser?.firstName?.charAt(0) || 'P'}{authUser?.lastName?.charAt(0) || ''}
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      {authUser?.firstName} {authUser?.lastName}
                    </h1>
                    <p className="text-primary-100 text-lg mb-1">
                      {authUser?.email}
                    </p>
                    <p className="text-primary-100 text-sm">
                      {dashboardData?.stats?.totalUnits || 0} unité{dashboardData?.stats?.totalUnits !== 1 ? 's' : ''} en gestion
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link 
                    href="/units?action=add" 
                    className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-white font-semibold backdrop-blur-sm border border-white border-opacity-30"
                  >
                    ➕ Ajouter une unité
                  </Link>
                  <Link 
                    href="/payments/proprietaire" 
                    className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-white font-semibold backdrop-blur-sm border border-white border-opacity-30"
                  >
                    💵 Voir mes paiements reçus
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications d'alertes */}
          {dashboardData && dashboardData.stats && dashboardData.stats.alertsCount > 0 && (
            <div className="mb-8 space-y-3">
              {dashboardData.overduePayments && dashboardData.overduePayments.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="text-2xl mr-3">⚠️</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-800">Loyers impayés</h3>
                        <p className="text-red-700">
                          {dashboardData.overduePayments.length} paiement(s) en retard nécessitent votre attention
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[DASHBOARD] Clic sur bouton - Navigation vers paiements en retard');
                        // Utiliser window.location.href directement pour forcer la navigation
                        window.location.href = '/payments/proprietaire?status=en_retard';
                      }}
                      className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm whitespace-nowrap cursor-pointer"
                    >
                      Voir les paiements →
                    </button>
                  </div>
                </div>
              )}
              {dashboardData.maintenanceRequests && dashboardData.maintenanceRequests.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">🔧</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-orange-800">Maintenance en cours</h3>
                      <p className="text-orange-700">
                        {dashboardData.maintenanceRequests.length} demande(s) de maintenance à traiter
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistiques rapides */}
          {dashboardData && dashboardData.stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Link href="/proprietaire/mes-unites" className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm mb-1">Total d'unités</p>
                      <p className="text-3xl font-bold">{dashboardData.stats.totalUnits}</p>
                      <p className="text-blue-100 text-xs mt-1">{dashboardData.stats.occupancyRate}% occupées</p>
                    </div>
                    <div className="text-4xl opacity-80">🏠</div>
                  </div>
                </Link>

                <Link href="/payments" className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm mb-1">Revenus mensuels</p>
                      <p className="text-2xl font-bold">{formatPrice(dashboardData.stats.monthlyRevenue)}</p>
                      <p className="text-green-100 text-xs mt-1">{formatPrice(dashboardData.stats.receivedThisMonth)} reçus</p>
                    </div>
                    <div className="text-4xl opacity-80">💰</div>
                  </div>
                </Link>

                <Link href="#documents-a-signer" className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm mb-1">Documents à signer</p>
                      <p className="text-3xl font-bold">{dashboardData.stats.documentsToSign || 0}</p>
                      <p className="text-orange-100 text-xs mt-1">{dashboardData.stats.acceptedRequests || 0} demande{dashboardData.stats.acceptedRequests !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-4xl opacity-80">📝</div>
                  </div>
                </Link>

                <Link href="/proprietaire/consult-units" className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm mb-1">Disponibles</p>
                      <p className="text-3xl font-bold">{dashboardData.stats.availableUnits}</p>
                      <p className="text-purple-100 text-xs mt-1">À louer</p>
                    </div>
                    <div className="text-4xl opacity-80">✅</div>
                  </div>
                </Link>
              </div>

              {/* Section 1 - Mes Unités */}
              {dashboardData.unitsWithDetails && dashboardData.unitsWithDetails.length > 0 && (
                <div className="card p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <span className="mr-3 text-3xl">🏘️</span>
                      Mes Unités
                    </h2>
                    <div className="flex items-center gap-3">
                      <Link href="/units?action=add" className="btn-primary text-sm">
                        ➕ Ajouter une unité
                      </Link>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewMode('cards')}
                          className={`px-3 py-1 rounded-lg ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Cartes
                        </button>
                        <button
                          onClick={() => setViewMode('table')}
                          className={`px-3 py-1 rounded-lg ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Tableau
                        </button>
                      </div>
                    </div>
                  </div>

                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboardData.unitsWithDetails.map((unit) => (
                      <div key={unit._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
                        {/* Image de l'unité */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
                          {(() => {
                            // Déterminer le chemin de l'image
                            let imageSrc = getUnitImagePath(unit)
                            if (unit.images && unit.images.length > 0) {
                              const firstImage = unit.images[0]
                              if (firstImage.startsWith('/images/')) {
                                imageSrc = firstImage
                              } else if (firstImage.startsWith('http')) {
                                imageSrc = firstImage
                              } else {
                                imageSrc = `/images/unites/${firstImage}`
                              }
                            } else if (unit.imageUrl) {
                              if (unit.imageUrl.startsWith('/images/')) {
                                imageSrc = unit.imageUrl
                              } else if (unit.imageUrl.startsWith('http')) {
                                imageSrc = unit.imageUrl
                              } else {
                                imageSrc = `/images/unites/${unit.imageUrl}`
                              }
                            }
                            
                            return (
                          <Image
                                src={imageSrc}
                            alt={`Unité ${unit.unitNumber} - ${unit.building.name}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/default/placeholder.jpg'
                            }}
                          />
                            )
                          })()}
                          {/* Badges sur l'image */}
                          <div className="absolute top-3 right-3 z-10 flex flex-col items-end space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-90 ${getStatusColor(unit.status)}`}>
                              {getStatusLabel(unit.status)}
                            </span>
                            {unit.hasOverdue && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                ⚠️ En retard
                              </span>
                            )}
                            {unit.hasMaintenance && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                🔧 Maintenance
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold">Unité {unit.unitNumber}</h3>
                            <p className="text-sm text-gray-600">{unit.building.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{getTypeLabel(unit.type)}</p>
                          </div>

                        {unit.locataire && (
                          <div className="mb-3 p-2 bg-gray-50 rounded">
                            <p className="text-sm font-semibold text-gray-700">
                              Locataire: {unit.locataire.firstName} {unit.locataire.lastName}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2 mb-3">
                          {unit.rentPrice && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Loyer mensuel:</span>
                              <span className="font-semibold">{formatPrice(unit.rentPrice)}</span>
                            </div>
                          )}
                          {unit.paidThisMonth !== undefined && unit.paidThisMonth > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Reçu ce mois:</span>
                              <span className="font-semibold text-green-600">{formatPrice(unit.paidThisMonth)}</span>
                            </div>
                          )}
                          {unit.pendingPayment && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">En attente:</span>
                              <span className={`font-semibold ${unit.hasOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                {formatPrice(unit.pendingPayment.amount)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Link href={`/documents?unit=${unit._id}`} className="flex-1 btn-secondary text-center text-sm">
                            📄 Voir contrat
                          </Link>
                          <Link href={`/payments?unit=${unit._id}`} className="flex-1 btn-secondary text-center text-sm">
                            🧾 Gérer paiements
                          </Link>
                          {unit.locataire && (
                            <Link 
                              href={`/messages?contact=${unit.locataire._id || unit.locataire}`}
                              className="btn-primary text-sm"
                            >
                              💬 Message
                            </Link>
                          )}
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unité</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locataire</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loyer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alertes</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dashboardData.unitsWithDetails.map((unit) => (
                          <tr key={unit._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* Miniature de l'unité */}
                                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                                  {(() => {
                                    // Déterminer le chemin de l'image
                                    let imageSrc = getUnitImagePath(unit)
                                    if (unit.images && unit.images.length > 0) {
                                      const firstImage = unit.images[0]
                                      if (firstImage.startsWith('/images/')) {
                                        imageSrc = firstImage
                                      } else if (firstImage.startsWith('http')) {
                                        imageSrc = firstImage
                                      } else {
                                        imageSrc = `/images/unites/${firstImage}`
                                      }
                                    } else if (unit.imageUrl) {
                                      if (unit.imageUrl.startsWith('/images/')) {
                                        imageSrc = unit.imageUrl
                                      } else if (unit.imageUrl.startsWith('http')) {
                                        imageSrc = unit.imageUrl
                                      } else {
                                        imageSrc = `/images/unites/${unit.imageUrl}`
                                      }
                                    }
                                    
                                    return (
                                  <Image
                                        src={imageSrc}
                                    alt={`Unité ${unit.unitNumber}`}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = '/images/default/placeholder.jpg'
                                    }}
                                  />
                                    )
                                  })()}
                                </div>
                                <div>
                                  <p className="font-semibold">Unité {unit.unitNumber}</p>
                                  <p className="text-xs text-gray-500">{unit.building.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{getTypeLabel(unit.type)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(unit.status)}`}>
                                {getStatusLabel(unit.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {unit.locataire ? (
                                `${unit.locataire.firstName} ${unit.locataire.lastName}`
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">{formatPrice(unit.rentPrice)}</td>
                            <td className="px-4 py-3">
                              <div>
                                {unit.paidThisMonth !== undefined && unit.paidThisMonth > 0 ? (
                                  <span className="text-sm font-semibold text-green-600">{formatPrice(unit.paidThisMonth)}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-1">
                                {unit.hasOverdue && (
                                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800" title="Paiement en retard">
                                    ⚠️
                                  </span>
                                )}
                                {unit.hasMaintenance && (
                                  <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800" title="Maintenance en cours">
                                    🔧
                                  </span>
                                )}
                                {!unit.hasOverdue && !unit.hasMaintenance && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <Link href={`/units/${unit._id}`} className="text-primary-600 hover:text-primary-700 text-sm">
                                  Voir
                                </Link>
                                {unit.locataire && (
                                  <button className="text-primary-600 hover:text-primary-700 text-sm">
                                    Message
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              )}

              {/* Section 2 - Demandes en cours */}
              <div className="card p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3 text-3xl">💬</span>
                    Demandes en cours
                  </h2>
                  <Link href="/requests" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Voir tout →
                  </Link>
                </div>
                
                {/* Calculer les statistiques des demandes (applications + maintenance) */}
                {(() => {
                  const allRequests = [
                    ...(dashboardData.applications || []),
                    ...(dashboardData.maintenanceRequests || [])
                  ];
                  const pendingCount = allRequests.filter(r => r.status === 'en_attente').length;
                  const inProgressCount = allRequests.filter(r => r.status === 'en_cours' || r.status === 'accepte').length;
                  const completedCount = allRequests.filter(r => r.status === 'termine' || r.status === 'refuse').length;
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200 text-center">
                          <div className="text-3xl mb-2">⏳</div>
                          <p className="font-semibold text-gray-900">
                            En attente ({pendingCount})
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 text-center">
                          <div className="text-3xl mb-2">🔄</div>
                          <p className="font-semibold text-gray-900">
                            En cours ({inProgressCount})
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 text-center">
                          <div className="text-3xl mb-2">✅</div>
                          <p className="font-semibold text-gray-900">
                            Terminées ({completedCount})
                          </p>
                        </div>
                      </div>

                      {allRequests.length > 0 ? (
                        <div className="space-y-3">
                          {/* Afficher les applications (demandes de location/achat) */}
                          {dashboardData.applications && dashboardData.applications.length > 0 && dashboardData.applications
                            .slice(0, 5)
                            .map((application) => (
                              <div key={application._id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">
                                      {application.type === 'location' ? '📍 Location' : '🏠 Achat'} - {application.unit?.unitNumber || 'N/A'}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      {application.building && <span>Immeuble: {application.building.name}</span>}
                                      {application.createdBy && (
                                        <span>Demandeur: {application.createdBy.firstName} {application.createdBy.lastName}</span>
                                      )}
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        application.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                        application.status === 'accepte' ? 'bg-blue-100 text-blue-800' :
                                        application.status === 'refuse' ? 'bg-red-100 text-red-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {application.status === 'en_attente' ? 'En attente' :
                                         application.status === 'accepte' ? 'Acceptée' :
                                         application.status === 'refuse' ? 'Refusée' :
                                         'Terminée'}
                                      </span>
                                    </div>
                                    {application.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{application.description}</p>
                                    )}
                                  </div>
                                  <Link 
                                    href={(() => {
                                      // Si le propriétaire actuel est le créateur de la demande (créée quand il était visiteur)
                                      // → Rediriger vers /locataire/requests/[id] pour qu'il puisse signer ses documents
                                      const requestCreatorId = application.createdBy?._id?.toString() || application.createdBy?.toString() || null;
                                      const currentUserId = authUser?._id?.toString() || authUser?.id?.toString() || null;
                                      
                                      if (requestCreatorId === currentUserId) {
                                        return `/locataire/requests/${application._id}`;
                                      }
                                      // Sinon → Rediriger vers /proprietaire/requests/[id] pour voir les détails de la demande pour son unité
                                      return `/proprietaire/requests/${application._id}`;
                                    })()}
                                    className="ml-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm whitespace-nowrap"
                                  >
                                    Voir détails
                                  </Link>
                                </div>
                              </div>
                            ))}
                          
                          {/* Afficher les demandes de maintenance */}
                          {dashboardData.maintenanceRequests && dashboardData.maintenanceRequests.length > 0 && dashboardData.maintenanceRequests
                            .slice(0, 5 - (dashboardData.applications?.length || 0))
                            .map((request) => (
                              <div key={request.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-500 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <span>Type: {request.type}</span>
                                      {request.unit && <span>Unité: {request.unit.unitNumber}</span>}
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        request.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                        request.status === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {request.status === 'en_attente' ? 'En attente' :
                                         request.status === 'en_cours' ? 'En cours' :
                                         'Terminée'}
                                      </span>
                                    </div>
                                  </div>
                                  <Link 
                                    href={`/requests/${request.id}`} 
                                    className="ml-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
                                  >
                                    Voir détails
                                  </Link>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-gray-500">Aucune demande en cours</p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Section 3 - Documents à signer */}
              {dashboardData.acceptedRequestsWithDocs && dashboardData.acceptedRequestsWithDocs.length > 0 && (
                <div id="documents-a-signer" className="card p-6 mb-8 border-2 border-orange-200 bg-orange-50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center text-orange-900">
                      <span className="mr-3 text-3xl">📝</span>
                      Documents à signer
                    </h2>
                    <span className="text-sm font-semibold text-orange-700 bg-orange-200 px-3 py-1 rounded-full">
                      {dashboardData.stats.documentsToSign || 0} document{dashboardData.stats.documentsToSign !== 1 ? 's' : ''} en attente
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {dashboardData.acceptedRequestsWithDocs.map((request) => {
                      const hasDocuments = request.generatedDocuments && request.generatedDocuments.length > 0;
                      const unsignedDocs = hasDocuments ? request.generatedDocuments.filter((doc: any) => !doc.signed || doc.signed === false) : [];
                      const signedDocs = hasDocuments ? request.generatedDocuments.filter((doc: any) => doc.signed === true) : [];
                      const hasUnsignedDocs = unsignedDocs.length > 0;
                      const allDocumentsSigned = hasDocuments && signedDocs.length === request.generatedDocuments.length;
                      
                      // Afficher toutes les demandes acceptées avec documents, même si tous sont signés
                      // Cela permet au propriétaire de voir ses demandes et leurs statuts
                      return (
                        <div key={request._id} className={`bg-white rounded-lg p-5 border-2 shadow-md hover:shadow-lg transition-shadow ${
                          !hasDocuments ? 'border-blue-300 bg-blue-50' :
                          hasUnsignedDocs ? 'border-orange-300 bg-orange-50' : 
                          'border-green-300 bg-green-50'
                        }`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-lg text-gray-900">
                                  {request.type === 'location' ? '📍 Location' : '🏠 Achat'} - Unité {request.unit?.unitNumber}
                                </h3>
                                {!hasDocuments && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                    📄 Documents à générer
                                  </span>
                                )}
                                {hasDocuments && allDocumentsSigned && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                    ✅ Tous signés
                                  </span>
                                )}
                                {hasDocuments && hasUnsignedDocs && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                                    ⏳ {unsignedDocs.length} doc{unsignedDocs.length > 1 ? 's' : ''} à signer
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Demandeur:</strong> {request.createdBy?.firstName} {request.createdBy?.lastName}</p>
                                <p><strong>Email:</strong> {request.createdBy?.email}</p>
                                {request.building?.name && <p><strong>Immeuble:</strong> {request.building.name}</p>}
                                <p><strong>Acceptée le:</strong> {formatDate(request.approvedAt)}</p>
                                <p><strong>Documents:</strong> {
                                  hasDocuments 
                                    ? `${signedDocs.length} signé${signedDocs.length > 1 ? 's' : ''} / ${request.generatedDocuments.length} total`
                                    : 'Aucun document généré'
                                }</p>
                              </div>
                            </div>
                            <Link
                              href={
                                // Si le propriétaire a créé la demande lui-même, utiliser /locataire/requests pour signer
                                // Sinon, utiliser /proprietaire/requests pour voir les détails de la candidature
                                (() => {
                                  const requestCreatorId = request.createdBy?._id?.toString() || request.createdBy?.toString() || null;
                                  const currentUserId = authUser?._id?.toString() || authUser?.id?.toString() || null;
                                  return requestCreatorId === currentUserId;
                                })()
                                  ? `/locataire/requests/${request._id}`
                                  : `/proprietaire/requests/${request._id}`
                              }
                              className={`ml-4 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                                !hasDocuments
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : hasUnsignedDocs 
                                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {(() => {
                                const requestCreatorId = request.createdBy?._id?.toString() || request.createdBy?.toString() || null;
                                const currentUserId = authUser?._id?.toString() || authUser?.id?.toString() || null;
                                if (requestCreatorId === currentUserId) {
                                  if (!hasDocuments) return 'Voir détails →';
                                  return hasUnsignedDocs ? 'Voir et signer →' : 'Voir documents →';
                                }
                                return 'Voir détails →';
                              })()}
                            </Link>
                          </div>
                          
                          {hasDocuments && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              {hasUnsignedDocs ? '📝 Documents en attente de signature:' : '✅ Documents générés:'}
                            </p>
                            <div className="space-y-2">
                              {/* Afficher tous les documents avec leur statut */}
                              {request.generatedDocuments?.map((doc: any, idx: number) => {
                                const isSigned = doc.signed === true;
                                return (
                                  <div key={idx} className={`flex items-center justify-between p-3 rounded ${
                                    isSigned ? 'bg-green-50' : 'bg-orange-50'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{isSigned ? '✅' : '📄'}</span>
                                      <span className="font-medium text-gray-800">{doc.filename}</span>
                                      <span className="text-xs text-gray-600">({doc.type === 'bail' ? 'Bail' : doc.type === 'contrat_vente' ? 'Contrat de vente' : 'Document'})</span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                      isSigned 
                                        ? 'bg-green-200 text-green-800' 
                                        : 'bg-orange-200 text-orange-800'
                                    }`}>
                                      {isSigned ? '✅ Signé' : '⏳ En attente'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          )}
                          
                          {!hasDocuments && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-blue-700 font-semibold">
                                📄 Aucun document généré. L'administrateur doit générer les documents.
                              </p>
                            </div>
                          )}
                          
                          {request.initialPayment && request.initialPayment.status === 'en_attente' && (
                            <div className="mt-4 pt-4 border-t border-orange-200">
                              <p className="text-sm text-gray-700">
                                <strong>Paiement initial:</strong> <span className="text-orange-700 font-semibold">{formatPrice(request.initialPayment.amount)}</span> en attente
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3.5 - Paiements initiaux en attente */}
              {dashboardData.pendingInitialPayments && dashboardData.pendingInitialPayments.length > 0 && (
                <div className="card p-6 mb-8 border-2 border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center text-blue-900">
                      <span className="mr-3 text-3xl">💳</span>
                      Paiements initiaux en attente
                    </h2>
                    <span className="text-sm font-semibold text-blue-700 bg-blue-200 px-3 py-1 rounded-full">
                      {dashboardData.stats.pendingInitialPayments || 0} paiement{dashboardData.stats.pendingInitialPayments !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {dashboardData.pendingInitialPayments.map((request) => (
                      <div key={request._id} className="bg-white rounded-lg p-5 border-2 border-blue-300 shadow-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-2">
                              {request.type === 'location' ? '📍 Location' : '🏠 Achat'} - Unité {request.unit?.unitNumber}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Demandeur:</strong> {request.createdBy?.firstName} {request.createdBy?.lastName}</p>
                              <p><strong>Montant:</strong> <span className="text-blue-700 font-semibold text-lg">{formatPrice(request.initialPayment?.amount)}</span></p>
                              <p><strong>Statut:</strong> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">En attente de paiement</span></p>
                            </div>
                          </div>
                          <Link
                            href={`/proprietaire/requests/${request._id}`}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            Voir détails →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3 - Candidatures & Locations */}
              {dashboardData.applications && dashboardData.applications.length > 0 && (
                <div className="card p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <span className="mr-3 text-3xl">👤</span>
                      Candidatures & Locations
                    </h2>
                    <span className="text-sm text-gray-600">
                      {dashboardData.applications.filter(a => a.status === 'en_attente').length} en attente
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {dashboardData.applications
                      .filter(app => app.status === 'en_attente')
                      .map((application) => (
                        <ApplicationCard
                          key={application._id}
                          application={application}
                          onUpdate={loadDashboardData}
                        />
                      ))}
                    
                    {dashboardData.applications.filter(app => app.status === 'en_attente').length === 0 && (
                      <p className="text-center py-8 text-gray-500">Aucune candidature en attente</p>
                    )}
                  </div>
                </div>
              )}

              {/* Section 3.6 - Paiements en retard */}
              {dashboardData.overduePayments && dashboardData.overduePayments.length > 0 && (
                <div className="card p-6 mb-8 border-2 border-red-200 bg-red-50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center text-red-900">
                      <span className="mr-3 text-3xl">⚠️</span>
                      Paiements en retard
                    </h2>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[DASHBOARD] Clic sur bouton "Voir tout" - Navigation vers paiements en retard');
                        // Utiliser window.location.href directement pour forcer la navigation
                        window.location.href = '/payments/proprietaire?status=en_retard';
                      }}
                      className="text-red-600 hover:text-red-700 font-medium text-sm cursor-pointer"
                    >
                      Voir tout →
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {dashboardData.overduePayments.slice(0, 10).map((payment) => (
                      <div key={payment.id || payment._id} className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">⚠️</span>
                              <div>
                                <p className="font-semibold text-lg text-red-900">
                                  {formatPrice(payment.amount)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {payment.payer?.firstName} {payment.payer?.lastName} • Unité {payment.unit?.unitNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Échéance: {formatDate(payment.dueDate)}
                                </p>
                                {payment.dueDate && (
                                  <p className="text-xs text-red-600 font-semibold mt-1">
                                    En retard depuis {Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} jour(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              En retard
                            </span>
                            <Link 
                              href={`/payments/${payment.id || payment._id}`}
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              Voir transaction →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4 - Paiements reçus */}
              <div className="card p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="mr-3 text-3xl">💵</span>
                    Paiements reçus
                  </h2>
                  <Link href="/payments/proprietaire" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Voir tout →
                  </Link>
                </div>
                
                {dashboardData.receivedPayments && dashboardData.receivedPayments.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.receivedPayments.slice(0, 10).map((payment) => (
                      <div key={payment.id || payment._id} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">✅</span>
                              <div>
                                <p className="font-semibold text-lg">
                                  {formatPrice(payment.amount)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {payment.payer?.firstName} {payment.payer?.lastName} • Unité {payment.unit?.unitNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Reçu le: {formatDate(payment.paidDate || payment.paidAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Payé
                            </span>
                            <Link 
                              href={`/payments/${payment.id || payment._id}`}
                              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                            >
                              Voir transaction →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">Aucun paiement reçu pour le moment</p>
                )}
              </div>
            </>
          ) : !loading && (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-2">Aucune donnée disponible</h2>
              <p className="text-gray-600 mb-6">
                Impossible de charger les données du tableau de bord. Veuillez réessayer plus tard.
              </p>
              <div className="space-y-4">
                <button onClick={() => {
                  setLoading(true)
                  loadDashboardData()
                }} className="btn-primary">
                  Réessayer
                </button>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Vérifiez que :</p>
                  <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
                    <li>• Vous êtes bien connecté</li>
                    <li>• Le serveur backend est démarré sur le port 5000</li>
                    <li>• Votre connexion internet fonctionne</li>
                    <li>• Vous avez le rôle "proprietaire"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}
