import { useState } from 'react'

interface Event {
  _id?: string
  title: string
  date: string
  time: string
  location: string
  description?: string
  type?: string
  organizer?: {
    firstName: string
    lastName: string
  }
  participants?: string[]
}

interface EventCardProps {
  event: Event
  isParticipating?: boolean
  onParticipate?: (eventId: string) => void
  onUnparticipate?: (eventId: string) => void
  currentUserId?: string
}

export default function EventCard({ 
  event, 
  isParticipating = false, 
  onParticipate, 
  onUnparticipate,
  currentUserId 
}: EventCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [participating, setParticipating] = useState(isParticipating)

  const handleParticipate = () => {
    if (event._id) {
      if (participating && onUnparticipate) {
        onUnparticipate(event._id)
      } else if (onParticipate) {
        onParticipate(event._id)
      }
      setParticipating(!participating)
    }
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'Assemblée':
        return 'bg-blue-100 text-blue-800'
      case 'Social':
        return 'bg-green-100 text-green-800'
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden border border-gray-100">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            {event.type && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeColor(event.type)}`}>
                {event.type}
              </span>
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-3">{event.title}</h3>
          
          <div className="space-y-2 text-gray-600 mb-4">
            <div className="flex items-center">
              <span className="mr-2">📅</span>
              <span>{event.date} à {event.time}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">📍</span>
              <span>{event.location}</span>
            </div>
            {event.organizer && (
              <div className="flex items-center">
                <span className="mr-2">👤</span>
                <span>Organisé par {event.organizer.firstName} {event.organizer.lastName}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDetails(true)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Voir détails
            </button>
            <button
              onClick={handleParticipate}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                participating
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {participating ? 'Se désinscrire' : 'Participer'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal détails */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-3xl font-bold">{event.title}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2 font-semibold">📅 Date:</span>
                    <span>{event.date} à {event.time}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2 font-semibold">📍 Lieu:</span>
                    <span>{event.location}</span>
                  </div>
                  {event.organizer && (
                    <div className="flex items-center">
                      <span className="mr-2 font-semibold">👤 Organisateur:</span>
                      <span>{event.organizer.firstName} {event.organizer.lastName}</span>
                    </div>
                  )}
                  {event.type && (
                    <div className="flex items-center">
                      <span className="mr-2 font-semibold">🏷️ Type:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {event.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {participating && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-600 text-xl mr-2">✅</span>
                    <span className="text-green-800 font-semibold">Vous êtes inscrit à cet événement.</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleParticipate}
                  className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                    participating
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {participating ? 'Se désinscrire' : 'Participer'}
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

