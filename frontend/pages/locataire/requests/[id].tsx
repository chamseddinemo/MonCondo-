import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { useGlobalSync } from '../../../hooks/useGlobalSync'
import { useSocket } from '../../../contexts/SocketContext'
import PaymentMethodSelector from '../../../components/payments/PaymentMethodSelector'
import StripePaymentForm from '../../../components/payments/StripePaymentForm'
import { buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage } from '@/utils/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

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
  payments?: Array<{
    _id: string
    amount: number
    status: string
    type: string
    description?: string
    dueDate?: string
    createdAt: string
    paidAt?: string
    paymentMethod?: string
  }>
  createdBy?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    role?: string
  }
  approvedAt?: string
  approvedBy?: {
    firstName: string
    lastName: string
  }
}

export default function LocataireRequestDetail() {
  const { user: authUser } = useAuth()
  const { socket, isConnected } = useSocket()
  const router = useRouter()
  const { id } = router.query
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signingDoc, setSigningDoc] = useState(false)
  
  // États pour le paiement intégré
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [interacBank, setInteracBank] = useState<string>('')
  const [interacContactMethod, setInteracContactMethod] = useState<'email' | 'phone'>('email')

  const loadRequest = async (requestId?: string) => {
    try {
      // Vérifier l'authentification avant de charger
      const token = getAuthToken()
      if (!token) {
        console.log('[LOCATAIRE REQUEST] ❌ Aucun token d\'authentification, redirection vers /login')
        setLoading(false)
        // Ne pas rediriger ici, laisser ProtectedRoute gérer
        return
      }

      const requestIdToUse = requestId || request?._id || (Array.isArray(id) ? id[0] : id)
      
      if (!requestIdToUse) {
        setError('ID de la demande manquant')
        setLoading(false)
        return
      }
      
      // Convertir en string pour éviter les erreurs TypeScript
      const cleanRequestId = String(requestIdToUse).trim()
      const url = buildApiUrlWithId('requests', cleanRequestId)
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.status === 200 && response.data && response.data.success) {
        const loadedRequest = response.data.data
        
        // Normaliser les statuts des paiements pour garantir la cohérence
        if (loadedRequest.payments && Array.isArray(loadedRequest.payments)) {
          loadedRequest.payments = loadedRequest.payments.map((p: any) => {
            const normalizedPayment = { ...p }
            // Normaliser le statut
            if (normalizedPayment.status === 'pending' || 
                normalizedPayment.status === 'payment_pending' || 
                normalizedPayment.status === 'pending_payment' || 
                normalizedPayment.status === 'awaiting_payment') {
              normalizedPayment.status = 'en_attente'
            }
            return normalizedPayment
          })
        }
        
        console.log('[LOCATAIRE REQUEST] 📥 Demande chargée:', {
          requestId: loadedRequest._id,
          status: loadedRequest.status,
          paymentsCount: loadedRequest.payments?.length || 0,
          payments: loadedRequest.payments?.map((p: any) => ({
            id: p._id,
            amount: p.amount,
            status: p.status,
            createdAt: p.createdAt
          })) || [],
          hasGeneratedDocuments: !!(loadedRequest.generatedDocuments && loadedRequest.generatedDocuments.length > 0),
          documentsCount: loadedRequest.generatedDocuments?.length || 0,
          documents: loadedRequest.generatedDocuments?.map((doc: any) => ({
            _id: doc._id,
            type: doc.type,
            filename: doc.filename,
            signed: doc.signed || false
          })) || [],
          allDocumentsSigned: loadedRequest.generatedDocuments && 
            loadedRequest.generatedDocuments.length > 0 &&
            loadedRequest.generatedDocuments.every((doc: any) => doc.signed === true)
        })
        
        setRequest(loadedRequest)
        setError('')
      } else {
        setError(response.data?.message || 'Demande non trouvée')
      }
    } catch (error: any) {
      // Gérer spécifiquement l'erreur 401 (Unauthorized)
      if (error.response?.status === 401) {
        console.log('[LOCATAIRE REQUEST] ❌ Erreur 401: Token invalide ou expiré')
        // Nettoyer le token invalide
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
        setLoading(false)
        setError('')
        // Ne pas rediriger ici, laisser ProtectedRoute gérer la redirection
        // Éviter les redirections multiples qui causent des conflits
        return
      }
      
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Erreur lors du chargement de la demande')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Synchronisation automatique globale pour rafraîchir après chaque mise à jour
  useGlobalSync(async () => {
    if (id) {
      const cleanId = String(id).trim().replace(/\s+/g, '')
      if (cleanId && cleanId.length > 0) {
        await loadRequest(cleanId)
      }
    }
  }, [id])

  // Rechargement périodique pour s'assurer que les paiements sont toujours à jour
  // Utile si les événements Socket.io ne sont pas reçus
  useEffect(() => {
    if (!id) return
    
    const cleanId = String(id).trim().replace(/\s+/g, '')
    if (!cleanId || cleanId.length === 0) return
    
    // Recharger toutes les 10 secondes pour s'assurer de la synchronisation
    const interval = setInterval(() => {
      console.log('[LOCATAIRE REQUEST] 🔄 Rechargement périodique de la demande')
      loadRequest(cleanId)
    }, 10000) // 10 secondes
    
    return () => clearInterval(interval)
  }, [id])

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

  // Écouter les événements Socket.io pour la synchronisation en temps réel
  useEffect(() => {
    if (!socket || !isConnected || !id) {
      return
    }

    console.log('[LOCATAIRE REQUEST] 🔌 Socket connecté, écoute des événements pour demande:', id)

    // Écouter les événements de synchronisation de demande
    const handleRequestSync = (data: any) => {
      const requestId = String(id).trim().replace(/\s+/g, '')
      if (data.requestId === requestId || data.requestId?.toString() === requestId) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement requestSync reçu pour cette demande:', requestId, data)
        // Recharger immédiatement puis après un court délai pour s'assurer que les documents sont bien récupérés
        loadRequest(requestId)
        setTimeout(() => {
          console.log('[LOCATAIRE REQUEST] 🔄 Rechargement après synchronisation (500ms)')
          loadRequest(requestId)
        }, 500)
        setTimeout(() => {
          console.log('[LOCATAIRE REQUEST] 🔄 Rechargement après synchronisation (1500ms)')
          loadRequest(requestId)
        }, 1500)
      }
    }

    // Écouter les événements globaux de synchronisation
    const handleGlobalRequestSync = (event: any) => {
      const data = event.detail || event
      const requestId = String(id).trim().replace(/\s+/g, '')
      if (data.requestId === requestId || data.requestId?.toString() === requestId) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement globalRequestSync reçu pour cette demande:', requestId, data)
        // Recharger immédiatement puis après un court délai pour s'assurer que les documents sont bien récupérés
        loadRequest(requestId)
        setTimeout(() => {
          console.log('[LOCATAIRE REQUEST] 🔄 Rechargement après synchronisation globale (500ms)')
          loadRequest(requestId)
        }, 500)
        setTimeout(() => {
          console.log('[LOCATAIRE REQUEST] 🔄 Rechargement après synchronisation globale (1500ms)')
          loadRequest(requestId)
        }, 1500)
      }
    }

    // Écouter les événements de paiement (DOM)
    const handlePaymentCreated = (event: any) => {
      const data = event.detail || event
      const requestId = String(id).trim().replace(/\s+/g, '')
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement DOM paymentCreated reçu pour cette demande:', requestId, data)
        
        // Vérifier l'authentification
        const token = getAuthToken()
        if (!token) {
          console.warn('[LOCATAIRE REQUEST] ⚠️  Token manquant - mise à jour annulée')
          return
        }
        
        // Normaliser le statut pour s'assurer qu'il est 'en_attente'
        let normalizedStatus = data.status || 'en_attente'
        if (normalizedStatus === 'pending' || normalizedStatus === 'payment_pending' || normalizedStatus === 'pending_payment' || normalizedStatus === 'awaiting_payment') {
          normalizedStatus = 'en_attente'
        }
        
        // Mettre à jour l'état local immédiatement pour afficher le paiement
        if (data.paymentId) {
          const existingPayment = request?.payments?.find((p: any) => {
            const paymentId = p._id?.toString() || p._id
            const dataPaymentId = data.paymentId?.toString() || data.paymentId
            return paymentId === dataPaymentId
          })
          
          if (!existingPayment) {
            // Nouveau paiement - l'ajouter à l'état immédiatement avec toutes les données
            const newPayment = {
              _id: data.paymentId,
              amount: data.amount || 0,
              status: normalizedStatus, // Utiliser le statut normalisé
              type: data.type || (request?.type === 'location' ? 'loyer' : 'achat'),
              createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
              dueDate: data.dueDate,
              description: data.description || `Paiement initial pour ${request?.type === 'location' ? 'location' : 'achat'} - ${request?.title || ''}`
            }
            
            setRequest(prev => {
              if (!prev) return prev
              return {
                ...prev,
                payments: [...(prev.payments || []), newPayment]
              }
            })
            
            console.log('[LOCATAIRE REQUEST] 💳 Nouveau paiement ajouté à l\'état depuis DOM:', {
              paymentId: newPayment._id,
              amount: newPayment.amount,
              status: newPayment.status,
              willShowButton: newPayment.status === 'en_attente'
            })
          }
        }
        
        // Recharger immédiatement pour obtenir les données complètes du serveur
        setTimeout(() => {
          loadRequest(requestId)
        }, 200) // Délai minimal pour laisser le state se mettre à jour
      }
    }

    // Écouter les événements Socket.io de paiement
    const handlePaymentCreatedSocket = (data: any) => {
      const requestId = String(id).trim().replace(/\s+/g, '')
      const dataRequestId = data.requestId?.toString() || data.requestId
      
      // Vérifier si c'est pour cet utilisateur ou pour cette demande
      const isForMe = data.forUser === authUser?.id || data.userId === authUser?.id
      const isForThisRequest = dataRequestId === requestId || dataRequestId?.trim() === requestId
      
      if (isForThisRequest || isForMe) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement Socket.io paymentCreated reçu:', { requestId, data, isForMe, isForThisRequest })
        
        // Vérifier l'authentification
        const token = getAuthToken()
        if (!token) {
          console.warn('[LOCATAIRE REQUEST] ⚠️  Token manquant - mise à jour annulée')
          return
        }
        
        // Mettre à jour l'état local immédiatement pour afficher le paiement instantanément
        // Normaliser le statut pour s'assurer qu'il est 'en_attente'
        let normalizedStatus = data.status || 'en_attente'
        if (normalizedStatus === 'pending' || normalizedStatus === 'payment_pending' || normalizedStatus === 'pending_payment' || normalizedStatus === 'awaiting_payment') {
          normalizedStatus = 'en_attente'
        }
        
        if (data.paymentId) {
          const existingPayment = request?.payments?.find((p: any) => {
            const paymentId = p._id?.toString() || p._id
            const dataPaymentId = data.paymentId?.toString() || data.paymentId
            return paymentId === dataPaymentId
          })
          
          if (!existingPayment) {
            // Nouveau paiement - l'ajouter à l'état immédiatement avec toutes les données
            const newPayment = {
              _id: data.paymentId,
              amount: data.amount || 0,
              status: normalizedStatus, // Utiliser le statut normalisé
              type: data.type || (request?.type === 'location' ? 'loyer' : 'achat'),
              createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
              dueDate: data.dueDate,
              description: data.description || `Paiement initial pour ${request?.type === 'location' ? 'location' : 'achat'} - ${request?.title || ''}`
            }
            
            console.log('[LOCATAIRE REQUEST] 💳 Nouveau paiement à ajouter:', newPayment)
            
            setRequest(prev => {
              if (!prev) return prev
              
              // Vérifier que le paiement n'existe pas déjà
              const alreadyExists = prev.payments?.some((p: any) => {
                const paymentId = p._id?.toString() || p._id
                const newPaymentId = newPayment._id?.toString() || newPayment._id
                return paymentId === newPaymentId
              })
              
              if (alreadyExists) {
                console.log('[LOCATAIRE REQUEST] ⚠️  Paiement déjà présent, mise à jour du statut')
                // Mettre à jour le statut du paiement existant
                return {
                  ...prev,
                  payments: prev.payments?.map((p: any) => {
                    const paymentId = p._id?.toString() || p._id
                    const newPaymentId = newPayment._id?.toString() || newPayment._id
                    if (paymentId === newPaymentId) {
                      return { ...p, ...newPayment, status: normalizedStatus }
                    }
                    return p
                  }) || []
                }
              }
              
              return {
                ...prev,
                payments: [...(prev.payments || []), newPayment]
              }
            })
            
            console.log('[LOCATAIRE REQUEST] ✅ Nouveau paiement ajouté à l\'état depuis Socket.io:', {
              paymentId: newPayment._id,
              amount: newPayment.amount,
              status: newPayment.status,
              willShowButton: newPayment.status === 'en_attente',
              paymentsCount: (request?.payments?.length || 0) + 1
            })
            
            // Recharger immédiatement pour obtenir les données complètes du serveur
            // Pas de délai pour une synchronisation instantanée
            setTimeout(() => {
              loadRequest(requestId)
            }, 200) // Délai minimal pour laisser le state se mettre à jour
          } else {
            // Paiement existant - mettre à jour le statut et recharger
            console.log('[LOCATAIRE REQUEST] 🔄 Paiement existant trouvé, mise à jour du statut')
            setRequest(prev => {
              if (!prev) return prev
              return {
                ...prev,
                payments: prev.payments?.map((p: any) => {
                  const paymentId = p._id?.toString() || p._id
                  const dataPaymentId = data.paymentId?.toString() || data.paymentId
                  if (paymentId === dataPaymentId) {
                    return { ...p, status: normalizedStatus }
                  }
                  return p
                }) || []
              }
            })
            // Recharger pour avoir les dernières données
            setTimeout(() => {
              loadRequest(requestId)
            }, 200)
          }
        } else {
          // Pas de paymentId - recharger pour obtenir la demande avec le nouveau paiement
          console.log('[LOCATAIRE REQUEST] ⚠️  Pas de paymentId dans l\'événement, rechargement de la demande')
          setTimeout(() => {
            loadRequest(requestId)
          }, 200)
        }
      }
    }

    // Écouter les événements Socket.io de synchronisation globale
    const handleGlobalSyncSocket = (data: any) => {
      const requestId = String(id).trim().replace(/\s+/g, '')
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement Socket.io globalSync reçu pour cette demande:', requestId, data)
        setTimeout(() => {
          loadRequest(requestId)
        }, 1000)
      }
    }

    // Écouter les événements de synchronisation du profil utilisateur
    const handleUserProfileSync = (event: any) => {
      const data = event.detail || event
      if (data.userId && request?.createdBy?._id) {
        const userId = String(data.userId).trim()
        const createdById = String(request.createdBy._id).trim()
        if (userId === createdById) {
          console.log('[LOCATAIRE REQUEST] 📡 Événement userProfileSync reçu pour le demandeur de cette demande')
          setTimeout(() => {
            loadRequest(String(id).trim())
          }, 500)
        }
      }
    }

    // S'abonner aux événements Socket.io
    socket.on('requestSync', handleRequestSync)
    socket.on('paymentCreated', handlePaymentCreatedSocket)
    socket.on('globalSync', (data: any) => {
      const requestId = String(id).trim().replace(/\s+/g, '')
      if (data.requestId === requestId || data.requestId?.toString() === requestId) {
        console.log('[LOCATAIRE REQUEST] 📡 Événement Socket.io globalSync reçu pour cette demande:', requestId)
        setTimeout(() => {
          loadRequest(requestId)
        }, 1000)
      }
    })
    
    // S'abonner aux événements DOM
    if (typeof window !== 'undefined') {
      window.addEventListener('globalRequestSync', handleGlobalRequestSync)
      window.addEventListener('globalSync', handleGlobalRequestSync)
      window.addEventListener('paymentCreated', handlePaymentCreated)
      window.addEventListener('paymentStatusUpdated', handlePaymentCreated)
      window.addEventListener('userProfileSync', handleUserProfileSync)
      window.addEventListener('requestSync', handleGlobalRequestSync)
    }

    // Nettoyage
    return () => {
      socket.off('requestSync', handleRequestSync)
      socket.off('paymentCreated', handlePaymentCreatedSocket)
      socket.off('globalSync')
      if (typeof window !== 'undefined') {
        window.removeEventListener('globalRequestSync', handleGlobalRequestSync)
        window.removeEventListener('globalSync', handleGlobalRequestSync)
        window.removeEventListener('paymentCreated', handlePaymentCreated)
        window.removeEventListener('paymentStatusUpdated', handlePaymentCreated)
        window.removeEventListener('userProfileSync', handleUserProfileSync)
        window.removeEventListener('requestSync', handleGlobalRequestSync)
      }
    }
  }, [socket, isConnected, id, request?.createdBy?._id])

  // Recharger automatiquement la demande toutes les 5 secondes si elle est en cours et qu'il y a des documents signés
  // Cela garantit que la demande de paiement apparaît rapidement après création
  useEffect(() => {
    if (!request || !id || request.status === 'termine' || request.status === 'refuse') {
      return
    }

    // Vérifier l'authentification avant de définir l'intervalle
    const token = getAuthToken()
    if (!token) {
      return
    }

    // Si la demande est acceptée mais n'a pas encore de documents, recharger très fréquemment
    const isAccepted = request.status === 'accepte'
    const hasNoDocuments = !request.generatedDocuments || request.generatedDocuments.length === 0
    const waitingForDocuments = isAccepted && hasNoDocuments
    
    // Si tous les documents sont signés, recharger plus fréquemment pour détecter la demande de paiement
    const allDocsSigned = request.generatedDocuments && 
      request.generatedDocuments.length > 0 &&
      request.generatedDocuments.every((doc: any) => doc.signed === true)
    
    // Si les documents sont signés et qu'il n'y a pas encore de paiement, recharger très fréquemment
    const hasNoPayment = !request.payments || request.payments.length === 0
    
    // Prioriser le rechargement si on attend les documents (très fréquent)
    // Sinon, prioriser si les documents sont signés et qu'on attend le paiement
    // Sinon, recharger normalement
    const interval = waitingForDocuments 
      ? 2000  // Recharger toutes les 2 secondes si on attend les documents
      : (allDocsSigned && hasNoPayment) 
        ? 3000  // Recharger toutes les 3 secondes si on attend le paiement
        : (allDocsSigned ? 5000 : 10000)  // Recharger normalement sinon

    const reloadInterval = setInterval(() => {
      // Vérifier l'authentification avant chaque rechargement
      const currentToken = getAuthToken()
      if (!currentToken) {
        clearInterval(reloadInterval)
        return
      }
      
      const cleanId = String(id).trim().replace(/\s+/g, '')
      if (cleanId && cleanId.length > 0) {
        if (waitingForDocuments) {
          console.log('[LOCATAIRE REQUEST] 🔍 Vérification des documents générés (intervalle: 2s)')
        } else {
          console.log('[LOCATAIRE REQUEST] 🔄 Rechargement automatique de la demande:', cleanId, `(intervalle: ${interval}ms)`)
        }
        loadRequest(cleanId)
      }
    }, interval)

    return () => clearInterval(reloadInterval)
  }, [id, request?.status, request?.generatedDocuments?.length, request?.payments?.length])

  const handleSignDocument = async (docId: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir signer ce document électroniquement ? Cette action est irréversible.')) {
      return
    }

    setSigningDoc(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || (Array.isArray(id) ? id[0] : id)
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setSigningDoc(false)
        return
      }
      
      // Convertir en string pour éviter les erreurs TypeScript
      const cleanRequestId = String(requestId).trim()
      const url = buildApiUrlWithId('requests', cleanRequestId, `documents/${docId}/sign`)
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

  const handleUnsignDocument = async (docId: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler la signature de ce document ? Le demandeur devra le signer à nouveau.')) {
      return
    }

    setSigningDoc(true)
    try {
      const token = getAuthToken()
      const requestId = request?._id || (Array.isArray(id) ? id[0] : id)
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setSigningDoc(false)
        return
      }
      
      // Convertir en string pour éviter les erreurs TypeScript
      const cleanRequestId = String(requestId).trim()
      const url = buildApiUrlWithId('requests', cleanRequestId, `documents/${docId}/unsign`)
      const response = await axios.put(url, {}, getApiConfig(token))

      if (response.status === 200 && response.data && response.data.success) {
        if (response.data.data) {
          setRequest(response.data.data)
        } else {
          loadRequest()
        }
        
        showSuccessMessage(response.data.message || 'Signature du document annulée avec succès !')
        setTimeout(() => {
          loadRequest()
        }, 500)
      } else {
        showErrorMessage(response.data?.message || 'Une erreur est survenue lors de l\'annulation de la signature.')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          getErrorMessage(error, 'Une erreur est survenue lors de l\'annulation de la signature. Veuillez réessayer.')
      showErrorMessage(errorMessage)
    } finally {
      setSigningDoc(false)
    }
  }

  const handleDownloadDocument = async (docId: string | number, filename: string) => {
    try {
      const token = getAuthToken()
      const requestId = request?._id || (Array.isArray(id) ? id[0] : id)
      
      if (!requestId) {
        showErrorMessage('Impossible de télécharger le document. L\'identifiant est manquant.')
        return
      }
      
      // Convertir en string pour éviter les erreurs TypeScript
      const cleanRequestId = String(requestId).trim()
      const url = buildApiUrlWithId('requests', cleanRequestId, `documents/${docId}/download`)
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

  // Fonctions pour le paiement intégré
  const handleOpenPaymentModal = (payment: any) => {
    setSelectedPayment(payment)
    setShowPaymentModal(true)
    setSelectedMethod('')
    setPaymentInstructions(null)
    setPaymentError(null)
    setInteracBank('')
    if (authUser?.email) {
      setInteracContactMethod('email')
    }
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedPayment(null)
    setSelectedMethod('')
    setPaymentInstructions(null)
    setPaymentError(null)
    setInteracBank('')
    setPaymentProcessing(false)
  }

  const handleSelectPaymentMethod = async (method: string) => {
    if (!selectedPayment || !authUser) {
      setPaymentError('Données de paiement manquantes')
      return
    }

    setSelectedMethod(method)
    setPaymentError(null)
    setPaymentProcessing(true)

    try {
      const token = getAuthToken()
      if (!token) {
        setPaymentError('Session expirée. Veuillez vous reconnecter.')
        setPaymentProcessing(false)
        return
      }

      if (method === 'carte_credit' || method === 'stripe') {
        // Créer un PaymentIntent Stripe
        const response = await axios.post(
          `${API_URL}/payments/${selectedPayment._id}/stripe/create-intent`,
          {},
          getApiConfig(token)
        )
        
        if (response.data.success && response.data.data) {
          setPaymentInstructions(response.data.data)
        } else {
          throw new Error(response.data.message || 'Erreur lors de la création du paiement Stripe')
        }
      } else if (method === 'interac') {
        if (!interacBank) {
          setPaymentError('Veuillez sélectionner votre banque')
          setPaymentProcessing(false)
          return
        }
        
        const response = await axios.post(
          `${API_URL}/payments/${selectedPayment._id}/interac/instructions`,
          {
            bank: interacBank,
            contactMethod: interacContactMethod
          },
          getApiConfig(token)
        )
        
        if (response.data.success && response.data.data) {
          setPaymentInstructions(response.data.data)
        } else {
          throw new Error(response.data.message || 'Erreur lors de la génération des instructions Interac')
        }
      } else if (method === 'virement') {
        const response = await axios.post(
          `${API_URL}/payments/${selectedPayment._id}/bank-transfer/instructions`,
          {},
          getApiConfig(token)
        )
        
        if (response.data.success && response.data.data) {
          setPaymentInstructions(response.data.data)
        } else {
          throw new Error(response.data.message || 'Erreur lors de la génération des instructions de virement')
        }
      }
    } catch (err: any) {
      console.error('[PAYMENT MODAL] Erreur:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du traitement du paiement'
      setPaymentError(errorMessage)
    } finally {
      setPaymentProcessing(false)
    }
  }

  const handleStripeSuccess = async () => {
    if (!selectedPayment || !paymentInstructions?.paymentIntentId) {
      setPaymentError('Données de paiement manquantes')
      return
    }

    setPaymentProcessing(true)
    setPaymentError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setPaymentError('Session expirée')
        setPaymentProcessing(false)
        return
      }

      const response = await axios.post(
        `${API_URL}/payments/${selectedPayment._id}/stripe/confirm`,
        { paymentIntentId: paymentInstructions.paymentIntentId },
        getApiConfig(token)
      )

      if (response.data.success) {
        showSuccessMessage('Paiement effectué avec succès !')
        handleClosePaymentModal()
        // Recharger la demande après un court délai
        setTimeout(() => {
          if (id) {
            loadRequest(String(id).trim())
          }
        }, 1000)
      } else {
        throw new Error(response.data.message || 'Erreur lors de la confirmation du paiement')
      }
    } catch (err: any) {
      console.error('[PAYMENT MODAL] Erreur confirmation:', err)
      setPaymentError(err.response?.data?.message || 'Erreur lors de la confirmation du paiement')
    } finally {
      setPaymentProcessing(false)
    }
  }

  const handleManualPaymentConfirm = async () => {
    if (!selectedPayment || !selectedMethod || !paymentInstructions?.referenceNumber) {
      setPaymentError('Données incomplètes pour confirmer le paiement')
      return
    }

    setPaymentProcessing(true)
    setPaymentError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setPaymentError('Session expirée')
        setPaymentProcessing(false)
        return
      }

      const paymentMethod = selectedMethod === 'interac' ? 'interac' : selectedMethod === 'virement' ? 'virement' : selectedMethod
      
      const response = await axios.post(
        `${API_URL}/payments/${selectedPayment._id}/process`,
        {
          paymentMethod: paymentMethod,
          transactionId: paymentInstructions.referenceNumber || `REF-${Date.now()}`,
          notes: `Paiement ${selectedMethod} effectué le ${new Date().toLocaleString('fr-FR')} - Montant: ${selectedPayment.amount} $CAD`
        },
        getApiConfig(token)
      )

      if (response.data.success) {
        showSuccessMessage('Paiement confirmé avec succès !')
        handleClosePaymentModal()
        // Recharger la demande après un court délai
        setTimeout(() => {
          if (id) {
            loadRequest(String(id).trim())
          }
        }, 1000)
      } else {
        throw new Error(response.data.message || 'Erreur lors du traitement du paiement')
      }
    } catch (err: any) {
      console.error('[PAYMENT MODAL] Erreur confirmation manuelle:', err)
      setPaymentError(err.response?.data?.message || 'Erreur lors de la confirmation du paiement')
    } finally {
      setPaymentProcessing(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['locataire', 'visiteur', 'proprietaire']}>
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
      <ProtectedRoute requiredRoles={['locataire', 'visiteur', 'proprietaire']}>
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

  const hasUnsignedDocuments = request.generatedDocuments?.some((doc: any) => !doc.signed) || false
  const allDocumentsSigned = request.generatedDocuments && request.generatedDocuments.length > 0 && request.generatedDocuments.every((doc: any) => doc.signed)

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

              {/* Documents générés - Afficher SEULEMENT si des documents existent */}
              {request.status === 'accepte' && request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Documents à signer</h2>
                  {hasUnsignedDocuments && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800 font-semibold mb-2">
                        ⚠️ Action requise : Signature des documents
                      </p>
                      <p className="text-sm text-yellow-700">
                        Les documents ont été générés automatiquement par l'administrateur. Vous devez télécharger et signer tous les documents pour finaliser votre demande. Une fois tous les documents signés, l'administrateur pourra {request.type === 'achat' ? 'créer la demande de paiement initial que le propriétaire devra effectuer' : 'procéder au paiement et à l\'attribution de l\'unité'}.
                      </p>
                    </div>
                  )}
                  {allDocumentsSigned && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800 font-semibold mb-2">
                        ✅ Tous les documents ont été signés
                      </p>
                      <p className="text-sm text-green-700">
                        {request.type === 'achat' 
                          ? 'Tous les documents sont signés. L\'administrateur va maintenant créer la demande de paiement initial. Le propriétaire devra effectuer le paiement avant l\'attribution de l\'unité.'
                          : 'Tous les documents sont signés. L\'administrateur va maintenant procéder à l\'attribution de l\'unité et créer la demande de paiement initial.'}
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
                          {doc.signed && authUser?.role === 'admin' && (
                            <button
                              onClick={() => handleUnsignDocument(doc._id || index)}
                              disabled={signingDoc}
                              className="btn-secondary bg-orange-500 hover:bg-orange-600 text-white text-sm"
                              title="Annuler la signature pour permettre au demandeur de signer manuellement"
                            >
                              {signingDoc ? '⏳ Annulation...' : '↩️ Annuler signature'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paiement initial - Afficher seulement si l'admin a créé une demande de paiement */}
              {/* La section ne s'affiche que s'il y a au moins un paiement dans le tableau payments */}
              {request.status === 'accepte' && allDocumentsSigned && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Paiement initial</h2>
                  {request.payments && request.payments.length > 0 ? (
                    <>
                  
                  {/* Trouver le paiement initial (le plus récent en attente ou payé) */}
                  {(() => {
                    // Trier les paiements par date de création (plus récent en premier)
                    const sortedPayments = [...request.payments].sort((a: any, b: any) => {
                      const dateA = new Date(a.createdAt || 0).getTime()
                      const dateB = new Date(b.createdAt || 0).getTime()
                      return dateB - dateA
                    })
                    
                    // Prendre le premier paiement (le plus récent)
                    const payment = sortedPayments[0]
                    
                    if (!payment) return null
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                            <p className="text-lg font-bold">${formatAmount(payment.amount)}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'paye' ? 'bg-green-100 text-green-800' :
                              payment.status === 'en_retard' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status === 'paye' ? 'Payé' :
                               payment.status === 'en_retard' ? 'En retard' :
                               'En attente'}
                            </span>
                          </div>
                        </div>
                        {payment.paidAt && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
                            <p className="text-sm text-gray-600">{new Date(payment.paidAt).toLocaleString('fr-CA')}</p>
                          </div>
                        )}
                        {payment.paymentMethod && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Méthode de paiement</label>
                            <p className="text-sm text-gray-600">{payment.paymentMethod}</p>
                          </div>
                        )}
                        {/* Bouton pour payer si le statut est en attente */}
                        {(() => {
                          // Normaliser le statut pour la vérification
                          const paymentStatus = (payment.status || '').toLowerCase().trim()
                          const isPending = paymentStatus === 'en_attente' || 
                                          paymentStatus === 'pending' || 
                                          paymentStatus === 'payment_pending' || 
                                          paymentStatus === 'pending_payment' || 
                                          paymentStatus === 'awaiting_payment'
                          const isPaid = paymentStatus === 'paye' || paymentStatus === 'paid' || paymentStatus === 'completed'
                          
                          return !isPaid && isPending
                        })() && payment && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleOpenPaymentModal(payment)}
                              className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-base shadow-lg hover:shadow-xl"
                            >
                              💳 Payer maintenant
                            </button>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Cliquez pour effectuer le paiement de manière sécurisée
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Afficher les demandes de paiement créées par l'admin - Synchronisé avec le bouton admin */}
                  {request.payments && request.payments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Demandes de paiement créées</h3>
                      <div className="space-y-3">
                        {request.payments.map((payment: any) => {
                          // Normaliser le statut pour la vérification
                          const paymentStatus = (payment.status || '').toLowerCase().trim()
                          const isPending = paymentStatus === 'en_attente' || 
                                          paymentStatus === 'pending' || 
                                          paymentStatus === 'payment_pending' || 
                                          paymentStatus === 'pending_payment' || 
                                          paymentStatus === 'awaiting_payment'
                          const isPaid = paymentStatus === 'paye' || paymentStatus === 'paid' || paymentStatus === 'completed'
                          const hasPendingPayment = isPending && !isPaid
                          return (
                            <div key={payment._id} className={`p-4 rounded-lg border-2 ${
                              payment.status === 'paye' ? 'bg-green-50 border-green-300' :
                              payment.status === 'en_retard' ? 'bg-red-50 border-red-300' :
                              'bg-yellow-50 border-yellow-300'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg font-bold">${formatAmount(payment.amount)}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      payment.status === 'paye' ? 'bg-green-200 text-green-800' :
                                      payment.status === 'en_retard' ? 'bg-red-200 text-red-800' :
                                      'bg-yellow-200 text-yellow-800'
                                    }`}>
                                      {payment.status === 'paye' ? 'Payé' :
                                       payment.status === 'en_retard' ? 'En retard' :
                                       'En attente de paiement par le client'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Créé le:</strong> {new Date(payment.createdAt).toLocaleString('fr-CA')}
                                  </p>
                                  {payment.dueDate && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <strong>Échéance:</strong> {new Date(payment.dueDate).toLocaleDateString('fr-CA')}
                                    </p>
                                  )}
                                  {payment.description && (
                                    <p className="text-sm text-gray-600 mt-2">{payment.description}</p>
                                  )}
                                  {payment.paidAt && (
                                    <p className="text-sm text-green-600 mt-1">
                                      <strong>Payé le:</strong> {new Date(payment.paidAt).toLocaleString('fr-CA')}
                                    </p>
                                  )}
                                  {payment.paymentMethod && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Méthode:</strong> {payment.paymentMethod}
                                    </p>
                                  )}
                                </div>
                                {hasPendingPayment && (
                                  <button
                                    onClick={() => handleOpenPaymentModal(payment)}
                                    className="ml-4 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-base whitespace-nowrap shadow-lg hover:shadow-xl"
                                  >
                                    💳 Payer maintenant
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                    </>
                  ) : (
                    // Si aucun paiement mais documents signés, afficher un message d'attente
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
                      <p className="text-sm text-blue-800">
                        ⏳ En attente de la demande de paiement de l'administrateur. 
                        Vous recevrez une notification et le bouton "Payer maintenant" apparaîtra automatiquement 
                        dès que l'administrateur créera la demande de paiement.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Message si les documents ne sont pas tous signés */}
              {request.status === 'accepte' && request.generatedDocuments && request.generatedDocuments.length > 0 && !allDocumentsSigned && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Paiement initial</h2>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded p-4">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">
                      ⚠️ Vous devez signer tous les documents pour finaliser votre demande.
                    </p>
                    <p className="text-sm text-yellow-700">
                      {request.type === 'achat' 
                        ? "Une fois tous les documents signés, l'administrateur créera une demande de paiement initial que le propriétaire devra effectuer. Vous recevrez une notification à chaque étape."
                        : "Une fois tous les documents signés, l'administrateur pourra attribuer l'unité et créer la demande de paiement initial. Vous recevrez une notification lorsqu'elle sera disponible."}
                    </p>
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
              {request.status === 'accepte' && hasUnsignedDocuments && request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6 bg-blue-50">
                  <h2 className="text-xl font-bold mb-4">Action requise</h2>
                  <p className="text-sm text-blue-800 mb-4">
                    Veuillez signer tous les documents ci-dessus pour finaliser votre demande. Une fois tous les documents signés, l'administrateur pourra {request.type === 'achat' ? 'créer la demande de paiement initial et' : ''} procéder à l'attribution de l'unité.
                  </p>
                </div>
              )}

              {request.status === 'accepte' && allDocumentsSigned && (
                <div className="card p-6 bg-green-50">
                  <h2 className="text-xl font-bold mb-4">✅ Documents signés</h2>
                  <p className="text-sm text-green-800">
                    {request.type === 'achat'
                      ? "Tous vos documents ont été signés avec succès. L'administrateur va maintenant créer la demande de paiement initial que le propriétaire devra effectuer. Vous recevrez une notification à chaque étape."
                      : "Tous vos documents ont été signés avec succès. L'administrateur va maintenant procéder à l'attribution de l'unité. Vous recevrez une notification une fois l'unité attribuée."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modale de paiement intégrée */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Effectuer le paiement</h2>
              <button
                onClick={handleClosePaymentModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Détails du paiement */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3">Détails de la facture</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant:</span>
                    <span className="font-bold text-lg">${formatAmount(selectedPayment.amount)} CAD</span>
                  </div>
                  {selectedPayment.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Échéance:</span>
                      <span>{new Date(selectedPayment.dueDate).toLocaleDateString('fr-CA')}</span>
                    </div>
                  )}
                  {selectedPayment.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description:</span>
                      <span className="text-right">{selectedPayment.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sélection de la méthode */}
              {!selectedMethod && (
                <div>
                  <PaymentMethodSelector
                    selectedMethod={selectedMethod}
                    onSelectMethod={handleSelectPaymentMethod}
                    disabled={paymentProcessing}
                  />
                </div>
              )}

              {/* Formulaire Stripe */}
              {selectedMethod === 'carte_credit' && paymentInstructions?.clientSecret && (
                <div className="mt-6">
                  <StripePaymentForm
                    clientSecret={paymentInstructions.clientSecret}
                    paymentIntentId={paymentInstructions.paymentIntentId}
                    amount={selectedPayment.amount}
                    onSuccess={handleStripeSuccess}
                    onError={(error) => setPaymentError(error)}
                  />
                </div>
              )}

              {/* Configuration Interac */}
              {selectedMethod === 'interac' && !paymentInstructions && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Configuration Interac</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Sélectionnez votre banque</label>
                      <select
                        value={interacBank}
                        onChange={(e) => setInteracBank(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={paymentProcessing}
                      >
                        <option value="">-- Choisissez votre banque --</option>
                        <option value="RBC">Banque Royale du Canada (RBC)</option>
                        <option value="TD">Banque TD Canada Trust</option>
                        <option value="BMO">Banque de Montréal (BMO)</option>
                        <option value="SCOTIA">Banque Scotia</option>
                        <option value="CIBC">Banque CIBC</option>
                        <option value="DESJARDINS">Mouvement Desjardins</option>
                        <option value="NATIONAL">Banque Nationale du Canada</option>
                        <option value="AUTRE">Autre banque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Méthode de contact</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={interacContactMethod === 'email'}
                            onChange={() => setInteracContactMethod('email')}
                            className="mr-2"
                            disabled={paymentProcessing}
                          />
                          <span>📧 Email</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={interacContactMethod === 'phone'}
                            onChange={() => setInteracContactMethod('phone')}
                            className="mr-2"
                            disabled={paymentProcessing}
                          />
                          <span>📱 Téléphone</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectPaymentMethod('interac')}
                      disabled={!interacBank || paymentProcessing}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {paymentProcessing ? 'Génération...' : 'Générer les instructions'}
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions Interac */}
              {selectedMethod === 'interac' && paymentInstructions && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Instructions Interac</h3>
                  <div className="bg-white rounded-lg p-4 mb-4 space-y-2 text-sm">
                    {paymentInstructions.steps && (
                      <div>
                        <p className="font-semibold mb-2">Étapes à suivre:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {paymentInstructions.steps.map((step: string, idx: number) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {paymentInstructions.referenceNumber && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded">
                        <p className="font-semibold">Numéro de référence:</p>
                        <p className="font-mono text-lg">{paymentInstructions.referenceNumber}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleManualPaymentConfirm}
                    disabled={paymentProcessing}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {paymentProcessing ? 'Traitement...' : '✓ Confirmer le paiement'}
                  </button>
                </div>
              )}

              {/* Configuration Virement */}
              {selectedMethod === 'virement' && !paymentInstructions && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Instructions de virement bancaire</h3>
                  <button
                    onClick={() => handleSelectPaymentMethod('virement')}
                    disabled={paymentProcessing}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {paymentProcessing ? 'Génération...' : 'Générer les instructions'}
                  </button>
                </div>
              )}

              {/* Instructions Virement */}
              {selectedMethod === 'virement' && paymentInstructions && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Instructions de virement</h3>
                  <div className="bg-white rounded-lg p-4 mb-4 space-y-2 text-sm">
                    {paymentInstructions.accountNumber && (
                      <div className="flex justify-between">
                        <span>Numéro de compte:</span>
                        <span className="font-mono">{paymentInstructions.accountNumber}</span>
                      </div>
                    )}
                    {paymentInstructions.transitNumber && (
                      <div className="flex justify-between">
                        <span>Numéro de transit:</span>
                        <span className="font-mono">{paymentInstructions.transitNumber}</span>
                      </div>
                    )}
                    {paymentInstructions.referenceNumber && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded">
                        <p className="font-semibold">Numéro de référence:</p>
                        <p className="font-mono text-lg">{paymentInstructions.referenceNumber}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleManualPaymentConfirm}
                    disabled={paymentProcessing}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {paymentProcessing ? 'Traitement...' : '✓ Confirmer le paiement'}
                  </button>
                </div>
              )}

              {/* Erreur */}
              {paymentError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{paymentError}</p>
                  {paymentError.includes('Stripe') && (
                    <button
                      onClick={() => {
                        setSelectedMethod('')
                        setPaymentError(null)
                        setPaymentInstructions(null)
                      }}
                      className="mt-2 text-sm text-red-600 hover:underline"
                    >
                      Choisir une autre méthode
                    </button>
                  )}
                </div>
              )}

              {/* Bouton retour si méthode sélectionnée */}
              {selectedMethod && !paymentProcessing && (
                <button
                  onClick={() => {
                    setSelectedMethod('')
                    setPaymentInstructions(null)
                    setPaymentError(null)
                  }}
                  className="mt-4 text-primary-600 hover:underline text-sm"
                >
                  ← Choisir une autre méthode
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </ProtectedRoute>
  )
}
