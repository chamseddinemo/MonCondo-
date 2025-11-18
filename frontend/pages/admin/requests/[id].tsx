import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { usePayment } from '../../../contexts/PaymentContext'
import { buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage, API_URL } from '@/utils/api'

interface Request {
  _id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  createdAt: string
  createdBy?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    monthlyIncome?: number
    numberOfChildren?: number
    creditScore?: number
    reputation?: string
    previousTenant?: boolean
    employmentProof?: {
      filename: string
      path: string
    }
    identityDocument?: {
      filename: string
      path: string
    }
  }
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
    address: {
      street: string
      city: string
      province: string
      postalCode: string
    }
  }
  rejectionReason?: string
  approvedBy?: {
    firstName: string
    lastName: string
  }
  approvedAt?: string
  rejectedBy?: {
    firstName: string
    lastName: string
  }
  rejectedAt?: string
  generatedDocuments?: Array<{
    type: string
    filename: string
    signed: boolean
    signedAt?: string
  }>
  initialPayment?: {
    amount: number
    status: string
    paidAt?: string
    paymentMethod?: string
  }
  adminNotes?: Array<{
    note: string
    addedBy: {
      firstName: string
      lastName: string
    }
    addedAt: string
  }>
  statusHistory?: Array<{
    status: string
    changedBy: {
      firstName: string
      lastName: string
    }
    changedAt: string
    comment?: string
  }>
}

export default function RequestDetail() {
  const { user: authUser } = useAuth()
  const { refreshPaymentStatus, getPaymentStatus } = usePayment()
  const router = useRouter()
  const { id } = router.query
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [signingDoc, setSigningDoc] = useState(false)
  const [validatingPayment, setValidatingPayment] = useState(false)
  const [assigningUnit, setAssigningUnit] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

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

  // Utiliser le PaymentContext pour synchroniser le statut
  useEffect(() => {
    if (request?._id) {
      getPaymentStatus(request._id).then(status => {
        if (status && request && request.initialPayment) {
          if (request.initialPayment.status !== status.paymentStatus) {
            setRequest(prev => prev ? {
              ...prev,
              initialPayment: {
                ...prev.initialPayment,
                status: status.paymentStatus,
                paidAt: status.paymentDate || prev.initialPayment.paidAt,
                paymentMethod: status.paymentMethod || prev.initialPayment.paymentMethod,
                transactionId: status.transactionId || prev.initialPayment.transactionId
              }
            } : null)
          }
        }
      })
    }
  }, [request?._id, getPaymentStatus])

  // Recharger automatiquement le statut toutes les 5 secondes si le paiement est en attente
  useEffect(() => {
    if (!request || !request.initialPayment || request.initialPayment.status === 'paye') {
      return
    }

    const interval = setInterval(() => {
      if (request?._id) {
        refreshPaymentStatus(request._id).then(() => {
          getPaymentStatus(request._id).then(status => {
            if (status && request && request.initialPayment) {
              if (request.initialPayment.status !== status.paymentStatus) {
                setRequest(prev => prev ? {
                  ...prev,
                  initialPayment: {
                    ...prev.initialPayment,
                    status: status.paymentStatus,
                    paidAt: status.paymentDate || prev.initialPayment.paidAt,
                    paymentMethod: status.paymentMethod || prev.initialPayment.paymentMethod,
                    transactionId: status.transactionId || prev.initialPayment.transactionId
                  }
                } : null)
                console.log('[ADMIN AUTO-RELOAD] Statut du paiement mis à jour:', status.paymentStatus)
              }
            }
          })
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [request?._id, request?.initialPayment?.status, refreshPaymentStatus, getPaymentStatus])

  // Écouter les événements de mise à jour de paiement
  useEffect(() => {
    const handlePaymentUpdate = (event: any) => {
      const { requestId, status } = event.detail || {};
      if (requestId === request?._id && status) {
        setRequest(prev => prev ? {
          ...prev,
          initialPayment: {
            ...prev.initialPayment,
            status: status.paymentStatus,
            paidAt: status.paymentDate || prev.initialPayment.paidAt,
            paymentMethod: status.paymentMethod || prev.initialPayment.paymentMethod,
            transactionId: status.transactionId || prev.initialPayment.transactionId
          }
        } : null)
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('paymentStatusUpdated', handlePaymentUpdate);
      return () => {
        window.removeEventListener('paymentStatusUpdated', handlePaymentUpdate);
      };
    }
  }, [request?._id])

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

  const handleAccept = async () => {
    // Validation
    if (!request) {
      showErrorMessage('Impossible de traiter la demande. Veuillez recharger la page.')
      return
    }

    if (request.status !== 'en_attente') {
      showErrorMessage(`Cette demande a déjà été traitée (statut: ${getStatusLabel(request.status)}).`)
      return
    }

    // Confirmation
    const confirmMessage = `Êtes-vous sûr de vouloir accepter cette demande de ${getTypeLabel(request.type)} ?\n\nCette action va:\n- Générer les documents nécessaires\n- Envoyer une notification au demandeur\n- Initialiser le processus de paiement`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setActionLoading(true)
    
    try {
      const token = getAuthToken()
      if (!token) {
        showErrorMessage('Vous devez être connecté pour accepter une demande. Veuillez vous reconnecter.')
        setActionLoading(false)
        return
      }

      const requestId = request._id || id
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setActionLoading(false)
        return
      }

      // Construire l'URL de manière explicite pour éviter tout problème
      const cleanRequestId = String(requestId).trim().replace(/\s+/g, '')
      
      // Vérifier que l'ID est valide (ObjectId MongoDB)
      if (!/^[a-f0-9]{24}$/i.test(cleanRequestId)) {
        showErrorMessage('ID de la demande invalide.')
        setActionLoading(false)
        return
      }
      
      // Construire l'URL manuellement pour garantir la bonne structure
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const baseUrl = apiBaseUrl.replace(/\/+$/, '') // Enlever les slashes finaux
      const url = `${baseUrl}/requests/${cleanRequestId}/accept`
      
      // Log pour debug
      console.log('[ACCEPT] URL construite:', url)
      console.log('[ACCEPT] Request ID:', cleanRequestId)
      console.log('[ACCEPT] Token présent:', !!token)

      // Envoyer la requête
      try {
        console.log('[ACCEPT] Envoi de la requête PUT à:', url)
        console.log('[ACCEPT] Headers:', getApiConfig(token).headers)
        
        const response = await axios.put(url, {}, getApiConfig(token))
        
        console.log('[ACCEPT] Réponse reçue:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        })

        // Traiter la réponse
        if (response.status === 200 && response.data && response.data.success) {
          // Mettre à jour l'état local immédiatement
          if (response.data.data) {
            setRequest(response.data.data)
          }
          
          // Afficher le message de succès
          showSuccessMessage(response.data.message || 'Demande acceptée avec succès !')
          
          // Recharger les données après un court délai
          setTimeout(() => {
            loadRequest()
          }, 500)
        } else {
          console.error('[ACCEPT] Réponse inattendue:', response)
          showErrorMessage(response.data?.message || 'Une erreur est survenue lors de l\'acceptation de la demande.')
        }
      } catch (axiosError: any) {
        // Log détaillé de l'erreur
        console.error('[ACCEPT] Erreur axios:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers
          }
        })
        
        // Gestion d'erreur propre
        if (axiosError.response?.status === 404) {
          console.error('[ACCEPT] ❌ 404 - Route non trouvée')
          console.error('[ACCEPT]    URL demandée:', url)
          console.error('[ACCEPT]    Vérifiez que le serveur backend est démarré et que la route existe')
          showErrorMessage('Route non trouvée. Vérifiez que le serveur backend est démarré et que la route PUT /api/requests/:id/accept existe.')
        } else {
          const errorMessage = axiosError.response?.data?.message || 
                              getErrorMessage(axiosError, 'Impossible d\'accepter la demande pour le moment. Veuillez réessayer plus tard.')
          showErrorMessage(errorMessage)
        }
      }
    } catch (error: any) {
      // Erreur lors de la construction de l'URL ou autre
      console.error('[ACCEPT] Erreur générale:', error)
      showErrorMessage('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showErrorMessage('Veuillez fournir une raison de refus')
      return
    }

    setActionLoading(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setActionLoading(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, 'reject')
      const response = await axios.put(url, { reason: rejectionReason }, getApiConfig(token))

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        }
        
        showSuccessMessage(response.data.message || 'Demande refusée avec succès.')
        setShowRejectModal(false)
        setRejectionReason('')
        
        setTimeout(() => {
          loadRequest()
        }, 500)
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors du refus de la demande.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors du refus de la demande. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!adminNote.trim()) {
      showErrorMessage('Veuillez entrer une note')
      return
    }

    setActionLoading(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setActionLoading(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, 'notes')
      const response = await axios.post(
        url,
        { note: adminNote },
        getApiConfig(token)
      )

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        } else {
          loadRequest()
        }
        
        showSuccessMessage('Note ajoutée avec succès')
        setAdminNote('')
        setShowNoteModal(false)
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors de l\'ajout de la note.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors de l\'ajout de la note. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSignDocument = async (docId: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir signer ce document électroniquement ?')) {
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
        
        showSuccessMessage(response.data.message || 'Document signé avec succès !')
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

  const handleValidatePayment = async () => {
    if (!paymentMethod.trim()) {
      showErrorMessage('Veuillez sélectionner une méthode de paiement')
      return
    }

    setValidatingPayment(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setValidatingPayment(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, 'payment/validate')
      const data = {
        paymentMethod: paymentMethod,
        transactionId: transactionId || undefined
      }
      
      const response = await axios.put(url, data, getApiConfig(token))

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        } else {
          loadRequest()
        }
        
        showSuccessMessage(response.data.message || 'Paiement initial validé avec succès !')
        setShowPaymentModal(false)
        setPaymentMethod('')
        setTransactionId('')
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors de la validation du paiement.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors de la validation du paiement. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setValidatingPayment(false)
    }
  }

  const handleAssignUnit = async () => {
    if (!confirm('Êtes-vous sûr de vouloir attribuer cette unité au demandeur ? Cette action est irréversible.')) {
      return
    }

    setAssigningUnit(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || id
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setAssigningUnit(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, 'assign-unit')
      const response = await axios.put(url, {}, getApiConfig(token))

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        } else {
          loadRequest()
        }
        
        showSuccessMessage(response.data.message || 'Unité attribuée avec succès ! La demande est maintenant terminée.')
        setShowAssignModal(false)
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors de l\'attribution de l\'unité.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors de l\'attribution de l\'unité. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setAssigningUnit(false)
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

  const getReputationLabel = (reputation?: string) => {
    const labels: { [key: string]: string } = {
      'excellent': 'Excellent',
      'bon': 'Bon',
      'moyen': 'Moyen',
      'faible': 'Faible'
    }
    return labels[reputation || 'moyen'] || 'Moyen'
  }

  const getReputationColor = (reputation?: string) => {
    const colors: { [key: string]: string } = {
      'excellent': 'bg-green-100 text-green-800',
      'bon': 'bg-blue-100 text-blue-800',
      'moyen': 'bg-yellow-100 text-yellow-800',
      'faible': 'bg-red-100 text-red-800'
    }
    return colors[reputation || 'moyen'] || 'bg-gray-100 text-gray-800'
  }

  const formatAmount = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0'
    }
    return amount.toLocaleString('fr-CA')
  }

  const formatBuildingAddress = (building?: Request['building']): string => {
    if (!building) return ''
    const parts = [building.name]
    if (building.address?.city) {
      parts.push(building.address.city)
    }
    return parts.join(' - ')
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
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
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Demande non trouvée</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cette demande n\'existe pas.'}</p>
              <Link href="/admin/requests" className="btn-primary">
                Retour aux demandes
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
            <div className="flex items-center justify-between">
              <div>
                <Link href="/admin/requests" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                  ← Retour aux demandes
                </Link>
                <h1 className="text-4xl font-bold mb-2">{request.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span 
                    key={`status-badge-${request.status}-${request._id}`}
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)} transition-colors duration-300`}
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
                        {request.unit.rentPrice && ` - $${request.unit.rentPrice}/mois`}
                        {request.unit.salePrice && ` - $${request.unit.salePrice}`}
                      </p>
                    </div>
                  )}
                  {request.building && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Immeuble</label>
                      <p className="text-gray-900">{formatBuildingAddress(request.building)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                    <p className="text-gray-900">{new Date(request.createdAt).toLocaleString('fr-CA')}</p>
                  </div>
                </div>
              </div>

              {/* Profil du demandeur */}
              {request.createdBy && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Profil du demandeur</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                      <p className="text-gray-900">{request.createdBy.firstName} {request.createdBy.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{request.createdBy.email}</p>
                    </div>
                    {request.createdBy.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <p className="text-gray-900">{request.createdBy.phone}</p>
                      </div>
                    )}
                    {request.createdBy.monthlyIncome !== undefined && request.createdBy.monthlyIncome !== null && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Revenu mensuel</label>
                        <p className="text-gray-900">${request.createdBy.monthlyIncome.toLocaleString()}</p>
                      </div>
                    )}
                    {request.createdBy.numberOfChildren !== undefined && request.createdBy.numberOfChildren !== null && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'enfants</label>
                        <p className="text-gray-900">{request.createdBy.numberOfChildren}</p>
                      </div>
                    )}
                    {request.createdBy.creditScore !== undefined && request.createdBy.creditScore !== null && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cote de crédit</label>
                        <p className="text-gray-900">{request.createdBy.creditScore}</p>
                      </div>
                    )}
                    {request.createdBy.reputation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Réputation</label>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReputationColor(request.createdBy.reputation)}`}>
                          {getReputationLabel(request.createdBy.reputation)}
                        </span>
                      </div>
                    )}
                    {request.createdBy.previousTenant !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ancien locataire</label>
                        <p className="text-gray-900">{request.createdBy.previousTenant ? 'Oui' : 'Non'}</p>
                      </div>
                    )}
                  </div>
                  {(request.createdBy.employmentProof || request.createdBy.identityDocument) && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-semibold mb-2">Documents</h3>
                      <div className="space-y-2">
                        {request.createdBy.employmentProof && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preuve d'emploi</label>
                            <a href={`${API_URL}/documents/${request.createdBy.employmentProof.path}`} target="_blank" className="text-primary-600 hover:text-primary-700">
                              {request.createdBy.employmentProof.filename}
                            </a>
                          </div>
                        )}
                        {request.createdBy.identityDocument && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pièce d'identité</label>
                            <a href={`${API_URL}/documents/${request.createdBy.identityDocument.path}`} target="_blank" className="text-primary-600 hover:text-primary-700">
                              {request.createdBy.identityDocument.filename}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Historique du statut */}
              {request.statusHistory && request.statusHistory.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Historique du statut</h2>
                  <div className="space-y-3">
                    {request.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(history.status)}`}>
                              {getStatusLabel(history.status)}
                            </span>
                            <span className="text-sm text-gray-600">
                              par {history.changedBy.firstName} {history.changedBy.lastName}
                            </span>
                          </div>
                          {history.comment && (
                            <p className="text-sm text-gray-700 mt-1">{history.comment}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(history.changedAt).toLocaleString('fr-CA')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commentaires internes */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Commentaires internes</h2>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="btn-secondary text-sm"
                  >
                    + Ajouter une note
                  </button>
                </div>
                {request.adminNotes && request.adminNotes.length > 0 ? (
                  <div className="space-y-3">
                    {request.adminNotes.map((note, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 mb-2">{note.note}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Par {note.addedBy.firstName} {note.addedBy.lastName}</span>
                          <span>{new Date(note.addedAt).toLocaleString('fr-CA')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun commentaire interne</p>
                )}
              </div>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              {/* Actions */}
              {request.status === 'en_attente' && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleAccept}
                      disabled={actionLoading}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
                    >
                      {actionLoading ? (
                        <span className="flex items-center justify-center">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Traitement en cours...
                        </span>
                      ) : (
                        '✅ Accepter la demande'
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="w-full btn-secondary bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
                    >
                      ❌ Refuser la demande
                    </button>
                  </div>
                </div>
              )}
              
              {/* Message de confirmation après acceptation */}
              {request.status === 'accepte' && request.approvedAt && (
                <div className="card p-6 bg-green-50 border-2 border-green-200 animate-fade-in">
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
                      {request.initialPayment && request.initialPayment.amount > 0 && (
                        <p className="text-sm text-green-700 mt-1">
                          Paiement initial requis: ${formatAmount(request.initialPayment.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents générés */}
              {request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Documents générés</h2>
                  <div className="space-y-2">
                    {request.generatedDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold">{doc.filename}</p>
                          <p className="text-sm text-gray-600">
                            {doc.type === 'bail' ? 'Bail' : doc.type === 'contrat_vente' ? 'Contrat de vente' : 'Autre'}
                          </p>
                          {doc.signed && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ Signé le {new Date(doc.signedAt!).toLocaleDateString('fr-CA')} par {doc.signedBy?.firstName} {doc.signedBy?.lastName}
                            </p>
                          )}
                          {!doc.signed && (
                            <p className="text-xs text-yellow-600 mt-1">⏳ En attente de signature</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadDocument(doc._id || index, doc.filename)}
                            className="btn-secondary text-xs"
                          >
                            📥 Télécharger
                          </button>
                          {!doc.signed && (
                            <button
                              onClick={() => handleSignDocument(doc._id || index)}
                              disabled={signingDoc}
                              className="btn-primary text-xs"
                            >
                              ✍️ Signer
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
                    {request.initialPayment.status === 'en_attente' && request.status === 'accepte' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full mt-4 btn-primary"
                      >
                        ✅ Valider le paiement
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Actions pour demande acceptée */}
              {request.status === 'accepte' && (
                <div className="card p-6 bg-blue-50">
                  <h2 className="text-xl font-bold mb-4">Actions disponibles</h2>
                  <div className="space-y-3">
                    {request.generatedDocuments && request.generatedDocuments.some((doc: any) => !doc.signed) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 mb-2">
                          ⚠️ Tous les documents doivent être signés avant d'attribuer l'unité
                        </p>
                      </div>
                    )}
                    {request.initialPayment && request.initialPayment.status !== 'paye' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 mb-2">
                          ⚠️ Le paiement initial doit être validé avant d'attribuer l'unité
                        </p>
                      </div>
                    )}
                    {request.generatedDocuments && 
                     request.generatedDocuments.length > 0 &&
                     request.generatedDocuments.every((doc: any) => doc.signed) &&
                     request.initialPayment &&
                     request.initialPayment.status === 'paye' && (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={assigningUnit}
                        className="w-full btn-primary"
                      >
                        {assigningUnit ? 'Attribution...' : '🏡 Attribuer l\'unité'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Informations d'approbation/refus */}
              {request.approvedBy && (
                <div className="card p-6 bg-green-50">
                  <h2 className="text-xl font-bold mb-2 text-green-800">✅ Acceptée</h2>
                  <p className="text-sm text-gray-700">
                    Par {request.approvedBy.firstName} {request.approvedBy.lastName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Le {new Date(request.approvedAt!).toLocaleString('fr-CA')}
                  </p>
                </div>
              )}

              {request.rejectedBy && (
                <div className="card p-6 bg-red-50">
                  <h2 className="text-xl font-bold mb-2 text-red-800">❌ Refusée</h2>
                  <p className="text-sm text-gray-700">
                    Par {request.rejectedBy.firstName} {request.rejectedBy.lastName}
                  </p>
                  {request.rejectionReason && (
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Raison:</strong> {request.rejectionReason}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Le {new Date(request.rejectedAt!).toLocaleString('fr-CA')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de refus */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Refuser la demande</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison du refus <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Expliquez la raison du refus..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 btn-secondary bg-red-500 hover:bg-red-600 text-white"
              >
                {actionLoading ? 'Traitement...' : 'Confirmer le refus'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de note */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Ajouter une note</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Ajoutez un commentaire interne..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddNote}
                disabled={actionLoading || !adminNote.trim()}
                className="flex-1 btn-primary"
              >
                {actionLoading ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                onClick={() => {
                  setShowNoteModal(false)
                  setAdminNote('')
                }}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validation de paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Valider le paiement initial</h2>
            <div className="space-y-4">
              {request.initialPayment && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Montant à valider</p>
                  <p className="text-2xl font-bold">${formatAmount(request.initialPayment?.amount)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de paiement <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Sélectionner une méthode</option>
                  <option value="carte_credit">Carte de crédit</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="stripe">Stripe</option>
                  <option value="moneris">Moneris</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de transaction (optionnel)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="ID de transaction..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleValidatePayment}
                disabled={validatingPayment || !paymentMethod.trim()}
                className="flex-1 btn-primary"
              >
                {validatingPayment ? 'Validation...' : 'Valider le paiement'}
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentMethod('')
                  setTransactionId('')
                }}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'attribution d'unité */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Attribuer l'unité</h2>
            <div className="space-y-4">
              {request.unit && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Unité à attribuer</p>
                  <p className="text-lg font-bold">Unité {request.unit.unitNumber}</p>
                  <p className="text-sm text-gray-600">{request.building?.name}</p>
                </div>
              )}
              {request.createdBy && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Attribuer à</p>
                  <p className="text-lg font-bold">{request.createdBy.firstName} {request.createdBy.lastName}</p>
                  <p className="text-sm text-gray-600">{request.createdBy.email}</p>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Cette action est irréversible. L'unité sera attribuée au demandeur et la demande sera finalisée.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAssignUnit}
                disabled={assigningUnit}
                className="flex-1 btn-primary"
              >
                {assigningUnit ? 'Attribution...' : 'Confirmer l\'attribution'}
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </ProtectedRoute>
  )
}

