import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { authenticatedAxios } from '../../../utils/axiosInstances'

interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province: string
    postalCode: string
    country?: string
  }
  totalUnits: number
  yearBuilt?: number
  isActive: boolean
  admin?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
  updatedAt?: string
}

export default function EditBuilding() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [building, setBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      province: '',
      postalCode: ''
    },
    yearBuilt: '',
    isActive: true
  })

  useEffect(() => {
    if (id) {
      loadBuilding()
    }
  }, [id])

  const loadBuilding = async () => {
    try {
      // Utiliser authenticatedAxios pour uniformiser les appels API
      const response = await authenticatedAxios.get(`/buildings/${id}`)
      
      if (response.data && response.data.success) {
        const buildingData = response.data.data
        setBuilding(buildingData)
        setFormData({
          name: buildingData.name,
          address: {
            street: buildingData.address?.street || '',
            city: buildingData.address?.city || '',
            province: buildingData.address?.province || '',
            postalCode: buildingData.address?.postalCode || ''
          },
          yearBuilt: buildingData.yearBuilt?.toString() || '',
          isActive: buildingData.isActive !== false
        })
        setError('')
      } else {
        setError('Immeuble non trouvé')
      }
    } catch (error: any) {
      console.error('[EditBuilding] Erreur chargement immeuble:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      setError(error.response?.data?.message || 'Erreur lors du chargement de l\'immeuble')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = {
        name: formData.name,
        address: formData.address,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        isActive: formData.isActive
      }

      // Utiliser authenticatedAxios pour uniformiser les appels API
      const response = await authenticatedAxios.put(`/buildings/${id}`, data)
      
      if (response.data && response.data.success) {
        // Rediriger vers la page de détails après sauvegarde réussie
        router.push(`/admin/units?building=${id}`)
      } else {
        setError('Erreur lors de la modification de l\'immeuble')
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde immeuble:', error)
      setError(error.response?.data?.message || 'Erreur lors de la modification de l\'immeuble')
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
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  if (error && !building) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Immeuble non trouvé</h1>
              <p className="text-xl text-gray-600 mb-8">{error}</p>
              <Link href="/admin/units" className="btn-primary">
                Retour à la liste des immeubles
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
            <Link href={`/admin/units?building=${id}`} className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
              ← Retour aux détails de l'immeuble
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Modifier l'immeuble</h1>
                {building && (
                  <p className="text-gray-600">{building.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <div className="max-w-3xl">
            <div className="card p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'immeuble *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: Résidence Les Jardins"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse (Rue) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: 123 Rue Principale"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Montréal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.province}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, province: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: QC"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, postalCode: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: H1A 1A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année de construction
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: 2015"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                    Immeuble actif
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Sauvegarde...
                      </span>
                    ) : (
                      'Enregistrer les modifications'
                    )}
                  </button>
                  <Link
                    href={`/buildings/${id}`}
                    className="btn-secondary flex-1 text-center"
                  >
                    Annuler
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

