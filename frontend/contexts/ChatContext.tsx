import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Message {
  _id: string
  sender: {
    _id: string
    firstName: string
    lastName: string
    role: string
  }
  content: string
  attachments?: any[]
  isSystemMessage?: boolean
  status: 'sending' | 'sent' | 'delivered' | 'read'
  createdAt: string
}

interface Contact {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface ChatContextType {
  isChatOpen: boolean
  openChat: (contact?: Contact) => void
  closeChat: () => void
  selectedContact: Contact | null
  messages: Message[]
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  isTyping: boolean
  typingUsers: Set<string>
  unreadCount: number
  loadMessages: () => Promise<void>
  conversationId: string | null
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { socket, isConnected, sendMessage: socketSendMessage, joinConversation, leaveConversation, markAsRead, onlineUsers } = useSocket()
  
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)

  // Ouvrir le chat avec un contact
  const openChat = useCallback(async (contact?: Contact) => {
    if (contact) {
      setSelectedContact(contact)
      
      // Créer ou récupérer la conversation
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.post(
          `${API_URL}/conversations/direct`,
          { receiverId: contact._id },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (response.data?.success) {
          const conv = response.data.data
          setConversationId(conv._id)
          joinConversation(conv._id)
          
          // Charger les messages
          await loadMessagesForConversation(conv._id)
        }
      } catch (error) {
        console.error('Erreur ouverture chat:', error)
      }
    }
    
    setIsChatOpen(true)
  }, [joinConversation])

  // Fermer le chat
  const closeChat = useCallback(() => {
    if (conversationId) {
      leaveConversation(conversationId)
    }
    setIsChatOpen(false)
    setSelectedContact(null)
    setConversationId(null)
    setMessages([])
  }, [conversationId, leaveConversation])

  // Charger les messages d'une conversation
  const loadMessagesForConversation = async (convId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(
        `${API_URL}/conversations/${convId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data?.success) {
        setMessages(response.data.data || [])
        markAsRead(convId)
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    }
  }

  // Charger les messages (pour refresh)
  const loadMessages = useCallback(async () => {
    if (conversationId) {
      await loadMessagesForConversation(conversationId)
    }
  }, [conversationId])

  // Envoyer un message
  const sendMessage = useCallback(async (content: string, attachments: File[] = []) => {
    if (!selectedContact || !conversationId || (!content.trim() && attachments.length === 0)) return

    // Upload des fichiers si présents
    let attachmentData: any[] = []
    if (attachments.length > 0) {
      try {
        const token = localStorage.getItem('authToken')
        const formData = new FormData()
        attachments.forEach(file => formData.append('files', file))

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
          attachmentData = uploadResponse.data.files.map((file: any) => ({
            filename: file.originalname,
            path: file.path,
            size: file.size,
            mimeType: file.mimetype
          }))
        }
      } catch (error) {
        console.error('Erreur upload fichiers:', error)
        return
      }
    }

    // Envoyer via Socket.io
    socketSendMessage({
      receiver: selectedContact._id,
      content: content.trim() || (attachmentData.length > 0 ? '📎 Fichier(s) joint(s)' : ''),
      conversationId,
      attachments: attachmentData
    })

    // Arrêter l'indicateur de frappe
    if (isTyping) {
      setIsTyping(false)
    }
  }, [selectedContact, conversationId, socketSendMessage, isTyping])

  // Écouter les nouveaux messages
  useEffect(() => {
    if (!socket) return

    const handleMessageReceived = (data: { message: Message; conversation: any }) => {
      if (data.conversation._id === conversationId) {
        setMessages(prev => [...prev, data.message])
        markAsRead(data.conversation._id)
        setUnreadCount(0)
      } else {
        // Message dans une autre conversation
        setUnreadCount(prev => prev + 1)
      }
    }

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
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
    socket.on('message:typing', handleTyping)

    return () => {
      socket.off('message:received', handleMessageReceived)
      socket.off('message:typing', handleTyping)
    }
  }, [socket, conversationId, markAsRead])

  // Charger le compteur de non lus
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.get(`${API_URL}/messages/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data?.success) {
          setUnreadCount(response.data.count || 0)
        }
      } catch (error) {
        console.error('Erreur chargement non lus:', error)
      }
    }

    if (isConnected) {
      loadUnreadCount()
      const interval = setInterval(loadUnreadCount, 30000) // Toutes les 30 secondes
      return () => clearInterval(interval)
    }
  }, [isConnected])

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        openChat,
        closeChat,
        selectedContact,
        messages,
        sendMessage,
        isTyping,
        typingUsers,
        unreadCount,
        loadMessages,
        conversationId
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

