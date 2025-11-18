import { useState } from 'react'

interface Testimonial {
  id: number
  name: string
  role: string
  rating: number
  comment: string
  avatar: string
}

export default function Testimonials() {
  const [expanded, setExpanded] = useState<number | null>(null)

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Marie Dubois',
      role: 'Propriétaire',
      rating: 5,
      comment: 'MonCondo+ a complètement transformé la façon dont je gère mes propriétés. La plateforme est intuitive et tout est centralisé. Je recommande vivement!',
      avatar: '👩'
    },
    {
      id: 2,
      name: 'Jean-Pierre Martin',
      role: 'Locataire',
      rating: 5,
      comment: 'En tant que locataire, j\'apprécie la facilité de paiement en ligne et la communication directe avec mon propriétaire. Le suivi des demandes est excellent.',
      avatar: '👨'
    },
    {
      id: 3,
      name: 'Sophie Tremblay',
      role: 'Locataire',
      rating: 4,
      comment: 'La messagerie instantanée facilite grandement la communication. Je peux facilement contacter l\'administration pour toute question ou demande.',
      avatar: '👩'
    },
    {
      id: 4,
      name: 'Marc Lavoie',
      role: 'Propriétaire',
      rating: 5,
      comment: 'Gestion simplifiée, paiements automatisés, et suivi en temps réel. MonCondo+ a rendu la gestion de mes unités beaucoup plus efficace.',
      avatar: '👨'
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Témoignages / Avis
          </h2>
          <p className="text-xl text-gray-600">
            Ce que nos utilisateurs disent de nous
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="card p-8">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-4">{testimonial.avatar}</div>
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
                        ? 'text-yellow-400'
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
                  className="mt-4 text-primary-600 hover:text-primary-700 font-semibold"
                >
                  {expanded === testimonial.id ? 'Lire moins' : 'Lire plus'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="btn-secondary">
            Voir plus de témoignages
          </button>
        </div>
      </div>
    </section>
  )
}

