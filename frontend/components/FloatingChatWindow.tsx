import { useState, useRef, useEffect } from 'react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useRouter } from 'next/router'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function FloatingChatWindow() {
  const { isChatOpen, closeChat, selectedContact, messages, sendMessage, typingUsers, conversationId } = useChat()
  const { user } = useAuth()
  const { onlineUsers, sendTyping } = useSocket()
  const router = useRouter()
  
  const [messageInput, setMessageInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [isTypingLocal, setIsTypingLocal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Gérer l'indicateur de frappe
  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (!conversationId) return

    if (!isTypingLocal && value.trim()) {
      setIsTypingLocal(true)
      sendTyping(conversationId, true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingLocal && conversationId) {
        sendTyping(conversationId, false)
        setIsTypingLocal(false)
      }
    }, 3000)
  }

  // Envoyer un message
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || uploadingFiles) return

    setUploadingFiles(true)
    await sendMessage(messageInput, selectedFiles)
    setMessageInput('')
    setSelectedFiles([])
    setUploadingFiles(false)
    
    if (isTypingLocal && conversationId) {
      sendTyping(conversationId, false)
      setIsTypingLocal(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { icon: string; bgColor: string; textColor: string } } = {
      'admin': { icon: '🟦', bgColor: 'bg-blue-100', textColor: 'text-blue-900' },
      'proprietaire': { icon: '🟧', bgColor: 'bg-orange-100', textColor: 'text-orange-900' },
      'locataire': { icon: '🟩', bgColor: 'bg-gray-100', textColor: 'text-gray-900' }
    }
    return badges[role] || { icon: '⚪', bgColor: 'bg-gray-100', textColor: 'text-gray-900' }
  }

  const isOnline = selectedContact ? onlineUsers.has(selectedContact._id) : false

  if (!isChatOpen || !selectedContact) return null

  const roleBadge = getRoleBadge(selectedContact.role)

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex fixed bottom-24 right-6 w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold backdrop-blur-sm">
                  {selectedContact.firstName.charAt(0)}{selectedContact.lastName.charAt(0)}
                </div>
                {isOnline ? (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                ) : (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {selectedContact.firstName} {selectedContact.lastName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs opacity-90">{roleBadge.icon} {selectedContact.role}</span>
                  {isOnline ? (
                    <span className="text-xs opacity-75">🟢 En ligne</span>
                  ) : (
                    <span className="text-xs opacity-75">⚪ Hors ligne</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/dashboard/${selectedContact.role === 'admin' ? 'admin' : selectedContact.role === 'proprietaire' ? 'proprietaire' : 'locataire'}`)}
                className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                title="Voir profil"
              >
                Profil
              </button>
              <button
                onClick={closeChat}
                className="text-white hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender._id === user?.id
              const msgRoleBadge = getRoleBadge(message.sender.role)

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="font-medium text-xs text-gray-700">
                          {message.sender.firstName}
                        </span>
                        <span className="text-xs">{msgRoleBadge.icon}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        isOwn
                          ? 'bg-blue-100 text-blue-900'
                          : `${msgRoleBadge.bgColor} ${msgRoleBadge.textColor}`
                      }`}
                    >
                      {message.isSystemMessage ? (
                        <p className="text-xs italic text-center text-gray-600">
                          {message.content}
                        </p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={`${API_URL.replace('/api', '')}/uploads/${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                            >
                              <span className="text-sm">📎</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{att.filename}</p>
                                {att.size && (
                                  <p className="text-xs opacity-75">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {isOwn && (
                        <span className="ml-1">
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
            <p className="text-sm">Aucun message</p>
            <p className="text-xs mt-1">Commencez la conversation !</p>
          </div>
        )}
        
        {/* Indicateur de frappe */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
        {/* Aperçu des fichiers */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                <span>📎 {file.name}</span>
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-800 ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Joindre un fichier"
          >
            📎
          </button>
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
            placeholder="Écrivez un message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!messageInput.trim() && selectedFiles.length === 0) || uploadingFiles}
            className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Envoyer"
          >
            {uploadingFiles ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>

    {/* Mobile */}
    <div className="fixed inset-0 bg-white z-50 flex flex-col md:hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold backdrop-blur-sm">
                {selectedContact.firstName.charAt(0)}{selectedContact.lastName.charAt(0)}
              </div>
              {isOnline ? (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              ) : (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {selectedContact.firstName} {selectedContact.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs opacity-90">{roleBadge.icon} {selectedContact.role}</span>
                {isOnline ? (
                  <span className="text-xs opacity-75">🟢 En ligne</span>
                ) : (
                  <span className="text-xs opacity-75">⚪ Hors ligne</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dashboard/${selectedContact.role === 'admin' ? 'admin' : selectedContact.role === 'proprietaire' ? 'proprietaire' : 'locataire'}`)}
              className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
              title="Voir profil"
            >
              Profil
            </button>
            <button
              onClick={closeChat}
              className="text-white hover:text-gray-200 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender._id === user?.id
              const msgRoleBadge = getRoleBadge(message.sender.role)

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="font-medium text-xs text-gray-700">
                          {message.sender.firstName}
                        </span>
                        <span className="text-xs">{msgRoleBadge.icon}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        isOwn
                          ? 'bg-blue-100 text-blue-900'
                          : `${msgRoleBadge.bgColor} ${msgRoleBadge.textColor}`
                      }`}
                    >
                      {message.isSystemMessage ? (
                        <p className="text-xs italic text-center text-gray-600">
                          {message.content}
                        </p>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={`${API_URL.replace('/api', '')}/uploads/${att.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                            >
                              <span className="text-sm">📎</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{att.filename}</p>
                                {att.size && (
                                  <p className="text-xs opacity-75">
                                    {(att.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {new Date(message.createdAt).toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {isOwn && (
                        <span className="ml-1">
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
              <p className="text-sm">Aucun message</p>
              <p className="text-xs mt-1">Commencez la conversation !</p>
            </div>
          )}
          
          {/* Indicateur de frappe */}
          {typingUsers.size > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-200 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                <span>📎 {file.name}</span>
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-800 ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Joindre un fichier"
          >
            📎
          </button>
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
            placeholder="Écrivez un message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!messageInput.trim() && selectedFiles.length === 0) || uploadingFiles}
            className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Envoyer"
          >
            {uploadingFiles ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

