import Header from '../components/Header'
import Footer from '../components/Footer'
import Link from 'next/link'

export default function FAQ() {
  const faqs = [
    {
      category: 'Général',
      questions: [
        {
          q: 'Qu\'est-ce que MonCondo+ ?',
          a: 'MonCondo+ est une plateforme moderne de gestion de condominiums qui permet aux administrateurs, propriétaires et locataires de gérer efficacement leurs immeubles, unités, documents et communications.'
        },
        {
          q: 'Comment puis-je créer un compte ?',
          a: 'Vous pouvez créer un compte en cliquant sur "Connexion" dans le menu, puis sur "Inscription". Remplissez le formulaire avec vos informations et choisissez votre rôle (propriétaire ou locataire).'
        },
        {
          q: 'Quels sont les différents rôles disponibles ?',
          a: 'Il existe trois types de rôles : Administrateur (gestion complète), Propriétaire (gestion de ses unités) et Locataire (accès à son unité et documents).'
        }
      ]
    },
    {
      category: 'Locations',
      questions: [
        {
          q: 'Comment puis-je faire une demande pour une unité ?',
          a: 'Naviguez vers la page "Explorer" pour voir toutes les unités disponibles. Cliquez sur "Faire une demande" pour l\'unité qui vous intéresse et remplissez le formulaire.'
        },
        {
          q: 'Combien de temps faut-il pour qu\'une demande soit traitée ?',
          a: 'Les demandes sont généralement traitées dans un délai de 2 à 5 jours ouvrables. Vous recevrez une notification par email une fois votre demande approuvée ou refusée.'
        },
        {
          q: 'Puis-je annuler ma demande ?',
          a: 'Oui, vous pouvez annuler votre demande à tout moment depuis votre tableau de bord, tant qu\'elle n\'a pas encore été approuvée.'
        }
      ]
    },
    {
      category: 'Paiements',
      questions: [
        {
          q: 'Comment puis-je payer mon loyer ?',
          a: 'Une fois que vous êtes locataire, vous pouvez accéder à la section "Paiements" de votre tableau de bord pour effectuer vos paiements en ligne de manière sécurisée.'
        },
        {
          q: 'Quels modes de paiement sont acceptés ?',
          a: 'Nous acceptons les cartes de crédit, les virements bancaires et les chèques. Les paiements en ligne sont traités de manière sécurisée.'
        },
        {
          q: 'Puis-je voir l\'historique de mes paiements ?',
          a: 'Oui, tous vos paiements sont enregistrés et accessibles depuis votre tableau de bord dans la section "Paiements".'
        }
      ]
    },
    {
      category: 'Documents',
      questions: [
        {
          q: 'Où puis-je trouver mes documents ?',
          a: 'Tous vos documents (contrats, factures, reçus) sont disponibles dans la section "Documents" de votre tableau de bord.'
        },
        {
          q: 'Puis-je télécharger mes documents ?',
          a: 'Oui, vous pouvez télécharger tous vos documents en format PDF depuis votre tableau de bord.'
        },
        {
          q: 'Mes documents sont-ils sécurisés ?',
          a: 'Absolument. Tous les documents sont stockés de manière sécurisée et ne sont accessibles qu\'aux personnes autorisées.'
        }
      ]
    },
    {
      category: 'Support',
      questions: [
        {
          q: 'Comment puis-je contacter le support ?',
          a: 'Vous pouvez nous contacter via le formulaire de contact sur la page "Contact" ou envoyer un email à contact@moncondo.com.'
        },
        {
          q: 'Quels sont les horaires de support ?',
          a: 'Notre équipe de support est disponible du lundi au vendredi de 9h00 à 17h00. Pour les urgences, contactez votre administrateur d\'immeuble.'
        }
      ]
    }
  ]

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">Questions fréquentes</h1>
              <p className="text-xl text-gray-600">
                Trouvez rapidement les réponses à vos questions
              </p>
            </div>

            <div className="space-y-8">
              {faqs.map((category, categoryIndex) => (
                <div key={categoryIndex} className="card p-6">
                  <h2 className="text-2xl font-bold mb-6 text-primary-600">
                    {category.category}
                  </h2>
                  <div className="space-y-6">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="border-b border-gray-200 pb-4 last:border-0">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">
                          {faq.q}
                        </h3>
                        <p className="text-gray-600">
                          {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 card p-6 bg-primary-50 text-center">
              <h3 className="text-xl font-bold mb-2">Vous ne trouvez pas votre réponse ?</h3>
              <p className="text-gray-600 mb-4">
                Notre équipe est là pour vous aider
              </p>
              <Link href="/contact" className="btn-primary inline-block">
                Contactez-nous
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

