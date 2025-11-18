import { useState } from 'react'
import ContactSidebar from './ContactSidebar'
import ChatWindow from './ChatWindow'
import NotificationsPanel from './NotificationsPanel'

interface Contact {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  phone?: string
}

export default function FloatingMessagesButton() {
  const [showContacts, setShowContacts] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setShowChat(true)
    setShowContacts(false)
  }

  return (
    <>
      {/* Bouton flottant */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center text-2xl relative"
          title="Notifications"
        >
          🔔
          {/* Badge de notification non lue */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button
          onClick={() => setShowContacts(!showContacts)}
          className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center text-2xl"
          title="Messages"
        >
          💬
        </button>
      </div>

      {/* Composants */}
      <ContactSidebar
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
        onSelectContact={handleSelectContact}
      />

      <ChatWindow
        contact={selectedContact}
        conversationId={conversationId}
        onClose={() => {
          setShowChat(false)
          setSelectedContact(null)
        }}
      />

      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  )
}

