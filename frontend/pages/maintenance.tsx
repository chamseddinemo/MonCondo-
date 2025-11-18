import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface MaintenanceRequest {
  _id: string
  title: string
  description: string
  type: string
  priority: string
  status: string
  unit?: {
    _id: string
    unitNumber: string
  }
  building?: {
    _id: string
    name: string
  }
  createdAt: string
  updatedAt: string
  completedAt?: string
  estimatedCost?: number
  actualCost?: number
}

interface Unit {
  _id: string
  unitNumber: string
  building: {
    name: string
  }
}

export default function Maintenance() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    unit: ''
  })
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    unit: '',
    priority: 'moyenne',
    estimatedCost: ''
  })

  useEffect(() => {
    if (isAuthenticated && user?.role === 'proprietaire') {
      loadMaintenanceRequests()
      loadUnits()
    }
  }, [isAuthenticated, user, filters])

  const loadMaintenanceRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      params.append('type', 'maintenance')
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) {
        // Note: Le backend ne filtre pas par priorité, on filtrera côté client
      }
      if (filters.unit) params.append('unit', filters.unit)

      const response = await axios.get(`${API_URL}/requests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        let requests = response.data.data || []
        // Filtrer par priorité côté client si nécessaire
        if (filters.priority) {
          requests = requests.filter((r: MaintenanceRequest) => r.priority === filters.priority)
        }
        setMaintenanceRequests(requests)
      }
    } catch (error) {
      console.error('Erreur chargement maintenance:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnits = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/proprietaire/my-units`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        setUnits(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement unités:', error)
    }
  }

  const createMaintenanceRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      const unit = units.find(u => u._id === newRequest.unit)
      
      if (!unit) {
        alert('Veuillez sélectionner une unité')
        return
      }

      await axios.post(
        `${API_URL}/requests`,
        {
          title: newRequest.title,
          description: newRequest.description,
          type: 'maintenance',
          unit: newRequest.unit,
          building: (unit.building as any)?._id || unit.building || '',
          priority: newRequest.priority,
          estimatedCost: newRequest.estimatedCost ? parseFloat(newRequest.estimatedCost) : undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      // Réinitialiser le formulaire
      setNewRequest({
        title: '',
        description: '',
        unit: '',
        priority: 'moyenne',
        estimatedCost: ''
      })
      setShowRequestModal(false)
      loadMaintenanceRequests()
      alert('Demande de maintenance créée avec succès!')
    } catch (error: any) {
      console.error('Erreur création demande:', error)
      alert(error.response?.data?.message || 'Erreur lors de la création de la demande.')
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'faible': 'bg-blue-100 text-blue-800',
      'moyenne': 'bg-yellow-100 text-yellow-800',
      'haute': 'bg-orange-100 text-orange-800',
      'urgente': 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
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
      'termine': 'Terminé',
      'accepte': 'Accepté',
      'refuse': 'Refusé'
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      'faible': 'Faible',
      'moyenne': 'Moyenne',
      'haute': 'Haute',
      'urgente': 'Urgente'
    }
    return labels[priority] || priority
  }

  // Fonctions pour le calendrier
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Ajouter les jours vides au début
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Ajouter les jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getRequestsForDate = (date: Date) => {
    if (!date) return []
    return maintenanceRequests.filter(req => {
      const reqDate = new Date(req.createdAt)
      return reqDate.toDateString() === date.toDateString()
    })
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const stats = {
    total: maintenanceRequests.length,
    pending: maintenanceRequests.filter(r => r.status === 'en_attente').length,
    inProgress: maintenanceRequests.filter(r => r.status === 'en_cours').length,
    completed: maintenanceRequests.filter(r => r.status === 'termine' || r.status === 'accepte').length,
    urgent: maintenanceRequests.filter(r => r.priority === 'urgente').length
  }

  if (!isAuthenticated || user?.role !== 'proprietaire') {
    return (
      <ProtectedRoute requiredRoles={['proprietaire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600">Cette page est réservée aux propriétaires.</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-orange-800 to-orange-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">Agenda / Maintenance Planifiée</h1>
                <p className="text-xl text-gray-300">
                  Planifiez et suivez les entretiens ou réparations à venir dans vos unités
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="bg-white text-orange-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors mt-4"
              >
                + Nouvelle demande
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="text-sm mb-2 opacity-90">Total</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <div className="text-sm mb-2 opacity-90">En attente</div>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="text-sm mb-2 opacity-90">En cours</div>
              <div className="text-3xl font-bold">{stats.inProgress}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="text-sm mb-2 opacity-90">Terminées</div>
              <div className="text-3xl font-bold">{stats.completed}</div>
            </div>
            <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="text-sm mb-2 opacity-90">Urgentes</div>
              <div className="text-3xl font-bold">{stats.urgent}</div>
            </div>
          </div>

          {/* Filtres et vue */}
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Toutes les priorités</option>
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unité</label>
                  <select
                    value={filters.unit}
                    onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Toutes les unités</option>
                    {units.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.unitNumber} - {unit.building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-lg ${viewMode === 'calendar' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  📅 Calendrier
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  📋 Liste
                </button>
              </div>
            </div>
          </div>

          {/* Vue Calendrier */}
          {viewMode === 'calendar' && (
            <div className="card p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    ‹
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-700 py-2">
                    {day}
                  </div>
                ))}
                {days.map((day, index) => {
                  const requestsForDay = day ? getRequestsForDate(day) : []
                  const isToday = day && day.toDateString() === new Date().toDateString()
                  const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString()

                  return (
                    <div
                      key={index}
                      className={`min-h-24 border border-gray-200 p-2 rounded-lg ${
                        !day ? 'bg-gray-50' : ''
                      } ${
                        isToday ? 'bg-orange-50 border-orange-400' : ''
                      } ${
                        isSelected ? 'ring-2 ring-orange-500' : ''
                      }`}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={`font-semibold mb-1 ${isToday ? 'text-orange-600' : ''}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {requestsForDay.slice(0, 2).map((req) => (
                              <div
                                key={req._id}
                                className={`text-xs p-1 rounded truncate ${getPriorityColor(req.priority)}`}
                                title={req.title}
                              >
                                {req.title}
                              </div>
                            ))}
                            {requestsForDay.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{requestsForDay.length - 2} autre(s)
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Légende */}
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded mr-2"></div>
                  <span className="text-sm">Aujourd'hui</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
                  <span className="text-sm">Faible</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-100 rounded mr-2"></div>
                  <span className="text-sm">Moyenne</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-100 rounded mr-2"></div>
                  <span className="text-sm">Haute</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
                  <span className="text-sm">Urgente</span>
                </div>
              </div>
            </div>
          )}

          {/* Vue Liste */}
          {viewMode === 'list' && (
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-6">Liste des Demandes de Maintenance</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
              ) : maintenanceRequests.length > 0 ? (
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <div
                      key={request._id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2">{request.title}</h3>
                          <p className="text-gray-600 mb-4">{request.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {request.unit && (
                              <div className="flex items-center">
                                <span className="mr-2">🏠</span>
                                <span>Unité {request.unit.unitNumber}</span>
                              </div>
                            )}
                            {request.building && (
                              <div className="flex items-center">
                                <span className="mr-2">🏢</span>
                                <span>{request.building.name}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <span className="mr-2">📅</span>
                              <span>{new Date(request.createdAt).toLocaleDateString('fr-CA')}</span>
                            </div>
                            {request.estimatedCost && (
                              <div className="flex items-center">
                                <span className="mr-2">💰</span>
                                <span>Estimation: {formatCurrency(request.estimatedCost)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(request.priority)}`}>
                            {getPriorityLabel(request.priority)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔧</div>
                  <h3 className="text-2xl font-bold mb-2">Aucune demande de maintenance</h3>
                  <p className="text-gray-600 mb-6">
                    {filters.status || filters.priority || filters.unit
                      ? 'Aucune demande ne correspond à vos critères.'
                      : 'Vous n\'avez pas encore de demande de maintenance.'}
                  </p>
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="btn-primary"
                  >
                    Créer une demande
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Détails de la date sélectionnée */}
          {selectedDate && viewMode === 'calendar' && (
            <div className="card p-6">
              <h3 className="text-xl font-bold mb-4">
                Demandes du {selectedDate.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              {getRequestsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getRequestsForDate(selectedDate).map((request) => (
                    <div key={request._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{request.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {request.unit && <span>Unité {request.unit.unitNumber}</span>}
                            {request.estimatedCost && <span>• {formatCurrency(request.estimatedCost)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                            {getPriorityLabel(request.priority)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Aucune demande pour cette date.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de demande */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Nouvelle Demande de Maintenance</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={createMaintenanceRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
                <input
                  type="text"
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Réparation de la plomberie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Décrivez le problème ou l'entretien nécessaire..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unité *</label>
                <select
                  value={newRequest.unit}
                  onChange={(e) => setNewRequest({ ...newRequest, unit: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Sélectionner une unité</option>
                  {units.map((unit) => (
                    <option key={unit._id} value={unit._id}>
                      {unit.unitNumber} - {unit.building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  value={newRequest.priority}
                  onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coût estimé (optionnel)</label>
                <input
                  type="number"
                  value={newRequest.estimatedCost}
                  onChange={(e) => setNewRequest({ ...newRequest, estimatedCost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Créer la demande
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

