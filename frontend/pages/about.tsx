import Header from '../components/Header'
import Footer from '../components/Footer'
import Link from 'next/link'

export default function About() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">À propos de MonCondo+</h1>
              <p className="text-xl text-gray-600">
                La plateforme moderne pour gérer votre condominium
              </p>
            </div>

            <div className="card p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">Notre mission</h2>
                <p className="text-gray-700 leading-relaxed">
                  MonCondo+ a été créé pour révolutionner la gestion des condominiums en offrant une solution 
                  complète, moderne et intuitive. Notre mission est de simplifier la vie des administrateurs, 
                  propriétaires et locataires en centralisant toutes les fonctionnalités nécessaires à la gestion 
                  efficace d'un immeuble.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Nos valeurs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">🔒 Sécurité</h3>
                    <p className="text-gray-700">
                      La protection de vos données est notre priorité absolue. Nous utilisons les dernières 
                      technologies de sécurité pour garantir la confidentialité de vos informations.
                    </p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">⚡ Efficacité</h3>
                    <p className="text-gray-700">
                      Nous optimisons chaque processus pour vous faire gagner du temps et simplifier 
                      la gestion quotidienne de votre immeuble.
                    </p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">🤝 Transparence</h3>
                    <p className="text-gray-700">
                      Nous croyons en la transparence totale dans toutes nos interactions. 
                      Vous avez toujours accès à toutes les informations pertinentes.
                    </p>
                  </div>
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">💡 Innovation</h3>
                    <p className="text-gray-700">
                      Nous innovons constamment pour améliorer votre expérience et ajouter 
                      de nouvelles fonctionnalités utiles.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Nos fonctionnalités</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Gestion des immeubles :</strong> Créez et gérez facilement vos immeubles avec toutes leurs informations</li>
                  <li><strong>Gestion des unités :</strong> Suivez toutes vos unités, leur statut et leurs occupants</li>
                  <li><strong>Communication :</strong> Système de messagerie intégré pour faciliter les échanges</li>
                  <li><strong>Documents :</strong> Stockage sécurisé et accès facile à tous vos documents administratifs</li>
                  <li><strong>Paiements :</strong> Suivi des paiements et génération automatique de reçus</li>
                  <li><strong>Demandes :</strong> Gestion centralisée des demandes de maintenance et autres requêtes</li>
                  <li><strong>Notifications :</strong> Restez informé en temps réel de tous les événements importants</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Notre équipe</h2>
                <p className="text-gray-700 leading-relaxed">
                  MonCondo+ est développé et maintenu par une équipe passionnée de développeurs et de professionnels 
                  de l'immobilier. Nous sommes dédiés à créer la meilleure expérience possible pour tous nos utilisateurs.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Contactez-nous</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Vous avez des questions ou des suggestions ? Nous serions ravis d'avoir de vos nouvelles !
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/contact" className="btn-primary">
                    📧 Nous contacter
                  </Link>
                  <Link href="/faq" className="btn-secondary">
                    ❓ Consulter la FAQ
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

