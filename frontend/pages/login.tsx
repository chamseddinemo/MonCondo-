import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'visiteur'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Connexion via le contexte
        await login(formData.email, formData.password)
        router.push('/dashboard')
      } else {
        // Inscription
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const response = await axios.post(`${API_URL}/auth/register`, formData)
        
        if (response.data.success) {
          // Après inscription, connecter automatiquement
          await login(formData.email, formData.password)
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      // Afficher le message d'erreur détaillé
      const errorMessage = error.message || error.response?.data?.message || 'Erreur lors de la connexion'
      setError(errorMessage)
      
      // Log pour debug
      console.error('[LOGIN] Erreur:', error)
      if (error.code) {
        console.error('[LOGIN] Code erreur:', error.code)
      }
      if (error.request && !error.response) {
        console.error('[LOGIN] Pas de réponse du serveur - Backend probablement non démarré')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 mt-20">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🏢</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Connexion' : 'Inscription'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte MonCondo+'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="visiteur">Visiteur</option>
                    <option value="locataire">Locataire</option>
                    <option value="proprietaire">Propriétaire</option>
                  </select>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="font-semibold mb-1">Erreur de connexion</p>
                    <p className="text-sm whitespace-pre-line">{error}</p>
                    {(error.includes('backend') || error.includes('serveur') || error.includes('port 5000') || error.includes('Solution :')) ? (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-semibold mb-2 text-blue-800">💡 Solution rapide :</p>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <span className="font-bold text-blue-600 mr-2">1.</span>
                            <span>Ouvrez un terminal PowerShell</span>
                          </div>
                          <div className="flex items-start">
                            <span className="font-bold text-blue-600 mr-2">2.</span>
                            <span>Naviguez vers le dossier backend : <code className="bg-blue-100 px-2 py-1 rounded font-mono">cd backend</code></span>
                          </div>
                          <div className="flex items-start">
                            <span className="font-bold text-blue-600 mr-2">3.</span>
                            <span>Démarrez le serveur : <code className="bg-blue-100 px-2 py-1 rounded font-mono">npm start</code></span>
                          </div>
                          <div className="flex items-start">
                            <span className="font-bold text-blue-600 mr-2">4.</span>
                            <span>Attendez le message <code className="bg-blue-100 px-2 py-1 rounded font-mono">"Server running on port 5000"</code></span>
                          </div>
                          <div className="flex items-start">
                            <span className="font-bold text-blue-600 mr-2">5.</span>
                            <span>Réessayez de vous connecter</span>
                          </div>
                        </div>
                        <p className="mt-2 text-blue-700 text-xs italic">💻 Ou utilisez le script : <code className="bg-blue-100 px-1 rounded">.\start-project.ps1</code></p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              {isLogin ? 'Pas encore de compte ? Inscrivez-vous' : 'Déjà un compte ? Connectez-vous'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

