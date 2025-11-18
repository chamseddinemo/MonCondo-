import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Contact {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  phone?: string
}

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
  }
  content: string
  isRead: boolean
  status: 'sending' | 'sent' | 'delivered' | 'read'
  isSystemMessage?: boolean
  attachments?: any[]
  createdAt: string
}

interface ChatWindowProps {
  contact: Contact | null
  conversationId?: string
  onClose: () => void
}

export default function ChatWindow({ contact, conversationId, onClose }: ChatWindowProps) {
  const { user: authUser } = useAuth()
  const { socket, isConnected, sendMessage, joinConversation, leaveConversation, markAsRead, sendTyping, onlineUsers } = useSocket()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentConversationIdRef = useRef<string | null>(null)
  const optimisticMessagesRef = useRef<Map<string, string>>(new Map()) // Map tempId -> realId

  // Charger ou créer la conversation
  useEffect(() => {
    if (!contact) return

    const loadOrCreateConversation = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('authToken')

        let convId: string | null = conversationId || null

        // Si pas de conversationId, créer ou récupérer une conversation directe
        if (!convId) {
          const response = await axios.post(
            `${API_URL}/conversations/direct`,
            { receiverId: contact._id },
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (response.data?.success && response.data.data?._id) {
            convId = response.data.data._id
            currentConversationIdRef.current = convId
          }
        } else {
          currentConversationIdRef.current = convId
        }

        // Charger les messages
        if (convId) {
          const messagesResponse = await axios.get(
            `${API_URL}/conversations/${convId}/messages`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (messagesResponse.data?.success) {
            setMessages(messagesResponse.data.data || [])
            markAsRead(convId)
            joinConversation(convId)
          }
        }
      } catch (error) {
        console.error('Erreur chargement conversation:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOrCreateConversation()

    return () => {
      if (currentConversationIdRef.current) {
        leaveConversation(currentConversationIdRef.current)
      }
    }
  }, [contact, conversationId, markAsRead, joinConversation, leaveConversation])

  // Rejoindre automatiquement la conversation quand elle change (IMPORTANT pour recevoir les messages)
  useEffect(() => {
    if (currentConversationIdRef.current && isConnected && socket && joinConversation) {
      joinConversation(currentConversationIdRef.current)
      console.log('[CHAT] ✅ Rejoint la conversation:', currentConversationIdRef.current)
    }
  }, [currentConversationIdRef.current, isConnected, socket, joinConversation])

  // Écouter les nouveaux messages (INSTANTANÉ)
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleMessageReceived = (data: { message: Message; conversation: any }) => {
      // Vérifier si le message appartient à la conversation actuelle
      const conversationId = data.conversation?._id || data.message?.conversation
      if (conversationId === currentConversationIdRef.current) {
        setMessages(prev => {
          // Vérifier si c'est un message que nous avons envoyé (pour remplacer l'optimiste)
          const isMyMessage = data.message.sender._id === authUser?.id || data.message.sender._id === authUser?.id
          
          if (isMyMessage) {
            // Chercher un message optimiste correspondant
            const optimisticMsg = prev.find(m => 
              m._id.startsWith('temp-') && 
              m.content === data.message.content &&
              m.sender._id === data.message.sender._id
            )
            
            if (optimisticMsg) {
              // Remplacer le message optimiste par le vrai message
              optimisticMessagesRef.current.set(optimisticMsg._id, data.message._id)
              return prev.map(m => 
                m._id === optimisticMsg._id ? { ...data.message, status: 'sent' as const } : m
              )
            }
          }
          
          // Vérifier si le message n'existe pas déjà (éviter les doublons)
          const messageExists = prev.some(m => 
            m._id === data.message._id || 
            (m._id.startsWith('temp-') && optimisticMessagesRef.current.get(m._id) === data.message._id)
          )
          
          if (messageExists) {
            // Mettre à jour le message existant
            return prev.map(m => {
              if (m._id === data.message._id) return data.message
              const realId = optimisticMessagesRef.current.get(m._id)
              if (realId === data.message._id) {
                // Remplacer le message optimiste
                optimisticMessagesRef.current.delete(m._id)
                return data.message
              }
              return m
            })
          }
          
          // Ajouter le nouveau message (INSTANTANÉ)
          return [...prev, data.message]
        })
        
        // Marquer comme lu automatiquement si c'est un message reçu
        const isReceivedMessage = (data.message.receiver?._id === authUser?.id || data.message.receiver === authUser?.id) &&
                                  (data.message.sender._id !== authUser?.id && data.message.sender._id !== authUser?.id)
        if (isReceivedMessage) {
          markAsRead(conversationId)
        }
      }
    }

    // Gérer la confirmation d'envoi (pour l'expéditeur) - Remplace le message optimiste
    const handleMessageSent = (data: { message: Message; conversation: any }) => {
      const conversationId = data.conversation?._id || data.message?.conversation
      if (conversationId === currentConversationIdRef.current) {
        setMessages(prev => {
          // Chercher un message optimiste qui correspond (même contenu, même expéditeur)
          const optimisticMsg = prev.find(m => 
            m._id.startsWith('temp-') && 
            m.content === data.message.content &&
            m.sender._id === data.message.sender._id
          )
          
          if (optimisticMsg) {
            // Remplacer le message optimiste par le vrai message
            optimisticMessagesRef.current.set(optimisticMsg._id, data.message._id)
            return prev.map(m => 
              m._id === optimisticMsg._id ? { ...data.message, status: 'sent' as const } : m
            )
          }
          
          // Si pas de message optimiste correspondant, vérifier s'il existe déjà
          const messageExists = prev.some(m => m._id === data.message._id)
          if (!messageExists) {
            return [...prev, { ...data.message, status: 'sent' as const }]
          }
          // Mettre à jour le statut du message existant
          return prev.map(m => m._id === data.message._id ? { ...m, status: 'sent' as const } : m)
        })
      }
    }

    // Gérer les erreurs
    const handleMessageError = (error: { error: string; details?: string }) => {
      console.error('[CHAT] Erreur message:', error.error)
      alert(`Erreur: ${error.error}`)
    }

    const handleTyping = (data: { userId: string; userName?: string; isTyping: boolean }) => {
      // Ne pas afficher l'indicateur de frappe pour soi-même
      if (data.userId === authUser?.id) return
      
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

    // Écouter tous les événements de messages
    socket.on('message:received', handleMessageReceived)
    socket.on('message:sent', handleMessageSent)
    socket.on('message:error', handleMessageError)
    socket.on('message:typing', handleTyping)

    return () => {
      socket.off('message:received', handleMessageReceived)
      socket.off('message:sent', handleMessageSent)
      socket.off('message:error', handleMessageError)
      socket.off('message:typing', handleTyping)
    }
  }, [socket, isConnected, markAsRead, authUser])

  // Scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Envoyer un message (OPTIMISTE - affichage instantané)
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !contact || !currentConversationIdRef.current) return

    const messageContent = messageInput.trim() || (selectedFiles.length > 0 ? '📎 Fichier(s) joint(s)' : '')
    if (!messageContent && selectedFiles.length === 0) return

    // Créer un message optimiste (affiché immédiatement)
    const tempMessageId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: Message = {
      _id: tempMessageId,
      sender: {
        _id: authUser?.id || '',
        firstName: authUser?.firstName || '',
        lastName: authUser?.lastName || '',
        email: authUser?.email || '',
        role: authUser?.role || 'visiteur'
      },
      receiver: {
        _id: contact._id,
        firstName: contact.firstName,
        lastName: contact.lastName
      },
      content: messageContent,
      isRead: false,
      status: 'sending' as const,
      createdAt: new Date().toISOString(),
      attachments: []
    }

    // Afficher le message optimiste immédiatement (INSTANTANÉ)
    setMessages(prev => [...prev, optimisticMessage])

    // Vider le champ de saisie immédiatement
    const savedMessageInput = messageInput
    const savedSelectedFiles = [...selectedFiles]
    setMessageInput('')
    setSelectedFiles([])
    
    // Arrêter l'indicateur de frappe
    if (isTyping) {
      sendTyping(currentConversationIdRef.current, false)
      setIsTyping(false)
    }

    // Upload des fichiers si présents
    let attachments: any[] = []
    if (savedSelectedFiles.length > 0) {
      try {
        setUploadingFiles(true)
        const token = localStorage.getItem('authToken')
        const formData = new FormData()
        
        savedSelectedFiles.forEach((file) => {
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
        // Retirer le message optimiste en cas d'erreur
        setMessages(prev => prev.filter(m => m._id !== tempMessageId))
        alert('Erreur lors de l\'upload des fichiers')
        setUploadingFiles(false)
        // Restaurer le message
        setMessageInput(savedMessageInput)
        setSelectedFiles(savedSelectedFiles)
        return
      } finally {
        setUploadingFiles(false)
      }
    }

    // Envoyer le message via Socket.io (INSTANTANÉ)
    try {
      sendMessage({
        receiver: contact._id,
        content: messageContent,
        conversationId: currentConversationIdRef.current,
        attachments
      })

      // Le message optimiste sera remplacé par le vrai message quand il arrive via handleMessageSent ou handleMessageReceived
      // Nettoyer après un délai si le message n'a pas été remplacé (fallback)
      setTimeout(() => {
        setMessages(prev => {
          const stillTemp = prev.find(m => m._id === tempMessageId)
          if (stillTemp) {
            // Vérifier si le message a été remplacé
            const realId = optimisticMessagesRef.current.get(tempMessageId)
            if (!realId) {
              // Le message n'a pas été remplacé, le garder mais le marquer comme envoyé
              // (peut arriver si la connexion est lente mais le message a bien été envoyé)
              return prev.map(m => 
                m._id === tempMessageId 
                  ? { ...m, status: 'sent' as const }
                  : m
              )
            } else {
              // Le message a été remplacé, supprimer l'ancien
              optimisticMessagesRef.current.delete(tempMessageId)
              return prev.filter(m => m._id !== tempMessageId)
            }
          }
          return prev
        })
      }, 3000) // 3 secondes de délai
    } catch (error) {
      console.error('Erreur envoi message:', error)
      // Retirer le message optimiste en cas d'erreur
      setMessages(prev => prev.filter(m => m._id !== tempMessageId))
      alert('Erreur lors de l\'envoi du message')
      // Restaurer le message
      setMessageInput(savedMessageInput)
      setSelectedFiles(savedSelectedFiles)
    }
  }

  // Gérer l'indicateur de frappe
  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (!currentConversationIdRef.current) return

    if (!isTyping && value.trim()) {
      setIsTyping(true)
      sendTyping(currentConversationIdRef.current, true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && currentConversationIdRef.current) {
        sendTyping(currentConversationIdRef.current, false)
        setIsTyping(false)
      }
    }, 3000)
  }

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { icon: string; color: string; bgColor: string } } = {
      'admin': { icon: '🟦', color: 'text-blue-800', bgColor: 'bg-blue-100' },
      'proprietaire': { icon: '🟧', color: 'text-orange-800', bgColor: 'bg-orange-100' },
      'locataire': { icon: '🟩', color: 'text-green-800', bgColor: 'bg-green-100' }
    }
    return badges[role] || { icon: '⚪', color: 'text-gray-800', bgColor: 'bg-gray-100' }
  }

  const isOnline = contact && onlineUsers ? onlineUsers.has(contact._id) : false

  if (!contact) return null

  const roleBadge = getRoleBadge(contact.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
              </div>
              {isOnline ? (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              ) : (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {contact.firstName} {contact.lastName}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${roleBadge.bgColor} ${roleBadge.color}`}>
                  {roleBadge.icon} {contact.role}
                </span>
                {isOnline ? (
                  <span className="text-xs text-green-600">🟢 En ligne</span>
                ) : (
                  <span className="text-xs text-gray-400">⚪ Hors ligne</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dashboard/${contact.role === 'admin' ? 'admin' : contact.role === 'proprietaire' ? 'proprietaire' : 'locataire'}`)}
              className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Voir Profil
            </button>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`p-2 rounded-lg ${notificationsEnabled ? 'text-yellow-600 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-50'}`}
              title={notificationsEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
            >
              {notificationsEnabled ? '🔔' : '🔕'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender._id === authUser?.id
              const msgRoleBadge = getRoleBadge(message.sender.role)

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {message.sender.firstName} {message.sender.lastName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${msgRoleBadge.bgColor} ${msgRoleBadge.color}`}>
                          {msgRoleBadge.icon}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        isOwn
                          ? 'bg-blue-100 text-blue-900'
                          : `${msgRoleBadge.bgColor} ${msgRoleBadge.color}`
                      }`}
                    >
                      {message.isSystemMessage ? (
                        <p className="text-sm italic text-center text-gray-600">
                          {message.content}
                        </p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={`${API_URL.replace('/api', '')}/uploads/${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white rounded hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-lg">📎</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{att.filename}</p>
                                {att.size && (
                                  <p className="text-xs text-gray-500">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-primary-600">Télécharger</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {isOwn && (
                        <span className="ml-2">
                          {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun message</p>
              <p className="text-sm mt-2">Commencez la conversation !</p>
            </div>
          )}
          
          {/* Indicateur de frappe */}
          {typingUsers.size > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
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

        {/* Zone de saisie */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {/* Aperçu des fichiers */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                  <span className="text-sm">📎 {file.name}</span>
                  <button
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
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
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              title="Joindre un fichier"
            >
              📎
            </label>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Tapez votre message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && selectedFiles.length === 0) || uploadingFiles}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingFiles ? 'Envoi...' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

