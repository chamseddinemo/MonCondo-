import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import LoanCalculator from '../../components/loans/LoanCalculator'
import { useAuth } from '../../contexts/AuthContext'
import { authenticatedAxios } from '../../utils/axiosInstances'

export default function LoanCalculatorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [savedSimulations, setSavedSimulations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'locataire') {
      router.push('/dashboard')
      return
    }

    loadSavedSimulations()
  }, [user, router])

  const loadSavedSimulations = async () => {
    try {
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

  if (user?.role === 'locataire') {
    return null
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'proprietaire', 'visiteur']}>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Simulations sauvegardées</h2>
              <div className="space-y-4">
                {savedSimulations.map((sim) => (
                  <div key={sim._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{sim.title || 'Simulation de prêt'}</h3>
                        <p className="text-sm text-gray-600">
                          Mensualité: ${sim.monthlyPayment?.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(sim.createdAt).toLocaleDateString('fr-CA')}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/loans/simulations/${sim._id}`)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Voir
                      </button>
                    </div>
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

