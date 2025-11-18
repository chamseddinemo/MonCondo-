import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useMessageSync } from '../hooks/useMessageSync'
import { useNotifications } from '../contexts/NotificationContext'
import ContactSuggestions from '../components/ContactSuggestions'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Message {
  _id: string
  sender: {
    _id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  receiver: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  content: string
  isRead: boolean
  status: 'sending' | 'sent' | 'delivered' | 'read'
  isSystemMessage?: boolean
  attachments?: any[]
  createdAt: string
}

interface Conversation {
  _id: string
  participants: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }>
  type: 'direct' | 'group' | 'unit' | 'building'
  lastMessage?: Message
  lastMessageAt: string
  unreadCount?: Map<string, number> | any
  unit?: {
    _id: string
    unitNumber: string
  }
  building?: {
    _id: string
    name: string
  }
}

export default function Messages() {
  const { user: authUser } = useAuth()
  const { socket, isConnected, onlineUsers, sendMessage, joinConversation, leaveConversation, markAsRead, sendTyping } = useSocket()
  const { refreshNotifications } = useNotifications()
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [groupedMessages, setGroupedMessages] = useState<any[]>([]) // Messages regroupés par expéditeur
  const [viewMode, setViewMode] = useState<'conversations' | 'messages'>('conversations') // Mode d'affichage
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Charger les conversations
  const loadConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success) {
        setConversations(response.data.data || [])
        
        // Joindre toutes les conversations via Socket.io
        if (socket && isConnected) {
          const conversationIds = (response.data.data || []).map((c: Conversation) => c._id)
          socket.emit('join:conversations', conversationIds)
        }
      }
    } catch (error) {
      console.error('Erreur chargement conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [socket, isConnected])

  // Charger les messages regroupés par expéditeur
  const loadGroupedMessages = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/messages`, {
        params: { grouped: true },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success) {
        setGroupedMessages(response.data.data || [])
        console.log('[MESSAGES PAGE] Messages regroupés chargés:', response.data.data.length)
      }
    } catch (error) {
      console.error('Erreur chargement messages regroupés:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les messages d'une conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success) {
        setMessages(response.data.data || [])
        
        // Marquer comme lu
        markAsRead(conversationId)
        
        // Joindre la conversation via Socket.io
        joinConversation(conversationId)
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [markAsRead, joinConversation])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Utiliser le hook de synchronisation pour recharger automatiquement
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadConversations(),
      loadGroupedMessages(),
      refreshNotifications()
    ])
  }, [loadConversations, loadGroupedMessages, refreshNotifications])

  // Synchroniser automatiquement avec les événements
  useMessageSync(refreshData, [authUser?._id])

  // Charger les messages regroupés au montage
  useEffect(() => {
    loadGroupedMessages()
  }, [loadGroupedMessages])

  // Écouter les nouveaux messages via Socket.io
  useEffect(() => {
    if (!socket) return

    const handleMessageReceived = (data: { message: Message; conversation: Conversation }) => {
      // Si c'est la conversation actuelle, ajouter le message
      if (selectedConversation?._id === data.conversation._id) {
        setMessages(prev => [...prev, data.message])
        markAsRead(data.conversation._id)
      }

      // Mettre à jour la liste des conversations
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv._id === data.conversation._id 
            ? { ...conv, lastMessage: data.message, lastMessageAt: data.message.createdAt }
            : conv
        )
        
        // Si la conversation n'existe pas encore, l'ajouter
        if (!updated.find(c => c._id === data.conversation._id)) {
          return [data.conversation, ...updated]
        }
        
        // Trier par lastMessageAt
        return updated.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      })
      
      // Déclencher la synchronisation pour mettre à jour le compteur
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('messageProcessed', {
          detail: {
            messageId: data.message._id,
            action: 'received',
            receiverId: data.message.receiver?._id || data.message.receiver,
            senderId: data.message.sender?._id || data.message.sender
          }
        }))
      }
    }

    const handleMessageNew = (data: { message: Message; conversation: Conversation }) => {
      handleMessageReceived(data)
    }

    const handleTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.add(data.userId)
          return newSet
        })
      } else {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
      }
    }

    socket.on('message:received', handleMessageReceived)
    socket.on('message:new', handleMessageNew)
    socket.on('message:typing', handleTyping)

    return () => {
      socket.off('message:received', handleMessageReceived)
      socket.off('message:new', handleMessageNew)
      socket.off('message:typing', handleTyping)
    }
  }, [socket, selectedConversation, markAsRead])

  // Sélectionner une conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    loadMessages(conversation._id)
  }

  // Créer une nouvelle conversation
  const handleStartConversation = async (contactId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post(
        `${API_URL}/conversations/direct`,
        { receiverId: contactId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data?.success) {
        const newConversation = response.data.data
        setConversations(prev => [newConversation, ...prev])
        handleSelectConversation(newConversation)
      }
    } catch (error) {
      console.error('Erreur création conversation:', error)
    }
  }

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0 || !selectedConversation) return

    const otherParticipant = selectedConversation.participants.find(
      p => p._id !== authUser?.id
    )

    if (!otherParticipant) return

    // Upload des fichiers si présents
    let attachments: any[] = []
    if (selectedFiles.length > 0) {
      try {
        setUploadingFiles(true)
        const token = localStorage.getItem('authToken')
        const formData = new FormData()
        
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })

        const uploadResponse = await axios.post(
          `${API_URL.replace('/api', '')}/upload/messages`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        )

        if (uploadResponse.data?.success) {
          attachments = uploadResponse.data.files.map((file: any) => ({
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype
          }))
        }
      } catch (error) {
        console.error('Erreur upload fichiers:', error)
        alert('Erreur lors de l\'upload des fichiers')
        setUploadingFiles(false)
        return
      } finally {
        setUploadingFiles(false)
      }
    }

    sendMessage({
      receiver: otherParticipant._id,
      content: messageInput.trim() || (attachments.length > 0 ? '📎 Fichier(s) joint(s)' : ''),
      conversationId: selectedConversation._id,
      unit: selectedConversation.unit?._id,
      building: selectedConversation.building?._id,
      attachments
    })

    setMessageInput('')
    setSelectedFiles([])
    
    // Réinitialiser la hauteur du textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Arrêter l'indicateur de frappe
    if (isTyping) {
      sendTyping(selectedConversation._id, false)
      setIsTyping(false)
    }
  }

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [messageInput])

  // Gérer l'indicateur de frappe
  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (!selectedConversation) return

    if (!isTyping && value.trim()) {
      setIsTyping(true)
      sendTyping(selectedConversation._id, true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        sendTyping(selectedConversation._id, false)
        setIsTyping(false)
      }
    }, 3000)
  }

  // Scroll vers le bas quand les messages changent
  useEffect(() => {
    // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [messages, loadingMessages])

  // Nettoyer à la déconnexion
  useEffect(() => {
    return () => {
      if (selectedConversation) {
        leaveConversation(selectedConversation._id)
      }
    }
  }, [selectedConversation, leaveConversation])

  const getRoleBadge = (role?: string | null) => {
    const badges: { [key: string]: { icon: string; color: string } } = {
      'admin': { icon: '🟦', color: 'bg-blue-100 text-blue-800' },
      'proprietaire': { icon: '🟧', color: 'bg-orange-100 text-orange-800' },
      'locataire': { icon: '🟩', color: 'bg-green-100 text-green-800' }
    }
    // Gérer les valeurs undefined, null ou vides
    const normalizedRole = (role || 'visiteur').toLowerCase()
    return badges[normalizedRole] || { icon: '⚪', color: 'bg-gray-100 text-gray-800' }
  }

  // Fonction pour formater la date d'un message
  const formatMessageDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Si c'est aujourd'hui, afficher seulement l'heure
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Si c'est hier
    if (messageDate.getTime() === yesterday.getTime()) {
      return `Hier ${date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    }

    // Si c'est cette semaine, afficher le jour de la semaine
    const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 7) {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Sinon, afficher la date complète
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fonction pour obtenir le séparateur de date
  const getDateSeparator = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (messageDate.getTime() === today.getTime()) {
      return "Aujourd'hui"
    }

    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Hier'
    }

    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Fonction pour grouper les messages par date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    
    // Trier les messages par date (croissant - plus anciens en premier)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    sortedMessages.forEach(message => {
      const date = new Date(message.createdAt)
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })

    // Trier les groupes par date (croissant)
    const sortedGroups: { [key: string]: Message[] } = {}
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key]
    })

    return sortedGroups
  }

  // Fonction utilitaire pour obtenir les initiales de manière sûre
  const getInitials = (firstName?: string, lastName?: string, email?: string): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }
    if (email) {
      return email.charAt(0).toUpperCase()
    }
    return '?'
  }

  // Fonction utilitaire pour obtenir le nom complet de manière sûre
  const getFullName = (firstName?: string, lastName?: string, email?: string): string => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    if (lastName) {
      return lastName
    }
    if (email) {
      return email
    }
    return 'Utilisateur inconnu'
  }

  // Participant par défaut pour éviter les erreurs
  const defaultParticipant = {
    _id: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'visiteur'
  }

  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation || !conversation.participants || conversation.participants.length === 0) {
      return defaultParticipant
    }
    
    const other = conversation.participants.find(p => p._id !== authUser?.id) || conversation.participants[0]
    
    // S'assurer que les propriétés essentielles existent
    return {
      _id: other?._id || '',
      firstName: other?.firstName || '',
      lastName: other?.lastName || '',
      email: other?.email || '',
      role: other?.role || 'visiteur'
    }
  }

  const getUnreadCount = (conversation: Conversation) => {
    if (!conversation.unreadCount) return 0
    if (conversation.unreadCount instanceof Map) {
      return conversation.unreadCount.get(authUser?.id) || 0
    }
    // Si c'est un objet JavaScript (venant de MongoDB)
    if (typeof conversation.unreadCount === 'object' && !(conversation.unreadCount instanceof Map)) {
      return authUser?.id ? (conversation.unreadCount as any)[authUser.id] || 0 : 0
    }
    return 0
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const other = getOtherParticipant(conv)
    const searchLower = searchQuery.toLowerCase()
    
    // Vérifications de sécurité pour éviter les erreurs
    const firstName = (other?.firstName || '').toLowerCase()
    const lastName = (other?.lastName || '').toLowerCase()
    const email = (other?.email || '').toLowerCase()
    const lastMessageContent = (conv.lastMessage?.content || '').toLowerCase()
    
    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      email.includes(searchLower) ||
      lastMessageContent.includes(searchLower)
    )
  })


  return (
    <ProtectedRoute requiredRoles={['admin', 'proprietaire', 'locataire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold flex items-center">
                <span className="mr-3">💬</span>
                Messagerie
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connecté' : 'Déconnecté'}
                  </span>
                </div>
                {/* Toggle entre conversations et messages regroupés */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('conversations')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'conversations'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Conversations
                  </button>
                  <button
                    onClick={() => setViewMode('messages')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'messages'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Messages
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 10rem)' }}>
            {/* Sidebar - Liste des conversations */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
              {/* Recherche */}
              <div className="p-4 border-b border-gray-200">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Liste des conversations ou messages regroupés */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : viewMode === 'messages' ? (
                  // Vue messages regroupés par expéditeur
                  groupedMessages.length > 0 ? (
                    groupedMessages
                      .filter((group: any) => {
                        if (!searchQuery) return true
                        const searchLower = searchQuery.toLowerCase()
                        const sender = group.sender || {}
                        const firstName = (sender.firstName || '').toLowerCase()
                        const lastName = (sender.lastName || '').toLowerCase()
                        const email = (sender.email || '').toLowerCase()
                        const lastMessageContent = (group.lastMessage?.content || '').toLowerCase()
                        return (
                          firstName.includes(searchLower) ||
                          lastName.includes(searchLower) ||
                          email.includes(searchLower) ||
                          lastMessageContent.includes(searchLower)
                        )
                      })
                      .map((group: any) => {
                        const sender = group.sender || {}
                        const roleBadge = getRoleBadge(sender.role || 'visiteur')
                        const isOnline = sender._id ? onlineUsers.has(sender._id) : false
                        const unreadCount = group.unreadCount || 0
                        const lastMessage = group.lastMessage

                        return (
                          <div
                            key={group._id}
                            onClick={() => {
                              // Créer ou sélectionner une conversation avec cet expéditeur
                              handleStartConversation(sender._id)
                            }}
                            className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {getInitials(sender.firstName, sender.lastName, sender.email)}
                                </div>
                                {isOnline && sender._id && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {getFullName(sender.firstName, sender.lastName, sender.email)}
                                  </p>
                                  {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] px-2 py-0.5 flex items-center justify-center">
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded ${roleBadge.color}`}>
                                    {roleBadge.icon} {sender.role || 'visiteur'}
                                  </span>
                                  {group.totalMessages > 1 && (
                                    <span className="text-xs text-gray-500">
                                      {group.totalMessages} message{group.totalMessages > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                {lastMessage && (
                                  <p className="text-sm text-gray-600 truncate">
                                    {lastMessage.content}
                                  </p>
                                )}
                                {group.lastMessageDate && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(group.lastMessageDate).toLocaleDateString('fr-CA', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>Aucun message</p>
                      <button
                        onClick={() => setShowNewMessageModal(true)}
                        className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Voir les contacts
                      </button>
                    </div>
                  )
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => {
                    const other = getOtherParticipant(conversation)
                    const roleBadge = getRoleBadge(other.role || 'visiteur')
                    const unreadCount = getUnreadCount(conversation)
                    const isOnline = other._id ? onlineUsers.has(other._id) : false
                    const isSelected = selectedConversation?._id === conversation._id

                    return (
                      <div
                        key={conversation._id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                              {getInitials(other.firstName, other.lastName, other.email)}
                            </div>
                            {isOnline && other._id && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {getFullName(other.firstName, other.lastName, other.email)}
                              </p>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${roleBadge.color}`}>
                                {roleBadge.icon} {other.role || 'visiteur'}
                              </span>
                            </div>
                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessage.content}
                              </p>
                            )}
                            {conversation.lastMessageAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(conversation.lastMessageAt).toLocaleDateString('fr-CA', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>Aucune conversation</p>
                    <button
                      onClick={() => setShowNewMessageModal(true)}
                      className="mt-2 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      Voir les contacts
                    </button>
                  </div>
                )}
              </div>

              {/* Bouton nouveau message */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="w-full btn-primary"
                >
                  ➕ Nouveau message
                </button>
              </div>
            </div>

            {/* Zone principale - Chat */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
              {selectedConversation ? (
                <>
                  {/* En-tête de la conversation */}
                  <div className="p-4 border-b border-gray-200">
                    {(() => {
                      const other = getOtherParticipant(selectedConversation)
                      const roleBadge = getRoleBadge(other.role || 'visiteur')
                      const isOnline = other._id ? onlineUsers.has(other._id) : false
                      
                      return (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                              {getInitials(other.firstName, other.lastName, other.email)}
                            </div>
                            {isOnline && other._id && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {getFullName(other.firstName, other.lastName, other.email)}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${roleBadge.color}`}>
                                {roleBadge.icon} {other.role || 'visiteur'}
                              </span>
                              {isOnline ? (
                                <span className="text-xs text-green-600">🟢 En ligne</span>
                              ) : (
                                <span className="text-xs text-gray-400">⚪ Hors ligne</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-gray-50">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
                          <p className="mt-4 text-gray-600">Chargement des messages...</p>
                        </div>
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="p-4 space-y-6">
                        {Object.entries(groupMessagesByDate(messages)).map(([dateKey, dateMessages]) => (
                          <div key={dateKey} className="space-y-3">
                            {/* Séparateur de date */}
                            <div className="flex items-center justify-center my-4">
                              <div className="bg-white px-4 py-1 rounded-full shadow-sm border border-gray-200">
                                <span className="text-xs font-medium text-gray-600">
                                  {getDateSeparator(dateMessages[0].createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Messages du jour */}
                            {dateMessages.map((message, index) => {
                              const isOwn = message.sender._id === authUser?.id
                              const roleBadge = getRoleBadge(message.sender?.role)
                              const showAvatar = !isOwn && (
                                index === 0 || 
                                dateMessages[index - 1].sender._id !== message.sender._id ||
                                new Date(message.createdAt).getTime() - new Date(dateMessages[index - 1].createdAt).getTime() > 300000 // 5 minutes
                              )
                              const showSenderName = !isOwn && showAvatar
                              const prevMessage = index > 0 ? dateMessages[index - 1] : null
                              const isConsecutive = prevMessage && 
                                prevMessage.sender._id === message.sender._id &&
                                new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000

                              return (
                                <div
                                  key={message._id}
                                  className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                                    isConsecutive && !isOwn ? 'ml-10' : ''
                                  }`}
                                >
                                  {/* Avatar (seulement pour les messages reçus et si nécessaire) */}
                                  {!isOwn && (
                                    <div className="flex-shrink-0 w-8 h-8">
                                      {showAvatar ? (
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                          {getInitials(message.sender?.firstName, message.sender?.lastName, message.sender?.email)}
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8"></div>
                                      )}
                                    </div>
                                  )}

                                  {/* Contenu du message */}
                                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%] lg:max-w-[60%]`}>
                                    {/* Nom de l'expéditeur (seulement pour les messages reçus et si nécessaire) */}
                                    {showSenderName && (
                                      <div className="flex items-center gap-2 mb-1 px-2">
                                        <span className="font-semibold text-sm text-gray-700">
                                          {getFullName(message.sender?.firstName, message.sender?.lastName, message.sender?.email)}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                                          {roleBadge.icon}
                                        </span>
                                      </div>
                                    )}

                                    {/* Bulle de message */}
                                    <div
                                      className={`rounded-2xl px-4 py-2 ${
                                        isOwn
                                          ? 'bg-blue-600 text-white rounded-br-sm'
                                          : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                                      }`}
                                    >
                                      {message.isSystemMessage ? (
                                        <p className="text-sm italic text-center text-gray-600">
                                          {message.content}
                                        </p>
                                      ) : (
                                        <p className={`text-sm whitespace-pre-wrap break-words ${
                                          isOwn ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {message.content}
                                        </p>
                                      )}
                                      
                                      {/* Pièces jointes */}
                                      {message.attachments && message.attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {message.attachments.map((att, idx) => (
                                            <a
                                              key={idx}
                                              href={`${API_URL.replace('/api', '')}/uploads/${att.path}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                                                isOwn
                                                  ? 'bg-blue-700 hover:bg-blue-800'
                                                  : 'bg-gray-50 hover:bg-gray-100'
                                              }`}
                                            >
                                              <span className="text-lg">📎</span>
                                              <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-semibold truncate ${
                                                  isOwn ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                  {att.filename}
                                                </p>
                                                {att.size && (
                                                  <p className={`text-xs ${
                                                    isOwn ? 'text-blue-200' : 'text-gray-500'
                                                  }`}>
                                                    {(att.size / 1024).toFixed(1)} KB
                                                  </p>
                                                )}
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Horaire et statut */}
                                    <div className={`flex items-center gap-1 mt-1 px-2 ${
                                      isOwn ? 'flex-row-reverse' : ''
                                    }`}>
                                      <span className="text-xs text-gray-500">
                                        {formatMessageDate(message.createdAt)}
                                      </span>
                                      {isOwn && (
                                        <span className={`text-xs ${
                                          message.status === 'read' 
                                            ? 'text-blue-600' 
                                            : message.status === 'delivered' 
                                            ? 'text-gray-400' 
                                            : 'text-gray-300'
                                        }`}>
                                          {message.status === 'read' 
                                            ? '✓✓' 
                                            : message.status === 'delivered' || message.status === 'sent'
                                            ? '✓✓' 
                                            : '✓'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Espace pour l'avatar (côté droit pour nos messages) */}
                                  {isOwn && <div className="flex-shrink-0 w-8 h-8"></div>}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                        
                        {/* Indicateur de frappe */}
                        {typingUsers.size > 0 && (
                          <div className="flex justify-start items-end gap-2">
                            <div className="w-8 h-8 flex-shrink-0"></div>
                            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">💬</div>
                          <p className="text-lg font-semibold text-gray-700 mb-2">Aucun message</p>
                          <p className="text-sm text-gray-500">Commencez la conversation !</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Zone de saisie */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Aperçu des fichiers sélectionnés */}
                    {selectedFiles.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 border border-gray-200">
                            <span className="text-sm text-gray-700">📎 {file.name}</span>
                            <button
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 text-sm font-bold ml-2"
                              title="Retirer ce fichier"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-end gap-2">
                      <input
                        type="file"
                        id="file-input"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                          }
                        }}
                      />
                      <label
                        htmlFor="file-input"
                        className="flex items-center justify-center w-10 h-10 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-primary-500 cursor-pointer transition-colors mb-0"
                        title="Joindre un fichier"
                      >
                        <span className="text-lg">📎</span>
                      </label>
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          value={messageInput}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          placeholder="Tapez votre message..."
                          rows={1}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-y-auto"
                          style={{ minHeight: '44px', maxHeight: '120px' }}
                        />
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={(!messageInput.trim() && selectedFiles.length === 0) || uploadingFiles}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm disabled:shadow-none"
                      >
                        {uploadingFiles ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Envoi...
                          </span>
                        ) : (
                          'Envoyer'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-xl">Sélectionnez une conversation</p>
                    <p className="text-sm mt-2">ou créez-en une nouvelle</p>
                    <button
                      onClick={() => setShowNewMessageModal(true)}
                      className="mt-4 btn-primary"
                    >
                      ➕ Nouvelle conversation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sélection de contacts */}
      <ContactSuggestions
        isOpen={showNewMessageModal}
        onClose={() => {
          setShowNewMessageModal(false)
          setSearchQuery('')
        }}
        onSelectContact={async (contact) => {
          await handleStartConversation(contact._id)
          setShowNewMessageModal(false)
          setSearchQuery('')
        }}
      />

    </ProtectedRoute>
  )
}

