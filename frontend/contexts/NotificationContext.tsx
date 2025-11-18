import { useState, useEffect, createContext, useContext } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Notification {
  _id: string
  type: 'request' | 'payment' | 'message' | 'alert' | 'maintenance'
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface NotificationStats {
  totalUnread: number
  byType: {
    request: number
    payment: number
    message: number
    alert: number
    maintenance: number
  }
}

interface NotificationContextType {
  notifications: Notification[]
  stats: NotificationStats
  loading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    totalUnread: 0,
    byType: {
      request: 0,
      payment: 0,
      message: 0,
      alert: 0,
      maintenance: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setLoading(false)
        return
      }

      // Fetch notifications from multiple endpoints
      // Utiliser le service centralisé pour les messages non lus
      const [requestsRes, paymentsRes, messagesRes, unreadCountRes] = await Promise.all([
        axios.get(`${API_URL}/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/messages/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, data: [], count: 0 } })),
        axios.get(`${API_URL}/messages/unread/count`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { success: true, count: 0 } }))
      ])

      // Transform data into notifications
      const notificationsList: Notification[] = []

      // Requests notifications (pending and in progress)
      if (requestsRes.data.success) {
        const requests = requestsRes.data.data || []
        requests.forEach((req: any) => {
          if (req.status === 'en_attente' || req.status === 'en_cours') {
            notificationsList.push({
              _id: req._id,
              type: 'request',
              title: `Demande: ${req.title || 'Sans titre'}`,
              message: req.description?.substring(0, 100) || '',
              read: false,
              createdAt: req.createdAt,
              link: `/locataire/services`,
              priority: req.priority === 'urgente' ? 'urgent' : req.priority === 'haute' ? 'high' : 'medium'
            })
          }
        })
      }

      // Payment notifications (pending and overdue)
      if (paymentsRes.data.success) {
        const payments = paymentsRes.data.data || []
        payments.forEach((payment: any) => {
          if (payment.status === 'en_attente' || payment.status === 'en_retard') {
            const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date()
            notificationsList.push({
              _id: payment._id,
              type: 'payment',
              title: isOverdue ? 'Paiement en retard' : 'Paiement en attente',
              message: `Montant: $${payment.amount?.toLocaleString() || 0}`,
              read: false,
              createdAt: payment.createdAt || payment.dueDate,
              link: `/payments`,
              priority: isOverdue ? 'urgent' : 'high'
            })
          }
        })
      }

      // Message notifications (unread) - Utiliser les données du service centralisé
      if (messagesRes.data.success) {
        const messages = messagesRes.data.data || []
        const unreadCount = unreadCountRes.data.success ? unreadCountRes.data.count : messages.length
        
        messages.forEach((msg: any) => {
          if (!msg.isRead) {
            notificationsList.push({
              _id: msg._id,
              type: 'message',
              title: `Message de ${msg.sender?.firstName || 'Utilisateur'}`,
              message: msg.subject || msg.content?.substring(0, 100) || '',
              read: false,
              createdAt: msg.createdAt,
              link: `/messages`,
              priority: 'medium'
            })
          }
        })
        
        // S'assurer que le compteur correspond exactement
        const messageUnreadCount = messages.filter((msg: any) => !msg.isRead).length
        if (messageUnreadCount !== unreadCount) {
          console.warn('[NOTIFICATION CONTEXT] Incohérence compteur messages:', { messageUnreadCount, unreadCount })
        }
      }

      // Sort by priority and date
      notificationsList.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2)
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setNotifications(notificationsList)

      // Calculate stats - Utiliser le compteur exact du backend pour les messages
      const messageUnreadCount = unreadCountRes.data.success ? unreadCountRes.data.count : 
        notificationsList.filter(n => n.type === 'message' && !n.read).length
      
      const unreadCount = notificationsList.filter(n => !n.read && n.type !== 'message').length + messageUnreadCount
      const byType = {
        request: notificationsList.filter(n => n.type === 'request' && !n.read).length,
        payment: notificationsList.filter(n => n.type === 'payment' && !n.read).length,
        message: messageUnreadCount, // Utiliser le compteur exact du backend
        alert: notificationsList.filter(n => n.type === 'alert' && !n.read).length,
        maintenance: notificationsList.filter(n => n.type === 'maintenance' && !n.read).length
      }

      setStats({
        totalUnread: unreadCount,
        byType
      })
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshNotifications = async () => {
    await fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    setStats(prev => ({
      totalUnread: Math.max(0, prev.totalUnread - 1),
      byType: {
        ...prev.byType,
        [notifications.find(n => n._id === id)?.type || 'request']: Math.max(0, prev.byType[notifications.find(n => n._id === id)?.type || 'request'] - 1)
      }
    }))
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setStats({
      totalUnread: 0,
      byType: {
        request: 0,
        payment: 0,
        message: 0,
        alert: 0,
        maintenance: 0
      }
    })
  }

  useEffect(() => {
    fetchNotifications()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    setRefreshInterval(interval)

    // Écouter les événements de synchronisation des messages
    const handleMessageSync = async (event: any) => {
      const { messageId, action, receiverId } = event.detail || {};
      console.log('[NOTIFICATION CONTEXT] Événement synchronisation message:', { messageId, action, receiverId });
      
      // Recharger les notifications après un court délai
      setTimeout(() => {
        fetchNotifications();
      }, 500);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('messageSync', handleMessageSync);
      window.addEventListener('messageListRefresh', handleMessageSync);
      window.addEventListener('messageProcessed', handleMessageSync);
      
      return () => {
        if (interval) clearInterval(interval);
        window.removeEventListener('messageSync', handleMessageSync);
        window.removeEventListener('messageListRefresh', handleMessageSync);
        window.removeEventListener('messageProcessed', handleMessageSync);
      };
    } else {
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        stats,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    // Return default values if context is not available (e.g., user not authenticated)
    return {
      notifications: [],
      stats: {
        totalUnread: 0,
        byType: {
          request: 0,
          payment: 0,
          message: 0,
          alert: 0,
          maintenance: 0
        }
      },
      loading: false,
      refreshNotifications: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {}
    }
  }
  return context
}

