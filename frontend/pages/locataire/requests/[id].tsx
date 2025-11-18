import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage } from '@/utils/api'

interface Request {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  createdAt: string
  unit?: {
    _id: string
    unitNumber: string
    type: string
    size: number
    bedrooms: number
    rentPrice?: number
    salePrice?: number
  }
  building?: {
    _id: string
    name: string
    address?: {
      street: string
      city: string
      province: string
      postalCode: string
    }
  }
  generatedDocuments?: Array<{
    _id: string
    type: string
    filename: string
    signed: boolean
    signedAt?: string
    signedBy?: {
      firstName: string
      lastName: string
    }
  }>
  initialPayment?: {
    amount: number
    status: string
    paidAt?: string
    paymentMethod?: string
  }
  approvedAt?: string
  approvedBy?: {
    firstName: string
    lastName: string
  }
}

export default function LocataireRequestDetail() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingDoc, setSigningDoc] = useState(false)

  useEffect(() => {
    if (id) {
      const cleanId = String(id).trim().replace(/\s+/g, '')
      if (cleanId && cleanId.length > 0) {
        loadRequest(cleanId)
      } else {
        setError('ID de la demande invalide')
        setLoading(false)
      }
    }
  }, [id])

  const loadRequest = async (requestId?: string) => {
    try {
      const token = getAuthToken()
      const requestIdToUse = requestId || request?._id || id
      
      if (!requestIdToUse) {
        setError('ID de la demande manquant')
        setLoading(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestIdToUse)
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.status === 200 && response.data && response.data.success) {
        setRequest(response.data.data)
        setError('')
      } else {
        setError(response.data?.message || 'Demande non trouvée')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Erreur lors du chargement de la demande')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSignDocument = async (docId: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir signer ce document électroniquement ? Cette action est irréversible.')) {
      return
    }

    setSigningDoc(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setSigningDoc(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, `documents/${docId}/sign`)
      const response = await axios.put(url, {}, getApiConfig(token))

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        } else {
          loadRequest()
        }
        
        showSuccessMessage('Document signé avec succès ! L\'administrateur a été notifié.')
        // Recharger après un court délai
        setTimeout(() => {
          loadRequest()
        }, 1000)
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors de la signature du document.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors de la signature du document. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setSigningDoc(false)
    }
  }

  const handleDownloadDocument = async (docId: string | number, filename: string) => {
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, `documents/${docId}/download`)
      const response = await axios.get(url, {
        ...getApiConfig(token),
        responseType: 'blob'
      })

      if (response.status === 200 && response.data) {
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = blobUrl
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(blobUrl)
      } else {
        showErrorMessage('Erreur lors du téléchargement du document')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Erreur lors du téléchargement du document')
      showErrorMessage(errorMessage)
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

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'location': 'Location',
      'achat': 'Achat',
      'maintenance': 'Maintenance',
      'service': 'Service',
      'reclamation': 'Réclamation',
      'autre': 'Autre'
    }
    return labels[type] || type
  }

  const formatAmount = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0'
    }
    return amount.toLocaleString('fr-CA')
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement de la demande...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  if (error || !request) {
    return (
      <ProtectedRoute requiredRoles={['locataire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Demande non trouvée</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cette demande n\'existe pas.'}</p>
              <Link href="/dashboard/locataire" className="btn-primary">
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  const hasUnsignedDocuments = request.generatedDocuments?.some(doc => !doc.signed) || false
  const allDocumentsSigned = request.generatedDocuments && request.generatedDocuments.length > 0 && 
                             request.generatedDocuments.every(doc => doc.signed)

  return (
    <ProtectedRoute requiredRoles={['locataire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/dashboard/locataire" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                  ← Retour au tableau de bord
                </Link>
                <h1 className="text-4xl font-bold mb-2">{request.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span 
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}
                  >
                    {getStatusLabel(request.status)}
                  </span>
                  <span className="text-gray-600 capitalize">Type: {getTypeLabel(request.type)}</span>
                  <span className="text-gray-600">Priorité: {request.priority}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contenu principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations de la demande */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-4">Informations de la demande</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{request.description}</p>
                  </div>
                  {request.unit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unité souhaitée</label>
                      <p className="text-gray-900">
                        Unité {request.unit.unitNumber} - {request.unit.type} - {request.unit.size} m²
                        {request.unit.rentPrice && ` - $${formatAmount(request.unit.rentPrice)}/mois`}
                        {request.unit.salePrice && ` - $${formatAmount(request.unit.salePrice)}`}
                      </p>
                    </div>
                  )}
                  {request.building && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Immeuble</label>
                      <p className="text-gray-900">
                        {request.building.name}
                        {request.building.address?.city && ` - ${request.building.address.city}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                    <p className="text-gray-900">{new Date(request.createdAt).toLocaleString('fr-CA')}</p>
                  </div>
                </div>
              </div>

              {/* Documents générés */}
              {request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Documents à signer</h2>
                  {hasUnsignedDocuments && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Vous devez signer tous les documents pour finaliser votre demande. Une fois signés, l'administrateur pourra attribuer l'unité.
                      </p>
                    </div>
                  )}
                  {allDocumentsSigned && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800">
                        ✅ Tous les documents ont été signés. L'administrateur va maintenant procéder à l'attribution de l'unité.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {request.generatedDocuments.map((doc, index) => (
                      <div key={doc._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">📄</span>
                            <div>
                              <p className="font-semibold">{doc.filename}</p>
                              <p className="text-sm text-gray-600">
                                {doc.type === 'bail' ? 'Bail de location' : 
                                 doc.type === 'contrat_vente' ? 'Contrat de vente' : 
                                 'Document'}
                              </p>
                            </div>
                          </div>
                          {doc.signed ? (
                            <div className="mt-2">
                              <p className="text-xs text-green-600">
                                ✅ Signé le {doc.signedAt ? new Date(doc.signedAt).toLocaleDateString('fr-CA') : ''}
                                {doc.signedBy && ` par ${doc.signedBy.firstName} ${doc.signedBy.lastName}`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-yellow-600 mt-2">⏳ En attente de signature</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadDocument(doc._id || index, doc.filename)}
                            className="btn-secondary text-sm"
                          >
                            📥 Télécharger
                          </button>
                          {!doc.signed && (
                            <button
                              onClick={() => handleSignDocument(doc._id || index)}
                              disabled={signingDoc}
                              className="btn-primary text-sm"
                            >
                              {signingDoc ? 'Signature...' : '✍️ Signer'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paiement initial */}
              {request.initialPayment && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Paiement initial</h2>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                      <p className="text-lg font-bold">${formatAmount(request.initialPayment?.amount)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        request.initialPayment.status === 'paye' ? 'bg-green-100 text-green-800' :
                        request.initialPayment.status === 'en_retard' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.initialPayment.status === 'paye' ? 'Payé' :
                         request.initialPayment.status === 'en_retard' ? 'En retard' :
                         'En attente'}
                      </span>
                    </div>
                    {request.initialPayment.paidAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
                        <p className="text-sm text-gray-600">{new Date(request.initialPayment.paidAt).toLocaleString('fr-CA')}</p>
                      </div>
                    )}
                    {request.initialPayment.paymentMethod && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                        <p className="text-sm text-gray-600">{request.initialPayment.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Message de confirmation après acceptation */}
              {request.status === 'accepte' && request.approvedAt && (
                <div className="card p-6 bg-green-50 border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">✅</div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-2 text-green-800">Demande acceptée</h2>
                      <p className="text-sm text-green-700 mb-2">
                        Acceptée le {new Date(request.approvedAt).toLocaleString('fr-CA', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {request.approvedBy && (
                          <> par <span className="font-semibold">{request.approvedBy.firstName} {request.approvedBy.lastName}</span></>
                        )}
                      </p>
                      {request.generatedDocuments && request.generatedDocuments.length > 0 && (
                        <p className="text-sm text-green-700">
                          {request.generatedDocuments.length} document{request.generatedDocuments.length > 1 ? 's' : ''} généré{request.generatedDocuments.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {request.status === 'accepte' && hasUnsignedDocuments && (
                <div className="card p-6 bg-blue-50">
                  <h2 className="text-xl font-bold mb-4">Action requise</h2>
                  <p className="text-sm text-blue-800 mb-4">
                    Veuillez signer tous les documents ci-dessus pour finaliser votre demande. Une fois tous les documents signés, l'administrateur pourra procéder à l'attribution de l'unité.
                  </p>
                </div>
              )}

              {request.status === 'accepte' && allDocumentsSigned && (
                <div className="card p-6 bg-green-50">
                  <h2 className="text-xl font-bold mb-4">✅ Documents signés</h2>
                  <p className="text-sm text-green-800">
                    Tous vos documents ont été signés avec succès. L'administrateur va maintenant procéder à l'attribution de l'unité. Vous recevrez une notification une fois l'unité attribuée.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}
