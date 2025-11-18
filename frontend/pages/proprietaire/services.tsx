import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'

export default function ProprietaireServices() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const services = [
    {
      icon: '📋',
      title: 'Gestion des demandes',
      description: 'Créez, suivez et gérez toutes vos demandes de maintenance, de réparation ou d\'intervention pour vos unités.',
      features: ['Suivi en temps réel', 'Priorisation automatique', 'Historique complet', 'Notifications instantanées'],
      link: '/request',
      color: 'bg-blue-50 border-blue-200 hover:border-blue-400'
    },
    {
      icon: '📄',
      title: 'Gestion documentaire',
      description: 'Retrouvez tous vos contrats, factures, reçus et documents officiels en un seul endroit.',
      features: ['Stockage cloud sécurisé', 'Recherche avancée', 'Téléchargement instantané', 'Partage sécurisé'],
      link: '/documents',
      color: 'bg-gray-50 border-gray-200 hover:border-gray-400'
    },
    {
      icon: '📊',
      title: 'Tableaux de bord analytiques',
      description: 'Visualisez vos revenus, dépenses et indicateurs clés à travers des graphiques interactifs.',
      features: ['Rapports automatiques', 'Statistiques détaillées', 'Export PDF / Excel', 'Graphiques interactifs'],
      link: '/analytics',
      color: 'bg-purple-50 border-purple-200 hover:border-purple-400'
    },
    {
      icon: '💳',
      title: 'Paiements et revenus',
      description: 'Consultez vos paiements reçus, vos revenus locatifs et vos factures.',
      features: ['Suivi des encaissements', 'Historique complet', 'Reçus automatiques', 'Export de données'],
      link: '/payments',
      color: 'bg-green-50 border-green-200 hover:border-green-400'
    },
    {
      icon: '📅',
      title: 'Agenda / Maintenance planifiée',
      description: 'Planifiez et suivez les entretiens ou réparations à venir dans vos unités.',
      features: ['Maintenance préventive', 'Suivi des interventions', 'Notifications d\'entretien', 'Calendrier visuel'],
      link: '/maintenance',
      color: 'bg-orange-50 border-orange-200 hover:border-orange-400'
    },
    {
      icon: '🔔',
      title: 'Alertes et notifications',
      description: 'Recevez en temps réel les alertes liées à vos unités et à votre activité.',
      features: ['Retard de paiement', 'Intervention urgente', 'Documents à renouveler', 'Notifications personnalisées'],
      link: '/notifications',
      color: 'bg-red-50 border-red-200 hover:border-red-400'
    }
  ]

  useEffect(() => {
    // Rediriger si l'utilisateur n'est pas un propriétaire
    if (isAuthenticated && user && user.role !== 'proprietaire') {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section - Header bleu foncé */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16 pt-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-5xl font-bold mb-4">Services Propriétaires</h1>
              <p className="text-xl text-gray-300">
                Une suite complète d'outils pour gérer efficacement vos propriétés et optimiser votre activité immobilière.
              </p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={index} 
                className={`${service.color} border-2 rounded-xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl mb-4">{service.icon}</div>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h3>
                
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {service.description}
                </p>

                <ul className="space-y-3 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700">
                      <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={service.link}
                  className="block w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Accéder
                </Link>
              </div>
            ))}
          </div>

          {/* Section d'aide */}
          <div className="mt-16 bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Besoin d'aide ?
              </h2>
              <p className="text-gray-600 mb-6">
                Notre équipe est disponible pour vous accompagner dans l'utilisation de ces services. 
                N'hésitez pas à nous contacter pour toute question.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact" className="btn-primary">
                  Nous contacter
                </Link>
                <Link href="/dashboard" className="btn-secondary">
                  Retour au tableau de bord
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

