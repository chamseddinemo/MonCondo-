import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoanCalculator from '../../components/loans/LoanCalculator'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { authenticatedAxios } from '../../utils/axiosInstances'

export default function ProprietaireLoansPage() {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const router = useRouter()
  const [savedSimulations, setSavedSimulations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSavedSimulations()
  }, [])

  useEffect(() => {
    if (!socket || !isConnected) return

    const handleSimulationSaved = (data: any) => {
      console.log('[PROPRIETAIRE LOANS] Simulation sauvegardée:', data)
      loadSavedSimulations()
    }

    socket.on('loanSimulation:saved', handleSimulationSaved)
    socket.on('loanSimulation:created', handleSimulationSaved)

    return () => {
      socket.off('loanSimulation:saved', handleSimulationSaved)
      socket.off('loanSimulation:created', handleSimulationSaved)
    }
  }, [socket, isConnected])

  const loadSavedSimulations = async () => {
    try {
      setLoading(true)
      const response = await authenticatedAxios.get('/loans/simulations?saved=true')
      if (response.data.success) {
        setSavedSimulations(response.data.data)
      }
    } catch (err) {
      console.error('Erreur chargement simulations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (simulation: any) => {
    setSavedSimulations(prev => [simulation, ...prev])
  }

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Calculatrice de prêt immobilier
            </h1>
            <p className="text-xl text-gray-600">
              Calculez vos mensualités et visualisez l'amortissement de votre prêt
            </p>
          </div>

          <LoanCalculator onSave={handleSave} showSaveButton={true} />

          {savedSimulations.length > 0 && (
            <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes simulations sauvegardées</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedSimulations.map((sim) => (
                  <div key={sim._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <h3 className="font-semibold text-gray-900 mb-2">{sim.title || 'Simulation de prêt'}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Montant: ${sim.loanAmount?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
                      <p>Mensualité: ${sim.monthlyPayment?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
                      <p>Taux: {sim.interestRate}%</p>
                      <p>Durée: {sim.loanDurationYears} ans</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/loans/simulations/${sim._id}`)}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                      >
                        Voir détails
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(sim.createdAt).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

