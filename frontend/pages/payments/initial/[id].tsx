import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentMethodSelector from '../../../components/payments/PaymentMethodSelector';
import StripePaymentForm from '../../../components/payments/StripePaymentForm';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { buildApiUrlWithId, getApiConfig, getAuthToken, getErrorMessage, showSuccessMessage, showErrorMessage } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';

export default function PayInitialPayment() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [request, setRequest] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodConfirmed, setMethodConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [interacBank, setInteracBank] = useState<string>('td');
  const [interacContactMethod, setInteracContactMethod] = useState<'email' | 'phone'>('email');
  const [interacEmail, setInteracEmail] = useState<string>('');
  const [interacPhone, setInteracPhone] = useState<string>('');
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id && isAuthenticated) {
      loadRequest();
    }

    // Initialiser l'email et le téléphone depuis l'utilisateur connecté
    if (user) {
      if (user.email && !interacEmail) {
        setInteracEmail(user.email);
      }
      if (user.phone && !interacPhone) {
        setInteracPhone(user.phone);
      }
    }
  }, [id, isAuthenticated, authLoading, user]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        router.push('/login');
        return;
      }

      const url = buildApiUrlWithId('requests', String(id));
      const response = await axios.get(url, getApiConfig(token));
      
      if (response.data.success) {
        setRequest(response.data.data);
        
        // Vérifier que le paiement initial existe et est en attente
        if (!response.data.data.initialPayment) {
          setError('Aucun paiement initial trouvé pour cette demande.');
          return;
        }
        
        if (response.data.data.initialPayment.status === 'paye') {
          setError('Ce paiement a déjà été effectué.');
          return;
        }
      } else {
        setError(response.data.message || 'Demande non trouvée');
      }
    } catch (err: any) {
      console.error('[INITIAL_PAYMENT] Erreur chargement demande:', err);
      const errorMsg = getErrorMessage(err, 'Erreur lors du chargement de la demande');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setMethodConfirmed(false);
    setError(null);
    setInstructions(null);
  };

  const handleContinue = () => {
    if (!selectedMethod) {
      setError('Veuillez sélectionner une méthode de paiement');
      return;
    }

    // Vérifications spécifiques selon la méthode
    if (selectedMethod === 'interac') {
      if (interacContactMethod === 'email' && !interacEmail.trim()) {
        setError('Veuillez entrer votre adresse email');
        return;
      }
      if (interacContactMethod === 'phone' && !interacPhone.trim()) {
        setError('Veuillez entrer votre numéro de téléphone');
        return;
      }
    }

    if (selectedMethod === 'virement') {
      if (!bankAccount.trim() || !bankName.trim()) {
        setError('Veuillez remplir les informations bancaires');
        return;
      }
    }

    setMethodConfirmed(true);
  };

  const handlePayment = async () => {
    if (!request || !request.initialPayment || !user) {
      showErrorMessage('Impossible d\'effectuer le paiement. Données manquantes.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        showErrorMessage('Session expirée. Veuillez vous reconnecter.');
        router.push('/login');
        return;
      }

      // D'abord, créer un paiement à partir du paiement initial
      const paymentData: any = {
        amount: request.initialPayment.amount,
        unit: request.unit?._id || request.unit,
        building: request.building?._id || request.building,
        type: request.type === 'achat' ? 'achat' : 'loyer',
        description: `Paiement initial - ${request.type === 'achat' ? 'Commission de vente' : 'Premier loyer'} - ${request.title}`,
        dueDate: new Date(),
        requestId: request._id,
        payer: user._id,
        status: 'en_attente'
      };

      // Créer le paiement
      let createdPayment;
      try {
        const createResponse = await axios.post(`${API_URL}/payments`, paymentData, getApiConfig(token));
        if (createResponse.data.success) {
          createdPayment = createResponse.data.data;
          console.log('[INITIAL_PAYMENT] Paiement créé:', createdPayment._id);
        } else {
          throw new Error(createResponse.data.message || 'Erreur lors de la création du paiement');
        }
      } catch (createErr: any) {
        // Si le paiement existe déjà, essayer de le récupérer
        if (createErr.response?.status === 400 && createErr.response?.data?.message?.includes('existe déjà')) {
          // Chercher le paiement existant pour cette demande
          const paymentsResponse = await axios.get(`${API_URL}/payments?requestId=${request._id}`, getApiConfig(token));
          if (paymentsResponse.data.success && paymentsResponse.data.data.length > 0) {
            createdPayment = paymentsResponse.data.data[0];
            console.log('[INITIAL_PAYMENT] Paiement existant trouvé:', createdPayment._id);
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }

      // Maintenant, traiter le paiement selon la méthode choisie
      if (selectedMethod === 'carte_credit' || selectedMethod === 'stripe') {
        // Pour Stripe, créer un PaymentIntent
        const stripeResponse = await axios.post(
          `${API_URL}/payments/${createdPayment._id}/stripe/create-intent`,
          {},
          getApiConfig(token)
        );
        
        if (stripeResponse.data.success && stripeResponse.data.data) {
          setInstructions({
            clientSecret: stripeResponse.data.data.clientSecret,
            paymentIntentId: stripeResponse.data.data.paymentIntentId,
            amount: stripeResponse.data.data.amount,
            currency: stripeResponse.data.data.currency || 'cad'
          });
          showSuccessMessage('✅ Paiement Stripe initialisé avec succès ! Veuillez compléter votre paiement ci-dessous.');
        } else {
          throw new Error(stripeResponse.data.message || 'Erreur lors de la création du paiement Stripe');
        }
      } else if (selectedMethod === 'interac') {
        // Pour Interac, obtenir les instructions
        const interacResponse = await axios.post(
          `${API_URL}/payments/${createdPayment._id}/interac/instructions`,
          {
            bank: interacBank || 'td',
            contactMethod: interacContactMethod,
            email: interacContactMethod === 'email' ? interacEmail : undefined,
            phone: interacContactMethod === 'phone' ? interacPhone : undefined
          },
          getApiConfig(token)
        );
        
        if (interacResponse.data.success && interacResponse.data.data) {
          const instructionsData = interacResponse.data.data;
          setInstructions(instructionsData);
          
          // Marquer le paiement comme payé après avoir généré les instructions Interac
          // (car Interac est considéré comme payé une fois les instructions générées)
          try {
            const referenceNumber = instructionsData.referenceNumber || 
                                   instructionsData.reference || 
                                   `INTERAC-${createdPayment._id}-${Date.now()}`;
            
            const processResponse = await axios.post(
              `${API_URL}/payments/${createdPayment._id}/process`,
              {
                paymentMethod: 'interac',
                transactionId: referenceNumber,
                notes: `Paiement Interac e-Transfer - ${interacContactMethod === 'email' ? `Email: ${interacEmail}` : `Téléphone: ${interacPhone}`}`
              },
              getApiConfig(token)
            );
            
            if (processResponse.data.success) {
              showSuccessMessage('✅ Paiement Interac traité avec succès ! Votre paiement a été enregistré.');
              
              // Recharger la demande pour mettre à jour le statut du paiement initial
              await loadRequest();
              
              // Afficher un message de confirmation supplémentaire
              setTimeout(() => {
                showSuccessMessage('✅ Paiement initial complété avec succès ! Vous allez être redirigé...');
              }, 1000);
              
              // Rediriger vers la page de la demande après 3 secondes
              setTimeout(() => {
                router.push(`/locataire/requests/${request._id}`);
              }, 3000);
            } else {
              // Si le traitement échoue, on affiche quand même les instructions
              console.warn('[INITIAL_PAYMENT] Paiement Interac: instructions générées mais traitement échoué');
              showSuccessMessage('✅ Instructions de paiement Interac générées avec succès ! Suivez les instructions ci-dessous pour compléter votre paiement.');
            }
          } catch (processErr: any) {
            // Si le traitement échoue, on affiche quand même les instructions
            console.warn('[INITIAL_PAYMENT] Erreur traitement paiement Interac (non bloquant):', processErr);
            const errorMsg = processErr.response?.data?.message || processErr.message;
            console.error('[INITIAL_PAYMENT] Détails erreur:', errorMsg);
            
            // Afficher les instructions même en cas d'erreur de traitement
            showSuccessMessage('✅ Instructions de paiement Interac générées avec succès ! Suivez les instructions ci-dessous pour compléter votre paiement.');
          }
        } else {
          throw new Error(interacResponse.data.message || 'Erreur lors de la génération des instructions Interac');
        }
      } else if (selectedMethod === 'virement') {
        // Pour virement bancaire, obtenir les instructions
        const virementResponse = await axios.post(
          `${API_URL}/payments/${createdPayment._id}/bank-transfer/instructions`,
          {
            bankAccount: bankAccount,
            bankName: bankName
          },
          getApiConfig(token)
        );
        
        if (virementResponse.data.success && virementResponse.data.data) {
          setInstructions(virementResponse.data.data);
          showSuccessMessage('✅ Instructions de virement bancaire générées avec succès ! Suivez les instructions ci-dessous pour compléter votre paiement.');
          
          // Pour virement, on peut aussi marquer comme traité immédiatement
          // ou attendre confirmation manuelle de l'admin
        } else {
          throw new Error(virementResponse.data.message || 'Erreur lors de la génération des instructions de virement');
        }
      }
    } catch (err: any) {
      console.error('[INITIAL_PAYMENT] Erreur traitement paiement:', err);
      const errorMsg = getErrorMessage(err, 'Erreur lors du traitement du paiement');
      setError(errorMsg);
      showErrorMessage(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  if (error && !request) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Erreur</h1>
              <p className="text-xl text-gray-600 mb-8">{error}</p>
              <button
                onClick={() => router.back()}
                className="btn-primary"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  if (!request || !request.initialPayment) {
    return (
      <ProtectedRoute>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Paiement non trouvé</h1>
              <p className="text-xl text-gray-600 mb-8">Aucun paiement initial trouvé pour cette demande.</p>
              <button
                onClick={() => router.back()}
                className="btn-primary"
              >
                Retour
              </button>
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
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h1 className="text-2xl font-bold mb-4">Paiement initial</h1>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Montant à payer</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ${request.initialPayment.amount.toLocaleString('fr-CA')}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Demande:</strong> {request.title}</p>
                  <p><strong>Type:</strong> {request.type === 'location' ? 'Location' : 'Achat'}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {instructions ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Instructions de paiement Interac</h2>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: instructions }} />
                  <button
                    onClick={() => router.push(`/locataire/requests/${request._id}`)}
                    className="mt-4 w-full btn-primary"
                  >
                    Retour à la demande
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Choisissez votre méthode de paiement
                    </h3>
                    <p className="text-sm text-gray-600">
                      Sélectionnez la méthode qui vous convient le mieux
                    </p>
                  </div>

                  {/* Méthodes de paiement */}
                  <div className="space-y-3 mb-6">
                    {/* Carte de crédit */}
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedMethod === 'carte_credit'
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}>
                      <button
                        onClick={() => handleMethodSelect('carte_credit')}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-2xl mr-4">💳</span>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">Carte de crédit / débit</h4>
                              <p className="text-sm text-gray-600">Visa, Mastercard, AMEX via Stripe</p>
                            </div>
                          </div>
                          {selectedMethod === 'carte_credit' && (
                            <span className="text-primary-600 text-xl font-bold">✓</span>
                          )}
                        </div>
                      </button>
                      {selectedMethod === 'carte_credit' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={handleContinue}
                            className="w-full btn-primary"
                          >
                            Continuer avec Stripe
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interac */}
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedMethod === 'interac'
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}>
                      <button
                        onClick={() => handleMethodSelect('interac')}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-2xl mr-4">🏦</span>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">Interac e-Transfer</h4>
                              <p className="text-sm text-gray-600">Virement Interac en ligne</p>
                            </div>
                          </div>
                          {selectedMethod === 'interac' && (
                            <span className="text-primary-600 text-xl font-bold">✓</span>
                          )}
                        </div>
                      </button>
                      {selectedMethod === 'interac' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Méthode de contact
                            </label>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setInteracContactMethod('email')}
                                className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                                  interacContactMethod === 'email'
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                📧 Email
                              </button>
                              <button
                                onClick={() => setInteracContactMethod('phone')}
                                className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                                  interacContactMethod === 'phone'
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                📱 Téléphone
                              </button>
                            </div>
                          </div>
                          {interacContactMethod === 'email' ? (
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
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Numéro de téléphone
                              </label>
                              <input
                                type="tel"
                                value={interacPhone}
                                onChange={(e) => setInteracPhone(e.target.value)}
                                placeholder="(514) 123-4567"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          )}
                          <button
                            onClick={handleContinue}
                            disabled={!interacEmail.trim() && !interacPhone.trim()}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Continuer avec Interac
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Virement bancaire */}
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedMethod === 'virement'
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}>
                      <button
                        onClick={() => handleMethodSelect('virement')}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-2xl mr-4">🏛️</span>
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">Virement bancaire</h4>
                              <p className="text-sm text-gray-600">Virement bancaire manuel</p>
                            </div>
                          </div>
                          {selectedMethod === 'virement' && (
                            <span className="text-primary-600 text-xl font-bold">✓</span>
                          )}
                        </div>
                      </button>
                      {selectedMethod === 'virement' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nom de la banque
                            </label>
                            <input
                              type="text"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="Ex: Banque Nationale"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Numéro de compte
                            </label>
                            <input
                              type="text"
                              value={bankAccount}
                              onChange={(e) => setBankAccount(e.target.value)}
                              placeholder="Numéro de compte bancaire"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          <button
                            onClick={handleContinue}
                            disabled={!bankName.trim() || !bankAccount.trim()}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Continuer avec virement bancaire
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Portefeuille MonCondo+ */}
                    <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-4">💰</span>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">Portefeuille MonCondo+</h4>
                            <p className="text-sm text-gray-600">Crédit interne (à venir)</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Bientôt</span>
                      </div>
                    </div>
                  </div>

                  {/* Affichage des instructions ou formulaire de paiement */}
                  {instructions ? (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4">
                          {selectedMethod === 'carte_credit' || selectedMethod === 'stripe' 
                            ? 'Finaliser votre paiement' 
                            : selectedMethod === 'interac'
                            ? 'Instructions de paiement Interac'
                            : 'Instructions de virement bancaire'}
                        </h2>
                        
                        {selectedMethod === 'carte_credit' || selectedMethod === 'stripe' ? (
                          instructions.clientSecret ? (
                            <StripePaymentForm
                              amount={request.initialPayment.amount}
                              clientSecret={instructions.clientSecret}
                              paymentIntentId={instructions.paymentIntentId}
                              onSuccess={() => {
                                showSuccessMessage('✅ Paiement effectué avec succès !');
                                setTimeout(() => {
                                  router.push(`/locataire/requests/${request._id}`);
                                }, 2000);
                              }}
                              onError={(err) => {
                                setError(err);
                                showErrorMessage(err);
                              }}
                            />
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-gray-600 mb-4">Préparation du paiement...</p>
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                          )
                        ) : (
                          <div>
                            {typeof instructions === 'string' ? (
                              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: instructions }} />
                            ) : instructions.html ? (
                              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: instructions.html }} />
                            ) : (
                              <div className="space-y-3">
                                {instructions.referenceNumber && (
                                  <p className="text-lg font-semibold">
                                    <strong>Numéro de référence:</strong> {instructions.referenceNumber}
                                  </p>
                                )}
                                {instructions.amount && (
                                  <p>
                                    <strong>Montant:</strong> ${instructions.amount.toLocaleString('fr-CA')}
                                  </p>
                                )}
                                {instructions.instructions && (
                                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: instructions.instructions }} />
                                )}
                              </div>
                            )}
                            <div className="mt-6 flex gap-3">
                              <button
                                onClick={() => {
                                  setInstructions(null);
                                  setMethodConfirmed(false);
                                  setSelectedMethod('');
                                }}
                                className="flex-1 btn-secondary"
                              >
                                Changer de méthode
                              </button>
                              <button
                                onClick={() => router.push(`/locataire/requests/${request._id}`)}
                                className="flex-1 btn-primary"
                              >
                                Retour à la demande
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : methodConfirmed && selectedMethod && !instructions ? (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800">
                          Vous êtes sur le point d'effectuer un paiement de <strong>${request.initialPayment.amount.toLocaleString('fr-CA')}</strong> via {selectedMethod === 'interac' ? 'Interac e-Transfer' : 'virement bancaire'}.
                        </p>
                      </div>
                      <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? '⏳ Traitement en cours...' : '✅ Confirmer le paiement'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  );
}

