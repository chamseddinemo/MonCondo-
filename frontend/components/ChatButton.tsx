import { useState, useEffect } from 'react'
import { useChat } from '../contexts/ChatContext'
import ContactSuggestions from './ContactSuggestions'

interface Contact {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function ChatButton() {
  const { isChatOpen, openChat, closeChat, unreadCount } = useChat()
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleClick = () => {
    if (isChatOpen) {
      closeChat()
    } else {
      // Ouvrir les suggestions de contacts
      setShowSuggestions(true)
    }
  }

  const handleSelectContact = (contact: Contact) => {
    openChat(contact)
    setShowSuggestions(false)
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all duration-200 flex items-center justify-center text-2xl z-40 group"
        title="Ouvrir le chat"
      >
        💬
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Suggestions de contacts */}
      <ContactSuggestions
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        onSelectContact={handleSelectContact}
        useChatContext={true}
      />
    </>
  )
}

