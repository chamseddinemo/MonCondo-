import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { buildApiUrl, getApiConfig, getAuthToken, logApiRequest, logApiResponse } from '@/utils/api'

interface Request {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  createdAt: string
  createdBy?: {
    firstName: string
    lastName: string
    email: string
  }
  unit?: {
    unitNumber: string
  }
  building?: {
    name: string
  }
}

export default function AdminRequests() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const token = getAuthToken()
      const url = buildApiUrl('requests')
      logApiRequest('GET', url)
      
      const response = await axios.get(url, getApiConfig(token))
      logApiResponse('GET', url, response.status, response.data)
      
      if (response.status === 200 && response.data && response.data.success) {
        setRequests(response.data.data || [])
      }
    } catch (error: any) {
      console.error('Erreur chargement demandes:', error)
      if (error.config) {
        console.error('Détails:', {
          url: error.config.url,
          message: error.message,
          response: error.response?.data
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'en_attente': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'termine': 'bg-green-100 text-green-800',
      'accepte': 'bg-green-100 text-green-800',
      'refuse': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'en_cours': 'En cours',
      'termine': 'Terminée',
      'accepte': 'Acceptée',
      'refuse': 'Refusée'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'urgente': 'bg-red-100 text-red-800',
      'haute': 'bg-orange-100 text-orange-800',
      'moyenne': 'bg-yellow-100 text-yellow-800',
      'faible': 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const filteredRequests = requests.filter(req => {
    const matchSearch = !searchTerm || 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = !typeFilter || req.type === typeFilter
    const matchStatus = !statusFilter || req.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des demandes...</p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Gestion des Demandes</h1>
                <p className="text-gray-600">Gérez toutes les demandes du système</p>
              </div>
              <Link href="/dashboard/admin" className="btn-secondary">
                ← Retour au tableau de bord
              </Link>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total</p>
                  <p className="text-3xl font-bold">{requests.length}</p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">En attente</p>
                  <p className="text-3xl font-bold text-yellow-600">{requests.filter(r => r.status === 'en_attente').length}</p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">En cours</p>
                  <p className="text-3xl font-bold text-blue-600">{requests.filter(r => r.status === 'en_cours').length}</p>
                </div>
                <div className="text-4xl">🔄</div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Terminées</p>
                  <p className="text-3xl font-bold text-green-600">{requests.filter(r => r.status === 'termine' || r.status === 'accepte').length}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="card p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <input
                  type="text"
                  placeholder="Titre, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tous les types</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="location">Location</option>
                  <option value="achat">Achat</option>
                  <option value="service">Service</option>
                  <option value="reclamation">Réclamation</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminée</option>
                  <option value="accepte">Acceptée</option>
                  <option value="refuse">Refusée</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des demandes */}
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Liste des demandes ({filteredRequests.length})</h2>
            <div className="space-y-4">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <div key={req._id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{req.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(req.priority)}`}>
                            {req.priority || 'moyenne'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{req.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="capitalize">Type: {req.type}</span>
                          {req.createdBy && (
                            <span>Par: {req.createdBy.firstName} {req.createdBy.lastName}</span>
                          )}
                          {req.unit && (
                            <span>Unité: {req.unit.unitNumber}</span>
                          )}
                          <span>{new Date(req.createdAt).toLocaleDateString('fr-CA')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link 
                          href={`/admin/requests/${req._id}`}
                          className="btn-primary text-sm"
                        >
                          Voir détails
                        </Link>
                        <Link 
                          href={`/admin/requests/${req._id}/edit`}
                          className="btn-secondary text-sm"
                        >
                          Modifier
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune demande trouvée</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}



