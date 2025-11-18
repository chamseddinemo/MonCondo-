import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProtectedRoute from '../../components/ProtectedRoute';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import StripePaymentForm from '../../components/payments/StripePaymentForm';
import { Payment } from '../../types/payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';

export default function PaymentDetail() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour le paiement
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [instructions, setInstructions] = useState<any>(null);
  
  // États pour Interac
  const [interacBank, setInteracBank] = useState<string>('');
  const [interacContactMethod, setInteracContactMethod] = useState<'email' | 'phone'>('email');
  const [interacEmail, setInteracEmail] = useState<string>('');
  const [interacPhone, setInteracPhone] = useState<string>('');
  
  // États pour carte de crédit
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id && isAuthenticated) {
      loadPayment();
    }
  }, [id, isAuthenticated, authLoading]);

  // Gérer à la fois id et _id pour compatibilité
  const paymentId = payment?._id || payment?.id || id;

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPayment(response.data.data);
      } else {
        setError(response.data.message || 'Paiement non trouvé');
      }
    } catch (err: any) {
      console.error('Erreur chargement paiement:', err);
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => router.push('/login'), 2000);
      } else if (err.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à accéder à ce paiement.');
      } else if (err.response?.status === 404) {
        setError('Paiement non trouvé.');
      } else {
        setError(err.response?.data?.message || 'Erreur lors du chargement du paiement');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number) => price ? `$${price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-CA', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paye':
        return 'bg-green-100 text-green-800';
      case 'en_retard':
        return 'bg-red-100 text-red-800';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paye':
        return 'Payé';
      case 'en_retard':
        return 'En retard';
      case 'en_attente':
        return 'En attente';
      default:
        return status;
    }
  };

  const handleShowPayment = () => {
    setShowPaymentForm(true);
    setSelectedMethod('');
    setError(null);
    setInstructions(null);
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (method === 'carte_credit') {
        // Créer un PaymentIntent Stripe
        try {
          const response = await axios.post(
            `${API_URL}/payments/${payment._id}/stripe/create-intent`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data.success && response.data.data) {
            setInstructions(response.data.data);
          } else {
            const errorMsg = response.data.message || 'Erreur lors de la création du paiement';
            if (errorMsg.includes('Stripe n\'est pas configuré') || errorMsg.includes('configuré')) {
              setError('Le paiement par carte n\'est pas disponible pour le moment. Veuillez utiliser Interac ou virement bancaire.');
            } else {
              setError(errorMsg);
            }
            setSelectedMethod('');
          }
        } catch (stripeErr: any) {
          const errorMessage = stripeErr.response?.data?.message || stripeErr.message || 'Erreur lors de la création du paiement';
          if (errorMessage.includes('Stripe n\'est pas configuré') || errorMessage.includes('configuré')) {
            setError('Le paiement par carte n\'est pas disponible pour le moment. Veuillez utiliser Interac ou virement bancaire.');
          } else {
            setError(errorMessage);
          }
          setSelectedMethod('');
        }
      } else if (method === 'interac') {
        // Pour Interac, on attend que l'utilisateur entre son email/téléphone
        setProcessing(false);
      } else if (method === 'virement') {
        // Obtenir les instructions de virement
        try {
          const response = await axios.post(
            `${API_URL}/payments/${payment._id}/bank-transfer/instructions`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data.success) {
            setInstructions(response.data.data);
          } else {
            setError(response.data.message || 'Erreur lors de la génération des instructions');
          }
        } catch (virementErr: any) {
          setError(virementErr.response?.data?.message || 'Erreur lors de la génération des instructions de virement');
        }
      }
    } catch (err: any) {
      console.error('Erreur sélection méthode:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sélection de la méthode');
    } finally {
      setProcessing(false);
    }
  };

  const handleInteracSubmit = async () => {
    if (!interacBank) {
      setError('Veuillez sélectionner votre banque');
      return;
    }

    if (interacContactMethod === 'email' && !interacEmail) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    if (interacContactMethod === 'phone' && !interacPhone) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/interac/instructions`,
        {
          bank: interacBank,
          contactMethod: interacContactMethod,
          email: interacContactMethod === 'email' ? interacEmail : undefined,
          phone: interacContactMethod === 'phone' ? interacPhone : undefined
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setInstructions(response.data.data);
      } else {
        setError(response.data.message || 'Erreur lors de la génération des instructions');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la génération des instructions Interac');
    } finally {
      setProcessing(false);
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
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/stripe/confirm`,
        {
          paymentIntentId: instructions.paymentIntentId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // Recharger le paiement pour avoir le statut à jour
        await loadPayment();
        
        // Si le paiement est lié à une demande, recharger aussi la demande
        if (payment.requestId) {
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            await axios.get(`${API_URL}/requests/${payment.requestId}/payment-status`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log('[PAYMENT] Statut de la demande mis à jour');
          } catch (err) {
            console.error('[PAYMENT] Erreur mise à jour demande:', err);
          }
        }
        
        setShowPaymentForm(false);
        setSelectedMethod('');
        setInstructions(null);
        
        // Attendre un peu pour que les données soient synchronisées
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recharger à nouveau pour avoir les données les plus récentes
        await loadPayment();
        
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors de la confirmation du paiement');
      }
    } catch (err: any) {
      setProcessing(false);
      setError(err.response?.data?.message || 'Erreur lors de la confirmation du paiement');
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
      
      if (!payment || !selectedMethod) {
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
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const paymentMethod = selectedMethod === 'interac' ? 'interac' : selectedMethod === 'virement' ? 'virement' : selectedMethod;
      
      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/process`,
        {
          paymentMethod: paymentMethod,
          transactionId: instructions?.referenceNumber || `REF-${Date.now()}`,
          notes: `Paiement ${selectedMethod} effectué le ${new Date().toLocaleString('fr-FR')}`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        // Recharger le paiement pour avoir le statut à jour
        await loadPayment();
        
        // Si le paiement est lié à une demande, recharger aussi la demande
        if (payment.requestId) {
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            await axios.get(`${API_URL}/requests/${payment.requestId}/payment-status`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log('[PAYMENT] Statut de la demande mis à jour');
          } catch (err) {
            console.error('[PAYMENT] Erreur mise à jour demande:', err);
          }
        }
        
        setShowPaymentForm(false);
        setSelectedMethod('');
        setInstructions(null);
        
        // Attendre un peu pour que les données soient synchronisées
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recharger à nouveau pour avoir les données les plus récentes
        await loadPayment();
        
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors du traitement du paiement');
      }
    } catch (err: any) {
      setProcessing(false);
      setError(err.response?.data?.message || 'Erreur lors du traitement du paiement');
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Chargement de la transaction...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  if (error && !payment) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="card p-6 bg-red-50 border-l-4 border-red-500">
              <h2 className="text-xl font-bold text-red-800 mb-2">Erreur</h2>
              <p className="text-red-700">{error}</p>
              <Link href="/payments/proprietaire" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
                ← Retour aux paiements
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  if (!payment) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="card p-6 text-center">
              <p className="text-gray-600">Paiement non trouvé</p>
              <Link href="/payments/proprietaire" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
                ← Retour aux paiements
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link href="/payments/proprietaire" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
              ← Retour aux paiements
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Détails de la transaction</h1>
                <p className="text-gray-600">ID: {payment._id}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(payment.status)}`}>
                {getStatusLabel(payment.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Carte principale */}
              <div className="card p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">💰</span>
                  <div>
                    <p className="text-3xl font-bold">{formatPrice(payment.amount)}</p>
                    <p className="text-gray-600">{payment.type || 'Paiement'}</p>
                  </div>
                </div>

                {payment.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-900">{payment.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date d'échéance</p>
                    <p className="font-medium">{formatDate(payment.dueDate)}</p>
                  </div>
                  {payment.paidDate && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date de paiement</p>
                      <p className="font-medium">{formatDate(payment.paidDate)}</p>
                    </div>
                  )}
                  {payment.paymentMethod && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Méthode de paiement</p>
                      <p className="font-medium capitalize">{payment.paymentMethod}</p>
                    </div>
                  )}
                  {payment.transactionId && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ID de transaction</p>
                      <p className="font-medium font-mono text-sm">{payment.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations sur l'unité */}
              {payment.unit && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Informations sur l'unité</h3>
                  <div className="space-y-3">
                    {payment.unit.unitNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Numéro d'unité</span>
                        <span className="font-medium">Unité {payment.unit.unitNumber}</span>
                      </div>
                    )}
                    {payment.building && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bâtiment</span>
                        <span className="font-medium">{payment.building.name || payment.building}</span>
                      </div>
                    )}
                    {payment.unit.floor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Étage</span>
                        <span className="font-medium">{payment.unit.floor}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {payment.notes && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{payment.notes}</p>
                </div>
              )}

              {/* Formulaire de paiement */}
              {showPaymentForm && payment.status !== 'paye' && (
                <div className="card p-6 border-2 border-primary-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Paiement</h3>
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setSelectedMethod('');
                        setError(null);
                        setInstructions(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {!selectedMethod ? (
                    <PaymentMethodSelector
                      selectedMethod={selectedMethod}
                      onSelectMethod={handleMethodSelect}
                      disabled={processing}
                    />
                  ) : selectedMethod === 'carte_credit' ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg mb-4">💳 Paiement par carte</h4>
                      {instructions?.clientSecret ? (
                        <StripePaymentForm
                          clientSecret={instructions.clientSecret}
                          paymentIntentId={instructions.paymentIntentId}
                          amount={payment.amount}
                          onSuccess={handleStripeSuccess}
                          onError={handleStripeError}
                        />
                      ) : processing ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                          <p className="text-gray-600">Création du paiement en cours...</p>
                        </div>
                      ) : error ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">{error}</p>
                          <button
                            onClick={() => {
                              setSelectedMethod('');
                              setError(null);
                            }}
                            className="mt-4 text-yellow-600 hover:text-yellow-800 underline"
                          >
                            Choisir une autre méthode
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : selectedMethod === 'interac' ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg mb-4">🏦 Interac e-Transfer</h4>
                      
                      {!instructions ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sélectionnez votre banque
                            </label>
                            <select
                              value={interacBank}
                              onChange={(e) => setInteracBank(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

                          {interacContactMethod === 'email' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Adresse email
                              </label>
                              <input
                                type="email"
                                value={interacEmail}
                                onChange={(e) => setInteracEmail(e.target.value)}
                                placeholder="votre@email.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                disabled={processing}
                              />
                            </div>
                          )}

                          {interacContactMethod === 'phone' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Numéro de téléphone
                              </label>
                              <input
                                type="tel"
                                value={interacPhone}
                                onChange={(e) => setInteracPhone(e.target.value)}
                                placeholder="514-123-4567"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                disabled={processing}
                              />
                            </div>
                          )}

                          <button
                            onClick={handleInteracSubmit}
                            disabled={!interacBank || processing || (interacContactMethod === 'email' && !interacEmail) || (interacContactMethod === 'phone' && !interacPhone)}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                          >
                            {processing ? 'Génération des instructions...' : 'Générer les instructions Interac'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Montant:</span>
                              <span className="font-bold text-green-600">{instructions.amount || payment.amount} $CAD</span>
                            </div>
                            {instructions.recipientEmail && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Email destinataire:</span>
                                <span className="font-mono text-xs break-all">{instructions.recipientEmail}</span>
                              </div>
                            )}
                            {instructions.recipientPhone && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Téléphone destinataire:</span>
                                <span className="font-mono text-xs">{instructions.recipientPhone}</span>
                              </div>
                            )}
                            {instructions.referenceNumber && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Numéro de référence:</span>
                                <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleManualPayment}
                            disabled={processing}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                          >
                            {processing ? 'Traitement...' : '✓ Confirmer le paiement'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : selectedMethod === 'virement' ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg mb-4">🏛️ Virement bancaire</h4>
                      
                      {instructions ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                          <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                            {instructions.accountNumber && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Numéro de compte:</span>
                                <span className="font-mono text-xs break-all">{instructions.accountNumber}</span>
                              </div>
                            )}
                            {instructions.referenceNumber && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Numéro de référence:</span>
                                <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleManualPayment}
                            disabled={processing}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                          >
                            {processing ? 'Traitement...' : '✓ Confirmer le paiement'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Chargement des instructions...</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {error && (
                    <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                      <p className="text-red-800">{error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Informations sur les parties */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Parties impliquées</h3>
                <div className="space-y-4">
                  {payment.payer && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Payeur</p>
                      <p className="font-medium">
                        {payment.payer.firstName} {payment.payer.lastName}
                      </p>
                      {payment.payer.email && (
                        <p className="text-sm text-gray-500">{payment.payer.email}</p>
                      )}
                    </div>
                  )}
                  {payment.recipient && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-1">Bénéficiaire</p>
                      <p className="font-medium">
                        {payment.recipient.firstName} {payment.recipient.lastName}
                      </p>
                      {payment.recipient.email && (
                        <p className="text-sm text-gray-500">{payment.recipient.email}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  {payment.status !== 'paye' && !showPaymentForm && (
                    <button
                      onClick={handleShowPayment}
                      className="block w-full bg-primary-600 text-white text-center px-4 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Payer maintenant
                    </button>
                  )}
                  {payment.status === 'paye' && payment.receipt && (
                    <a
                      href={payment.receipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-green-600 text-white text-center px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Télécharger le reçu
                    </a>
                  )}
                  <Link
                    href="/payments/proprietaire"
                    className="block w-full bg-gray-200 text-gray-700 text-center px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Retour à la liste
                  </Link>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Informations techniques</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Créé le</span>
                    <span className="font-medium">{formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modifié le</span>
                      <span className="font-medium">{formatDate(payment.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  );
}

