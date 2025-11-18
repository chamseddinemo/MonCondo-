import { useState, useEffect, useCallback } from 'react'
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
  building?: {
    _id: string
    name: string
  }
  unreadCount?: number
}

interface ContactSidebarProps {
  onSelectContact: (contact: Contact) => void
  isOpen: boolean
  onClose: () => void
}

export default function ContactSidebar({ onSelectContact, isOpen, onClose }: ContactSidebarProps) {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [groupedContacts, setGroupedContacts] = useState<{ [key: string]: Contact[] }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<string>('')

  // Charger les contacts
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (filterRole) params.append('role', filterRole)
      if (searchQuery) params.append('search', searchQuery)

      const response = await axios.get(`${API_URL}/conversations/contacts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data?.success) {
        const contactsData = response.data.data || []
        
        // Charger les conversations pour obtenir les compteurs de non lus
        const conversationsResponse = await axios.get(`${API_URL}/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const conversations = conversationsResponse.data?.data || []
        const unreadMap = new Map<string, number>()

        conversations.forEach((conv: any) => {
          if (conv.unreadCount) {
            if (conv.unreadCount instanceof Map) {
              const count = conv.unreadCount.get(user?.id) || 0
              conv.participants.forEach((p: any) => {
                if (p._id !== user?.id) {
                  unreadMap.set(p._id, (unreadMap.get(p._id) || 0) + count)
                }
              })
            } else if (typeof conv.unreadCount === 'object' && user?.id) {
              const count = (conv.unreadCount as any)[user.id] || 0
              conv.participants.forEach((p: any) => {
                if (p._id !== user.id) {
                  unreadMap.set(p._id, (unreadMap.get(p._id) || 0) + count)
                }
              })
            }
          }
        })

        // Ajouter les compteurs de non lus aux contacts
        const contactsWithUnread = contactsData.map((contact: Contact) => ({
          ...contact,
          unreadCount: unreadMap.get(contact._id) || 0
        }))

        setContacts(contactsWithUnread)
        groupContacts(contactsWithUnread)
      }
    } catch (error) {
      console.error('Erreur chargement contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterRole, user?.id])

  // Grouper les contacts
  const groupContacts = (contactsList: Contact[]) => {
    const groups: { [key: string]: Contact[] } = {
      'Équipe administrative': [],
      'Propriétaires': [],
      'Locataires': [],
      'Autres': []
    }

    contactsList.forEach(contact => {
      if (contact.role === 'admin') {
        groups['Équipe administrative'].push(contact)
      } else if (contact.role === 'proprietaire') {
        groups['Propriétaires'].push(contact)
      } else if (contact.role === 'locataire') {
        groups['Locataires'].push(contact)
      } else {
        groups['Autres'].push(contact)
      }
    })

    // Retirer les groupes vides
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })

    setGroupedContacts(groups)
  }

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
        {/* En-tête */}
        <div className="p-4 border-b border-gray-200 bg-primary-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Contacts</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Recherche */}
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un contact..."
              className="w-full px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
            />
          </div>

          {/* Filtre par rôle */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterRole('')}
              className={`px-3 py-1 rounded text-sm ${filterRole === '' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterRole('admin')}
              className={`px-3 py-1 rounded text-sm ${filterRole === 'admin' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
            >
              Admin
            </button>
            <button
              onClick={() => setFilterRole('proprietaire')}
              className={`px-3 py-1 rounded text-sm ${filterRole === 'proprietaire' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
            >
              Propriétaires
            </button>
            <button
              onClick={() => setFilterRole('locataire')}
              className={`px-3 py-1 rounded text-sm ${filterRole === 'locataire' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'}`}
            >
              Locataires
            </button>
          </div>
        </div>

        {/* Liste des contacts */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : Object.keys(groupedContacts).length > 0 ? (
            Object.entries(groupedContacts).map(([groupName, groupContacts]) => (
              <div key={groupName} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  {groupName} ({groupContacts.length})
                </h3>
                <div className="space-y-2">
                  {groupContacts.map((contact) => {
                    const roleBadge = getRoleBadge(contact.role)
                    const online = isOnline(contact._id)

                    return (
                      <button
                        key={contact._id}
                        onClick={() => {
                          onSelectContact(contact)
                          onClose()
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                            {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                          </div>
                          {online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                          {!online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {contact.firstName} {contact.lastName}
                            </p>
                            {contact.unreadCount && contact.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                                {contact.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${roleBadge.color}`}>
                              {roleBadge.icon} {contact.role}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                              {contact.email}
                            </span>
                          </div>
                          {contact.building && (
                            <p className="text-xs text-gray-400 mt-1">
                              🏢 {contact.building.name}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun contact trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

