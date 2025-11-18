import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useChat } from '../contexts/ChatContext'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Contact {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  phone?: string
  building?: {
    _id: string
    name: string
  }
  unit?: {
    _id: string
    unitNumber: string
  }
  unreadCount?: number
  lastMessageAt?: string
}

interface ContactSuggestionsProps {
  isOpen: boolean
  onClose: () => void
  onSelectContact: (contact: Contact) => void
  useChatContext?: boolean // Optionnel : utiliser ChatContext pour ouvrir le chat
}

export default function ContactSuggestions({ isOpen, onClose, onSelectContact, useChatContext = false }: ContactSuggestionsProps) {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()
  // Toujours appeler useChat (règle des hooks React), mais l'utiliser seulement si useChatContext est true
  const chatContext = useChat()
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')

  // Charger TOUS les contacts disponibles (SIMPLIFIÉ et UNIFIÉ)
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')

      if (!token || !user) {
        console.error('[ContactSuggestions] Token ou utilisateur manquant')
        setLoading(false)
        return
      }

      console.log('[ContactSuggestions] Chargement de TOUS les contacts pour:', user.role)

      // TOUJOURS utiliser /conversations/contacts qui retourne TOUS les utilisateurs disponibles
      // Le backend s'occupe de filtrer et enrichir les données
      let contactsData: Contact[] = []

      try {
        // Charger TOUS les contacts avec limite élevée (200 par défaut)
        const contactsResponse = await axios.get(`${API_URL}/conversations/contacts?limit=200`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        console.log('[ContactSuggestions] Contacts response:', contactsResponse.data)

        if (contactsResponse.data?.success && contactsResponse.data.data) {
          contactsData = contactsResponse.data.data.map((u: any) => ({
            _id: u._id || u._id.toString(),
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
            phone: u.phone,
            building: u.building ? {
              _id: u.building._id || u.building._id.toString(),
              name: u.building.name
            } : undefined,
            unit: u.unit ? {
              _id: u.unit._id || u.unit._id.toString(),
              unitNumber: u.unit.unitNumber
            } : undefined
          }))
          
          console.log('[ContactSuggestions] ✅ Contacts chargés:', contactsData.length)
        } else {
          console.warn('[ContactSuggestions] Réponse invalide:', contactsResponse.data)
        }
      } catch (contactsError: any) {
        console.error('[ContactSuggestions] ❌ Erreur chargement contacts:', contactsError)
        console.error('[ContactSuggestions] Détails:', contactsError.response?.data || contactsError.message)
        
        // En cas d'erreur, essayer sans limite
        try {
          const fallbackResponse = await axios.get(`${API_URL}/conversations/contacts`, {
            headers: { Authorization: `Bearer ${token}` }
          })

          if (fallbackResponse.data?.success && fallbackResponse.data.data) {
            contactsData = fallbackResponse.data.data.map((u: any) => ({
              _id: u._id || u._id.toString(),
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              role: u.role,
              phone: u.phone
            }))
            console.log('[ContactSuggestions] ✅ Contacts chargés via fallback:', contactsData.length)
          }
        } catch (fallbackError) {
          console.error('[ContactSuggestions] ❌ Erreur fallback:', fallbackError)
        }
      }

      // Charger les conversations pour obtenir les compteurs de non lus et dernières activités
      try {
        const conversationsResponse = await axios.get(`${API_URL}/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const conversations = conversationsResponse.data?.data || []
        const unreadMap = new Map<string, number>()
        const lastMessageMap = new Map<string, string>()

        conversations.forEach((conv: any) => {
          if (conv.unreadCount) {
            let count = 0
            if (conv.unreadCount instanceof Map) {
              count = conv.unreadCount.get(user?.id) || 0
            } else if (typeof conv.unreadCount === 'object' && user?.id) {
              count = (conv.unreadCount as any)[user.id] || 0
            }

            conv.participants.forEach((p: any) => {
              const participantId = p._id?.toString() || p._id
              if (participantId !== user?.id) {
                unreadMap.set(participantId, (unreadMap.get(participantId) || 0) + count)
                if (conv.lastMessageAt) {
                  const existingDate = lastMessageMap.get(participantId)
                  if (!existingDate || new Date(conv.lastMessageAt) > new Date(existingDate)) {
                    lastMessageMap.set(participantId, conv.lastMessageAt)
                  }
                }
              }
            })
          }
        })

        // Enrichir les contacts avec les données de conversations
        contactsData = contactsData.map((contact: Contact) => {
          const contactId = contact._id.toString()
          return {
            ...contact,
            unreadCount: unreadMap.get(contactId) || 0,
            lastMessageAt: lastMessageMap.get(contactId)
          }
        })
      } catch (convError) {
        console.error('[ContactSuggestions] Erreur chargement conversations (non bloquant):', convError)
        // Continuer même si les conversations ne peuvent pas être chargées
      }

      setContacts(contactsData)
      console.log('[ContactSuggestions] ✅ Contacts finaux chargés:', contactsData.length)

      if (contactsData.length === 0) {
        console.warn('[ContactSuggestions] ⚠️ Aucun contact trouvé - Vérifier la base de données')
      }
    } catch (error: any) {
      console.error('[ContactSuggestions] ❌ Erreur générale chargement contacts:', error)
      console.error('[ContactSuggestions] Détails:', error.response?.data || error.message)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Filtrer et trier les contacts
  useEffect(() => {
    let filtered = [...contacts]

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.role.toLowerCase().includes(query) ||
        contact.building?.name.toLowerCase().includes(query) ||
        contact.unit?.unitNumber.toLowerCase().includes(query)
      )
    }

    // Trier
    if (sortBy === 'recent') {
      filtered.sort((a, b) => {
        // Priorité aux contacts avec messages non lus
        if (a.unreadCount && !b.unreadCount) return -1
        if (!a.unreadCount && b.unreadCount) return 1
        
        // Puis par dernière activité
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        }
        if (a.lastMessageAt) return -1
        if (b.lastMessageAt) return 1
        
        return 0
      })
    } else {
      filtered.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    setFilteredContacts(filtered)
  }, [contacts, searchQuery, sortBy])

  useEffect(() => {
    if (isOpen) {
      loadContacts()
    }
  }, [isOpen, loadContacts])

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { icon: string; color: string } } = {
      'admin': { icon: '🟦', color: 'bg-blue-100 text-blue-800' },
      'proprietaire': { icon: '🟧', color: 'bg-orange-100 text-orange-800' },
      'locataire': { icon: '🟩', color: 'bg-green-100 text-green-800' }
    }
    return badges[role] || { icon: '⚪', color: 'bg-gray-100 text-gray-800' }
  }

  const isOnline = (contactId: string) => {
    return onlineUsers.has(contactId)
  }

  const handleContactClick = (contact: Contact) => {
    onSelectContact(contact)
    // Si useChatContext est activé, ouvrir aussi le chat via ChatContext
    if (useChatContext && chatContext) {
      chatContext.openChat(contact)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Nouveau message</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un contact (nom, email, rôle, unité)..."
              className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:outline-none placeholder-gray-400"
              autoFocus
            />
          </div>

          {/* Options de tri */}
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">Trier par:</span>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'recent'
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              Activité récente
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'name'
                  ? 'bg-white text-blue-600 font-semibold'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              Nom (A-Z)
            </button>
            <span className="text-sm opacity-75 ml-auto">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Liste des contacts */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Chargement des contacts...</p>
              <p className="mt-2 text-sm text-gray-400">Veuillez patienter</p>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-2">
              {filteredContacts.map((contact, index) => {
                const roleBadge = getRoleBadge(contact.role)
                const online = isOnline(contact._id)

                return (
                  <button
                    key={contact._id}
                    onClick={() => handleContactClick(contact)}
                    className="w-full flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md hover:bg-blue-50 transition-all duration-200 text-left group animate-fade-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
                        {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                      </div>
                      {online ? (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                      ) : (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 border-2 border-white rounded-full"></div>
                      )}
                      {contact.unreadCount && contact.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors text-base">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${roleBadge.color} font-medium`}>
                          {roleBadge.icon} {contact.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600 truncate">{contact.email}</span>
                        <span className={`text-xs flex-shrink-0 ${online ? 'text-green-600' : 'text-gray-400'}`}>
                          {online ? '🟢 En ligne' : '⚪ Hors ligne'}
                        </span>
                      </div>
                      {(contact.building || contact.unit) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {contact.building && (
                            <span className="truncate flex items-center gap-1">
                              <span>🏢</span>
                              <span>{contact.building.name}</span>
                            </span>
                          )}
                          {contact.unit && contact.building && (
                            <span className="flex-shrink-0">•</span>
                          )}
                          {contact.unit && (
                            <span className="flex-shrink-0">Unité {contact.unit.unitNumber}</span>
                          )}
                        </div>
                      )}
                      {contact.lastMessageAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Dernier message: {new Date(contact.lastMessageAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">👤</div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact disponible'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery
                  ? 'Essayez avec d\'autres mots-clés ou vérifiez l\'orthographe'
                  : 'Il n\'y a pas encore de contacts disponibles. Les contacts apparaîtront ici une fois ajoutés au système.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={loadContacts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Actualiser
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

