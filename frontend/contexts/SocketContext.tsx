import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const SOCKET_URL = API_URL

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: Map<string, any>
  connect: () => void
  disconnect: () => void
  sendMessage: (data: {
    receiver: string
    content: string
    conversationId?: string
    unit?: string
    building?: string
    attachments?: any[]
  }) => void
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void
  markAsRead: (conversationId: string) => void
  sendTyping: (conversationId: string, isTyping: boolean) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('[SOCKET] Non authentifié, connexion annulée')
      return
    }

    if (socketRef.current?.connected) {
      console.log('[SOCKET] Déjà connecté')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      console.error('[SOCKET] Token manquant')
      return
    }

    console.log('[SOCKET] Connexion en cours...')

    const newSocket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    newSocket.on('connect', () => {
      console.log('[SOCKET] ✅ Connecté:', newSocket.id)
      setIsConnected(true)
      setSocket(newSocket)
      socketRef.current = newSocket
      
      // Réessayer de rejoindre les conversations actives après reconnexion
      // (sera géré par les composants individuels)
    })
    
    // Écouter les événements de messages pour debug
    newSocket.on('message:received', (data) => {
      console.log('[SOCKET] 📨 Message reçu:', data.message?.content?.substring(0, 50))
    })
    
    newSocket.on('message:sent', (data) => {
      console.log('[SOCKET] ✅ Message confirmé envoyé:', data.message?.content?.substring(0, 50))
    })
    
    newSocket.on('message:error', (error) => {
      console.error('[SOCKET] ❌ Erreur message:', error.error)
    })
    
    newSocket.on('conversation:joined', (data) => {
      console.log('[SOCKET] ✅ Conversation jointe:', data.conversationId)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] ❌ Déconnecté:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] Erreur de connexion:', error.message)
      setIsConnected(false)
    })

    newSocket.on('user:online', (data: { userId: string; firstName?: string; lastName?: string; role?: string }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev)
        newMap.set(data.userId, data)
        return newMap
      })
    })

    newSocket.on('user:offline', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.userId)
        return newMap
      })
    })

    setSocket(newSocket)
    socketRef.current = newSocket
  }, [isAuthenticated, user])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      console.log('[SOCKET] Déconnexion manuelle')
    }
  }, [])

  const sendMessage = useCallback((data: {
    receiver: string
    content: string
    conversationId?: string
    unit?: string
    building?: string
    attachments?: any[]
  }) => {
    if (!socketRef.current) {
      console.error('[SOCKET] Socket non initialisé')
      return
    }

    if (!socketRef.current.connected) {
      console.warn('[SOCKET] Socket non connecté, tentative de reconnexion...')
      // Tentative de reconnexion
      if (socketRef.current) {
        socketRef.current.connect()
      }
      // Attendre un peu avant d'envoyer
      setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('message:send', {
            conversationId: data.conversationId,
            receiverId: data.receiver,
            receiver: data.receiver, // Support des deux formats
            content: data.content,
            attachments: data.attachments || [],
            unit: data.unit,
            building: data.building
          })
          console.log('[SOCKET] ✅ Message envoyé après reconnexion')
        } else {
          console.error('[SOCKET] ❌ Impossible d\'envoyer le message - socket non connecté')
        }
      }, 1000)
      return
    }

    // Envoi immédiat (INSTANTANÉ)
    socketRef.current.emit('message:send', {
      conversationId: data.conversationId,
      receiverId: data.receiver,
      receiver: data.receiver, // Support des deux formats pour compatibilité
      content: data.content,
      attachments: data.attachments || [],
      unit: data.unit,
      building: data.building
    })
    console.log('[SOCKET] ✅ Message émis instantanément:', data.content.substring(0, 50))
  }, [])

  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('join:conversation', conversationId)
  }, [])

  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('leave:conversation', conversationId)
  }, [])

  const markAsRead = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('message:read', { conversationId })
  }, [])

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('message:typing', { conversationId, isTyping })
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, user, connect, disconnect])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        connect,
        disconnect,
        sendMessage,
        joinConversation,
        leaveConversation,
        markAsRead,
        sendTyping
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

