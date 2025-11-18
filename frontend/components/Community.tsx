import { useState } from 'react'
import Link from 'next/link'

export default function Community() {
  const [email, setEmail] = useState('')

  const communityItems = [
    {
      type: 'sondage',
      title: 'Sondage mensuel',
      description: 'Participez au sondage sur les améliorations à apporter'
    },
    {
      type: 'annonce',
      title: 'Nouvelle annonce',
      description: 'Réunion du conseil le 15 décembre 2024'
    },
    {
      type: 'evenement',
      title: 'Événement communautaire',
      description: 'Fête de fin d\'année le 20 décembre'
    }
  ]

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement subscription logic
    alert('Merci pour votre inscription!')
    setEmail('')
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Communauté / Engagement
          </h2>
          <p className="text-xl text-gray-600">
            Participez à la vie de votre communauté
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {communityItems.map((item, index) => (
            <div key={index} className="card p-6 hover:border-primary-500 border-2 border-transparent transition-colors">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">
                  {item.type === 'sondage' && '📊'}
                  {item.type === 'annonce' && '📢'}
                  {item.type === 'evenement' && '🎉'}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
              </div>
              <p className="text-gray-600 mb-4">{item.description}</p>
              <Link href="/community" className="text-primary-600 hover:text-primary-700 font-semibold">
                En savoir plus →
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">
            Rejoignez notre communauté
          </h3>
          <p className="text-xl mb-8 text-gray-100">
            Inscrivez-vous pour participer aux sondages, voir les annonces et participer aux événements
          </p>
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre email"
              required
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
            />
            <button type="submit" className="btn-secondary bg-white text-primary-600 hover:bg-gray-100">
              S'inscrire
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

