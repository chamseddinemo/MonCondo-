import Header from '../components/Header'
import Footer from '../components/Footer'

export default function CGU() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">Conditions générales d'utilisation</h1>
              <p className="text-gray-600">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-CA')}
              </p>
            </div>

            <div className="card p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">1. Acceptation des conditions</h2>
                <p className="text-gray-700 leading-relaxed">
                  En accédant et en utilisant MonCondo+, vous acceptez d'être lié par ces conditions générales d'utilisation. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">2. Description du service</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  MonCondo+ est une plateforme de gestion de condominiums qui permet :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>La gestion des immeubles et unités</li>
                  <li>La communication entre administrateurs, propriétaires et locataires</li>
                  <li>La gestion des documents administratifs</li>
                  <li>Le suivi des paiements et factures</li>
                  <li>La gestion des demandes de maintenance</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">3. Compte utilisateur</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Pour utiliser MonCondo+, vous devez créer un compte en fournissant des informations exactes et à jour. 
                  Vous êtes responsable de :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Maintenir la confidentialité de votre mot de passe</li>
                  <li>Toutes les activités qui se produisent sous votre compte</li>
                  <li>Notifier immédiatement toute utilisation non autorisée de votre compte</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">4. Utilisation acceptable</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Vous vous engagez à ne pas utiliser MonCondo+ pour :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Violer toute loi ou réglementation applicable</li>
                  <li>Transmettre des contenus illégaux, nuisibles ou offensants</li>
                  <li>Tenter d'accéder à des zones non autorisées du système</li>
                  <li>Perturber ou endommager le fonctionnement de la plateforme</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">5. Propriété intellectuelle</h2>
                <p className="text-gray-700 leading-relaxed">
                  Tous les contenus de MonCondo+, incluant mais sans s'y limiter, les textes, graphiques, logos, icônes, 
                  images et logiciels, sont la propriété de MonCondo+ et sont protégés par les lois sur la propriété intellectuelle.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">6. Confidentialité</h2>
                <p className="text-gray-700 leading-relaxed">
                  La protection de vos données personnelles est importante pour nous. 
                  Consultez notre <a href="/privacy" className="text-primary-600 hover:underline">Politique de confidentialité</a> pour plus d'informations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">7. Limitation de responsabilité</h2>
                <p className="text-gray-700 leading-relaxed">
                  MonCondo+ est fourni "tel quel" sans garantie d'aucune sorte. Nous ne garantissons pas que la plateforme 
                  sera ininterrompue, sécurisée ou exempte d'erreurs. Votre utilisation de MonCondo+ est à vos propres risques.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">8. Modifications des conditions</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet 
                  dès leur publication sur la plateforme. Il est de votre responsabilité de consulter régulièrement ces conditions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">9. Résiliation</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment, sans préavis, 
                  en cas de violation de ces conditions générales d'utilisation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
                <p className="text-gray-700 leading-relaxed">
                  Pour toute question concernant ces conditions générales d'utilisation, veuillez nous contacter à 
                  <a href="mailto:contact@moncondo.com" className="text-primary-600 hover:underline"> contact@moncondo.com</a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

