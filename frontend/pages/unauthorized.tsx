import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'

export default function Unauthorized() {
  const { user, logout } = useAuth()

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="text-8xl mb-4">🚫</div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Accès refusé</h1>
            <p className="text-xl text-gray-600 mb-2">
              Désolé, vous n'avez pas les droits nécessaires pour accéder à cette page.
            </p>
            {user && (
              <p className="text-gray-500 mb-6">
                Votre rôle actuel : <span className="font-semibold capitalize">{user.role}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Que pouvez-vous faire ?</h2>
            <ul className="text-left space-y-2 text-gray-600 mb-6">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Retourner à la page d'accueil
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Contacter un administrateur si vous pensez que c'est une erreur
              </li>
              {user && (
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Vous connecter avec un compte ayant les droits appropriés
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="btn-primary">
              Retour à l'accueil
            </Link>
            <Link href="/contact" className="btn-secondary">
              Nous contacter
            </Link>
            {user && (
              <button onClick={logout} className="btn-secondary border-red-500 text-red-600 hover:bg-red-50">
                Se déconnecter
              </button>
            )}
          </div>

          {user && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> Si vous pensez avoir besoin d'accès à cette page, 
                veuillez contacter votre administrateur pour obtenir les permissions nécessaires.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}



