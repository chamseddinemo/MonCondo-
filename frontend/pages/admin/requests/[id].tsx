import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { usePayment } from '../../../contexts/PaymentContext'
import { useSocket } from '../../../contexts/SocketContext'
import { useGlobalSync } from '../../../hooks/useGlobalSync'
import { buildApiUrl, buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage, API_URL } from '@/utils/api'
import GoogleMapCard from '../../../components/maps/GoogleMapCard'

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
    _id?: string
    type: string
    filename: string
    signed: boolean
    signedAt?: string
    signedBy?: {
      firstName: string
      lastName: string
    }
    generatedAt?: string
  }>
  initialPayment?: {
    amount: number
    status: string
    paidAt?: string
    paymentMethod?: string
    transactionId?: string
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
    transactionId?: string
    payer?: {
      _id: string
      firstName: string
      lastName: string
      email: string
    }
    recipient?: {
      _id: string
      firstName: string
      lastName: string
      email: string
    }
  }>
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
  const { socket, isConnected } = useSocket()
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
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')
  // Flag pour empêcher les rechargements automatiques juste après la création d'un paiement
  const [justCreatedPayment, setJustCreatedPayment] = useState(false)

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

  // Plus besoin de synchroniser initialPayment - on utilise uniquement les paiements réels

  // Plus besoin de polling pour initialPayment - on utilise uniquement les paiements réels

  // Utiliser le hook de synchronisation globale pour recharger automatiquement après chaque mise à jour
  // MAIS préserver les paiements pour éviter de perdre l'état
  // ET ne pas recharger si on vient juste de créer un paiement
  useGlobalSync(async () => {
    // Ne pas recharger si on vient juste de créer un paiement (pendant 5 secondes)
    if (justCreatedPayment) {
      console.log('[USE GLOBAL SYNC] ⏸️  Rechargement ignoré - paiement créé récemment')
      return
    }
    
    if (id) {
      const cleanId = String(id).trim().replace(/\s+/g, '')
      if (cleanId && cleanId.length > 0) {
        // Préserver les paiements lors du rechargement global pour éviter de perdre l'état
        await loadRequest(cleanId, true)
      }
    }
  }, [id, justCreatedPayment])

  // Rechargement périodique pour s'assurer que les paiements sont toujours à jour
  // Utile si les événements Socket.io ne sont pas reçus
  useEffect(() => {
    if (!id || justCreatedPayment) return
    
    const cleanId = String(id).trim().replace(/\s+/g, '')
    if (!cleanId || cleanId.length === 0) return
    
    // Recharger toutes les 10 secondes pour s'assurer de la synchronisation
    const interval = setInterval(() => {
      console.log('[PERIODIC SYNC] 🔄 Rechargement périodique de la demande')
      loadRequest(cleanId, false) // Ne pas préserver pour avoir les données les plus récentes
    }, 10000) // 10 secondes
    
    return () => clearInterval(interval)
  }, [id, justCreatedPayment])

  // Écouter les événements Socket.io pour la synchronisation en temps réel
  useEffect(() => {
    if (!socket || !isConnected || !id) {
      return
    }

    const requestId = String(id).trim().replace(/\s+/g, '')

    // Écouter les événements de synchronisation de demande
    const handleRequestSync = (data: any) => {
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        // Ne pas recharger si on vient juste de créer un paiement
        if (justCreatedPayment) {
          console.log('[ADMIN REQUEST] ⏸️  requestSync ignoré - paiement créé récemment')
          return
        }
        
        // Ne pas recharger si on a déjà un paiement en attente dans l'état local
        // Cela évite d'écraser l'état local avec une réponse serveur qui pourrait ne pas encore avoir le paiement
        if (hasPendingPayment(request)) {
          console.log('[ADMIN REQUEST] ⏸️  requestSync ignoré - paiement en attente déjà présent dans l\'état local')
          return
        }
        
        console.log('[ADMIN REQUEST] 📡 Événement Socket.io requestSync reçu pour cette demande:', requestId, data)
        // Préserver les paiements pour éviter de perdre l'état
        setTimeout(() => {
          loadRequest(requestId, true)
        }, 1000)
      }
    }

    // Écouter les événements de création de paiement
    const handlePaymentCreated = (data: any) => {
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        console.log('[ADMIN REQUEST] 📡 Événement Socket.io paymentCreated reçu pour cette demande:', requestId, data)
        // Ne JAMAIS recharger si le paiement est déjà dans l'état local (c'est nous qui l'avons créé)
        // Ajouter seulement si c'est un nouveau paiement créé par quelqu'un d'autre
        const isOurPayment = request?.payments?.some((p: any) => p._id === data.paymentId)
        if (!isOurPayment && request && data.paymentId) {
          // Ajouter le paiement à l'état local sans recharger complètement
          const existingPayment = request.payments?.find((p: any) => p._id === data.paymentId)
          if (!existingPayment) {
            const newPayment = {
              _id: data.paymentId,
              amount: data.amount || 0,
              status: data.status || 'en_attente',
              type: request.type === 'location' ? 'loyer' : request.type === 'achat' ? 'achat' : 'autre',
              createdAt: data.timestamp || new Date().toISOString(),
              dueDate: data.dueDate,
              description: data.description
            }
            setRequest(prev => prev ? {
              ...prev,
              payments: [...(prev.payments || []), newPayment]
            } : null)
            console.log('[ADMIN REQUEST] 💳 Paiement ajouté à l\'état depuis Socket.io')
          }
        } else {
          console.log('[ADMIN REQUEST] ℹ️  Paiement déjà présent dans l\'état local - pas de rechargement pour éviter de perdre l\'état')
        }
      }
    }

    // Écouter les événements de paiement payé (synchronisation)
    const handlePaymentPaid = (data: any) => {
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        console.log('[ADMIN REQUEST] 💰 Événement Socket.io paymentPaid/paymentSync reçu pour cette demande:', requestId, data)
        
        // Mettre à jour immédiatement le paiement dans l'état local
        if (data.paymentId) {
          setRequest(prev => {
            if (!prev) return prev
            
            // Mettre à jour le paiement si il existe
            const updatedPayments = prev.payments?.map((p: any) => {
              const paymentId = p._id?.toString() || p._id
              const dataPaymentId = data.paymentId?.toString() || data.paymentId
              if (paymentId === dataPaymentId) {
                console.log('[ADMIN REQUEST] 🔄 Mise à jour du paiement:', {
                  id: paymentId,
                  oldStatus: p.status,
                  newStatus: data.status || 'paye'
                })
                return {
                  ...p,
                  status: 'paye', // Forcer le statut à 'paye'
                  paidAt: data.paidDate || data.paidAt || new Date().toISOString(),
                  paymentMethod: data.paymentMethod || p.paymentMethod,
                  transactionId: data.transactionId || p.transactionId
                }
              }
              return p
            }) || []
            
            // Si le paiement n'existe pas encore, l'ajouter
            const paymentExists = updatedPayments.some((p: any) => {
              const paymentId = p._id?.toString() || p._id
              const dataPaymentId = data.paymentId?.toString() || data.paymentId
              return paymentId === dataPaymentId
            })
            if (!paymentExists && data.paymentId) {
              console.log('[ADMIN REQUEST] ➕ Ajout d\'un nouveau paiement payé:', data.paymentId)
              updatedPayments.push({
                _id: data.paymentId,
                amount: data.amount || 0,
                status: 'paye',
                type: prev.type === 'location' ? 'loyer' : 'achat',
                createdAt: data.timestamp || data.createdAt || new Date().toISOString(),
                paidAt: data.paidDate || data.paidAt || new Date().toISOString(),
                paymentMethod: data.paymentMethod || 'interac',
                transactionId: data.transactionId
              })
            }
            
            // Mettre à jour aussi le paiement initial si c'est un paiement initial
            let updatedInitialPayment = prev.initialPayment
            if (data.status === 'paye' && prev.initialPayment && data.requestId) {
              updatedInitialPayment = {
                ...prev.initialPayment,
                status: 'paye',
                paidAt: data.paidDate || data.paidAt || new Date().toISOString(),
                paymentMethod: data.paymentMethod || prev.initialPayment.paymentMethod,
                transactionId: data.transactionId || prev.initialPayment.transactionId
              }
            }
            
            console.log('[ADMIN REQUEST] ✅ État mis à jour - paiements:', updatedPayments.map((p: any) => ({
              id: p._id,
              status: p.status,
              amount: p.amount
            })))
            
            return {
              ...prev,
              payments: updatedPayments,
              initialPayment: updatedInitialPayment
            }
          })
        }
        
        // Recharger IMMÉDIATEMENT pour s'assurer que tout est synchronisé
        // Ne PAS préserver les paiements car le serveur est la source de vérité
        // On veut que les données du serveur remplacent complètement les données locales
        console.log('[ADMIN REQUEST] 🔄 Rechargement immédiat de la demande pour synchronisation')
        loadRequest(requestId, false)
      }
    }

    // Écouter les événements de synchronisation globale
    const handleGlobalSync = (data: any) => {
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        // Si c'est un événement de paiement payé, utiliser handlePaymentPaid
        if (data.type === 'payment' && data.action === 'paid') {
          handlePaymentPaid({
            paymentId: data.paymentId,
            requestId: data.requestId,
            status: 'paye',
            timestamp: data.timestamp
          })
          return
        }
        
        // Ne pas recharger si on vient juste de créer un paiement
        if (justCreatedPayment) {
          console.log('[ADMIN REQUEST] ⏸️  globalSync ignoré - paiement créé récemment')
          return
        }
        
        // Ne pas recharger si on a déjà un paiement en attente dans l'état local
        // SAUF si c'est un paiement qui vient d'être payé (on doit mettre à jour)
        if (hasPendingPayment(request) && data.type !== 'payment' && data.action !== 'paid') {
          console.log('[ADMIN REQUEST] ⏸️  globalSync ignoré - paiement en attente déjà présent dans l\'état local')
          return
        }
        
        console.log('[ADMIN REQUEST] 📡 Événement Socket.io globalSync reçu pour cette demande:', requestId, data)
        // Préserver les paiements pour éviter de perdre l'état
        setTimeout(() => {
          loadRequest(requestId, true)
        }, 1000)
      }
    }

    // S'abonner aux événements Socket.io
    socket.on('requestSync', handleRequestSync)
    socket.on('paymentCreated', handlePaymentCreated)
    socket.on('paymentPaid', handlePaymentPaid)
    socket.on('paymentSync', handlePaymentPaid) // Écouter aussi paymentSync
    socket.on('globalSync', handleGlobalSync)

    // Plus besoin de handlePaymentUpdate pour initialPayment - on utilise uniquement les paiements réels

    const handlePaymentCreatedDOM = (event: any) => {
      const data = event.detail || event
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        console.log('[ADMIN REQUEST] 📡 Événement DOM paymentCreated reçu pour cette demande:', requestId, data)
        // Ne JAMAIS recharger si le paiement est déjà dans l'état local (c'est nous qui l'avons créé)
        // Ajouter seulement si c'est un nouveau paiement créé par quelqu'un d'autre
        const isOurPayment = request?.payments?.some((p: any) => p._id === data.paymentId)
        if (!isOurPayment && request && data.paymentId) {
          const existingPayment = request.payments?.find((p: any) => p._id === data.paymentId)
          if (!existingPayment) {
            const newPayment = {
              _id: data.paymentId,
              amount: data.amount || 0,
              status: data.status || 'en_attente',
              type: request.type === 'location' ? 'loyer' : request.type === 'achat' ? 'achat' : 'autre',
              createdAt: data.timestamp || new Date().toISOString(),
              dueDate: data.dueDate,
              description: data.description
            }
            setRequest(prev => prev ? {
              ...prev,
              payments: [...(prev.payments || []), newPayment]
            } : null)
            console.log('[ADMIN REQUEST] 💳 Paiement ajouté à l\'état depuis DOM')
          }
        } else {
          console.log('[ADMIN REQUEST] ℹ️  Paiement déjà présent dans l\'état local - pas de rechargement pour éviter de perdre l\'état')
        }
      }
    }

    const handleRequestSyncDOM = (event: any) => {
      const data = event.detail || event
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        // Ne pas recharger si on vient juste de créer un paiement
        if (justCreatedPayment) {
          console.log('[ADMIN REQUEST] ⏸️  requestSync DOM ignoré - paiement créé récemment')
          return
        }
        
        // Ne pas recharger si on a déjà un paiement en attente dans l'état local
        if (hasPendingPayment(request)) {
          console.log('[ADMIN REQUEST] ⏸️  requestSync DOM ignoré - paiement en attente déjà présent dans l\'état local')
          return
        }
        
        console.log('[ADMIN REQUEST] 📡 Événement DOM requestSync reçu pour cette demande:', requestId, data)
        // Préserver les paiements pour éviter de perdre l'état
        setTimeout(() => {
          loadRequest(requestId, true)
        }, 1000)
      }
    }

    const handleGlobalSyncDOM = (event: any) => {
      const data = event.detail || event
      const dataRequestId = data.requestId?.toString() || data.requestId
      if (dataRequestId === requestId || dataRequestId?.trim() === requestId) {
        // Ne pas recharger si on vient juste de créer un paiement
        if (justCreatedPayment) {
          console.log('[ADMIN REQUEST] ⏸️  globalSync DOM ignoré - paiement créé récemment')
          return
        }
        
        // Ne pas recharger si on a déjà un paiement en attente dans l'état local
        if (hasPendingPayment(request)) {
          console.log('[ADMIN REQUEST] ⏸️  globalSync DOM ignoré - paiement en attente déjà présent dans l\'état local')
          return
        }
        
        console.log('[ADMIN REQUEST] 📡 Événement DOM globalSync reçu pour cette demande:', requestId, data)
        // Préserver les paiements pour éviter de perdre l'état
        setTimeout(() => {
          loadRequest(requestId, true)
        }, 1000)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('paymentCreated', handlePaymentCreatedDOM);
      window.addEventListener('requestSync', handleRequestSyncDOM);
      window.addEventListener('globalSync', handleGlobalSyncDOM);
      window.addEventListener('globalRequestSync', handleRequestSyncDOM);
    }

    // Nettoyage
    return () => {
      socket.off('requestSync', handleRequestSync)
      socket.off('paymentCreated', handlePaymentCreated)
      socket.off('paymentPaid', handlePaymentPaid)
      socket.off('paymentSync', handlePaymentPaid)
      socket.off('globalSync', handleGlobalSync)
      if (typeof window !== 'undefined') {
        window.removeEventListener('paymentCreated', handlePaymentCreatedDOM);
        window.removeEventListener('requestSync', handleRequestSyncDOM);
        window.removeEventListener('globalSync', handleGlobalSyncDOM);
        window.removeEventListener('globalRequestSync', handleRequestSyncDOM);
      }
    }
  }, [socket, isConnected, id, request?._id, justCreatedPayment])

  // Fonction pour vérifier s'il existe un paiement en attente
  // Uniformiser tous les statuts possibles à 'en_attente'
  // Fonction pour vérifier s'il existe un paiement en attente
  // IMPORTANT: Ne retourne true QUE si un paiement est vraiment en attente (pas payé)
  const hasPendingPayment = (req: Request | null): boolean => {
    if (!req?.payments || req.payments.length === 0) {
      return false
    }
    const hasPending = req.payments.some((p: any) => {
      const status = (p.status || '').toLowerCase().trim()
      // Vérifier que ce n'est PAS un paiement payé
      const isPaid = status === 'paye' || status === 'paid' || status === 'completed'
      if (isPaid) {
        return false // Ignorer les paiements payés
      }
      // Vérifier que c'est un paiement en attente
      const isPending = status === 'en_attente' || 
             status === 'pending' || 
             status === 'payment_pending' || 
             status === 'pending_payment' || 
             status === 'awaiting_payment'
      return isPending
    })
    return hasPending
  }

  // Fonction pour obtenir le paiement en attente
  // Uniformiser tous les statuts possibles à 'en_attente'
  const getPendingPayment = (req: Request | null) => {
    if (!req?.payments || req.payments.length === 0) return null
    return req.payments.find((p: any) => {
      const status = (p.status || '').toLowerCase().trim()
      // Exclure explicitement les paiements payés
      const isPaid = status === 'paye' || status === 'paid' || status === 'completed'
      if (isPaid) {
        return false // Ignorer les paiements payés
      }
      // Vérifier que c'est un paiement en attente
      return status === 'en_attente' || 
             status === 'pending' || 
             status === 'payment_pending' || 
             status === 'pending_payment' || 
             status === 'awaiting_payment'
    }) || null
  }

  // Fonction pour vérifier si tous les paiements sont payés
  const allPaymentsPaid = (req: Request | null) => {
    if (!req?.payments || req.payments.length === 0) {
      return false // Pas de paiements = pas tous payés
    }
    // Vérifier que TOUS les paiements sont payés
    const allPaid = req.payments.every((p: any) => {
      const status = (p.status || '').toLowerCase().trim()
      const isPaid = status === 'paye' || status === 'paid' || status === 'completed'
      if (!isPaid) {
        console.log('[ALL PAYMENTS PAID] Paiement non payé trouvé:', {
          id: p._id,
          status: p.status,
          amount: p.amount
        })
      }
      return isPaid
    })
    
    console.log('[ALL PAYMENTS PAID] Résultat:', {
      paymentsCount: req.payments.length,
      allPaid,
      payments: req.payments.map((p: any) => ({
        id: p._id,
        status: p.status,
        amount: p.amount
      }))
    })
    
    return allPaid
  }

  // Fonction pour vérifier s'il existe au moins un paiement payé
  const hasPaidPayment = (req: Request | null) => {
    if (!req?.payments || req.payments.length === 0) {
      return false
    }
    return req.payments.some((p: any) => {
      const status = (p.status || '').toLowerCase().trim()
      return status === 'paye' || status === 'paid' || status === 'completed'
    })
  }

  // Composant pour gérer l'affichage du bouton de demande de paiement
  const PaymentRequestSection = ({ request, creatingPayment, onRequestPayment }: {
    request: Request | null
    creatingPayment: boolean
    onRequestPayment: () => void
  }) => {
    if (!request) return null

    // Logs de débogage pour comprendre l'état des paiements
    console.log('[PAYMENT REQUEST SECTION] État des paiements:', {
      paymentsCount: request.payments?.length || 0,
      payments: request.payments?.map((p: any) => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt
      })) || [],
      hasPending: hasPendingPayment(request),
      allPaid: allPaymentsPaid(request)
    })

    // Vérifier si tous les documents sont signés
    const allDocumentsSigned = request.generatedDocuments && 
      request.generatedDocuments.length > 0 &&
      request.generatedDocuments.every((doc: any) => doc.signed === true)

    // Si un paiement est en attente, afficher le statut
    if (hasPendingPayment(request)) {
      const pendingPayment = getPendingPayment(request)
      if (pendingPayment) {
        return (
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏳</span>
              <span className="font-semibold text-yellow-800">Demande de paiement en attente</span>
            </div>
            <p className="text-sm text-yellow-700 mb-2">
              Une demande de paiement de <strong>${formatAmount(pendingPayment.amount)}</strong> a été créée et envoyée au demandeur.
            </p>
            <p className="text-xs text-yellow-600">
              📅 Créée le {pendingPayment.createdAt ? new Date(pendingPayment.createdAt).toLocaleString('fr-CA') : new Date().toLocaleString('fr-CA')}
              {pendingPayment.dueDate && ` • Échéance: ${new Date(pendingPayment.dueDate).toLocaleDateString('fr-CA')}`}
            </p>
            <p className="text-xs text-blue-600 mt-2 font-semibold">
              👤 Le demandeur peut maintenant effectuer le paiement via son tableau de bord.
            </p>
          </div>
        )
      }
    }

    // Si au moins un paiement est payé, afficher un message de confirmation
    // (même si tous ne sont pas payés, on affiche le statut du paiement payé)
    if (hasPaidPayment(request)) {
      const paidPayments = request.payments?.filter((p: any) => {
        const status = (p.status || '').toLowerCase().trim()
        return status === 'paye' || status === 'paid' || status === 'completed'
      }) || []
      
      if (paidPayments.length > 0) {
        // Trier par date de paiement (plus récent en premier)
        paidPayments.sort((a: any, b: any) => {
          const dateA = new Date(a.paidAt || a.createdAt || 0).getTime()
          const dateB = new Date(b.paidAt || b.createdAt || 0).getTime()
          return dateB - dateA
        })
        
        const latestPayment = paidPayments[0] // Le plus récent
        return (
          <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold text-green-800">
                {allPaymentsPaid(request) ? 'Tous les paiements effectués' : 'Paiement effectué'}
              </span>
            </div>
            <p className="text-sm text-green-700 mb-2">
              Le paiement de <strong>${formatAmount(latestPayment.amount)}</strong> a été effectué avec succès.
            </p>
            {latestPayment.paidAt && (
              <p className="text-xs text-green-600">
                📅 Payé le {new Date(latestPayment.paidAt).toLocaleString('fr-CA')}
              </p>
            )}
            {latestPayment.paymentMethod && (
              <p className="text-xs text-green-600">
                💳 Méthode: {latestPayment.paymentMethod}
              </p>
            )}
            {!allPaymentsPaid(request) && hasPendingPayment(request) && (
              <p className="text-xs text-yellow-600 mt-2">
                ⚠️ D'autres paiements sont encore en attente.
              </p>
            )}
          </div>
        )
      }
    }

    // Afficher le bouton seulement si toutes les conditions sont remplies
    // ET s'il n'y a vraiment aucun paiement en attente (vérification stricte)
    // ET s'il n'y a pas de paiement payé (même un seul)
    const hasAnyPendingPayment = hasPendingPayment(request)
    const allPaid = allPaymentsPaid(request)
    const hasAnyPaidPayment = hasPaidPayment(request)
    
    console.log('[PAYMENT REQUEST SECTION] Conditions pour afficher le bouton:', {
      statusAccepte: request.status === 'accepte',
      allDocumentsSigned,
      hasAnyPendingPayment,
      allPaid,
      hasAnyPaidPayment,
      shouldShowButton: request.status === 'accepte' && allDocumentsSigned && !hasAnyPendingPayment && !hasAnyPaidPayment
    })
    
    // Ne PAS afficher le bouton si :
    // - Il y a un paiement en attente
    // - Il y a au moins un paiement payé (même si tous ne sont pas payés)
    if (request.status === 'accepte' && 
        allDocumentsSigned && 
        !hasAnyPendingPayment &&
        !hasAnyPaidPayment) {
      return (
        <button
          onClick={onRequestPayment}
          disabled={creatingPayment}
          className="w-full mt-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creatingPayment ? '⏳ Création...' : '💳 Demander un paiement au demandeur'}
        </button>
      )
    }

    // Ne jamais retourner le bouton si un paiement est en attente ou si tous sont payés
    // Même si les autres conditions sont remplies
    return null
  }

  const loadRequest = async (requestId?: string, preservePayments: boolean = false) => {
    try {
      const token = getAuthToken()
      const idValue = Array.isArray(id) ? id[0] : id
      const requestIdToUse = requestId || request?._id || idValue
      
      if (!requestIdToUse) {
        setError('ID de la demande manquant')
        setLoading(false)
        return
      }
      
      // TOUJOURS préserver les paiements existants pour éviter de perdre l'état
      const existingPayments = request?.payments || []
      
      const url = buildApiUrlWithId('requests', requestIdToUse)
      const response = await axios.get(url, getApiConfig(token))
      
      if (response.status === 200 && response.data && response.data.success) {
        const loadedRequest = response.data.data
        const serverPayments = loadedRequest.payments || []
        
        console.log('[LOAD REQUEST] 📥 Paiements reçus du serveur:', serverPayments.map((p: any) => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
          paidAt: p.paidAt
        })))
        
        // Le serveur est la source de vérité - utiliser TOUJOURS les paiements du serveur
        // Normaliser tous les statuts des paiements du serveur pour uniformité
        const normalizedServerPayments = serverPayments.map((payment: any) => {
          const normalizedPayment = { ...payment }
          const originalStatus = normalizedPayment.status
          // Normaliser le statut
          if (normalizedPayment.status === 'pending' || 
              normalizedPayment.status === 'payment_pending' || 
              normalizedPayment.status === 'pending_payment' || 
              normalizedPayment.status === 'awaiting_payment') {
            normalizedPayment.status = 'en_attente'
          }
          // S'assurer que le statut 'paye' est bien reconnu
          if (normalizedPayment.status === 'paid' || normalizedPayment.status === 'completed') {
            normalizedPayment.status = 'paye'
          }
          
          if (originalStatus !== normalizedPayment.status) {
            console.log('[LOAD REQUEST] 🔄 Statut normalisé:', { original: originalStatus, normalized: normalizedPayment.status })
          }
          
          return normalizedPayment
        })
        
        // Si preservePayments est true, ajouter seulement les paiements locaux qui n'existent pas encore côté serveur
        // (cas où le paiement vient d'être créé et n'est pas encore synchronisé)
        let mergedPayments = [...normalizedServerPayments]
        
        if (preservePayments) {
          existingPayments.forEach((existingPayment: any) => {
            const existsInServer = normalizedServerPayments.some((p: any) => {
              const serverId = p._id?.toString() || p._id
              const existingId = existingPayment._id?.toString() || existingPayment._id
              return serverId === existingId
            })
            
            // Normaliser le statut pour la comparaison
            const normalizedStatus = existingPayment.status === 'pending' || 
                                     existingPayment.status === 'payment_pending' || 
                                     existingPayment.status === 'pending_payment' || 
                                     existingPayment.status === 'awaiting_payment' 
                                     ? 'en_attente' 
                                     : existingPayment.status === 'paid' || existingPayment.status === 'completed'
                                     ? 'paye'
                                     : existingPayment.status
            
            // Ajouter seulement si le paiement n'existe pas côté serveur ET qu'il est en attente
            // (on ne garde pas les paiements payés locaux si le serveur ne les a pas)
            if (!existsInServer && normalizedStatus === 'en_attente') {
              mergedPayments.push({
                ...existingPayment,
                status: 'en_attente'
              })
            }
          })
        }
        
        // Trier par date de création (plus récent en premier)
        mergedPayments.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          return dateB - dateA
        })
        
        loadedRequest.payments = mergedPayments
        
        console.log('[LOAD REQUEST] 📄 Données chargées:', {
          requestId: loadedRequest?._id,
          status: loadedRequest?.status,
          hasDocuments: !!(loadedRequest?.generatedDocuments && loadedRequest.generatedDocuments.length > 0),
          documentsCount: loadedRequest?.generatedDocuments?.length || 0,
          paymentsCount: loadedRequest?.payments?.length || 0,
          existingPaymentsCount: existingPayments.length,
          serverPaymentsCount: serverPayments.length,
          mergedPaymentsCount: mergedPayments.length,
          paymentsStatus: mergedPayments.map((p: any) => ({
            id: p._id,
            status: p.status,
            amount: p.amount,
            paidAt: p.paidAt
          }))
        });
        
        setRequest(loadedRequest)
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

      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request._id || idValue
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
          // Mettre à jour l'état local immédiatement avec les données de la réponse
          if (response.data.data) {
            console.log('[ACCEPT] 📄 Réponse complète reçue:', {
              hasData: !!response.data.data,
              hasDocuments: !!(response.data.data.generatedDocuments && response.data.data.generatedDocuments.length > 0),
              documentsCount: response.data.data.generatedDocuments?.length || 0,
              documents: response.data.data.generatedDocuments || []
            });
            
            // Mettre à jour immédiatement avec les données de la réponse
            setRequest(response.data.data)
          }
          
          // Afficher le message de succès
          showSuccessMessage(response.data.message || 'Demande acceptée avec succès !')
          
          // Recharger les données après un court délai pour s'assurer d'avoir les documents à jour
          // Utiliser un délai pour laisser le temps au backend de finaliser la sauvegarde
          setTimeout(async () => {
            console.log('[ACCEPT] 🔄 Rechargement des données pour afficher les documents...');
            await loadRequest()
          }, 1000) // Augmenter le délai à 1 seconde pour s'assurer que les documents sont sauvegardés
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
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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
        setTimeout(() => {
          loadRequest()
        }, 500)
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
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
      if (!requestId) {
        showErrorMessage('Impossible de traiter la demande. L\'identifiant est manquant.')
        setSigningDoc(false)
        return
      }
      
      const url = buildApiUrlWithId('requests', requestId, `documents/${docId}/unsign`)
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

  const handleRequestPayment = async () => {
    // Vérifier que tous les documents sont signés
    if (!request) {
      showErrorMessage('Impossible de créer la demande de paiement. La demande est invalide.')
      return
    }

    const allDocumentsSigned = request.generatedDocuments && 
      request.generatedDocuments.length > 0 &&
      request.generatedDocuments.every((doc: any) => doc.signed === true)

    if (!allDocumentsSigned) {
      showErrorMessage('Tous les documents doivent être signés avant de créer une demande de paiement')
      return
    }

    // Vérifier qu'il n'y a pas déjà un paiement en attente
    if (hasPendingPayment(request)) {
      showErrorMessage('Une demande de paiement est déjà en attente pour cette demande.')
      return
    }

    // Calculer le montant par défaut basé sur le type de demande
    let defaultAmount = ''
    if (request.unit) {
      if (request.type === 'location' && (request.unit as any).rentPrice) {
        defaultAmount = String((request.unit as any).rentPrice)
      } else if (request.type === 'achat' && (request.unit as any).salePrice) {
        // Pour un achat, prendre 10% du prix de vente comme paiement initial
        defaultAmount = String(Math.round((request.unit as any).salePrice * 0.1))
      }
    }
    
    // Si pas de montant par défaut, utiliser une valeur raisonnable
    if (!defaultAmount) {
      defaultAmount = request.type === 'location' ? '950' : '35000'
    }
    
    // Calculer la date d'échéance par défaut (30 jours à partir d'aujourd'hui)
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
    const defaultDueDateString = defaultDueDate.toISOString().split('T')[0]
    
    // Pré-remplir les champs
    setPaymentAmount(defaultAmount)
    setPaymentDueDate(defaultDueDateString)
    
    // Ouvrir le modal de création de paiement
    setShowCreatePaymentModal(true)
  }

  const handleValidatePayment = async () => {
    if (!paymentMethod.trim()) {
      showErrorMessage('Veuillez sélectionner une méthode de paiement')
      return
    }

    setValidatingPayment(true)
    try {
      const token = getAuthToken()
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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
        
        showSuccessMessage(response.data.message || 'Paiement validé avec succès !')
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

  const handleCreatePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showErrorMessage('Le montant doit être supérieur à 0')
      return
    }

    if (!paymentDueDate) {
      showErrorMessage('La date d\'échéance est requise')
      return
    }

    setCreatingPayment(true)
    try {
      const token = getAuthToken()
      if (!token) {
        showErrorMessage('Vous devez être connecté pour créer un paiement')
        setCreatingPayment(false)
        return
      }
      
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
      if (!requestId || !request) {
        showErrorMessage('Impossible de créer le paiement. La demande est invalide.')
        setCreatingPayment(false)
        return
      }

      // Vérifier que tous les documents sont signés
      const allDocumentsSigned = request.generatedDocuments && 
        request.generatedDocuments.length > 0 &&
        request.generatedDocuments.every((doc: any) => doc.signed === true)

      if (!allDocumentsSigned) {
        showErrorMessage('Tous les documents doivent être signés avant de créer un paiement')
        setCreatingPayment(false)
        return
      }

      // Vérifier que le payeur existe
      if (!request.createdBy?._id && !request.createdBy) {
        showErrorMessage('Impossible de créer le paiement. Le demandeur est invalide.')
        setCreatingPayment(false)
        return
      }

      // Vérifier que l'unité existe
      if (!request.unit?._id && !request.unit) {
        showErrorMessage('Impossible de créer le paiement. L\'unité est invalide.')
        setCreatingPayment(false)
        return
      }

      // Normaliser les IDs pour s'assurer qu'ils sont des strings
      const unitId = request.unit?._id ? String(request.unit._id) : (request.unit ? String(request.unit) : null)
      const buildingId = request.building?._id ? String(request.building._id) : (request.building ? String(request.building) : null)
      const payerId = request.createdBy?._id ? String(request.createdBy._id) : (request.createdBy ? String(request.createdBy) : null)
      
      if (!unitId) {
        showErrorMessage('Impossible de créer le paiement. L\'unité est invalide ou manquante.')
        setCreatingPayment(false)
        return
      }
      
      if (!payerId) {
        showErrorMessage('Impossible de créer le paiement. Le demandeur est invalide ou manquant.')
        setCreatingPayment(false)
        return
      }

      const paymentData: any = {
        unit: unitId,
        building: buildingId,
        payer: payerId,
        amount: parseFloat(paymentAmount),
        type: request.type === 'location' ? 'loyer' : request.type === 'achat' ? 'achat' : 'autre',
        description: `Paiement pour ${request.type === 'location' ? 'location' : 'achat'} - ${request.title}`,
        dueDate: new Date(paymentDueDate).toISOString(),
        requestId: String(requestId)
      }

      console.log('[ADMIN] Création de paiement avec données:', {
        unit: paymentData.unit,
        building: paymentData.building,
        payer: paymentData.payer,
        amount: paymentData.amount,
        type: paymentData.type,
        description: paymentData.description,
        dueDate: paymentData.dueDate,
        requestId: paymentData.requestId,
        allFieldsPresent: !!(paymentData.unit && paymentData.payer && paymentData.amount && paymentData.dueDate)
      })

      const url = buildApiUrl('payments')
      console.log('[ADMIN] URL de création de paiement:', url)
      console.log('[ADMIN] Données envoyées:', JSON.stringify(paymentData, null, 2))
      
      const response = await axios.post(url, paymentData, getApiConfig(token))
      
      console.log('[ADMIN] Réponse complète de création de paiement:', {
        status: response.status,
        statusText: response.statusText,
        success: response.data?.success,
        message: response.data?.message,
        error: response.data?.error,
        data: response.data?.data,
        fullResponse: response.data
      })

      // Vérifier si c'est une erreur HTTP (4xx ou 5xx)
      if (response.status >= 400) {
        const errorMsg = response.data?.message || response.data?.error || `Erreur HTTP ${response.status}`
        console.error('[ADMIN] Erreur HTTP lors de la création du paiement:', {
          status: response.status,
          message: errorMsg,
          data: response.data
        })
        showErrorMessage(errorMsg)
        setCreatingPayment(false)
        return
      }

      if (response.status === 200 || response.status === 201) {
        if (response.data && response.data.success) {
          showSuccessMessage('Demande de paiement créée avec succès ! Le client a été notifié.')
          setShowCreatePaymentModal(false)
          setPaymentAmount('')
          setPaymentDueDate('')
          
          // Mettre à jour immédiatement le state avec le paiement créé pour éviter le flash
          if (response.data.data && request) {
            const newPayment = response.data.data
            // S'assurer que le paiement a le bon statut (uniformiser à 'en_attente')
            if (!newPayment.status || newPayment.status === 'pending' || newPayment.status === 'payment_pending' || newPayment.status === 'pending_payment' || newPayment.status === 'awaiting_payment') {
              newPayment.status = 'en_attente'
            }
            // S'assurer que le paiement a un createdAt si manquant
            if (!newPayment.createdAt) {
              newPayment.createdAt = new Date().toISOString()
            }
            const updatedPayments = request.payments ? [...request.payments, newPayment] : [newPayment]
            const updatedRequest = {
              ...request,
              payments: updatedPayments
            }
            setRequest(updatedRequest)
            
            console.log('[PAYMENT CREATED] 💳 Paiement ajouté à l\'état local:', {
              paymentId: newPayment._id,
              amount: newPayment.amount,
              status: newPayment.status,
              paymentsCount: updatedPayments.length,
              hasPendingPayment: hasPendingPayment(updatedRequest),
              allPayments: updatedPayments.map((p: any) => ({ id: p._id, status: p.status, amount: p.amount }))
            })
          }
          
          // Activer le flag pour empêcher les rechargements automatiques pendant 15 secondes
          setJustCreatedPayment(true)
          setTimeout(() => {
            setJustCreatedPayment(false)
            console.log('[PAYMENT CREATED] ⏰ Flag justCreatedPayment désactivé après 15 secondes')
          }, 15000)
          
          // Ne JAMAIS recharger automatiquement - le paiement est déjà dans l'état local
          // Le rechargement se fera uniquement via Socket.io si quelqu'un d'autre modifie la demande
          // Cela évite d'écraser l'état local avec une réponse serveur qui pourrait ne pas encore avoir le paiement
          
          // Réinitialiser le state
          setCreatingPayment(false)
        } else {
          const errorMsg = response.data?.message || response.data?.error || 'Une erreur est survenue lors de la création du paiement.'
          console.error('[ADMIN] Réponse indique un échec:', {
            success: response.data?.success,
            message: response.data?.message,
            error: response.data?.error,
            data: response.data
          })
          showErrorMessage(errorMsg)
          setCreatingPayment(false)
        }
      } else {
        const errorMsg = `Erreur inattendue: Status ${response.status}`
        console.error('[ADMIN] Status HTTP inattendu:', response.status)
        showErrorMessage(errorMsg)
        setCreatingPayment(false)
      }
    } catch (error: any) {
      console.error('[ADMIN] Exception lors de la création du paiement:', error)
      console.error('[ADMIN] Détails complets de l\'erreur:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : null,
        request: error.request ? {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        } : null
      })
      
      // Déterminer le message d'erreur approprié
      let errorMessage = 'Une erreur est survenue lors de la création du paiement. Veuillez réessayer.'
      
      if (error.response) {
        // Erreur de réponse du serveur
        errorMessage = error.response.data?.message || 
                      error.response.data?.error ||
                      `Erreur serveur (${error.response.status}): ${error.response.statusText || 'Erreur inconnue'}`
      } else if (error.request) {
        // Pas de réponse du serveur (problème réseau)
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et que le serveur backend est démarré.'
      } else {
        // Autre erreur
        errorMessage = error.message || getErrorMessage(error, errorMessage)
      }
      
      showErrorMessage(errorMessage)
      setCreatingPayment(false)
    }
  }

  const handleAssignUnit = async () => {
    if (!confirm('Êtes-vous sûr de vouloir attribuer cette unité au demandeur ? Cette action est irréversible.')) {
      return
    }

    setAssigningUnit(true)
    try {
      const token = getAuthToken()
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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
      const idValue = Array.isArray(id) ? id[0] : id
      const requestId = request?._id || idValue
      
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

              {/* Carte Google Maps - Afficher si l'immeuble a une adresse */}
              {request.building?.address && (
                <div className="card p-6">
                  <GoogleMapCard
                    address={request.building.address}
                    title="Localisation de l'immeuble"
                    height="400px"
                  />
                </div>
              )}

              {/* Profil du demandeur */}
              {request.createdBy && (
                <div className="card p-6">
                  <h2 className="text-2xl font-bold mb-4">Profil du demandeur</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                      <p className="text-gray-900">{request.createdBy?.firstName || ''} {request.createdBy?.lastName || ''}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{request.createdBy?.email || ''}</p>
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
                    </div>
                  </div>
                </div>
              )}


              {/* Documents générés - Affichage uniquement si des documents existent */}
              {request.status === 'accepte' && request.generatedDocuments && request.generatedDocuments.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Documents générés</h2>
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                      {request.generatedDocuments.length} document{request.generatedDocuments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      {request.generatedDocuments.map((doc, index) => (
                        <div key={index} className={`flex items-start justify-between p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md ${
                          doc.signed 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                            : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{doc.signed ? '✅' : '📝'}</span>
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 text-base">{doc.filename}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {doc.type === 'bail' ? '📄 Bail de location' : doc.type === 'contrat_vente' ? '📄 Contrat de vente' : '📄 Document'}
                                </p>
                              </div>
                            </div>
                            <div className="ml-10 space-y-1">
                              {doc.generatedAt && (
                                <p className="text-xs text-gray-500">
                                  📅 Généré le {new Date(doc.generatedAt).toLocaleString('fr-CA', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                              {doc.signed && doc.signedAt && (
                                <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                                  <p className="text-xs text-green-800 font-semibold">
                                    ✅ Signé le {new Date(doc.signedAt).toLocaleDateString('fr-CA', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  <p className="text-xs text-green-700 mt-1">
                                    Par : {doc.signedBy?.firstName || 'N/A'} {doc.signedBy?.lastName || ''}
                                  </p>
                                </div>
                              )}
                              {!doc.signed && (
                                <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                                  <p className="text-xs text-yellow-800 font-semibold">
                                    ⏳ En attente de signature
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleDownloadDocument(doc._id || index, doc.filename)}
                              className="btn-secondary text-xs px-3 py-2 whitespace-nowrap"
                            >
                              📥 Télécharger
                            </button>
                            {!doc.signed && (
                              <button
                                onClick={() => handleSignDocument(doc._id || index)}
                                disabled={signingDoc}
                                className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
                              >
                                {signingDoc ? '⏳ Signature...' : '✍️ Signer (Admin)'}
                              </button>
                            )}
                            {doc.signed && (
                              <button
                                onClick={() => handleUnsignDocument(doc._id || index)}
                                disabled={signingDoc}
                                className="btn-secondary bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-2 whitespace-nowrap"
                                title="Annuler la signature pour permettre au demandeur de signer manuellement"
                              >
                                {signingDoc ? '⏳ Annulation...' : '↩️ Annuler signature'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {request.generatedDocuments.every((doc: any) => doc.signed) ? (
                        <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                          <p className="text-sm text-green-800 font-semibold mb-1">
                            ✅ Tous les documents sont signés
                          </p>
                          <p className="text-xs text-green-700">
                            Vous pouvez maintenant créer une demande de paiement.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-semibold mb-2">
                            💡 Instructions
                          </p>
                          <p className="text-xs text-blue-700">
                            Le client et le propriétaire doivent signer les documents. 
                            {request.generatedDocuments.some((doc: any) => !doc.signed) && (
                              <span> Les notifications ont été envoyées automatiquement.</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section de demande de paiement */}
              {request.status === 'accepte' && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Demande de paiement</h2>
                  <PaymentRequestSection 
                    request={request}
                    creatingPayment={creatingPayment}
                    onRequestPayment={handleRequestPayment}
                  />
                  
                  {/* Afficher les demandes de paiement créées */}
                  {request.payments && request.payments.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold mb-4">Demandes de paiement créées</h3>
                      <div className="space-y-3">
                        {request.payments.map((payment: any) => (
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
                                <p className="text-sm text-gray-600">
                                  <strong>Créé le:</strong> {new Date(payment.createdAt).toLocaleString('fr-CA')}
                                </p>
                                {payment.dueDate && (
                                  <p className="text-sm text-gray-600">
                                    <strong>Échéance:</strong> {new Date(payment.dueDate).toLocaleDateString('fr-CA')}
                                  </p>
                                )}
                                {payment.description && (
                                  <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
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
                              {payment.status === 'en_attente' && (
                                <Link
                                  href={`/payments/${payment._id}/pay`}
                                  className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm whitespace-nowrap"
                                >
                                  💳 Payer
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flux de traitement - 4 Étapes */}
              {request.status === 'accepte' && (
                <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="text-2xl">🔄</span>
                    Flux de traitement de la demande
                  </h2>
                  <div className="space-y-4">
                    {/* ÉTAPE 1 : Acceptation (déjà fait) */}
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-green-900 mb-1">✅ Étape 1 : Actions de l'admin</p>
                          <p className="text-sm text-green-800 mb-2">Demande acceptée</p>
                          <p className="text-xs text-gray-700">
                            Acceptée le {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('fr-CA') : 'N/A'} 
                            {request.approvedBy && ` par ${request.approvedBy.firstName} ${request.approvedBy.lastName}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ÉTAPE 2 : Génération des documents - Toujours affichée après acceptation */}
                    <div className={`border-2 rounded-lg p-4 ${
                      request.generatedDocuments && request.generatedDocuments.length > 0
                        ? (request.generatedDocuments.every((doc: any) => doc.signed)
                            ? 'bg-green-50 border-green-300'
                            : 'bg-yellow-50 border-yellow-300')
                        : 'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          request.generatedDocuments && request.generatedDocuments.length > 0
                            ? (request.generatedDocuments.every((doc: any) => doc.signed)
                                ? 'bg-green-500'
                                : 'bg-yellow-500')
                            : 'bg-blue-500'
                        }`}>
                          2
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold mb-1 ${
                            request.generatedDocuments && request.generatedDocuments.length > 0
                              ? (request.generatedDocuments.every((doc: any) => doc.signed)
                                  ? 'text-green-900'
                                  : 'text-yellow-900')
                              : 'text-blue-900'
                          }`}>
                            📝 Étape 2 : Génération des documents
                          </p>
                          <div>
                            {request.generatedDocuments && request.generatedDocuments.length > 0 ? (
                              <>
                                <p className={`text-sm mb-2 ${
                                  request.generatedDocuments.every((doc: any) => doc.signed)
                                    ? 'text-green-800'
                                    : 'text-yellow-800'
                                }`}>
                                  {request.generatedDocuments.every((doc: any) => doc.signed)
                                    ? '✅ Tous les documents sont signés'
                                    : '⏳ Documents en attente de signature'
                                  }
                                </p>
                                <div className="text-xs text-gray-700 space-y-1">
                                  <p>
                                    ✅ Documents générés automatiquement lors de l'acceptation et envoyés au demandeur pour signature.
                                  </p>
                                  <p>
                                    📄 {request.generatedDocuments.length} document(s) généré(s) : {
                                      request.generatedDocuments.map((doc: any) => 
                                        doc.type === 'bail' ? 'Bail' : doc.type === 'contrat_vente' ? 'Contrat de vente' : 'Document'
                                      ).join(', ')
                                    }
                                  </p>
                                  <p>
                                    {request.generatedDocuments.filter((doc: any) => !doc.signed).length} en attente de signature • {
                                      request.generatedDocuments.filter((doc: any) => doc.signed).length
                                    } signé(s)
                                  </p>
                                  {!request.generatedDocuments.every((doc: any) => doc.signed) && (
                                    <p className="text-yellow-700 font-semibold mt-2">
                                      💡 Le client et le propriétaire doivent signer les documents. Notifications envoyées automatiquement.
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-green-800 mb-2">
                                      ✅ Documents générés automatiquement lors de l'acceptation
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Les documents ({request.type === 'location' ? 'bail de location' : 'contrat de vente'}) ont été générés automatiquement lors de l'acceptation et envoyés au demandeur pour signature.
                                    </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ÉTAPE 3 : Demande de paiement */}
                    <div className={`border-2 rounded-lg p-4 ${
                      request.generatedDocuments && 
                      request.generatedDocuments.length > 0 &&
                      request.generatedDocuments.every((doc: any) => doc.signed)
                        ? (() => {
                            // Vérifier s'il y a un paiement en attente ou payé
                            const hasPayment = (request as any).payments?.some((p: any) => {
                              const status = p.status?.toLowerCase()
                              return status === 'en_attente' || status === 'paye' || status === 'pending'
                            })
                            if (hasPayment) {
                              const paidPayment = (request as any).payments?.find((p: any) => {
                                const status = p.status?.toLowerCase()
                                return status === 'paye' || status === 'paid'
                              })
                              return paidPayment ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
                            }
                            return 'bg-blue-50 border-blue-300'
                          })()
                        : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          request.generatedDocuments && 
                          request.generatedDocuments.length > 0 &&
                          request.generatedDocuments.every((doc: any) => doc.signed)
                            ? (() => {
                                const hasPayment = (request as any).payments?.some((p: any) => {
                                  const status = p.status?.toLowerCase()
                                  return status === 'en_attente' || status === 'paye' || status === 'pending'
                                })
                                if (hasPayment) {
                                  const paidPayment = (request as any).payments?.find((p: any) => {
                                    const status = p.status?.toLowerCase()
                                    return status === 'paye' || status === 'paid'
                                  })
                                  return paidPayment ? 'bg-green-500' : 'bg-yellow-500'
                                }
                                return 'bg-blue-500'
                              })()
                            : 'bg-gray-400'
                        }`}>
                          3
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold mb-1 ${
                            request.generatedDocuments && 
                            request.generatedDocuments.length > 0 &&
                            request.generatedDocuments.every((doc: any) => doc.signed)
                              ? 'text-blue-900'
                              : 'text-gray-600'
                          }`}>
                            💳 Étape 3 : Demande de paiement
                          </p>
                          {!(request.generatedDocuments && 
                            request.generatedDocuments.length > 0 &&
                            request.generatedDocuments.every((doc: any) => doc.signed)) ? (
                            <p className="text-sm text-gray-600">
                              ⏸️ En attente de la signature complète des documents
                            </p>
                          ) : (
                            <>
                              {(() => {
                                // Vérifier le statut du paiement basé uniquement sur payments
                                const pendingPayment = (request as any).payments?.find((p: any) => {
                                  const status = p.status?.toLowerCase()
                                  return status === 'en_attente' || status === 'pending'
                                })
                                const paidPayment = (request as any).payments?.find((p: any) => {
                                  const status = p.status?.toLowerCase()
                                  return status === 'paye' || status === 'paid'
                                })

                                if (paidPayment) {
                                  return (
                                    <div>
                                      <p className="text-sm text-green-800 font-semibold mb-1">✅ Paiement effectué</p>
                                      <p className="text-xs text-gray-700">
                                        Montant : ${formatAmount(paidPayment.amount)} • 
                                        Méthode : {paidPayment.paymentMethod || 'N/A'} • 
                                        Date : {paidPayment.paidAt 
                                          ? new Date(paidPayment.paidAt).toLocaleDateString('fr-CA') 
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  )
                                }

                                if (pendingPayment) {
                                  return (
                                    <div>
                                      <p className="text-sm text-yellow-800 font-semibold mb-1">
                                        💳 Demande de paiement créée - En attente de paiement {request.type === 'achat' ? 'par le propriétaire' : 'par le demandeur'}
                                      </p>
                                      <p className="text-xs text-yellow-700 mb-2">
                                        Une demande de paiement de <strong>${formatAmount(pendingPayment.amount)}</strong> a été créée et envoyée {request.type === 'achat' ? 'au propriétaire' : 'au demandeur'}.
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        📅 Créée le {new Date(pendingPayment.createdAt).toLocaleString('fr-CA')}
                                        {pendingPayment.dueDate && ` • Échéance: ${new Date(pendingPayment.dueDate).toLocaleDateString('fr-CA')}`}
                                      </p>
                                      <p className="text-xs text-blue-600 mt-2 font-semibold">
                                        👤 {request.type === 'achat' ? 'Le propriétaire' : 'Le demandeur'} peut maintenant effectuer le paiement via son tableau de bord.
                                      </p>
                                    </div>
                                  )
                                }

                                // Aucun paiement - afficher le bouton
                                return (
                                  <div>
                                    <p className="text-sm text-blue-800 mb-3">
                                      ✅ Documents signés - Créer la demande de paiement
                                    </p>
                                    <button
                                      onClick={handleRequestPayment}
                                      disabled={creatingPayment}
                                      className="w-full btn-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {creatingPayment ? '⏳ Création...' : `💳 Demander un paiement ${request.type === 'achat' ? 'au propriétaire' : 'au demandeur'}`}
                                    </button>
                                    <p className="text-xs text-gray-600 mt-2 text-center">
                                      ⚡ Une notification sera envoyée {request.type === 'achat' ? 'au propriétaire' : 'au demandeur'} pour effectuer le paiement
                                    </p>
                                  </div>
                                )
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ÉTAPE 4 : Attribution de l'unité */}
                    <div className={`border-2 rounded-lg p-4 ${
                      request.generatedDocuments && 
                      request.generatedDocuments.length > 0 &&
                      request.generatedDocuments.every((doc: any) => doc.signed) &&
                      (request as any).payments?.some((p: any) => {
                        const status = p.status?.toLowerCase()
                        return status === 'paye' || status === 'paid'
                      })
                        ? 'bg-green-50 border-green-300'
                        : (request.generatedDocuments && 
                            request.generatedDocuments.length > 0 &&
                            request.generatedDocuments.every((doc: any) => doc.signed) &&
                            (request as any).payments?.some((p: any) => {
                              const status = p.status?.toLowerCase()
                              return status === 'en_attente' || status === 'pending'
                            })
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-gray-50 border-gray-300 opacity-60')
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          request.generatedDocuments && 
                          request.generatedDocuments.length > 0 &&
                          request.generatedDocuments.every((doc: any) => doc.signed) &&
                          (request as any).payments?.some((p: any) => {
                            const status = p.status?.toLowerCase()
                            return status === 'paye' || status === 'paid'
                          })
                            ? 'bg-green-500'
                            : (request.generatedDocuments && 
                                request.generatedDocuments.length > 0 &&
                                request.generatedDocuments.every((doc: any) => doc.signed) &&
                                (request as any).payments?.some((p: any) => {
                                  const status = p.status?.toLowerCase()
                                  return status === 'en_attente' || status === 'pending'
                                })
                              ? 'bg-yellow-500'
                              : 'bg-gray-400')
                        }`}>
                          4
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold mb-1 ${
                            request.generatedDocuments && 
                            request.generatedDocuments.length > 0 &&
                            request.generatedDocuments.every((doc: any) => doc.signed) &&
                            (request as any).payments?.some((p: any) => {
                              const status = p.status?.toLowerCase()
                              return status === 'paye' || status === 'paid'
                            })
                              ? 'text-green-900'
                              : 'text-gray-600'
                          }`}>
                            🏡 Étape 4 : Attribution de l'unité
                          </p>
                          {(() => {
                            const allDocsSigned = request.generatedDocuments && 
                              request.generatedDocuments.length > 0 &&
                              request.generatedDocuments.every((doc: any) => doc.signed)
                            
                            const paymentDone = (request as any).payments?.some((p: any) => {
                              const status = p.status?.toLowerCase()
                              return status === 'paye' || status === 'paid'
                            })
                            
                            const unitAssigned = request.type === 'location' 
                              ? (request.unit as any)?.locataire 
                              : (request.unit as any)?.proprietaire
                            
                            if (unitAssigned) {
                              return (
                                <div>
                                  <p className="text-sm text-green-800 font-semibold mb-1">✅ Unité attribuée</p>
                                  <p className="text-xs text-gray-700">
                                    {request.type === 'location' 
                                      ? `Locataire : ${(request.unit as any)?.locataire?.firstName || 'N/A'} ${(request.unit as any)?.locataire?.lastName || ''}`
                                      : `Propriétaire : ${(request.unit as any)?.proprietaire?.firstName || 'N/A'} ${(request.unit as any)?.proprietaire?.lastName || ''}`
                                    }
                                  </p>
                                </div>
                              )
                            }
                            
                            if (!allDocsSigned) {
                              return (
                                <p className="text-sm text-gray-600">
                                  ⏸️ En attente de la signature complète des documents
                                </p>
                              )
                            }
                            
                            if (!paymentDone) {
                              return (
                                <p className="text-sm text-gray-600">
                                  ⏸️ En attente du paiement
                                </p>
                              )
                            }
                            
                            return (
                              <div>
                                <p className="text-sm text-green-800 font-semibold mb-3">
                                  ✅ Paiement reçu - Attribuer l'unité au client
                                </p>
                                <button
                                  onClick={() => setShowAssignModal(true)}
                                  disabled={assigningUnit}
                                  className="w-full btn-primary font-semibold"
                                >
                                  {assigningUnit ? '⏳ Attribution en cours...' : '🏡 Attribuer l\'unité au client'}
                                </button>
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                  Le client recevra une notification et aura accès à son unité dans son dashboard
                                </p>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
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


      {/* Modal de création de paiement */}
      {showCreatePaymentModal && request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Créer une demande de paiement</h2>
            <div className="space-y-4">
              {request.createdBy && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Client</p>
                  <p className="font-semibold">{request.createdBy.firstName} {request.createdBy.lastName}</p>
                  <p className="text-sm text-gray-600">{request.createdBy.email}</p>
                </div>
              )}
              {request.unit && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Unité</p>
                  <p className="font-semibold">Unité {(request.unit as any).unitNumber}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (CAD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 border"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 rounded-lg"
                  required
                />
              </div>
              {/* Different element needs rounded-lg independently */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Une notification sera envoyée au client pour lui demander d'effectuer le paiement.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreatePayment}
                disabled={creatingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPayment ? 'Création...' : 'Créer la demande de paiement'}
              </button>
              <button
                onClick={() => {
                  setShowCreatePaymentModal(false)
                  setPaymentAmount('')
                  setPaymentDueDate('')
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
                  <p className="text-lg font-bold">{request.createdBy?.firstName || ''} {request.createdBy?.lastName || ''}</p>
                  <p className="text-sm text-gray-600">{request.createdBy?.email || ''}</p>
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

