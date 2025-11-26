import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoanCalculator from '../../components/loans/LoanCalculator'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { authenticatedAxios } from '../../utils/axiosInstances'

export default function AdminLoansPage() {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const router = useRouter()
  const [allSimulations, setAllSimulations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSimulation, setSelectedSimulation] = useState<any>(null)
  const [filters, setFilters] = useState({
    userRole: '',
    userId: '',
    saved: ''
  })

  useEffect(() => {
    loadAllSimulations()
  }, [filters])

  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNewSimulation = (data: any) => {
      console.log('[ADMIN LOANS] Nouvelle simulation reçue:', data)
      loadAllSimulations()
    }

    const handleSimulationUpdated = (data: any) => {
      console.log('[ADMIN LOANS] Simulation mise à jour:', data)
      loadAllSimulations()
    }

    const handleSimulationDeleted = (data: any) => {
      console.log('[ADMIN LOANS] Simulation supprimée:', data)
      loadAllSimulations()
    }

    socket.on('loanSimulation:new', handleNewSimulation)
    socket.on('loanSimulation:created', handleNewSimulation)
    socket.on('loanSimulation:updated', handleSimulationUpdated)
    socket.on('loanSimulation:deleted', handleSimulationDeleted)

    return () => {
      socket.off('loanSimulation:new', handleNewSimulation)
      socket.off('loanSimulation:created', handleNewSimulation)
      socket.off('loanSimulation:updated', handleSimulationUpdated)
      socket.off('loanSimulation:deleted', handleSimulationDeleted)
    }
  }, [socket, isConnected])

  const loadAllSimulations = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.userRole) params.userRole = filters.userRole
      if (filters.userId) params.userId = filters.userId
      if (filters.saved) params.saved = filters.saved

      const response = await authenticatedAxios.get('/loans/simulations/all', { params })
      if (response.data.success) {
        setAllSimulations(response.data.data)
      }
    } catch (err) {
      console.error('Erreur chargement simulations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (simulationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette simulation?')) return

    try {
      await authenticatedAxios.delete(`/loans/simulations/${simulationId}`)
      loadAllSimulations()
    } catch (err) {
      alert('Erreur lors de la suppression')
    }
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Gestion des simulations de prêt
            </h1>
            <p className="text-xl text-gray-600">
              Visualisez toutes les simulations créées par les utilisateurs
            </p>
          </div>

          {/* Calculatrice */}
          <div className="mb-12">
            <LoanCalculator showSaveButton={true} />
          </div>

          {/* Liste des simulations */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Toutes les simulations ({allSimulations.length})
              </h2>
              <div className="flex gap-4">
                <select
                  value={filters.userRole}
                  onChange={(e) => setFilters({ ...filters, userRole: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tous les rôles</option>
                  <option value="admin">Admin</option>
                  <option value="proprietaire">Propriétaire</option>
                  <option value="visiteur">Visiteur</option>
                </select>
                <select
                  value={filters.saved}
                  onChange={(e) => setFilters({ ...filters, saved: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Toutes</option>
                  <option value="true">Sauvegardées</option>
                  <option value="false">Non sauvegardées</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : allSimulations.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                Aucune simulation trouvée
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant prêt</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mensualité</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taux</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durée</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allSimulations.map((sim) => (
                      <tr key={sim._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {sim.createdBy?.firstName} {sim.createdBy?.lastName}
                          <br />
                          <span className="text-xs text-gray-500">{sim.createdBy?.email}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sim.userRole === 'admin' ? 'bg-purple-100 text-purple-800' :
                            sim.userRole === 'proprietaire' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {sim.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ${sim.loanAmount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ${sim.monthlyPayment?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {sim.interestRate}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {sim.loanDurationYears} ans
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(sim.createdAt).toLocaleDateString('fr-CA')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedSimulation(sim)}
                              className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                            >
                              Voir
                            </button>
                            <button
                              onClick={() => handleDelete(sim._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal de détail */}
          {selectedSimulation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Détails de la simulation</h2>
                    <button
                      onClick={() => setSelectedSimulation(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <LoanCalculator initialData={selectedSimulation} readOnly={true} showSaveButton={false} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

