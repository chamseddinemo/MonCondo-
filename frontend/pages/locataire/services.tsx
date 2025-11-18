import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { useRequestsSync } from '../../hooks/useDataSync'
import { useNotifications } from '../../contexts/NotificationContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface MaintenanceRequest {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  createdAt: string
  updatedAt?: string
  completedAt?: string
  estimatedCost?: number
  actualCost?: number
  unit?: {
    _id: string
    unitNumber: string
  }
  building?: {
    _id: string
    name: string
    address?: string
  }
  createdBy?: {
    firstName: string
    lastName: string
    email: string
  }
  assignedTo?: {
    firstName: string
    lastName: string
    email: string
  }
  statusHistory?: Array<{
    status: string
    changedAt: string
    comment?: string
    changedBy?: {
      firstName: string
      lastName: string
    }
  }>
  attachments?: Array<{
    filename: string
    path: string
    uploadedAt: string
  }>
}

export default function LocataireServices() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { refreshNotifications } = useNotifications()
  
  // Use data sync hook for automatic refresh
  const { requests: syncedRequests, loading: syncLoading, refresh: refreshRequests, stats: requestStats } = useRequestsSync({
    enabled: true,
    interval: 30000 // Refresh every 30 seconds
  })

  // Local state for filters and UI
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: ''
  })

  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    type: 'maintenance',
    priority: 'moyenne'
  })

  // Update local requests when synced data changes
  useEffect(() => {
    if (syncedRequests.length > 0) {
      setRequests(syncedRequests)
      setLoading(false)
    }
  }, [syncedRequests])

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/requests`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.data && response.data.success) {
        setRequests(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      await axios.post(`${API_URL}/requests`, newRequest, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setShowRequestModal(false)
      setNewRequest({ title: '', description: '', type: 'maintenance', priority: 'moyenne' })
      loadRequests()
      refreshRequests()
      refreshNotifications()
    } catch (error) {
      console.error('Erreur création demande:', error)
      alert('Erreur lors de la création de la demande')
    }
  }

  // Filter requests based on filters
  const filteredRequests = requests.filter(request => {
    if (filters.status !== 'all' && request.status !== filters.status) return false
    if (filters.type !== 'all' && request.type !== filters.type) return false
    if (filters.priority !== 'all' && request.priority !== filters.priority) return false
    if (filters.search && !request.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !request.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const handleViewDetails = async (requestId: string) => {
    setLoadingDetail(true)
    setShowDetailModal(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/requests/${requestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data && response.data.success && response.data.data) {
        setSelectedRequest(response.data.data)
      } else {
        alert('Erreur lors du chargement des détails de la demande')
        setShowDetailModal(false)
      }
    } catch (error: any) {
      console.error('Erreur chargement détails:', error)
      if (error.response?.status === 401) {
        alert('Session expirée. Veuillez vous reconnecter.')
        router.push('/login')
      } else if (error.response?.status === 403) {
        alert('Vous n\'avez pas accès à cette demande')
      } else if (error.response?.status === 404) {
        alert('Demande non trouvée')
      } else {
        alert('Erreur lors du chargement des détails de la demande')
      }
      setShowDetailModal(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'en_attente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'en_cours': 'bg-blue-100 text-blue-800 border-blue-300',
      'termine': 'bg-green-100 text-green-800 border-green-300',
      'accepte': 'bg-green-100 text-green-800 border-green-300',
      'refuse': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
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

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      'urgente': 'Urgente',
      'haute': 'Haute',
      'moyenne': 'Moyenne',
      'faible': 'Faible'
    }
    return labels[priority] || priority
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'maintenance': 'Maintenance',
      'location': 'Location',
      'achat': 'Achat',
      'service': 'Service',
      'reclamation': 'Réclamation',
      'autre': 'Autre'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['locataire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center">
                  <span className="mr-3">🔧</span>
                  Services et Maintenance
                </h1>
                <p className="text-gray-600">Gérez vos demandes de réparation et signalements</p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="btn-primary"
              >
                ➕ Nouvelle demande
              </button>
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
                  <p className="text-3xl font-bold text-green-600">{requests.filter(r => r.status === 'termine').length}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Filtres et recherche</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Titre, description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminée</option>
                  <option value="refuse">Refusée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Tous les types</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="location">Location</option>
                  <option value="service">Service</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Toutes les priorités</option>
                  <option value="urgente">Urgente</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="faible">Faible</option>
                </select>
              </div>
            </div>
            {syncLoading && (
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Synchronisation en cours...
              </div>
            )}
          </div>

          {/* Liste des demandes */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Mes demandes</h2>
              <button
                onClick={() => {
                  refreshRequests()
                  refreshNotifications()
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
                disabled={syncLoading}
              >
                🔄 Actualiser
              </button>
            </div>
            <div className="space-y-4">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <div key={request._id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{request.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            request.priority === 'urgente' ? 'bg-red-100 text-red-800' :
                            request.priority === 'haute' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.priority || 'moyenne'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{request.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="capitalize">Type: {request.type}</span>
                          {request.unit && <span>Unité: {request.unit.unitNumber}</span>}
                          <span>{new Date(request.createdAt).toLocaleDateString('fr-CA')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleViewDetails(request._id)} 
                        className="btn-secondary text-sm"
                      >
                        Voir détails
                      </button>
                    </div>
                  </div>
                ))
              ) : requests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune demande trouvée</p>
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune demande ne correspond aux filtres sélectionnés</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal détails demande */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600">Chargement des détails...</p>
              </div>
            ) : selectedRequest ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">{selectedRequest.title}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(selectedRequest.status)}`}>
                        {getStatusLabel(selectedRequest.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedRequest.priority)}`}>
                        Priorité: {getPriorityLabel(selectedRequest.priority)}
                      </span>
                      <span className="text-gray-600 text-sm">
                        Type: {getTypeLabel(selectedRequest.type)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedRequest(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Contenu principal */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center">
                        <span className="mr-2">📝</span>
                        Description
                      </h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
                    </div>

                    {/* Historique des statuts */}
                    {selectedRequest.statusHistory && selectedRequest.statusHistory.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center">
                          <span className="mr-2">🕐</span>
                          Historique des statuts
                        </h3>
                        <div className="space-y-4">
                          {selectedRequest.statusHistory.map((history, index) => (
                            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0">
                              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <span className="text-primary-600 font-bold">{index + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(history.status)}`}>
                                    {getStatusLabel(history.status)}
                                  </span>
                                  {history.changedBy && (
                                    <span className="text-sm text-gray-600">
                                      par {history.changedBy.firstName} {history.changedBy.lastName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {new Date(history.changedAt).toLocaleDateString('fr-CA', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {history.comment && (
                                  <p className="text-gray-700 mt-2 text-sm">{history.comment}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pièces jointes */}
                    {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center">
                          <span className="mr-2">📎</span>
                          Pièces jointes
                        </h3>
                        <div className="space-y-2">
                          {selectedRequest.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={`${API_URL.replace('/api', '')}/uploads/${attachment.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-2xl">📄</span>
                              <div className="flex-1">
                                <p className="font-semibold">{attachment.filename}</p>
                                <p className="text-sm text-gray-500">
                                  Ajouté le {new Date(attachment.uploadedAt).toLocaleDateString('fr-CA')}
                                </p>
                              </div>
                              <span className="text-primary-600">Télécharger</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Informations */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold mb-4">Informations</h3>
                      <div className="space-y-4">
                        {selectedRequest.unit && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Unité</label>
                            <p className="text-lg font-semibold">Unité {selectedRequest.unit.unitNumber}</p>
                          </div>
                        )}
                        {selectedRequest.building && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Immeuble</label>
                            <p className="text-lg font-semibold">{selectedRequest.building.name}</p>
                            {selectedRequest.building.address && (
                              <p className="text-sm text-gray-500">
                                {typeof selectedRequest.building.address === 'string' 
                                  ? selectedRequest.building.address
                                  : selectedRequest.building.address.city 
                                    ? `${selectedRequest.building.address.street || ''}, ${selectedRequest.building.address.city}, ${selectedRequest.building.address.province || ''} ${selectedRequest.building.address.postalCode || ''}`.trim()
                                    : ''}
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-600">Date de création</label>
                          <p className="text-lg">
                            {new Date(selectedRequest.createdAt).toLocaleDateString('fr-CA', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {selectedRequest.updatedAt && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Dernière mise à jour</label>
                            <p className="text-lg">
                              {new Date(selectedRequest.updatedAt).toLocaleDateString('fr-CA', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        {selectedRequest.completedAt && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Date de completion</label>
                            <p className="text-lg">
                              {new Date(selectedRequest.completedAt).toLocaleDateString('fr-CA', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        {selectedRequest.createdBy && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Créée par</label>
                            <p className="text-lg">
                              {selectedRequest.createdBy.firstName} {selectedRequest.createdBy.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{selectedRequest.createdBy.email}</p>
                          </div>
                        )}
                        {selectedRequest.assignedTo && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Assignée à</label>
                            <p className="text-lg">
                              {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{selectedRequest.assignedTo.email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coûts */}
                    {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Coûts</h3>
                        <div className="space-y-3">
                          {selectedRequest.estimatedCost && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Coût estimé</label>
                              <p className="text-xl font-semibold text-primary-600">
                                ${selectedRequest.estimatedCost.toLocaleString()}
                              </p>
                            </div>
                          )}
                          {selectedRequest.actualCost && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Coût réel</label>
                              <p className="text-xl font-semibold text-green-600">
                                ${selectedRequest.actualCost.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false)
                      setSelectedRequest(null)
                    }}
                    className="btn-primary"
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-xl font-bold mb-2">Erreur</h3>
                <p className="text-gray-600 mb-4">Impossible de charger les détails de la demande</p>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedRequest(null)
                  }}
                  className="btn-primary"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal nouvelle demande */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Nouvelle demande</h2>
            <form onSubmit={handleSubmitRequest}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <input
                  type="text"
                  required
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Fuite d'eau dans la salle de bain"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  required
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  placeholder="Décrivez le problème en détail..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newRequest.type}
                    onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="reparation">Réparation</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  Envoyer la demande
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </ProtectedRoute>
  )
}

