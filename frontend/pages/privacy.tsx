import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Privacy() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">Politique de confidentialité</h1>
              <p className="text-gray-600">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-CA')}
              </p>
            </div>

            <div className="card p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                <p className="text-gray-700 leading-relaxed">
                  MonCondo+ s'engage à protéger votre vie privée et vos données personnelles. 
                  Cette politique explique comment nous collectons, utilisons, stockons et protégeons vos informations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">2. Données collectées</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Nous collectons les informations suivantes :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li><strong>Informations d'identification :</strong> nom, prénom, email, numéro de téléphone</li>
                  <li><strong>Informations de compte :</strong> nom d'utilisateur, mot de passe (hashé)</li>
                  <li><strong>Informations de transaction :</strong> historique des paiements, factures</li>
                  <li><strong>Données d'utilisation :</strong> logs d'accès, préférences utilisateur</li>
                  <li><strong>Documents :</strong> contrats, factures, documents administratifs</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">3. Utilisation des données</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Nous utilisons vos données pour :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Fournir et améliorer nos services</li>
                  <li>Gérer votre compte et vos transactions</li>
                  <li>Communiquer avec vous concernant votre compte</li>
                  <li>Respecter nos obligations légales</li>
                  <li>Améliorer la sécurité de la plateforme</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">4. Partage des données</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations uniquement dans les cas suivants :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Avec votre consentement explicite</li>
                  <li>Pour respecter une obligation légale</li>
                  <li>Avec les administrateurs d'immeuble autorisés</li>
                  <li>Avec des prestataires de services de confiance (hébergement, paiement) sous contrat de confidentialité</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">5. Sécurité des données</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger 
                  vos données contre l'accès non autorisé, la perte, la destruction ou la modification. 
                  Cela inclut le chiffrement des données sensibles et l'accès restreint aux informations personnelles.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">6. Conservation des données</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services 
                  et respecter nos obligations légales. Les données peuvent être conservées plus longtemps si requis par la loi.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">7. Vos droits</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Conformément aux lois sur la protection des données, vous avez le droit de :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Accéder à vos données personnelles</li>
                  <li>Corriger des données inexactes</li>
                  <li>Demander la suppression de vos données</li>
                  <li>Vous opposer au traitement de vos données</li>
                  <li>Demander la portabilité de vos données</li>
                  <li>Retirer votre consentement à tout moment</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">8. Cookies</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience sur notre plateforme. 
                  Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">9. Modifications de la politique</h2>
                <p className="text-gray-700 leading-relaxed">
                  Nous pouvons modifier cette politique de confidentialité à tout moment. 
                  Les modifications seront publiées sur cette page avec une date de mise à jour révisée.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
                <p className="text-gray-700 leading-relaxed">
                  Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
                  contactez-nous à <a href="mailto:contact@moncondo.com" className="text-primary-600 hover:underline">contact@moncondo.com</a>.
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

