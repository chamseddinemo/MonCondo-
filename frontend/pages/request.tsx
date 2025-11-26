import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import { buildApiUrl, getApiConfig, getAuthToken, logApiRequest, logApiResponse, getErrorMessage, showSuccessMessage, showErrorMessage } from '../utils/api'

export default function Request() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { unitId, unit } = router.query
  
  // Utiliser unitId ou unit (les deux peuvent être utilisés selon la page source)
  const selectedUnitId = (unitId || unit) as string | undefined
  
  const [formData, setFormData] = useState({
    type: 'location',
    unitId: '',
    message: '',
    title: ''
  })
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Attendre que le router soit prêt avant d'accéder aux query params
    if (!router.isReady) return
    
    // Si unitId ou unit est fourni dans l'URL, l'utiliser
    if (selectedUnitId) {
      setFormData(prev => ({ ...prev, unitId: selectedUnitId }))
    }
    
    // Vérifier l'authentification
    if (!isAuthenticated) {
      router.push('/login?redirect=/request')
      return
    }
    
    loadAvailableUnits()
  }, [selectedUnitId, isAuthenticated, router.isReady])

  const loadAvailableUnits = async () => {
    try {
      const url = buildApiUrl('units/available')
      logApiRequest('GET', url)
      
      const response = await axios.get(url, getApiConfig())
      logApiResponse('GET', url, response.status, response.data)
      
      if (response.status === 200 && response.data && response.data.success) {
        setUnits(response.data.data || [])
      }
    } catch (error: any) {
      console.error('Erreur chargement unités:', error)
      const errorMessage = getErrorMessage(error, 'Une erreur est survenue lors du chargement des unités disponibles.')
      console.error(errorMessage)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!isAuthenticated || !user) {
        router.push('/login?redirect=/request')
        return
      }

      const token = getAuthToken()
      if (!token) {
        showErrorMessage('Vous devez être connecté pour créer une demande. Veuillez vous reconnecter.')
        router.push('/login?redirect=/request')
        return
      }

      // Préparer les données de la demande
      const selectedUnit = units.find((u: any) => u._id === formData.unitId)
      const typeLabel = formData.type === 'location' ? 'Location' : 'Achat'
      const requestData: any = {
        type: formData.type,
        description: formData.message || `Demande de ${formData.type} pour une unité`,
        title: formData.title || (selectedUnit ? `Demande de ${typeLabel} - Unité ${selectedUnit.unitNumber}` : `Demande de ${typeLabel}`),
        status: 'en_attente',
        priority: 'moyenne'
      }

      // Ajouter l'unité si spécifiée
      if (formData.unitId) {
        requestData.unit = formData.unitId
      }

      // Créer la demande
      const url = buildApiUrl('requests')
      logApiRequest('POST', url, requestData)
      
      const response = await axios.post(url, requestData, getApiConfig(token))
      logApiResponse('POST', url, response.status, response.data)

      if (response.status === 200 || response.status === 201) {
        if (response.data && response.data.success) {
          setSuccess(true)
          showSuccessMessage(response.data.message || 'Demande créée avec succès !')
          
          // Rediriger vers le dashboard après 1.5 secondes (plus rapide)
          setTimeout(() => {
            if (user.role === 'locataire') {
              router.push('/dashboard/locataire')
            } else if (user.role === 'admin') {
              router.push('/dashboard/admin')
            } else if (user.role === 'proprietaire') {
              router.push('/dashboard/proprietaire')
            } else if (user.role === 'visiteur') {
              router.push('/dashboard/visiteur')
            } else {
              router.push('/dashboard')
            }
          }, 1500)
        } else {
          const errorMessage = getErrorMessage({ response }, 'Une erreur est survenue lors de la création de la demande.')
          setError(errorMessage)
        }
      } else {
        const errorMessage = getErrorMessage({ response }, 'Une erreur est survenue lors de la création de la demande.')
        setError(errorMessage)
      }
    } catch (error: any) {
      console.error('Erreur création demande:', error)
      if (error.response?.status === 401) {
        showErrorMessage('Votre session a expiré. Veuillez vous reconnecter.')
        setTimeout(() => router.push('/login?redirect=/request'), 2000)
      } else {
        const errorMessage = getErrorMessage(error, 'Une erreur est survenue lors de l\'envoi de la demande. Veuillez réessayer.')
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 py-12 px-4 mt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Redirection vers la page de connexion...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Faire une demande
            </h1>
            <p className="text-xl text-gray-600">
              Demandez une unité disponible ou faites une demande de location/achat
            </p>
          </div>

          {/* Messages d'erreur et de succès */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              ✅ Demande créée avec succès !
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Informations de l'utilisateur */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Demande effectuée par :</p>
              <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de demande <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="location">Location</option>
                  <option value="achat">Achat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unité souhaitée (optionnel)
                </label>
                <select
                  value={formData.unitId}
                  onChange={(e) => setFormData({...formData, unitId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une unité</option>
                  {units.map((unit: any) => (
                    <option key={unit._id} value={unit._id}>
                      Unité {unit.unitNumber} - {unit.building?.name || 'Immeuble'} - {formData.type === 'location' ? `$${unit.rentPrice || 'N/A'}/mois` : `$${unit.salePrice || 'N/A'}`}
                    </option>
                  ))}
                </select>
                {formData.unitId && (
                  <p className="mt-2 text-sm text-gray-500">
                    ✅ Unité sélectionnée : {units.find((u: any) => u._id === formData.unitId)?.unitNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la demande (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder={`Ex: Demande de ${formData.type} pour unité ${formData.unitId ? units.find((u: any) => u._id === formData.unitId)?.unitNumber : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Décrivez votre demande en détail..."
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="btn-primary flex-1" disabled={loading || success}>
                  {loading ? 'Envoi en cours...' : success ? 'Demande envoyée !' : 'Envoyer la demande'}
                </button>
                <Link href={formData.unitId ? `/units/${formData.unitId}` : '/units'} className="btn-secondary">
                  Annuler
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

