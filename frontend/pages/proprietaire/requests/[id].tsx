import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { usePayment } from '../../../contexts/PaymentContext'
import { buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage } from '@/utils/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

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
  createdBy?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  generatedDocuments?: Array<{
    _id?: string
    type: string
    filename: string
    path: string
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

export default function ProprietaireRequestDetail() {
  const { user: authUser } = useAuth()
  const { refreshPaymentStatus, getPaymentStatus } = usePayment()
  const router = useRouter()
  const { id } = router.query
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingDoc, setSigningDoc] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // États pour le module de paiement inline
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')

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
      // Charger le statut depuis le contexte
      getPaymentStatus(request._id).then(status => {
        if (status && request && request.initialPayment) {
          // Mettre à jour le statut local si différent
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
                console.log('[AUTO-RELOAD] Statut du paiement mis à jour:', status.paymentStatus)
              }
            }
          })
        })
      }
    }, 5000) // Vérifier toutes les 5 secondes

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
        setPaymentSuccess(true)
        setShowPaymentOptions(false)
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
      const response = await axios.get(url, {
        ...getApiConfig(token),
        timeout: 10000 // 10 secondes de timeout
      })
      
      if (response.status === 200 && response.data && response.data.success) {
        setRequest(response.data.data)
        setError('')
      } else {
        setError(response.data?.message || 'Demande non trouvée')
      }
    } catch (error: any) {
      let errorMessage = 'Erreur lors du chargement de la demande'
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré sur le port 5000.'
      } else if (error.request && !error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 5000) et votre connexion internet.'
      } else if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.'
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else if (error.response.status === 403) {
          errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.'
        } else if (error.response.status === 404) {
          errorMessage = 'Demande non trouvée. Elle a peut-être été supprimée.'
        } else {
          errorMessage = error.response?.data?.message || getErrorMessage(error, errorMessage)
        }
      } else {
        errorMessage = getErrorMessage(error, errorMessage)
      }
      
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
        
        showSuccessMessage('Document signé avec succès ! L\'administrateur et le demandeur ont été notifiés.')
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

  const handlePayNow = () => {
    if (!request || !request.initialPayment || !request.unit) {
      showErrorMessage('Impossible d\'effectuer le paiement. Données manquantes.')
      return
    }

    // Vérifier que le montant est valide
    if (!request.initialPayment.amount || request.initialPayment.amount <= 0) {
      showErrorMessage('Le montant du paiement est invalide.')
      return
    }

    // Afficher les options de paiement sur la même page
    setShowPaymentOptions(true)
    setPaymentSuccess(false)
    setSelectedPaymentMethod('')
    setError('')
  }

  const handlePayment = async (method: string) => {
    if (!request || !request.initialPayment || !request.unit || !authUser) {
      showErrorMessage('Impossible d\'effectuer le paiement. Données manquantes.')
      return
    }

    // Vérifier le rôle de l'utilisateur avant d'appeler l'API
    const userRole = authUser.role
    const allowedRoles = ['admin', 'proprietaire', 'locataire']
    
    console.log('[PAYMENT] Vérification du rôle:', {
      userRole,
      allowedRoles,
      isAllowed: allowedRoles.includes(userRole)
    })

    if (!allowedRoles.includes(userRole)) {
      const errorMsg = `Accès refusé. Votre rôle (${userRole}) n'a pas les permissions nécessaires pour effectuer un paiement. Rôles autorisés: ${allowedRoles.join(', ')}.`
      console.error('[PAYMENT] ❌ Rôle non autorisé:', userRole)
      showErrorMessage(errorMsg)
      setError(errorMsg)
      return
    }

    // Vérification supplémentaire pour propriétaire : s'assurer qu'il est propriétaire de l'unité
    if (userRole === 'proprietaire' && request.unit) {
      // Note: La vérification complète se fait côté backend
      // Ici on fait juste une vérification basique côté frontend
      console.log('[PAYMENT] ✅ Propriétaire - Vérification côté backend nécessaire')
    }

    // Vérification supplémentaire pour locataire : s'assurer qu'il est locataire de l'unité
    if (userRole === 'locataire' && request.unit) {
      // Note: La vérification complète se fait côté backend
      console.log('[PAYMENT] ✅ Locataire - Vérification côté backend nécessaire')
    }

    setProcessingPayment(true)
    setSelectedPaymentMethod(method)
    setError('')

    try {
      const token = getAuthToken()
      if (!token) {
        showErrorMessage('Session expirée. Veuillez vous reconnecter.')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      console.log('[PAYMENT] Token trouvé, préparation de la requête...')

      // Créer le paiement avec les données requises
      // Format: { amount, method, unitId, userId depuis token }
      const unitId = request.unit._id || request.unit
      const buildingId = request.building?._id || request.building
      
      const paymentData = {
        amount: request.initialPayment.amount,
        method: method,
        unit: unitId,
        building: buildingId,
        type: request.type === 'achat' ? 'achat' : 'loyer',
        description: `Paiement initial - ${request.type === 'achat' ? 'Commission de vente' : 'Premier loyer'} - ${request.title}`,
        dueDate: new Date(),
        requestId: request._id,
        payerId: authUser._id // userId depuis le token (via authUser)
      }

      console.log('[PAYMENT] ========== Création du paiement ==========')
      console.log('[PAYMENT] Token présent:', !!token)
      console.log('[PAYMENT] Token (premiers 20 chars):', token ? token.substring(0, 20) + '...' : 'N/A')
      console.log('[PAYMENT] User ID:', authUser._id)
      console.log('[PAYMENT] User Role:', authUser.role)
      console.log('[PAYMENT] Payment Data:', JSON.stringify(paymentData, null, 2))
      console.log('[PAYMENT] =========================================')

      // Vérifier que le token est bien dans les headers
      const apiConfig = getApiConfig(token)
      console.log('[PAYMENT] Configuration API:', {
        hasToken: !!token,
        hasAuthHeader: !!apiConfig.headers?.Authorization,
        authHeaderPrefix: apiConfig.headers?.Authorization?.substring(0, 7) || 'N/A',
        url: `${API_URL}/payments`
      })

      const createResponse = await axios.post(
        `${API_URL}/payments`,
        paymentData,
        {
          ...apiConfig,
          timeout: 15000
        }
      )

      console.log('[PAYMENT] Réponse reçue:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        success: createResponse.data?.success,
        message: createResponse.data?.message
      })

      // D'abord, initier le paiement initial via l'endpoint dédié
      let paymentId = null
      
      try {
        console.log('[PAYMENT] Initiation du paiement initial pour la demande:', request._id)
        const initiateResponse = await axios.post(
          `${API_URL}/requests/${request._id}/payment/initiate`,
          {},
          {
            ...apiConfig,
            timeout: 15000
          }
        )
        
        if (initiateResponse.data?.success && initiateResponse.data.data?._id) {
          paymentId = initiateResponse.data.data._id
          console.log('[PAYMENT] ✅ Paiement initialisé avec ID:', paymentId)
        } else {
          // Si l'initiation échoue, essayer de créer directement
          console.log('[PAYMENT] Initiation échouée, création directe du paiement')
          const createResponse = await axios.post(
            `${API_URL}/payments`,
            paymentData,
            {
              ...apiConfig,
              timeout: 15000
            }
          )
          
          if (createResponse.status === 201 || createResponse.data?.success) {
            paymentId = createResponse.data?.data?._id
            console.log('[PAYMENT] ✅ Paiement créé directement avec ID:', paymentId)
          }
        }
      } catch (initiateErr: any) {
        console.error('[PAYMENT] Erreur initiation, tentative création directe:', initiateErr)
        // Si l'initiation échoue, essayer de créer directement
        try {
          const createResponse = await axios.post(
            `${API_URL}/payments`,
            paymentData,
            {
              ...apiConfig,
              timeout: 15000
            }
          )
          
          if (createResponse.status === 201 || createResponse.data?.success) {
            paymentId = createResponse.data?.data?._id
            console.log('[PAYMENT] ✅ Paiement créé directement avec ID:', paymentId)
          }
        } catch (createErr: any) {
          throw new Error(createErr.response?.data?.message || 'Erreur lors de la création du paiement')
        }
      }
      
      // Si on a un paymentId, traiter le paiement
      if (paymentId) {
        try {
          console.log('[PAYMENT] Traitement du paiement:', paymentId)
          
          // Traiter le paiement avec la méthode choisie
          const processResponse = await axios.post(
            `${API_URL}/payments/${paymentId}/process`,
            {
              paymentMethod: method === 'carte_credit' || method === 'stripe' ? 'carte_credit' : method === 'interac' ? 'interac' : 'virement',
              transactionId: `PAY-${Date.now()}-${method}`,
              notes: `Paiement initial ${method} effectué le ${new Date().toLocaleString('fr-FR')}`
            },
            {
              ...apiConfig,
              timeout: 15000
            }
          )
          
          if (processResponse.data?.success) {
            console.log('[PAYMENT] ✅ Paiement traité avec succès')
            
            // Attendre un peu pour que le backend synchronise
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            // Recharger le statut plusieurs fois pour s'assurer de la synchronisation
            let retries = 0
            const maxRetries = 5
            let paymentStatusUpdated = false
            
            while (retries < maxRetries && !paymentStatusUpdated) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              try {
                const paymentStatusResponse = await axios.get(
                  `${API_URL}/requests/${request._id}/payment-status`,
                  {
                    ...apiConfig,
                    timeout: 10000
                  }
                )
                
                if (paymentStatusResponse.data?.success) {
                  const paymentStatus = paymentStatusResponse.data.data
                  
                  // Mettre à jour le statut local
                  if (paymentStatus.initialPayment) {
                    setRequest(prev => prev ? {
                      ...prev,
                      initialPayment: paymentStatus.initialPayment
                    } : null)
                    
                    // Si le paiement est payé, arrêter les tentatives
                    if (paymentStatus.initialPayment.status === 'paye') {
                      console.log('[PAYMENT] ✅ Statut synchronisé: paye (tentative', retries + 1, ')')
                      paymentStatusUpdated = true
                      break
                    }
                  }
                }
              } catch (statusErr) {
                console.error('[PAYMENT] Erreur récupération statut (tentative', retries + 1, '):', statusErr)
              }
              
              retries++
            }
            
            // Recharger complètement la demande une dernière fois
            await loadRequest()
            
            // Recharger le statut via le PaymentContext
            await refreshPaymentStatus(request._id)
            
            // Attendre un peu pour que le backend synchronise
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Recharger à nouveau pour être sûr
            await refreshPaymentStatus(request._id)
            
            // Émettre un événement pour notifier les autres composants
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('paymentProcessed', {
                detail: { requestId: request._id, paymentId: paymentId }
              }));
              // Émettre aussi un événement de synchronisation globale
              window.dispatchEvent(new CustomEvent('paymentListRefresh', {
                detail: { paymentId: paymentId, status: 'paye' }
              }));
            }
            
            // Recharger complètement la demande
            await loadRequest()
            
            // Forcer un rechargement supplémentaire après 2 secondes
            setTimeout(async () => {
              await refreshPaymentStatus(request._id)
              await loadRequest()
            }, 2000)
            
            showSuccessMessage('Paiement effectué avec succès!')
            setPaymentSuccess(true)
            setShowPaymentOptions(false)
            setProcessingPayment(false)
          } else {
            throw new Error(processResponse.data?.message || 'Erreur lors du traitement du paiement')
          }
        } catch (processErr: any) {
          console.error('[PAYMENT] Erreur traitement paiement:', processErr)
          showErrorMessage(processErr.response?.data?.message || 'Erreur lors du traitement du paiement')
          setError(processErr.response?.data?.message || 'Erreur lors du traitement du paiement')
          setProcessingPayment(false)
          // Recharger quand même la demande pour voir l'état actuel
          await loadRequest()
        }
      } else {
        throw new Error('Impossible de créer le paiement. Veuillez réessayer.')
      }
    } catch (err: any) {
      console.error('[PAYMENT] ❌ Erreur création paiement:', err)
      console.error('[PAYMENT] Détails erreur:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })
      
      let errorMessage = 'Erreur lors de la création du paiement.'
      
      if (err.response?.status === 403) {
        const backendMessage = err.response.data?.message || 'Accès refusé'
        const backendCode = err.response.data?.code || 'FORBIDDEN'
        
        // Messages d'erreur spécifiques selon le code
        if (backendCode === 'NOT_UNIT_OWNER') {
          errorMessage = 'Accès refusé. Vous n\'êtes pas propriétaire de cette unité.'
        } else if (backendCode === 'NOT_UNIT_TENANT') {
          errorMessage = 'Accès refusé. Vous n\'êtes pas locataire de cette unité.'
        } else if (backendCode === 'INVALID_ROLE') {
          errorMessage = `Accès refusé. Votre rôle (${err.response.data?.userRole || 'inconnu'}) n'a pas les permissions nécessaires.`
        } else {
          errorMessage = backendMessage
        }
        
        console.error('[PAYMENT] ❌ Erreur 403:', {
          code: backendCode,
          message: backendMessage,
          userRole: authUser?.role
        })
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.'
        setTimeout(() => router.push('/login'), 2000)
      } else if (err.response?.status === 404) {
        errorMessage = err.response.data?.message || 'Unité non trouvée.'
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Données invalides. Vérifiez les informations.'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      showErrorMessage(errorMessage)
      setProcessingPayment(false)
      setShowPaymentOptions(false)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-CA', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['proprietaire']}>
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
      <ProtectedRoute requiredRoles={['proprietaire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Demande non trouvée</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cette demande n\'existe pas.'}</p>
              <Link href="/dashboard/proprietaire" className="btn-primary">
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
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/dashboard/proprietaire" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
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
                    <p className="text-gray-900">{request.description || 'Aucune description'}</p>
                  </div>
                  
                  {request.unit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unité souhaitée</label>
                      <p className="text-gray-900">
                        Unité {request.unit.unitNumber} - {request.unit.type} - {request.unit.size} m²
                        {request.unit.rentPrice && ` - ${formatAmount(request.unit.rentPrice)} $/mois`}
                        {request.unit.salePrice && ` - ${formatAmount(request.unit.salePrice)} $`}
                      </p>
                    </div>
                  )}

                  {request.building && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Immeuble</label>
                      <p className="text-gray-900">
                        {request.building.name}
                        {request.building.address && (
                          <span className="text-gray-600">
                            {' - '}{request.building.address.city}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                    <p className="text-gray-900">{formatDate(request.createdAt)}</p>
                  </div>

                  {request.approvedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acceptée le</label>
                      <p className="text-gray-900">{formatDate(request.approvedAt)}</p>
                      {request.approvedBy && (
                        <p className="text-sm text-gray-600">par {request.approvedBy.firstName} {request.approvedBy.lastName}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Profil du demandeur */}
              {request.createdBy && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Profil du demandeur</h2>
                  <div className="space-y-3">
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
                  </div>
                </div>
              )}

              {/* Documents générés */}
              {request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Documents générés</h2>
                  
                  {hasUnsignedDocuments && (
                    <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                      <p className="text-orange-800 font-semibold">
                        ⚠️ Vous avez des documents en attente de signature
                      </p>
                    </div>
                  )}

                  {allDocumentsSigned && (
                    <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-green-800 font-semibold">
                        ✅ Tous les documents ont été signés
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {request.generatedDocuments.map((doc, index) => {
                      const docId = doc._id || index
                      const docTypeLabel = doc.type === 'bail' ? 'Bail' : doc.type === 'contrat_vente' ? 'Contrat de vente' : 'Document'
                      
                      return (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{doc.filename}</h3>
                              <p className="text-sm text-gray-600">{docTypeLabel}</p>
                              {doc.signed && doc.signedAt && (
                                <p className="text-sm text-green-600 mt-1">
                                  ✅ Signé le {formatDate(doc.signedAt)}
                                  {doc.signedBy && ` par ${doc.signedBy.firstName} ${doc.signedBy.lastName}`}
                                </p>
                              )}
                              {!doc.signed && (
                                <p className="text-sm text-orange-600 mt-1">⏳ En attente de signature</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleDownloadDocument(docId, doc.filename)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                              >
                                📥 Télécharger
                              </button>
                              {!doc.signed && (
                                <button
                                  onClick={() => handleSignDocument(docId)}
                                  disabled={signingDoc}
                                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {signingDoc ? '⏳ Signature...' : '✍️ Signer'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Paiement initial */}
              {request.initialPayment && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Paiement initial</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                      <p className="text-lg font-bold">${formatAmount(request.initialPayment.amount)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qui doit payer</label>
                      <p className="text-gray-900">
                        {request.type === 'achat' 
                          ? 'Vous (propriétaire) devez payer ce montant à l\'administrateur'
                          : 'Le demandeur (locataire) doit payer ce montant'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.initialPayment && request.initialPayment.status === 'paye' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.initialPayment && request.initialPayment.status === 'paye' ? 'Payé' : 'En attente'}
                      </span>
                    </div>
                    {request.initialPayment.paidAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
                        <p className="text-gray-900">{formatDate(request.initialPayment.paidAt)}</p>
                      </div>
                    )}
                    {request.initialPayment.paymentMethod && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                        <p className="text-gray-900">{request.initialPayment.paymentMethod}</p>
                      </div>
                    )}
                    {request.type === 'achat' && request.initialPayment && request.initialPayment.status !== 'paye' && !showPaymentOptions && !paymentSuccess && (
                      <div className="mt-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                        <p className="text-sm text-orange-800 font-semibold mb-2">
                          ⚠️ Action requise
                        </p>
                        <p className="text-xs text-orange-700 mb-3">
                          Pour finaliser la vente et permettre à l'administrateur d'attribuer l'unité au demandeur, 
                          vous devez effectuer le paiement initial de ${formatAmount(request.initialPayment.amount)} à l'administrateur.
                        </p>
                        <button
                          onClick={handlePayNow}
                          disabled={processingPayment}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          💳 Payer maintenant
                        </button>
                      </div>
                    )}

                    {/* Module de paiement inline */}
                    {showPaymentOptions && request.initialPayment && request.initialPayment.status !== 'paye' && !paymentSuccess && (
                      <div className="mt-4 p-4 bg-white border-2 border-primary-200 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Choisissez votre méthode de paiement</h3>
                          <button
                            onClick={() => {
                              setShowPaymentOptions(false)
                              setError('')
                            }}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                            disabled={processingPayment}
                          >
                            ×
                          </button>
                        </div>

                        {paymentSuccess ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div className="text-4xl mb-2">✅</div>
                            <p className="text-green-800 font-semibold">Paiement réussi!</p>
                            <p className="text-green-700 text-sm mt-2">Le statut sera mis à jour dans quelques instants...</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Interac */}
                            <button
                              onClick={() => handlePayment('interac')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-3xl">🏦</span>
                              <span className="font-semibold text-sm">Interac</span>
                            </button>

                            {/* Stripe */}
                            <button
                              onClick={() => handlePayment('stripe')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-3xl">💳</span>
                              <span className="font-semibold text-sm">Stripe</span>
                            </button>

                            {/* Carte de crédit */}
                            <button
                              onClick={() => handlePayment('carte_credit')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-3xl">💳</span>
                              <span className="font-semibold text-sm">Carte de crédit</span>
                            </button>

                            {/* Mastercard */}
                            <button
                              onClick={() => handlePayment('mastercard')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-2xl font-bold text-red-600">MC</span>
                              <span className="font-semibold text-sm">Mastercard</span>
                            </button>

                            {/* Visa */}
                            <button
                              onClick={() => handlePayment('visa')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-2xl font-bold text-blue-600">VISA</span>
                              <span className="font-semibold text-sm">Visa</span>
                            </button>

                            {/* PayPal */}
                            <button
                              onClick={() => handlePayment('paypal')}
                              disabled={processingPayment}
                              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-2xl font-bold text-blue-500">PP</span>
                              <span className="font-semibold text-sm">PayPal</span>
                            </button>
                          </div>
                        )}

                        {processingPayment && (
                          <div className="mt-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                            <span className="text-gray-600">Traitement du paiement en cours...</span>
                          </div>
                        )}

                        {error && (
                          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                            <p className="text-red-700 text-sm">{error}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-xl font-bold mb-4">Actions disponibles</h3>
                <div className="space-y-3">
                  {hasUnsignedDocuments && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-semibold mb-2">
                        ⚠️ Action requise
                      </p>
                      <p className="text-xs text-orange-700">
                        Vous devez signer tous les documents avant que l'unité puisse être attribuée au demandeur.
                      </p>
                    </div>
                  )}
                  
                  {allDocumentsSigned && request.initialPayment && request.initialPayment.status !== 'paye' && !paymentSuccess && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-semibold mb-2">
                        💳 Paiement en attente
                      </p>
                      <p className="text-xs text-blue-700 mb-3">
                        {request.type === 'achat' 
                          ? `Vous devez effectuer le paiement initial de ${formatAmount(request.initialPayment.amount)} à l'administrateur pour finaliser la vente.`
                          : `Le demandeur (locataire) doit effectuer le paiement initial de ${formatAmount(request.initialPayment.amount)}.`
                        }
                      </p>
                      {request.type === 'achat' && (
                        <button
                          onClick={handlePayNow}
                          disabled={processingPayment}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingPayment ? '⏳ Redirection...' : '💳 Payer maintenant'}
                        </button>
                      )}
                    </div>
                  )}

                  {allDocumentsSigned && request.initialPayment && request.initialPayment.status === 'paye' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-semibold mb-2">
                        ✅ Prêt pour attribution
                      </p>
                      <p className="text-xs text-green-700">
                        Tous les documents sont signés et le paiement a été reçu. L'administrateur peut maintenant attribuer l'unité.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal supprimé - remplacé par module inline dans la section Paiement initial */}

      <Footer />
    </ProtectedRoute>
  )
}

