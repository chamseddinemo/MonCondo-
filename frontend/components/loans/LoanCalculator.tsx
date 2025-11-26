import { useState, useEffect, useMemo } from 'react'
import { authenticatedAxios } from '../../utils/axiosInstances'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface LoanCalculatorProps {
  onSave?: (simulation: any) => void
  initialData?: any
  showSaveButton?: boolean
  readOnly?: boolean
}

interface LoanInputs {
  propertyAmount: number
  downPayment: number
  interestRate: number
  interestType: 'fixe' | 'variable'
  loanDurationMonths: number
  loanDurationYears: number
  additionalFees: {
    insurance: number
    taxes: number
    notary: number
    other: number
  }
  title?: string
  notes?: string
}

interface CalculationResult {
  loanAmount: number
  monthlyPayment: number
  totalInterest: number
  totalCost: number
  amortizationSchedule: Array<{
    month: number
    payment: number
    principal: number
    interest: number
    remainingBalance: number
  }>
  loanDurationYears: number
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function LoanCalculator({ 
  onSave, 
  initialData, 
  showSaveButton = true,
  readOnly = false 
}: LoanCalculatorProps) {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const [inputs, setInputs] = useState<LoanInputs>({
    propertyAmount: initialData?.propertyAmount || 500000,
    downPayment: initialData?.downPayment || 100000,
    interestRate: initialData?.interestRate || 3.5,
    interestType: initialData?.interestType || 'fixe',
    loanDurationMonths: initialData?.loanDurationMonths || 300,
    loanDurationYears: initialData?.loanDurationYears || 25,
    additionalFees: initialData?.additionalFees || {
      insurance: 0,
      taxes: 0,
      notary: 0,
      other: 0
    },
    title: initialData?.title || '',
    notes: initialData?.notes || ''
  })

  const [result, setResult] = useState<CalculationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSimulations, setSavedSimulations] = useState<any[]>([])
  const [showAmortizationTable, setShowAmortizationTable] = useState(false)

  // Calculer automatiquement quand les inputs changent
  useEffect(() => {
    if (inputs.propertyAmount > 0 && inputs.downPayment >= 0 && inputs.interestRate >= 0) {
      calculateLoan()
    }
  }, [inputs.propertyAmount, inputs.downPayment, inputs.interestRate, inputs.loanDurationMonths, inputs.additionalFees])

  // Synchroniser la durée en années et mois
  useEffect(() => {
    if (inputs.loanDurationYears) {
      setInputs(prev => ({ ...prev, loanDurationMonths: prev.loanDurationYears * 12 }))
    }
  }, [inputs.loanDurationYears])

  useEffect(() => {
    if (inputs.loanDurationMonths && !inputs.loanDurationYears) {
      setInputs(prev => ({ ...prev, loanDurationYears: Math.round((prev.loanDurationMonths / 12) * 100) / 100 }))
    }
  }, [inputs.loanDurationMonths])

  const calculateLoan = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await authenticatedAxios.post('/loans/calculate', {
        propertyAmount: inputs.propertyAmount,
        downPayment: inputs.downPayment,
        interestRate: inputs.interestRate,
        interestType: inputs.interestType,
        loanDurationMonths: inputs.loanDurationMonths,
        additionalFees: inputs.additionalFees
      })

      if (response.data.success) {
        setResult(response.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du calcul')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return

    try {
      setSaving(true)
      const response = await authenticatedAxios.post('/loans/simulations', {
        ...inputs,
        ...result,
        isSaved: true
      })

      if (response.data.success) {
        // Émettre un événement Socket.io pour synchronisation
        if (socket && isConnected) {
          socket.emit('loanSimulation:saved', {
            simulationId: response.data.data._id,
            userId: user?._id
          })
        }

        if (onSave) {
          onSave(response.data.data)
        }
        alert('Simulation sauvegardée avec succès!')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (readOnly) return
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  const handleFeeChange = (feeType: string, value: number) => {
    if (readOnly) return
    setInputs(prev => ({
      ...prev,
      additionalFees: {
        ...prev.additionalFees,
        [feeType]: value
      }
    }))
  }

  // Données pour les graphiques
  const chartData = useMemo(() => {
    if (!result?.amortizationSchedule) return []

    // Prendre un échantillon pour le graphique (tous les 12 mois)
    return result.amortizationSchedule
      .filter((_, index) => index % 12 === 0 || index === result.amortizationSchedule.length - 1)
      .map(item => ({
        mois: item.month,
        capital: item.principal,
        intérêts: item.interest,
        solde: item.remainingBalance
      }))
  }, [result])

  const pieData = useMemo(() => {
    if (!result) return []
    return [
      { name: 'Capital', value: result.loanAmount },
      { name: 'Intérêts', value: result.totalInterest },
      { name: 'Frais', value: Object.values(inputs.additionalFees).reduce((a, b) => a + b, 0) }
    ]
  }, [result, inputs.additionalFees])

  const exportToPDF = async () => {
    if (!result) {
      alert('Veuillez d\'abord calculer une simulation')
      return
    }
    
    try {
      // Si on a déjà une simulation sauvegardée, utiliser son ID
      let simId = initialData?._id
      
      // Sinon, créer une simulation temporaire pour l'export
      if (!simId) {
        const saveResponse = await authenticatedAxios.post('/loans/simulations', {
          ...inputs,
          ...result,
          isSaved: false,
          title: inputs.title || 'Export PDF'
        })
        if (saveResponse.data.success) {
          simId = saveResponse.data.data._id
        } else {
          throw new Error('Impossible de créer la simulation pour l\'export')
        }
      }
      
      if (simId) {
        const response = await authenticatedAxios.get(`/loans/simulations/${simId}/export/pdf`, {
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `simulation-pret-${new Date().toISOString().split('T')[0]}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
    } catch (err: any) {
      console.error('Erreur export PDF:', err)
      alert(err.response?.data?.message || 'Erreur lors de l\'export PDF')
    }
  }

  const exportToExcel = async () => {
    if (!result) {
      alert('Veuillez d\'abord calculer une simulation')
      return
    }
    
    try {
      // Si on a déjà une simulation sauvegardée, utiliser son ID
      let simId = initialData?._id
      
      // Sinon, créer une simulation temporaire pour l'export
      if (!simId) {
        const saveResponse = await authenticatedAxios.post('/loans/simulations', {
          ...inputs,
          ...result,
          isSaved: false,
          title: inputs.title || 'Export Excel'
        })
        if (saveResponse.data.success) {
          simId = saveResponse.data.data._id
        } else {
          throw new Error('Impossible de créer la simulation pour l\'export')
        }
      }
      
      if (simId) {
        const response = await authenticatedAxios.get(`/loans/simulations/${simId}/export/excel`, {
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `simulation-pret-${new Date().toISOString().split('T')[0]}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
    } catch (err: any) {
      console.error('Erreur export Excel:', err)
      alert(err.response?.data?.message || 'Erreur lors de l\'export Excel')
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de saisie */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Paramètres du prêt</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Montant du bien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant total du bien ($) <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-500" title="Montant total de la propriété à financer">
                ℹ️
              </span>
            </label>
            <input
              type="number"
              value={inputs.propertyAmount}
              onChange={(e) => handleInputChange('propertyAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              disabled={readOnly}
              min="0"
              step="1000"
            />
          </div>

          {/* Apport initial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apport initial / Mise de fonds ($) <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-500" title="Montant que vous apportez personnellement">
                ℹ️
              </span>
            </label>
            <input
              type="number"
              value={inputs.downPayment}
              onChange={(e) => handleInputChange('downPayment', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              disabled={readOnly}
              min="0"
              step="1000"
            />
            {inputs.downPayment > 0 && inputs.propertyAmount > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                {((inputs.downPayment / inputs.propertyAmount) * 100).toFixed(2)}% du montant total
              </p>
            )}
          </div>

          {/* Taux d'intérêt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux d'intérêt annuel (%) <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-500" title="Taux d'intérêt annuel du prêt">
                ℹ️
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputs.interestRate}
                onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={readOnly}
                min="0"
                max="100"
                step="0.01"
              />
              <select
                value={inputs.interestType}
                onChange={(e) => handleInputChange('interestType', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={readOnly}
              >
                <option value="fixe">Fixe</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>

          {/* Durée du prêt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée du prêt <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-500" title="Durée totale du prêt">
                ℹ️
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={inputs.loanDurationYears}
                onChange={(e) => handleInputChange('loanDurationYears', parseFloat(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={readOnly}
                min="1"
                max="50"
                step="1"
                placeholder="Années"
              />
              <span className="self-center text-gray-500">ans</span>
              <span className="self-center text-gray-400">ou</span>
              <input
                type="number"
                value={inputs.loanDurationMonths}
                onChange={(e) => handleInputChange('loanDurationMonths', parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={readOnly}
                min="1"
                max="600"
                step="1"
                placeholder="Mois"
              />
              <span className="self-center text-gray-500">mois</span>
            </div>
          </div>
        </div>

        {/* Frais annexes */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Frais annexes (optionnel)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'insurance', label: 'Assurance ($)' },
              { key: 'taxes', label: 'Taxes ($)' },
              { key: 'notary', label: 'Notaire ($)' },
              { key: 'other', label: 'Autres frais ($)' }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <input
                  type="number"
                  value={inputs.additionalFees[key as keyof typeof inputs.additionalFees]}
                  onChange={(e) => handleFeeChange(key, parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  disabled={readOnly}
                  min="0"
                  step="100"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Titre et notes */}
        {showSaveButton && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la simulation</label>
                <input
                  type="text"
                  value={inputs.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Achat maison principale"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={inputs.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Notes personnelles..."
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Résultats */}
      {result && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-6">Résumé de la simulation</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <p className="text-sm opacity-90 mb-1">Montant du prêt</p>
                <p className="text-2xl font-bold">${result.loanAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <p className="text-sm opacity-90 mb-1">Mensualité</p>
                <p className="text-2xl font-bold">${result.monthlyPayment.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <p className="text-sm opacity-90 mb-1">Intérêts totaux</p>
                <p className="text-2xl font-bold">${result.totalInterest.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <p className="text-sm opacity-90 mb-1">Coût total</p>
                <p className="text-2xl font-bold">${result.totalCost.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique capital/intérêts */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition Capital / Intérêts</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="capital" fill="#2563EB" name="Capital" />
                  <Bar dataKey="intérêts" fill="#10B981" name="Intérêts" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique circulaire */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition du coût total</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graphique solde restant */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du solde restant</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="solde" stroke="#EF4444" strokeWidth={2} name="Solde restant ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau d'amortissement */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tableau d'amortissement</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAmortizationTable(!showAmortizationTable)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {showAmortizationTable ? 'Masquer' : 'Afficher'}
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📊 Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  📄 PDF
                </button>
              </div>
            </div>

            {showAmortizationTable && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mensualité</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capital</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Intérêts</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde restant</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.amortizationSchedule.slice(0, 120).map((row, index) => (
                      <tr key={index} className={index % 12 === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.month}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${row.payment.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${row.principal.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${row.interest.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ${row.remainingBalance.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {result.amortizationSchedule.length > 120 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-sm text-gray-500 text-center">
                          ... et {result.amortizationSchedule.length - 120} mois supplémentaires
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          {showSaveButton && !readOnly && (
            <div className="flex justify-end gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : '💾 Sauvegarder la simulation'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

