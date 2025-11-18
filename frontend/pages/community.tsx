import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Link from 'next/link'
import EventCard from '../components/locataire/EventCard'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

export default function Community() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('events')
  const [participatingEvents, setParticipatingEvents] = useState<string[]>([])

  const events = [
    {
      _id: '1',
      title: 'Assemblée générale annuelle',
      date: '15 Janvier 2024',
      time: '19h00',
      location: 'Salle communautaire',
      type: 'Assemblée',
      description: 'Assemblée générale annuelle pour discuter des projets et des décisions importantes de la résidence. Ordre du jour disponible sur demande.',
      organizer: {
        firstName: 'Administration',
        lastName: 'MonCondo+'
      }
    },
    {
      _id: '2',
      title: 'Soirée de bienvenue',
      date: '22 Janvier 2024',
      time: '18h00',
      location: 'Jardin communautaire',
      type: 'Social',
      description: 'Venez rencontrer vos voisins lors de cette soirée conviviale. Buffet et animations prévus. Inscription requise.',
      organizer: {
        firstName: 'Comité',
        lastName: 'Social'
      }
    },
    {
      _id: '3',
      title: 'Nettoyage printanier',
      date: '5 Février 2024',
      time: '10h00',
      location: 'Espaces communs',
      type: 'Maintenance',
      description: 'Journée de nettoyage communautaire des espaces communs. Tous les résidents sont invités à participer. Matériel fourni.',
      organizer: {
        firstName: 'Comité',
        lastName: 'Maintenance'
      }
    }
  ]

  const handleParticipate = (eventId: string) => {
    setParticipatingEvents([...participatingEvents, eventId])
    // TODO: Appel API pour enregistrer la participation
    console.log('Participation à l\'événement:', eventId)
  }

  const handleUnparticipate = (eventId: string) => {
    setParticipatingEvents(participatingEvents.filter(id => id !== eventId))
    // TODO: Appel API pour retirer la participation
    console.log('Désinscription de l\'événement:', eventId)
  }

  const discussions = [
    {
      author: 'Marie Dubois',
      title: 'Proposition d\'amélioration du jardin',
      replies: 12,
      views: 45,
      time: 'Il y a 2 heures'
    },
    {
      author: 'Jean Tremblay',
      title: 'Réservation de la salle de sport',
      replies: 5,
      views: 23,
      time: 'Il y a 5 heures'
    },
    {
      author: 'Sophie Martin',
      title: 'Nouvelle règlementation sur les animaux',
      replies: 18,
      views: 67,
      time: 'Il y a 1 jour'
    }
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-bold mb-4">Communauté</h1>
            <p className="text-xl text-gray-200 max-w-2xl">
              Rejoignez votre communauté et participez à la vie de votre résidence. Événements, discussions et informations partagées.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Tabs */}
          <div className="flex space-x-4 mb-8 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'events'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Événements
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'discussions'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'announcements'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annonces
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">👥 Vie communautaire et événements</h2>
                  <p className="text-gray-600">Participez aux événements de votre résidence</p>
                </div>
                {isAuthenticated && user && user.role === 'admin' && (
                  <button className="btn-primary">Créer un événement</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    isParticipating={participatingEvents.includes(event._id || '')}
                    onParticipate={handleParticipate}
                    onUnparticipate={handleUnparticipate}
                    currentUserId={user?._id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Discussions communautaires</h2>
                <button className="btn-primary">Nouvelle discussion</button>
              </div>
              <div className="space-y-4">
                {discussions.map((discussion, index) => (
                  <div key={index} className="card p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {discussion.author.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold">{discussion.author}</p>
                            <p className="text-sm text-gray-500">{discussion.time}</p>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{discussion.title}</h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-4">{discussion.replies} réponses</span>
                          <span>{discussion.views} vues</span>
                        </div>
                      </div>
                      <button className="btn-secondary ml-4">Participer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Annonces importantes</h2>
              </div>
              <div className="space-y-4">
                <div className="card p-6 border-l-4 border-primary-600">
                  <div className="flex items-center mb-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold mr-3">
                      Important
                    </span>
                    <span className="text-sm text-gray-500">15 Janvier 2024</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Rénovation de l'ascenseur principal</h3>
                  <p className="text-gray-600 mb-4">
                    Veuillez noter que l'ascenseur principal sera en maintenance du 20 au 22 janvier. 
                    Des alternatives seront mises en place pour les résidents.
                  </p>
                  <button className="btn-secondary">Lire la suite</button>
                </div>
                <div className="card p-6 border-l-4 border-blue-600">
                  <div className="flex items-center mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mr-3">
                      Info
                    </span>
                    <span className="text-sm text-gray-500">10 Janvier 2024</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nouveau système de recyclage</h3>
                  <p className="text-gray-600 mb-4">
                    Un nouveau système de tri sélectif est maintenant en place. 
                    Consultez le guide dans le hall d'entrée pour plus d'informations.
                  </p>
                  <button className="btn-secondary">Lire la suite</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
