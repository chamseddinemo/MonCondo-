import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Notification {
  _id: string
  type: 'message' | 'system' | 'maintenance' | 'contract'
  title: string
  content: string
  sender?: {
    _id: string
    firstName: string
    lastName: string
  }
  conversation?: {
    _id: string
  }
  isRead: boolean
  createdAt: string
}

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<Notification[]>([])

  // Charger les notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('type', filter)
      if (dateFilter !== 'all') params.append('date', dateFilter)

      const response = await axios.get(`${API_URL}/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success) {
        setNotifications(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, dateFilter])

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (data: { message: any; conversation: any }) => {
      const notification: Notification = {
        _id: `temp-${Date.now()}`,
        type: 'message',
        title: `Nouveau message de ${data.message.sender.firstName} ${data.message.sender.lastName}`,
        content: data.message.content.substring(0, 100) + (data.message.content.length > 100 ? '...' : ''),
        sender: data.message.sender,
        conversation: data.conversation,
        isRead: false,
        createdAt: new Date().toISOString()
      }

      // Ajouter à la liste
      setNotifications(prev => [notification, ...prev])

      // Afficher un toast
      setToasts(prev => [...prev, notification])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t._id !== notification._id))
      }, 5000)
    }

    socket.on('message:received', handleNewMessage)

    return () => {
      socket.off('message:received', handleNewMessage)
    }
  }, [socket])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  // Marquer comme lu
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.patch(`${API_URL}/notifications/read/${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Erreur marquage comme lu:', error)
    }
  }

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.patch(`${API_URL}/notifications/read/all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Erreur marquage tout comme lu:', error)
    }
  }

  // Supprimer une notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setNotifications(prev => prev.filter(n => n._id !== notificationId))
    } catch (error) {
      console.error('Erreur suppression notification:', error)
    }
  }

  // Exporter l'historique
  const exportHistory = async (format: 'pdf' | 'txt') => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(
        `${API_URL}/notifications/export/${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `notifications_${new Date().toISOString()}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erreur export:', error)
      alert('Erreur lors de l\'export')
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'message': '💬',
      'system': '🔔',
      'maintenance': '🔧',
      'contract': '📄'
    }
    return icons[type] || '🔔'
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false
    if (dateFilter === 'today') {
      const today = new Date()
      const notifDate = new Date(n.createdAt)
      return notifDate.toDateString() === today.toDateString()
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(n.createdAt) >= weekAgo
    }
    return true
  })

  return (
    <>
      {/* Toasts en temps réel */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast._id}
            className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-primary-600 max-w-sm animate-slide-in"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getNotificationIcon(toast.type)}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{toast.title}</p>
                <p className="text-xs text-gray-600 mt-1">{toast.content}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t._id !== toast._id))}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Panneau principal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
            {/* En-tête */}
            <div className="p-4 border-b border-gray-200 bg-primary-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Notifications</h2>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Filtres */}
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setFilter('message')}
                    className={`px-3 py-1 rounded text-sm ${filter === 'message' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => setFilter('system')}
                    className={`px-3 py-1 rounded text-sm ${filter === 'system' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
                  >
                    Système
                  </button>
                  <button
                    onClick={() => setFilter('maintenance')}
                    className={`px-3 py-1 rounded text-sm ${filter === 'maintenance' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
                  >
                    Maintenance
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1 rounded text-sm text-gray-900"
                  >
                    <option value="all">Toutes les dates</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Tout marquer comme lu
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => exportHistory('txt')}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded"
                >
                  Export TXT
                </button>
                <button
                  onClick={() => exportHistory('pdf')}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded"
                >
                  Export PDF
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 rounded-lg border ${
                        notification.isRead
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-primary-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm">{notification.title}</p>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.content}</p>
                          {notification.sender && (
                            <p className="text-xs text-gray-500">
                              De: {notification.sender.firstName} {notification.sender.lastName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString('fr-CA')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              Marquer lu
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucune notification</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

