import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Notification {
  id: string
  type: 'payment_overdue' | 'maintenance_urgent' | 'document_expiring' | 'maintenance_coming' | 'payment_pending' | 'other'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  date: string
  unitId?: string
  unitNumber?: string
  buildingName?: string
  isRead: boolean
  actionUrl?: string
  actionLabel?: string
}

interface OverduePayment {
  _id: string
  amount: number
  dueDate: string
  unit?: {
    unitNumber: string
  }
  building?: {
    name: string
  }
  payer?: {
    firstName: string
    lastName: string
  }
}

interface UrgentMaintenance {
  _id: string
  title: string
  description: string
  unit?: {
    unitNumber: string
  }
  building?: {
    name: string
  }
  createdAt: string
}

export default function Notifications() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications()
      
      // Auto-refresh toutes les 30 secondes si activé
      if (autoRefresh) {
        const interval = setInterval(() => {
          loadNotifications()
        }, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [isAuthenticated, user, autoRefresh])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) {
        setLoading(false)
        return
      }

      console.log('[NOTIFICATIONS PAGE] 🔄 Chargement des notifications pour:', user?.role)
      
      // Utiliser l'endpoint centralisé des notifications qui fonctionne pour tous les rôles
      const [notificationsRes, requestsRes, paymentsRes, messagesRes] = await Promise.all([
        axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/messages/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } }))
      ])

      const notifs: Notification[] = []

      // 1. Notifications depuis l'endpoint centralisé (pour tous les rôles)
      if (notificationsRes.data.success && notificationsRes.data.data) {
        notificationsRes.data.data.forEach((notif: any) => {
          notifs.push({
            id: notif._id || notif.id,
            type: notif.type === 'payment' ? 'payment_overdue' : 
                  notif.type === 'maintenance' ? 'maintenance_urgent' :
                  notif.type === 'request' ? 'maintenance_urgent' :
                  notif.type === 'message' ? 'other' : 'other',
            title: notif.title || 'Notification',
            message: notif.content || notif.message || '',
            priority: notif.priority === 'urgente' ? 'urgent' :
                     notif.priority === 'haute' ? 'high' :
                     notif.priority === 'moyenne' ? 'medium' : 'low',
            date: notif.createdAt || new Date().toISOString(),
            unitId: notif.unit?._id || notif.unit,
            unitNumber: notif.unit?.unitNumber,
            buildingName: notif.building?.name,
            isRead: notif.isRead || false,
            actionUrl: notif.link || '/dashboard',
            actionLabel: 'Voir les détails'
          })
        })
      }

      // 2. Notifications de paiements en retard (pour propriétaires et locataires)
      if (paymentsRes.data.success && paymentsRes.data.data) {
        const overduePayments = paymentsRes.data.data.filter((p: any) => 
          p.status === 'en_retard' || (p.status === 'en_attente' && p.dueDate && new Date(p.dueDate) < new Date())
        )
        
        overduePayments.forEach((payment: any) => {
          notifs.push({
            id: `payment-overdue-${payment._id}`,
            type: 'payment_overdue',
            title: 'Paiement en retard',
            message: `Le paiement de ${payment.amount?.toLocaleString() || 0} $ est en retard${payment.unit?.unitNumber ? ` pour l'unité ${payment.unit.unitNumber}` : ''}`,
            priority: 'urgent',
            date: payment.dueDate || payment.createdAt,
            unitId: payment.unit?._id || payment.unit,
            unitNumber: payment.unit?.unitNumber,
            buildingName: payment.building?.name,
            isRead: false,
            actionUrl: user?.role === 'locataire' ? '/payments/locataire' : '/payments/proprietaire',
            actionLabel: 'Voir les paiements'
          })
        })
      }

      // 3. Notifications de paiements en attente
      if (paymentsRes.data.success && paymentsRes.data.data) {
        const pendingPayments = paymentsRes.data.data.filter((p: any) => 
          p.status === 'en_attente' && (!p.dueDate || new Date(p.dueDate) >= new Date())
        )
        
        if (pendingPayments.length > 0) {
          const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
          notifs.push({
            id: 'payment-pending-summary',
            type: 'payment_pending',
            title: 'Paiements en attente',
            message: `Vous avez ${pendingPayments.length} paiement(s) en attente (${totalPending.toLocaleString()} $)`,
            priority: 'high',
            date: new Date().toISOString(),
            isRead: false,
            actionUrl: user?.role === 'locataire' ? '/payments/locataire' : '/payments/proprietaire',
            actionLabel: 'Consulter'
          })
        }
      }

      // 4. Notifications de demandes en attente ou en cours
      if (requestsRes.data.success && requestsRes.data.data) {
        const activeRequests = requestsRes.data.data.filter((req: any) => 
          req.status === 'en_attente' || req.status === 'en_cours'
        )
        
        activeRequests.slice(0, 10).forEach((request: any) => {
          notifs.push({
            id: `request-${request._id}`,
            type: request.type === 'maintenance' ? 'maintenance_urgent' : 'other',
            title: `Demande: ${request.title || 'Sans titre'}`,
            message: request.description?.substring(0, 100) || '',
            priority: request.priority === 'urgente' ? 'urgent' :
                     request.priority === 'haute' ? 'high' :
                     request.priority === 'moyenne' ? 'medium' : 'low',
            date: request.createdAt,
            unitId: request.unit?._id || request.unit,
            unitNumber: request.unit?.unitNumber,
            buildingName: request.building?.name,
            isRead: false,
            actionUrl: user?.role === 'locataire' ? '/locataire/services' : '/proprietaire/services',
            actionLabel: 'Voir la demande'
          })
        })
      }

      // 5. Notifications de messages non lus
      if (messagesRes.data.success && messagesRes.data.data) {
        const unreadMessages = messagesRes.data.data.filter((msg: any) => !msg.isRead)
        
        if (unreadMessages.length > 0) {
          unreadMessages.slice(0, 5).forEach((message: any) => {
            notifs.push({
              id: `message-${message._id}`,
              type: 'other',
              title: `Message de ${message.sender?.firstName || 'Utilisateur'}`,
              message: message.subject || message.content?.substring(0, 100) || '',
              priority: 'medium',
              date: message.createdAt,
              isRead: false,
              actionUrl: '/messages',
              actionLabel: 'Voir le message'
            })
          })
        }
      }

      // Trier par priorité et date (les plus récentes en premier)
      notifs.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

      setNotifications(notifs)
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })))
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId))
  }

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'payment_overdue': '🔴',
      'payment_pending': '💰',
      'maintenance_urgent': '🔧',
      'maintenance_coming': '📅',
      'document_expiring': '📄',
      'other': 'ℹ️'
    }
    return icons[type] || '🔔'
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'urgent': 'bg-red-50 border-red-200',
      'high': 'bg-orange-50 border-orange-200',
      'medium': 'bg-yellow-50 border-yellow-200',
      'low': 'bg-blue-50 border-blue-200'
    }
    return colors[priority] || 'bg-gray-50 border-gray-200'
  }

  const getPriorityBadgeColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'urgent': 'bg-red-600 text-white',
      'high': 'bg-orange-600 text-white',
      'medium': 'bg-yellow-600 text-white',
      'low': 'bg-blue-600 text-white'
    }
    return colors[priority] || 'bg-gray-600 text-white'
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high'
    return true
  })

  const unreadCount = notifications.filter(n => !n.isRead).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length

  if (!isAuthenticated) {
    return (
      <ProtectedRoute requiredRoles={['admin', 'proprietaire', 'locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600">Vous devez être connecté pour voir vos notifications.</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'proprietaire', 'locataire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-800 to-red-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">Alertes et Notifications</h1>
                <p className="text-xl text-gray-300">
                  Recevez en temps réel les alertes liées à vos unités et à votre activité
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Actualisation auto</span>
                </label>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="bg-white text-red-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="text-sm mb-2 opacity-90">Total des notifications</div>
              <div className="text-3xl font-bold">{notifications.length}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <div className="text-sm mb-2 opacity-90">Non lues</div>
              <div className="text-3xl font-bold">{unreadCount}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="text-sm mb-2 opacity-90">Urgentes</div>
              <div className="text-3xl font-bold">{urgentCount}</div>
            </div>
          </div>

          {/* Filtres */}
          <div className="card p-6 mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium text-gray-700">Filtrer:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Toutes ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'unread' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Non lues ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('urgent')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'urgent' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Urgentes ({urgentCount})
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`card p-6 border-l-4 ${
                    notification.priority === 'urgent' ? 'border-red-500' :
                    notification.priority === 'high' ? 'border-orange-500' :
                    notification.priority === 'medium' ? 'border-yellow-500' :
                    'border-blue-500'
                  } ${getPriorityColor(notification.priority)} ${
                    !notification.isRead ? 'ring-2 ring-opacity-50 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div className="text-4xl mr-4">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold">{notification.title}</h3>
                          {!notification.isRead && (
                            <span className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-semibold">
                              Nouveau
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeColor(notification.priority)}`}>
                            {notification.priority === 'urgent' ? 'Urgent' :
                             notification.priority === 'high' ? 'Élevée' :
                             notification.priority === 'medium' ? 'Moyenne' : 'Faible'}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                          {notification.unitNumber && (
                            <div className="flex items-center">
                              <span className="mr-2">🏠</span>
                              <span>Unité {notification.unitNumber}</span>
                            </div>
                          )}
                          {notification.buildingName && (
                            <div className="flex items-center">
                              <span className="mr-2">🏢</span>
                              <span>{notification.buildingName}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="mr-2">📅</span>
                            <span>{new Date(notification.date).toLocaleString('fr-CA')}</span>
                          </div>
                        </div>
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            onClick={() => markAsRead(notification.id)}
                            className="inline-block btn-primary text-sm"
                          >
                            {notification.actionLabel || 'Voir les détails'}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Marquer comme lu"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-2xl font-bold mb-2">Aucune notification</h3>
              <p className="text-gray-600">
                {filter === 'unread'
                  ? 'Toutes vos notifications ont été lues.'
                  : filter === 'urgent'
                  ? 'Aucune notification urgente pour le moment.'
                  : 'Vous n\'avez aucune notification pour le moment.'}
              </p>
            </div>
          )}

          {/* Guide des types de notifications */}
          <div className="card p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">Types de notifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start">
                <span className="text-2xl mr-3">🔴</span>
                <div>
                  <h4 className="font-semibold">Retard de paiement</h4>
                  <p className="text-sm text-gray-600">Alertes pour les paiements en retard</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">🔧</span>
                <div>
                  <h4 className="font-semibold">Intervention urgente</h4>
                  <p className="text-sm text-gray-600">Demandes de maintenance nécessitant une attention immédiate</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">📄</span>
                <div>
                  <h4 className="font-semibold">Documents à renouveler</h4>
                  <p className="text-sm text-gray-600">Documents expirant bientôt ou nécessitant un renouvellement</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <h4 className="font-semibold">Paiements en attente</h4>
                  <p className="text-sm text-gray-600">Rappels pour les paiements en attente</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">📅</span>
                <div>
                  <h4 className="font-semibold">Maintenance à venir</h4>
                  <p className="text-sm text-gray-600">Entretiens préventifs planifiés</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">ℹ️</span>
                <div>
                  <h4 className="font-semibold">Notifications personnalisées</h4>
                  <p className="text-sm text-gray-600">Informations sur votre activité immobilière</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

