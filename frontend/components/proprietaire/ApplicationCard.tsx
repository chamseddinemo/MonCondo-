import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Application {
  _id: string
  title: string
  description: string
  type: 'location' | 'achat'
  status: string
  createdAt: string
  createdBy: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  unit: {
    _id: string
    unitNumber: string
  }
  building?: {
    name: string
  }
}

interface ApplicationCardProps {
  application: Application
  onUpdate?: () => void
}

export default function ApplicationCard({ application, onUpdate }: ApplicationCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleAccept = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir accepter la candidature de ${application.createdBy.firstName} ${application.createdBy.lastName} ?`)) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      
      // Mettre à jour le statut de la demande
      await axios.put(
        `${API_URL}/requests/${application._id}`,
        { 
          status: 'accepte',
          statusComment: 'Candidature acceptée par le propriétaire. Le locataire sera assigné automatiquement.'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      // Assigner le locataire à l'unité
      await axios.put(
        `${API_URL}/units/${application.unit._id}/assign-tenant`,
        {
          locataireId: application.createdBy._id,
          rentAmount: undefined, // Sera défini par le propriétaire
          contractStartDate: new Date(),
          contractEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      alert('✅ Candidature acceptée ! Le locataire a été assigné et les documents ont été générés.')
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Erreur acceptation candidature:', error)
      alert(error.response?.data?.message || 'Erreur lors de l\'acceptation de la candidature')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Raison du refus (optionnel):')
    if (reason === null) return // Utilisateur a annulé

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      
      await axios.put(
        `${API_URL}/requests/${application._id}`,
        { 
          status: 'refuse',
          statusComment: reason || 'Candidature refusée par le propriétaire'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      alert('❌ Candidature refusée. Une notification a été envoyée au candidat.')
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Erreur refus candidature:', error)
      alert(error.response?.data?.message || 'Erreur lors du refus de la candidature')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border-l-4 border-blue-500 p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏠</span>
              <h3 className="font-semibold text-lg">{application.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                application.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                application.status === 'accepte' ? 'bg-green-100 text-green-800' :
                application.status === 'refuse' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {application.status === 'en_attente' ? 'En attente' :
                 application.status === 'accepte' ? 'Acceptée' :
                 application.status === 'refuse' ? 'Refusée' :
                 application.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-2">
              <p><span className="font-semibold">Candidat:</span> {application.createdBy.firstName} {application.createdBy.lastName}</p>
              <p><span className="font-semibold">Email:</span> {application.createdBy.email}</p>
              {application.createdBy.phone && (
                <p><span className="font-semibold">Téléphone:</span> {application.createdBy.phone}</p>
              )}
              <p><span className="font-semibold">Unité:</span> {application.unit.unitNumber}</p>
              <p><span className="font-semibold">Type:</span> {application.type === 'location' ? 'Location' : 'Achat'}</p>
            </div>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{application.description}</p>
            <p className="text-xs text-gray-500">
              {new Date(application.createdAt).toLocaleDateString('fr-CA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="ml-4 flex flex-col gap-2">
            <button
              onClick={() => setShowDetails(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Détails
            </button>
            {application.status === 'en_attente' && (
              <>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {loading ? '...' : '✅ Accepter'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {loading ? '...' : '❌ Refuser'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal détails */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold">Détails de la candidature</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold mb-2">Informations du candidat</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Nom:</span> {application.createdBy.firstName} {application.createdBy.lastName}</p>
                  <p><span className="font-semibold">Email:</span> {application.createdBy.email}</p>
                  {application.createdBy.phone && (
                    <p><span className="font-semibold">Téléphone:</span> {application.createdBy.phone}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold mb-2">Informations de la demande</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Type:</span> {application.type === 'location' ? 'Location' : 'Achat'}</p>
                  <p><span className="font-semibold">Unité:</span> {application.unit.unitNumber}</p>
                  {application.building && (
                    <p><span className="font-semibold">Immeuble:</span> {application.building.name}</p>
                  )}
                  <p><span className="font-semibold">Date:</span> {new Date(application.createdAt).toLocaleDateString('fr-CA')}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{application.description}</p>
              </div>

              {application.status === 'en_attente' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Traitement...' : '✅ Accepter la candidature'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Traitement...' : '❌ Refuser'}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowDetails(false)}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

