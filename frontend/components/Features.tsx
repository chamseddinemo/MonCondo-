export default function Features() {
  const features = [
    {
      icon: '💬',
      title: 'Messagerie instantanée',
      description: 'Communiquez directement avec les propriétaires, locataires et administrateurs en temps réel'
    },
    {
      icon: '📋',
      title: 'Suivi des demandes',
      description: 'Suivez l\'état de vos demandes de maintenance, location ou achat en temps réel'
    },
    {
      icon: '💳',
      title: 'Paiement en ligne',
      description: 'Effectuez vos paiements de loyer et charges en toute sécurité depuis votre compte'
    },
    {
      icon: '📄',
      title: 'Gestion documentaire',
      description: 'Accédez à tous vos documents importants (contrats, factures, reçus) en un seul endroit'
    },
    {
      icon: '📅',
      title: 'Calendrier partagé',
      description: 'Planifiez et coordonnez les événements, réunions et réservations d\'espaces communs'
    },
    {
      icon: '🤖',
      title: 'Assistance IA',
      description: 'Obtenez des réponses instantanées à vos questions avec notre assistant intelligent'
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Fonctionnalités / Avantages
          </h2>
          <p className="text-xl text-gray-600">
            Tout ce dont vous avez besoin pour une gestion simplifiée
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card p-8 text-center hover:scale-105 transition-transform duration-300"
            >
              <div className="text-6xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

