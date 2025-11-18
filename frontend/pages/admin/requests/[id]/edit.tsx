import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import { useAuth } from '../../../../contexts/AuthContext'
import { buildApiUrlWithId, getApiConfig, getAuthToken, logApiRequest, logApiResponse } from '@/utils/api'

interface Request {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  unit?: {
    _id: string
    unitNumber: string
  }
  building?: {
    _id: string
    name: string
  }
}

export default function EditRequest() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    status: '',
    priority: '',
    unit: '',
    building: ''
  })

  useEffect(() => {
    if (id) {
      loadRequest()
    }
  }, [id])

  const loadRequest = async () => {
    try {
      if (!id) {
        setError('ID de la demande manquant')
        setLoading(false)
        return
      }
      
      const token = getAuthToken()
      const requestId = String(id).trim().replace(/\s+/g, '')
      const url = buildApiUrlWithId('requests', requestId)
      logApiRequest('GET', url)
      
      const response = await axios.get(url, getApiConfig(token))
      logApiResponse('GET', url, response.status, response.data)
      
      if (response.status === 200 && response.data && response.data.success) {
        const req = response.data.data
        setRequest(req)
        setFormData({
          title: req.title || '',
          description: req.description || '',
          type: req.type || '',
          status: req.status || '',
          priority: req.priority || 'moyenne',
          unit: req.unit?._id || '',
          building: req.building?._id || ''
        })
      } else {
        setError(response.data?.message || 'Demande non trouvée')
      }
    } catch (error: any) {
      console.error('Erreur chargement demande:', error)
      if (error.config) {
        console.error('Détails:', {
          url: error.config.url,
          message: error.message,
          response: error.response?.data
        })
      }
      setError(error.response?.data?.message || error.message || 'Erreur lors du chargement de la demande')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!id) {
        setError('ID de la demande manquant')
        setSaving(false)
        return
      }
      
      const token = getAuthToken()
      const requestId = String(id).trim().replace(/\s+/g, '')
      const url = buildApiUrlWithId('requests', requestId)
      logApiRequest('PUT', url, formData)
      
      const response = await axios.put(
        url,
        formData,
        getApiConfig(token)
      )
      
      logApiResponse('PUT', url, response.status, response.data)

      if (response.status === 200 && response.data && response.data.success) {
        alert('✅ Demande mise à jour avec succès !')
        router.push(`/admin/requests/${requestId}`)
      } else {
        setError(response.data?.message || 'Erreur lors de la mise à jour')
      }
    } catch (error: any) {
      console.error('Erreur mise à jour:', error)
      if (error.config) {
        console.error('Détails:', {
          url: error.config.url,
          message: error.message,
          response: error.response?.data
        })
      }
      setError(error.response?.data?.message || error.message || 'Erreur lors de la mise à jour de la demande')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement de la demande...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  if (error || !request) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Demande non trouvée</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cette demande n\'existe pas.'}</p>
              <Link href="/admin/requests" className="btn-primary">
                Retour aux demandes
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link href={`/admin/requests/${id}`} className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
              ← Retour aux détails
            </Link>
            <h1 className="text-4xl font-bold mb-2">Modifier la demande</h1>
            <p className="text-gray-600">{request.title}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="card p-6 max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="location">Location</option>
                    <option value="achat">Achat</option>
                    <option value="service">Service</option>
                    <option value="reclamation">Réclamation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminée</option>
                  <option value="accepte">Acceptée</option>
                  <option value="refuse">Refusée</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
                <Link
                  href={`/admin/requests/${id}`}
                  className="flex-1 btn-secondary text-center"
                >
                  Annuler
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

