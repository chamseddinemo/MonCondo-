import { useState } from 'react'
import Image from 'next/image'

interface Testimonial {
  id: number
  name: string
  role: string
  rating: number
  comment: string
  avatar: string
  image: string
}

export default function Testimonials() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Marie Dubois',
      role: 'Propriétaire',
      rating: 5,
      comment: 'MonCondo+ a complètement transformé la façon dont je gère mes propriétés. La plateforme est intuitive et tout est centralisé. Je recommande vivement!',
      avatar: '👩',
      image: '/images/personnes/per1.jpg'
    },
    {
      id: 2,
      name: 'Jean-Pierre Martin',
      role: 'Locataire',
      rating: 5,
      comment: 'En tant que locataire, j\'apprécie la facilité de paiement en ligne et la communication directe avec mon propriétaire. Le suivi des demandes est excellent. La plateforme est vraiment bien conçue et répond à tous mes besoins.',
      avatar: '👨',
      image: '/images/personnes/per2.jpg'
    },
    {
      id: 3,
      name: 'Sophie Tremblay',
      role: 'Locataire',
      rating: 4,
      comment: 'La messagerie instantanée facilite grandement la communication. Je peux facilement contacter l\'administration pour toute question ou demande. Le système de notifications est très pratique.',
      avatar: '👩',
      image: '/images/personnes/per3.jpg'
    },
    {
      id: 4,
      name: 'Marc Lavoie',
      role: 'Propriétaire',
      rating: 5,
      comment: 'Gestion simplifiée, paiements automatisés, et suivi en temps réel. MonCondo+ a rendu la gestion de mes unités beaucoup plus efficace. Je ne peux plus m\'en passer!',
      avatar: '👨',
      image: '/images/personnes/per4.jpg'
    },
    {
      id: 5,
      name: 'Isabelle Roy',
      role: 'Propriétaire',
      rating: 5,
      comment: 'Excellente plateforme pour gérer plusieurs propriétés. L\'interface est claire et les fonctionnalités sont complètes. Le support client est également très réactif.',
      avatar: '👩',
      image: '/images/personnes/per5.jpg'
    },
    {
      id: 6,
      name: 'Pierre Gagnon',
      role: 'Locataire',
      rating: 5,
      comment: 'Je suis très satisfait de MonCondo+. Le paiement en ligne est simple et sécurisé. La gestion des documents est également très pratique. Je recommande sans hésitation!',
      avatar: '👨',
      image: '/images/personnes/per6.jpg'
    },
    {
      id: 7,
      name: 'Julie Bouchard',
      role: 'Locataire',
      rating: 5,
      comment: 'Une plateforme moderne et efficace. La communication avec mon propriétaire est fluide et les demandes de maintenance sont traitées rapidement. Très professionnel!',
      avatar: '👩',
      image: '/images/personnes/per7.jpg'
    }
  ]

  return (
    <section className="py-20 bg-concrete-400">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-500 mb-4">
            Témoignages / Avis
          </h2>
          <p className="text-xl text-secondary-600">
            Ce que nos utilisateurs disent de nous
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.slice(0, 4).map((testimonial) => (
            <div key={testimonial.id} className="card p-8 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4 border-2 border-accent-500/30 shadow-lg">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/default/placeholder.jpg'
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {testimonial.name}
                  </h3>
                  <p className="text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < testimonial.rating
                        ? 'text-accent-500'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-700 leading-relaxed">
                {expanded === testimonial.id
                  ? testimonial.comment
                  : testimonial.comment.substring(0, 150)}
                {testimonial.comment.length > 150 && expanded !== testimonial.id && '...'}
              </p>

              {testimonial.comment.length > 150 && (
                <button
                  onClick={() =>
                    setExpanded(expanded === testimonial.id ? null : testimonial.id)
                  }
                  className="mt-4 text-primary-500 hover:text-primary-600 font-semibold transition-colors"
                >
                  {expanded === testimonial.id ? 'Lire moins' : 'Lire plus'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={() => setShowModal(true)}
            className="btn-primary text-lg px-8 py-4 hover:scale-105 transition-transform"
          >
            Voir plus de témoignages
          </button>
        </div>

        {/* Modal pour tous les témoignages */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Tous les témoignages</h2>
                  <p className="text-primary-100">Découvrez ce que nos utilisateurs pensent de MonCondo+</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-accent-200 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testimonials.map((testimonial) => (
                    <div 
                      key={testimonial.id} 
                      className="bg-concrete-400 rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
                    >
                      <div className="flex items-center mb-4">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden mr-3 border-2 border-accent-500/40 shadow-md">
                          <Image
                            src={testimonial.image}
                            alt={testimonial.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/default/placeholder.jpg'
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {testimonial.name}
                          </h3>
                          <p className="text-sm text-gray-600">{testimonial.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex mb-3">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < testimonial.rating
                                ? 'text-accent-500'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>

                      <p className="text-gray-700 text-sm leading-relaxed">
                        {testimonial.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl text-center">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-primary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

