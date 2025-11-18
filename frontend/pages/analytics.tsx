import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'
import { useRealEstateData } from '../hooks/useRealEstateData'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface AnalyticsData {
  stats: {
    totalUnits: number
    availableUnits: number
    rentedUnits: number
    occupancyRate: number
    monthlyRevenue: number
    receivedThisMonth: number
    overdueCount: number
    alertsCount: number
  }
  monthlyPayments: Array<{
    month: string
    received: number
    pending: number
  }>
  unitPerformance: Array<{
    unitNumber: string
    revenue: number
    occupancyRate: number
  }>
  paymentStatus: {
    paid: number
    pending: number
    overdue: number
  }
}

export default function Analytics() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  // Utiliser le hook centralisé pour toutes les données immobilières
  const { 
    stats: globalStats, 
    loading: statsLoading, 
    refreshStats 
  } = useRealEstateData({
    autoRefresh: true,
    refreshInterval: 30000 // Rafraîchir toutes les 30 secondes
  })
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'proprietaire' || user?.role === 'admin')) {
      loadAnalyticsData()
    }
  }, [isAuthenticated, user, dateRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      
      // Charger les données du dashboard selon le rôle
      const endpoint = user?.role === 'admin' 
        ? `${API_URL}/admin/dashboard`
        : `${API_URL}/proprietaire/dashboard`
      
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        const dashboardData = response.data.data
        
        // Rafraîchir les stats globales d'abord
        await refreshStats()
        
        // Utiliser les stats globales pour les unités et bâtiments (synchronisées)
        const stats = {
          ...dashboardData.stats,
          // Utiliser les stats globales synchronisées (prioritaires)
          totalUnits: globalStats.totalUnits > 0 ? globalStats.totalUnits : (dashboardData.stats?.totalUnits ?? 0),
          availableUnits: globalStats.availableUnits > 0 ? globalStats.availableUnits : (dashboardData.stats?.availableUnits ?? 0),
          rentedUnits: globalStats.rentedUnits > 0 ? globalStats.rentedUnits : (dashboardData.stats?.rentedUnits ?? 0),
          occupancyRate: globalStats.occupancyRate > 0 ? globalStats.occupancyRate : (dashboardData.stats?.occupancyRate ?? 0),
          monthlyRevenue: globalStats.monthlyRevenue > 0 ? globalStats.monthlyRevenue : (dashboardData.stats?.monthlyRevenue ?? 0)
        }
        
        // Générer des données mensuelles pour les graphiques (simulation)
        const monthlyPayments = generateMonthlyData({ stats })
        const unitPerformance = generateUnitPerformance({ stats })
        const paymentStatus = generatePaymentStatus({ stats })

        setAnalyticsData({
          stats,
          monthlyPayments,
          unitPerformance,
          paymentStatus
        })
      }
    } catch (error) {
      console.error('Erreur chargement données analytiques:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyData = (dashboardData: any) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const currentMonth = new Date().getMonth()
    
    return months.map((month, index) => {
      const isCurrentMonth = index === currentMonth
      return {
        month,
        received: isCurrentMonth ? (dashboardData.stats?.receivedThisMonth || 0) : Math.random() * 5000 + 1000,
        pending: isCurrentMonth ? (dashboardData.stats?.monthlyRevenue - (dashboardData.stats?.receivedThisMonth || 0)) : Math.random() * 2000 + 500
      }
    })
  }

  const generateUnitPerformance = (dashboardData: any) => {
    const units = dashboardData.unitsWithDetails || []
    return units.slice(0, 5).map((unit: any) => ({
      unitNumber: unit.unitNumber,
      revenue: unit.paidThisMonth || unit.rentPrice || 0,
      occupancyRate: unit.status === 'loue' ? 100 : 0
    }))
  }

  const generatePaymentStatus = (dashboardData: any) => {
    return {
      paid: dashboardData.stats?.receivedThisMonth || 0,
      pending: (dashboardData.stats?.monthlyRevenue || 0) - (dashboardData.stats?.receivedThisMonth || 0),
      overdue: dashboardData.stats?.overdueCount || 0
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const exportToPDF = () => {
    window.print()
  }

  const exportToExcel = () => {
    // Créer un CSV simple
    if (!analyticsData) return

    const csvContent = [
      ['Rapport Analytique - MonCondo+'],
      ['Date', new Date().toLocaleDateString('fr-CA')],
      [''],
      ['Statistiques Générales'],
      ['Total d\'unités', analyticsData.stats.totalUnits],
      ['Unités disponibles', analyticsData.stats.availableUnits],
      ['Unités louées', analyticsData.stats.rentedUnits],
      ['Taux d\'occupation', `${analyticsData.stats.occupancyRate}%`],
      ['Revenus mensuels estimés', formatCurrency(analyticsData.stats.monthlyRevenue)],
      ['Revenus reçus ce mois', formatCurrency(analyticsData.stats.receivedThisMonth)],
      [''],
      ['Paiements Mensuels'],
      ['Mois', 'Reçu', 'En attente'],
      ...analyticsData.monthlyPayments.map(p => [p.month, formatCurrency(p.received), formatCurrency(p.pending)])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rapport-analytique-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!isAuthenticated || (user?.role !== 'proprietaire' && user?.role !== 'admin')) {
    return (
      <ProtectedRoute requiredRoles={['proprietaire', 'admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600">Cette page est réservée aux administrateurs et propriétaires.</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['proprietaire', 'admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-800 to-purple-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">Tableaux de Bord Analytiques</h1>
                <p className="text-xl text-gray-300">
                  Visualisez vos revenus, dépenses et indicateurs clés à travers des graphiques interactifs
                </p>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={exportToPDF}
                  className="bg-white text-purple-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="bg-white text-purple-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  📊 Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Filtres */}
          <div className="card p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'month' | 'quarter' | 'year')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Dernière mise à jour: {new Date().toLocaleString('fr-CA')}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : analyticsData ? (
            <>
              {/* Statistiques principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="text-sm mb-2 opacity-90">Revenus mensuels</div>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(analyticsData.stats.monthlyRevenue)}</div>
                  <div className="text-sm opacity-80">{formatCurrency(analyticsData.stats.receivedThisMonth)} reçus</div>
                </div>
                <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <div className="text-sm mb-2 opacity-90">Taux d'occupation</div>
                  <div className="text-3xl font-bold mb-1">{analyticsData.stats.occupancyRate}%</div>
                  <div className="text-sm opacity-80">{analyticsData.stats.rentedUnits} / {analyticsData.stats.totalUnits} unités</div>
                </div>
                <div className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <div className="text-sm mb-2 opacity-90">Paiements en attente</div>
                  <div className="text-3xl font-bold mb-1">{formatCurrency(analyticsData.stats.monthlyRevenue - analyticsData.stats.receivedThisMonth)}</div>
                  <div className="text-sm opacity-80">{analyticsData.stats.overdueCount} en retard</div>
                </div>
                <div className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <div className="text-sm mb-2 opacity-90">Demandes actives</div>
                  <div className="text-3xl font-bold mb-1">{analyticsData.stats.totalUnits}</div>
                  <div className="text-sm opacity-80">{analyticsData.stats.availableUnits} disponibles</div>
                </div>
              </div>

              {/* Graphique des paiements mensuels */}
              <div className="card p-6 mb-8">
                <h2 className="text-2xl font-bold mb-6">Évolution des Paiements Mensuels</h2>
                <div className="relative h-64">
                  <BarChart data={analyticsData.monthlyPayments} />
                </div>
              </div>

              {/* Graphique en secteurs - Statut des paiements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-6">Statut des Paiements</h2>
                  <div className="relative h-64">
                    <PieChart data={analyticsData.paymentStatus} />
                  </div>
                </div>

                {/* Performance par unité */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-6">Performance par Unité</h2>
                  <div className="space-y-4">
                    {analyticsData.unitPerformance.map((unit, index) => (
                      <div key={index} className="border-l-4 border-purple-500 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Unité {unit.unitNumber}</h3>
                          <span className="text-purple-600 font-bold">{formatCurrency(unit.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${unit.occupancyRate}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-600">Taux d'occupation: {unit.occupancyRate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tableau détaillé */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-6">Rapport Détaillé</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En attente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analyticsData.monthlyPayments.map((payment, index) => {
                        const total = payment.received + payment.pending
                        const rate = total > 0 ? Math.round((payment.received / total) * 100) : 0
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{payment.month}</td>
                            <td className="px-4 py-3 text-green-600">{formatCurrency(payment.received)}</td>
                            <td className="px-4 py-3 text-orange-600">{formatCurrency(payment.pending)}</td>
                            <td className="px-4 py-3 font-semibold">{formatCurrency(total)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                rate >= 80 ? 'bg-green-100 text-green-800' :
                                rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-2">Aucune donnée disponible</h3>
              <p className="text-gray-600">Impossible de charger les données analytiques.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

// Composant de graphique en barres simple
function BarChart({ data }: { data: Array<{ month: string; received: number; pending: number }> }) {
  const maxValue = Math.max(...data.map(d => d.received + d.pending))

  return (
    <div className="flex items-end justify-between h-full gap-2">
      {data.map((item, index) => {
        const receivedHeight = (item.received / maxValue) * 100
        const pendingHeight = (item.pending / maxValue) * 100
        const totalHeight = receivedHeight + pendingHeight

        return (
          <div key={index} className="flex-1 flex flex-col items-center group">
            <div className="relative w-full h-full flex flex-col justify-end" style={{ height: '200px' }}>
              <div className="flex flex-col items-center w-full">
                <div
                  className="w-full bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 cursor-pointer"
                  style={{ height: `${receivedHeight}%` }}
                  title={`Reçu: ${item.received.toLocaleString()} $`}
                ></div>
                <div
                  className="w-full bg-orange-500 transition-all duration-500 hover:bg-orange-600 cursor-pointer"
                  style={{ height: `${pendingHeight}%` }}
                  title={`En attente: ${item.pending.toLocaleString()} $`}
                ></div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600 font-medium">{item.month}</div>
            <div className="mt-1 text-xs text-gray-400 hidden group-hover:block">
              {(item.received + item.pending).toLocaleString()} $
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Composant de graphique en secteurs simple
function PieChart({ data }: { data: { paid: number; pending: number; overdue: number } }) {
  const total = data.paid + data.pending + data.overdue
  const paidPercent = total > 0 ? Math.round((data.paid / total) * 100) : 0
  const pendingPercent = total > 0 ? Math.round((data.pending / total) * 100) : 0
  const overduePercent = total > 0 ? Math.round((data.overdue / total) * 100) : 0

  return (
    <div className="flex items-center justify-center h-full">
      <div className="relative w-48 h-48">
        <svg className="w-48 h-48 transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
          />
          {paidPercent > 0 && (
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="#10b981"
              strokeWidth="16"
              strokeDasharray={`${(paidPercent / 100) * 502.4} 502.4`}
              strokeDashoffset="0"
            />
          )}
          {pendingPercent > 0 && (
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="16"
              strokeDasharray={`${(pendingPercent / 100) * 502.4} 502.4`}
              strokeDashoffset={`-${(paidPercent / 100) * 502.4}`}
            />
          )}
          {overduePercent > 0 && (
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="#ef4444"
              strokeWidth="16"
              strokeDasharray={`${(overduePercent / 100) * 502.4} 502.4`}
              strokeDashoffset={`-${((paidPercent + pendingPercent) / 100) * 502.4}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{total > 0 ? paidPercent : 0}%</div>
            <div className="text-sm text-gray-600">Payé</div>
          </div>
        </div>
      </div>
      <div className="ml-8 space-y-3">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span className="text-sm">Payé: {paidPercent}%</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
          <span className="text-sm">En attente: {pendingPercent}%</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
          <span className="text-sm">En retard: {overduePercent}%</span>
        </div>
      </div>
    </div>
  )
}



