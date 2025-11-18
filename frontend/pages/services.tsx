import Header from '../components/Header'
import Footer from '../components/Footer'
import Link from 'next/link'

export default function Services() {
  const services = [
    {
      icon: '💬',
      title: 'Messagerie instantanée',
      description: 'Communiquez directement avec les propriétaires, locataires et administrateurs en temps réel. Système de notifications et historique complet des conversations.',
      features: ['Messages en temps réel', 'Notifications push', 'Historique complet', 'Pièces jointes']
    },
    {
      icon: '📋',
      title: 'Gestion des demandes',
      description: 'Créez et suivez l\'état de vos demandes de maintenance, location ou achat. Système de tickets avec priorité et assignation automatique.',
      features: ['Suivi en temps réel', 'Notifications automatiques', 'Priorisation', 'Historique complet']
    },
    {
      icon: '💳',
      title: 'Paiement en ligne sécurisé',
      description: 'Effectuez vos paiements de loyer et charges en toute sécurité depuis votre compte. Support de multiples méthodes de paiement.',
      features: ['Paiement sécurisé SSL', 'Reçus automatiques', 'Historique des paiements', 'Rappels de paiement']
    },
    {
      icon: '📄',
      title: 'Gestion documentaire',
      description: 'Accédez à tous vos documents importants (contrats, factures, reçus) en un seul endroit. Stockage sécurisé et recherche avancée.',
      features: ['Stockage cloud sécurisé', 'Recherche avancée', 'Téléchargement instantané', 'Partage sécurisé']
    },
    {
      icon: '📅',
      title: 'Calendrier partagé',
      description: 'Planifiez et coordonnez les événements, réunions et réservations d\'espaces communs. Synchronisation automatique avec vos calendriers.',
      features: ['Synchronisation calendrier', 'Réservations d\'espaces', 'Notifications d\'événements', 'Gestion des conflits']
    },
    {
      icon: '🤖',
      title: 'Assistance IA',
      description: 'Obtenez des réponses instantanées à vos questions avec notre assistant intelligent. Disponible 24/7 pour vous aider.',
      features: ['Réponses instantanées', 'Disponible 24/7', 'Support multilingue', 'Apprentissage continu']
    },
    {
      icon: '🏢',
      title: 'Gestion immobilière',
      description: 'Solutions complètes pour la gestion de vos propriétés : suivi des locations, gestion des contrats, évaluation des biens.',
      features: ['Suivi des locations', 'Gestion des contrats', 'Évaluation des biens', 'Rapports détaillés']
    },
    {
      icon: '📊',
      title: 'Tableaux de bord analytiques',
      description: 'Visualisez toutes vos données importantes avec des tableaux de bord personnalisables. Rapports automatiques et statistiques détaillées.',
      features: ['Tableaux personnalisables', 'Rapports automatiques', 'Export de données', 'Statistiques détaillées']
    }
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-bold mb-4">Nos Services</h1>
            <p className="text-xl text-gray-200 max-w-2xl">
              Une suite complète d'outils pour simplifier la gestion de votre condominium et améliorer votre expérience résidentielle.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {services.map((service, index) => (
              <div key={index} className="card p-8 hover:scale-105 transition-transform duration-300">
                <div className="text-5xl mb-4">{service.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="bg-primary-600 rounded-xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
            <p className="text-xl mb-8 text-primary-100">
              Rejoignez des milliers de propriétaires et locataires qui font confiance à MonCondo+
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
                Créer un compte
              </Link>
              <Link href="/contact" className="btn-secondary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600">
                Nous contacter
              </Link>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-center mb-12">Nos Tarifs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Visiteur</h3>
                <div className="text-4xl font-bold text-primary-600 mb-4">Gratuit</div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Consultation des unités disponibles
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Demande de visite
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Contact avec les propriétaires
                  </li>
                </ul>
                <Link href="/register" className="btn-primary w-full">Commencer</Link>
              </div>

              <div className="card p-8 text-center border-2 border-primary-600 relative">
                <span className="absolute top-0 right-0 bg-primary-600 text-white px-4 py-1 rounded-bl-lg">Populaire</span>
                <h3 className="text-2xl font-bold mb-4">Locataire/Propriétaire</h3>
                <div className="text-4xl font-bold text-primary-600 mb-4">$9.99<span className="text-lg">/mois</span></div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tous les avantages Visiteur
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gestion complète des unités
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Paiement en ligne
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Messagerie illimitée
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Support prioritaire
                  </li>
                </ul>
                <Link href="/register" className="btn-primary w-full">S'abonner</Link>
              </div>

              <div className="card p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Administrateur</h3>
                <div className="text-4xl font-bold text-primary-600 mb-4">Sur mesure</div>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tous les avantages Pro
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gestion multi-immeubles
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tableaux de bord avancés
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Support dédié 24/7
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Intégrations personnalisées
                  </li>
                </ul>
                <Link href="/contact" className="btn-secondary w-full">Nous contacter</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
