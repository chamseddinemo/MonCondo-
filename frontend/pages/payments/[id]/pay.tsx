import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentMethodSelector from '../../../components/payments/PaymentMethodSelector';
import { Payment } from '../../../types/payment';
import StripePaymentForm from '../../../components/payments/StripePaymentForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';

export default function PayPayment() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [interacBank, setInteracBank] = useState<string>('');
  const [interacContactMethod, setInteracContactMethod] = useState<'email' | 'phone'>('email');
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id && isAuthenticated) {
      loadPayment();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[PAYMENT_PAGE] Chargement du paiement:', id);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10 secondes de timeout
      });
      
      if (response.data.success) {
        console.log('[PAYMENT_PAGE] Paiement chargé avec succès:', response.data.data);
        setPayment(response.data.data);
      } else {
        const errorMsg = response.data.message || 'Paiement non trouvé';
        console.error('[PAYMENT_PAGE] Réponse non réussie:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('[PAYMENT_PAGE] Erreur chargement paiement:', err);
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.');
      } else if (err.response) {
        if (err.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          setTimeout(() => router.push('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Vous n\'êtes pas autorisé à accéder à ce paiement. Veuillez vérifier votre session ou vos permissions.');
        } else if (err.response.status === 404) {
          setError('Paiement non trouvé. Il a peut-être été supprimé ou n\'existe pas.');
        } else {
          setError(err.response?.data?.message || 'Erreur lors du chargement du paiement');
        }
      } else if (err.request) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré et votre connexion internet.');
      } else {
        setError('Erreur lors du chargement du paiement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = async (method: string) => {
    setSelectedMethod(method);
    setError(null);
    setInstructions(null);
    setProcessing(true);

    if (!payment) {
      setError('Paiement non trouvé');
      setProcessing(false);
      return;
    }

    try {
      if (method === 'carte_credit') {
        // Créer un PaymentIntent Stripe
        console.log('[FRONTEND] Création PaymentIntent pour paiement:', payment._id);
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_URL}/payments/${payment._id}/stripe/create-intent`, 
            {}, 
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000 // 15 secondes de timeout
            }
          );
          
          console.log('[FRONTEND] Réponse PaymentIntent:', response.data);
          
          if (response.data.success && response.data.data) {
            setInstructions(response.data.data);
            setError(null);
            console.log('[FRONTEND] PaymentIntent créé avec succès, clientSecret:', response.data.data.clientSecret ? 'présent' : 'absent');
          } else {
            const errorMsg = response.data.message || 'Erreur lors de la création du paiement';
            console.error('[FRONTEND] Erreur dans la réponse:', errorMsg);
            if (errorMsg.includes('Stripe n\'est pas configuré') || errorMsg.includes('configuré')) {
              setError('Le paiement par carte n\'est pas disponible pour le moment. Veuillez utiliser Interac ou virement bancaire.');
            } else {
              setError(errorMsg);
            }
            setSelectedMethod(''); // Réinitialiser pour permettre de choisir une autre méthode
          }
        } catch (stripeErr: any) {
          console.error('[FRONTEND] Erreur création PaymentIntent:', stripeErr);
          console.error('[FRONTEND] Détails erreur:', {
            status: stripeErr.response?.status,
            statusText: stripeErr.response?.statusText,
            data: stripeErr.response?.data,
            message: stripeErr.message
          });
          
          const errorMessage = stripeErr.response?.data?.message || stripeErr.message || 'Erreur lors de la création du paiement';
          const errorCode = stripeErr.response?.data?.code;
          const statusCode = stripeErr.response?.status;
          
          // Vérifier si c'est une erreur liée à Stripe non configuré
          const isStripeNotConfigured = 
            errorCode === 'STRIPE_NOT_CONFIGURED' ||
            errorMessage.includes('Stripe n\'est pas configuré') || 
            errorMessage.includes('configuré') ||
            errorMessage.includes('STRIPE_SECRET_KEY') ||
            errorMessage.includes('non défini') ||
            errorMessage.includes('non initialisé') ||
            statusCode === 503;
          
          if (isStripeNotConfigured) {
            setError('Le paiement par carte n\'est pas disponible pour le moment. Veuillez utiliser Interac ou virement bancaire.');
          } else if (statusCode === 403) {
            setError('Vous n\'êtes pas autorisé à effectuer ce paiement.');
          } else if (statusCode === 400) {
            // Pour les erreurs 400 qui ne sont pas liées à la configuration
            setError(errorMessage || 'Erreur lors de la création du PaymentIntent. Vérifiez que tous les champs sont valides.');
          } else {
            setError(errorMessage);
          }
          setSelectedMethod(''); // Réinitialiser pour permettre de choisir une autre méthode
          setInstructions(null);
        } finally {
          setProcessing(false);
        }
      } else if (method === 'interac') {
        // Vérifier que la banque et la méthode de contact sont sélectionnées
        if (!interacBank) {
          setError('Veuillez sélectionner votre banque');
          setProcessing(false);
          return;
        }
        
        // Obtenir les instructions Interac avec les options
        try {
          console.log('[FRONTEND] Demande instructions Interac pour paiement:', payment._id, {
            bank: interacBank,
            contactMethod: interacContactMethod
          });
          
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_URL}/payments/${payment._id}/interac/instructions`, 
            {
              bank: interacBank,
              contactMethod: interacContactMethod
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000 // 15 secondes de timeout
            }
          );
          
          console.log('[FRONTEND] Réponse Interac complète:', JSON.stringify(response.data, null, 2));
          
          if (response.data.success) {
            // Le backend retourne directement result.instructions dans data
            const instructionsData = response.data.data;
            
            // Sauvegarder la liste des banques si disponible
            if (response.data.banks) {
              setAvailableBanks(response.data.banks);
            }
            
            if (instructionsData && typeof instructionsData === 'object' && Object.keys(instructionsData).length > 0) {
              console.log('[FRONTEND] Instructions Interac valides:', instructionsData);
              setInstructions(instructionsData);
              setError(null);
            } else {
              console.error('[FRONTEND] Instructions Interac invalides ou vides:', instructionsData);
              setError('Format d\'instructions invalide. Veuillez réessayer.');
            }
          } else {
            const errorMsg = response.data.message || 'Erreur lors de la génération des instructions';
            console.error('[FRONTEND] Erreur dans la réponse Interac:', errorMsg);
            setError(errorMsg);
          }
        } catch (interacErr: any) {
          console.error('[FRONTEND] Erreur Interac:', interacErr);
          console.error('[FRONTEND] Détails erreur Interac:', {
            status: interacErr.response?.status,
            data: interacErr.response?.data,
            message: interacErr.message
          });
          setError(interacErr.response?.data?.message || 'Erreur lors de la génération des instructions Interac');
        } finally {
          setProcessing(false);
        }
      } else if (method === 'virement') {
        // Obtenir les instructions de virement
        try {
          console.log('[FRONTEND] Demande instructions Virement pour paiement:', payment._id);
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_URL}/payments/${payment._id}/bank-transfer/instructions`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000 // 15 secondes de timeout
            }
          );
          console.log('[FRONTEND] Réponse Virement complète:', JSON.stringify(response.data, null, 2));
          
          if (response.data.success) {
            // Le backend retourne directement result.instructions dans data
            const instructionsData = response.data.data;
            
            if (instructionsData && typeof instructionsData === 'object' && Object.keys(instructionsData).length > 0) {
              console.log('[FRONTEND] Instructions Virement valides:', instructionsData);
              setInstructions(instructionsData);
              setError(null);
            } else {
              console.error('[FRONTEND] Instructions Virement invalides ou vides:', instructionsData);
              setError('Format d\'instructions invalide. Veuillez réessayer.');
            }
          } else {
            const errorMsg = response.data.message || 'Erreur lors de la génération des instructions';
            console.error('[FRONTEND] Erreur dans la réponse Virement:', errorMsg);
            setError(errorMsg);
          }
        } catch (virementErr: any) {
          console.error('[FRONTEND] Erreur Virement:', virementErr);
          console.error('[FRONTEND] Détails erreur Virement:', {
            status: virementErr.response?.status,
            data: virementErr.response?.data,
            message: virementErr.message
          });
          setError(virementErr.response?.data?.message || 'Erreur lors de la génération des instructions de virement');
        } finally {
          setProcessing(false);
        }
      }
    } catch (err: any) {
      console.error('[FRONTEND] Erreur sélection méthode:', err);
      setProcessing(false);
      if (err.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à effectuer ce paiement.');
      } else {
        setError(err.response?.data?.message || 'Erreur lors de la sélection de la méthode');
      }
    }
  };

  const handleStripeSuccess = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      if (!payment || !instructions?.paymentIntentId) {
        setError('Données de paiement manquantes');
        setProcessing(false);
        return;
      }
      
      console.log('[FRONTEND] ========== Confirmation paiement Stripe ==========');
      console.log('[FRONTEND] Payment ID:', payment._id);
      console.log('[FRONTEND] PaymentIntent ID:', instructions.paymentIntentId);
      console.log('[FRONTEND] ===================================================');
      
      const token = localStorage.getItem('token');
      
      // Confirmer le paiement côté serveur
      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/stripe/confirm`, 
        {
          paymentIntentId: instructions.paymentIntentId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 secondes de timeout
        }
      );
      
      console.log('[FRONTEND] ✅ Paiement Stripe confirmé:', response.data);
      
      if (response.data.success) {
        // Attendre un peu pour que le backend mette à jour le statut
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recharger le paiement pour avoir le statut à jour
        await loadPayment();
        
        // Rediriger vers la page de succès
        console.log('[FRONTEND] Redirection vers la page de succès...');
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors de la confirmation du paiement');
      }
    } catch (err: any) {
      console.error('[FRONTEND] ❌ Erreur confirmation paiement Stripe:', err);
      setProcessing(false);
      
      let errorMessage = 'Erreur lors de la confirmation du paiement. Veuillez réessayer.';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.';
      } else if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          setTimeout(() => router.push('/login'), 2000);
        } else if (err.response.status === 403) {
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer ce paiement.';
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Erreur lors de la confirmation du paiement. Vérifiez les informations.';
        } else if (err.response.status === 404) {
          errorMessage = 'Paiement non trouvé. Il a peut-être été supprimé.';
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré et votre connexion internet.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    }
  };

  const handleStripeError = (error: string) => {
    setError(error);
    setProcessing(false);
  };

  const handleManualPayment = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      // Validation avant traitement
      if (!payment) {
        setError('Paiement non trouvé');
        setProcessing(false);
        return;
      }
      
      if (!selectedMethod) {
        setError('Veuillez sélectionner une méthode de paiement');
        setProcessing(false);
        return;
      }
      
      if (selectedMethod === 'interac' && !instructions?.referenceNumber) {
        setError('Veuillez d\'abord générer les instructions Interac');
        setProcessing(false);
        return;
      }
      
      if (selectedMethod === 'virement' && !instructions?.referenceNumber) {
        setError('Veuillez d\'abord générer les instructions de virement');
        setProcessing(false);
        return;
      }
      
      console.log('[FRONTEND] ========== Traitement paiement manuel ==========');
      console.log('[FRONTEND] Payment ID:', payment._id);
      console.log('[FRONTEND] Méthode:', selectedMethod);
      console.log('[FRONTEND] Reference Number:', instructions?.referenceNumber);
      console.log('[FRONTEND] ===============================================');
      
      const token = localStorage.getItem('token');
      const paymentMethod = selectedMethod === 'interac' ? 'interac' : selectedMethod === 'virement' ? 'virement' : selectedMethod;
      
      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/process`, 
        {
          paymentMethod: paymentMethod,
          transactionId: instructions?.referenceNumber || `REF-${Date.now()}`,
          notes: `Paiement ${selectedMethod} effectué le ${new Date().toLocaleString('fr-FR')} - Montant: ${payment.amount} $CAD`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 secondes de timeout
        }
      );
      
      console.log('[FRONTEND] ✅ Paiement traité avec succès:', response.data);
      
      if (response.data.success) {
        // Attendre un peu pour que le backend mette à jour le statut
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recharger le paiement pour avoir le statut à jour
        await loadPayment();
        
        // Rediriger vers la page de succès
        console.log('[FRONTEND] Redirection vers la page de succès...');
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors du traitement du paiement');
      }
    } catch (err: any) {
      console.error('[FRONTEND] ❌ Erreur traitement paiement:', err);
      setProcessing(false);
      
      let errorMessage = 'Erreur lors du traitement du paiement. Veuillez réessayer.';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.';
      } else if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          setTimeout(() => router.push('/login'), 2000);
        } else if (err.response.status === 403) {
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer ce paiement.';
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Données invalides. Vérifiez les informations du paiement.';
        } else if (err.response.status === 404) {
          errorMessage = 'Paiement non trouvé. Il a peut-être été supprimé.';
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré et votre connexion internet.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && (error.includes('403') || error.includes('non autorisé'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/payments/locataire')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour aux paiements
          </button>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Paiement non trouvé'}</p>
          <button
            onClick={() => router.push('/payments/locataire')}
            className="mt-4 text-primary-600 hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Payer ma facture</h1>

          {/* Détails du paiement */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Détails de la facture</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{payment.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Montant:</span>
                <span className="font-bold text-lg">{payment.amount.toFixed(2)} $CAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date d'échéance:</span>
                <span className="font-medium">
                  {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {payment.building && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Unité:</span>
                  <span className="font-medium">
                    {payment.building.name} - {payment.unit?.unitNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sélection de la méthode */}
          {!selectedMethod && payment.status !== 'paye' && (
            <div>
              <PaymentMethodSelector
                selectedMethod={selectedMethod}
                onSelectMethod={handleMethodSelect}
              />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Astuce :</strong> Les méthodes Interac et virement bancaire sont disponibles immédiatement. 
                  Le paiement par carte nécessite une configuration Stripe.
                </p>
              </div>
            </div>
          )}

          {/* Instructions selon la méthode */}
          {selectedMethod && (
            <div className="mt-6">
              {selectedMethod === 'carte_credit' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-blue-900">Paiement par carte</h3>
                  {instructions?.clientSecret ? (
                    <div>
                      <div className="mb-4 bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>✅ PaymentIntent créé avec succès</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {instructions.paymentIntentId}
                        </p>
                      </div>
                      <StripePaymentForm
                        clientSecret={instructions.clientSecret}
                        paymentIntentId={instructions.paymentIntentId}
                        amount={payment.amount}
                        onSuccess={handleStripeSuccess}
                        onError={handleStripeError}
                      />
                    </div>
                  ) : processing ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Création du PaymentIntent en cours...</p>
                    </div>
                  ) : error && (error.includes('pas disponible') || error.includes('Stripe n\'est pas configuré') || error.includes('configuré')) ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm font-semibold mb-2">
                        ⚠️ Paiement par carte non disponible
                      </p>
                      <p className="text-yellow-700 text-sm mt-2">
                        {error}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedMethod('');
                          setError(null);
                          setInstructions(null);
                        }}
                        className="mt-4 w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Choisir une autre méthode (Interac ou Virement)
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm font-semibold mb-2">
                        ⚠️ Paiement par carte non disponible
                      </p>
                      <p className="text-yellow-700 text-sm mt-2">
                        Le paiement par carte nécessite une configuration Stripe. Veuillez utiliser Interac ou virement bancaire.
                      </p>
                      <button
                        onClick={() => {
                          setSelectedMethod('');
                          setError(null);
                          setInstructions(null);
                        }}
                        className="mt-4 w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Choisir une autre méthode (Interac ou Virement)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === 'interac' && !instructions && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🏦</span>
                    <h3 className="font-semibold text-green-900">
                      Configuration du virement Interac
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Sélection de la banque */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sélectionnez votre banque
                      </label>
                      <select
                        value={interacBank}
                        onChange={(e) => setInteracBank(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={processing}
                      >
                        <option value="">-- Choisissez votre banque --</option>
                        <option value="RBC">Banque Royale du Canada (RBC)</option>
                        <option value="TD">Banque TD Canada Trust</option>
                        <option value="BMO">Banque de Montréal (BMO)</option>
                        <option value="SCOTIA">Banque Scotia</option>
                        <option value="CIBC">Banque CIBC</option>
                        <option value="DESJARDINS">Mouvement Desjardins</option>
                        <option value="NATIONAL">Banque Nationale du Canada</option>
                        <option value="HSBC">HSBC Bank Canada</option>
                        <option value="TANGERINE">Tangerine</option>
                        <option value="PC">Banque PC</option>
                        <option value="AUTRE">Autre banque</option>
                      </select>
                    </div>
                    
                    {/* Méthode de contact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comment souhaitez-vous recevoir le virement?
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="contactMethod"
                            value="email"
                            checked={interacContactMethod === 'email'}
                            onChange={(e) => setInteracContactMethod('email')}
                            className="mr-2"
                            disabled={processing}
                          />
                          <span className="text-sm">📧 Par email</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="contactMethod"
                            value="phone"
                            checked={interacContactMethod === 'phone'}
                            onChange={(e) => setInteracContactMethod('phone')}
                            className="mr-2"
                            disabled={processing}
                          />
                          <span className="text-sm">📱 Par téléphone</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Bouton pour générer les instructions */}
                    <button
                      onClick={() => handleMethodSelect('interac')}
                      disabled={!interacBank || processing}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Génération des instructions...' : 'Générer les instructions Interac'}
                    </button>
                  </div>
                </div>
              )}
              
              {selectedMethod === 'interac' && instructions && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🏦</span>
                    <h3 className="font-semibold text-green-900">
                      Instructions de paiement Interac
                    </h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                    {instructions && instructions.steps ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-blue-900 mb-2">📋 Informations du virement:</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Banque:</span>
                              <span className="font-medium">{instructions.bank}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Montant:</span>
                              <span className="font-bold text-green-600">{instructions.amount} $CAD</span>
                            </div>
                            {instructions.contactMethod === 'email' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email destinataire:</span>
                                <span className="font-mono text-xs break-all">{instructions.recipientEmail}</span>
                              </div>
                            )}
                            {instructions.contactMethod === 'phone' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Téléphone destinataire:</span>
                                <span className="font-mono text-xs">{instructions.recipientPhone}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Question de sécurité:</span>
                              <span className="font-medium">{instructions.securityQuestion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Réponse:</span>
                              <span className="font-mono text-sm bg-yellow-100 px-2 py-1 rounded">{instructions.securityAnswer}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numéro de référence:</span>
                              <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-3">
                          <p className="text-sm font-semibold text-gray-900 mb-2">📝 Étapes à suivre:</p>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {instructions.steps.map((step: string, index: number) => (
                              <li key={index} className="pl-2">{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    ) : instructions && typeof instructions === 'object' && Object.keys(instructions).length > 0 ? (
                      Object.entries(instructions)
                        .filter(([key, value]) => {
                          // Filtrer les clés techniques ou valeurs vides
                          return key !== 'success' && 
                                 key !== 'steps' &&
                                 value !== null && 
                                 value !== undefined && 
                                 value !== '';
                        })
                        .map(([key, value]: [string, any]) => {
                          // Formater les clés pour un affichage plus lisible
                          const formattedKey = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                          
                          return (
                            <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 last:border-0">
                              <span className="font-medium text-gray-700 mb-1 sm:mb-0">{formattedKey}:</span>
                              <span className="text-gray-900 font-mono text-sm break-all">{String(value)}</span>
                            </div>
                          );
                        })
                    ) : processing ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">Chargement des instructions...</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">Instructions non disponibles</p>
                        {error && (
                          <p className="text-red-500 text-xs mt-2">{error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Important :</strong> Après avoir effectué le virement, cliquez sur "Confirmer le paiement" pour mettre à jour le statut de votre facture.
                    </p>
                  </div>

                  <button
                    onClick={handleManualPayment}
                    disabled={processing}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Traitement...
                      </span>
                    ) : (
                      '✓ Confirmer le paiement'
                    )}
                  </button>
                </div>
              )}

              {selectedMethod === 'virement' && !instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🏛️</span>
                    <h3 className="font-semibold text-blue-900">
                      Configuration du virement bancaire
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Cliquez sur le bouton ci-dessous pour générer les instructions de virement bancaire.
                    </p>
                    
                    <button
                      onClick={() => handleMethodSelect('virement')}
                      disabled={processing}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Génération des instructions...' : 'Générer les instructions de virement'}
                    </button>
                  </div>
                </div>
              )}

              {selectedMethod === 'virement' && instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🏛️</span>
                    <h3 className="font-semibold text-blue-900">
                      Instructions de virement bancaire
                    </h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                    {instructions && instructions.steps ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-blue-900 mb-2">📋 Informations du virement:</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Banque:</span>
                              <span className="font-medium">{instructions.bank || 'Banque du bénéficiaire'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Montant:</span>
                              <span className="font-bold text-blue-600">{instructions.amount || payment.amount} $CAD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numéro de compte:</span>
                              <span className="font-mono text-xs break-all">{instructions.accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numéro de transit:</span>
                              <span className="font-mono text-xs">{instructions.transitNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numéro d'institution:</span>
                              <span className="font-mono text-xs">{instructions.institutionNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nom du bénéficiaire:</span>
                              <span className="font-medium">{instructions.recipientName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Numéro de référence:</span>
                              <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-3">
                          <p className="text-sm font-semibold text-gray-900 mb-2">📝 Étapes à suivre:</p>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {instructions.steps.map((step: string, index: number) => (
                              <li key={index} className="pl-2">{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    ) : instructions && typeof instructions === 'object' && Object.keys(instructions).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(instructions)
                          .filter(([key, value]) => {
                            return key !== 'success' && 
                                   key !== 'steps' &&
                                   value !== null && 
                                   value !== undefined && 
                                   value !== '';
                          })
                          .map(([key, value]: [string, any]) => {
                            const formattedKey = key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, str => str.toUpperCase())
                              .trim();
                            
                            return (
                              <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 last:border-0">
                                <span className="font-medium text-gray-700 mb-1 sm:mb-0">{formattedKey}:</span>
                                <span className="text-gray-900 font-mono text-sm break-all">{String(value)}</span>
                              </div>
                            );
                          })}
                      </div>
                    ) : processing ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">Chargement des instructions...</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">Instructions non disponibles</p>
                        {error && (
                          <p className="text-red-500 text-xs mt-2">{error}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Important :</strong> Après avoir effectué le virement bancaire, cliquez sur "Confirmer le paiement" pour mettre à jour le statut de votre facture.
                    </p>
                  </div>

                  <button
                    onClick={handleManualPayment}
                    disabled={processing}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Traitement...
                      </span>
                    ) : (
                      '✓ Confirmer le paiement'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-start">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-1">Erreur</h4>
                  <p className="text-red-700">{error}</p>
                  {error.includes('Stripe') && (
                    <button
                      onClick={() => {
                        setSelectedMethod('');
                        setError(null);
                        setInstructions(null);
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Choisir une autre méthode de paiement
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message de succès après paiement */}
          {payment.status === 'paye' && (
            <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <div>
                  <h4 className="font-semibold text-green-800">Paiement confirmé</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Ce paiement a déjà été effectué le {payment.paidDate && new Date(payment.paidDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => router.back()}
            className="mt-6 text-primary-600 hover:underline"
          >
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );
}

