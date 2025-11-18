import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import PaymentMethodSelector from '../../components/payments/PaymentMethodSelector';
import StripePaymentForm from '../../components/payments/StripePaymentForm';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function NewPayment() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { unit, building, amount, type, description, requestId } = router.query;
  
  const [payment, setPayment] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<any>(null);
  const [interacBank, setInteracBank] = useState<string>('');
  const [interacContactMethod, setInteracContactMethod] = useState<'email' | 'phone'>('email');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && unit && amount) {
      createAndLoadPayment();
    }
  }, [isAuthenticated, authLoading, unit, amount]);

  const createAndLoadPayment = async () => {
    try {
      setLoading(true);
      setCreatingPayment(true);
      setError(null);
      
      console.log('[NEW_PAYMENT] Création du paiement avec paramètres:', {
        unit,
        building,
        amount,
        type,
        description,
        requestId
      });

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // Créer le paiement
      const paymentData = {
        unit: unit,
        building: building || undefined,
        payer: user?._id,
        type: type || 'loyer',
        amount: parseFloat(String(amount)),
        description: description || 'Paiement',
        dueDate: new Date()
      };

      console.log('[NEW_PAYMENT] Données du paiement:', paymentData);

      const createResponse = await axios.post(
        `${API_URL}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('[NEW_PAYMENT] Réponse création paiement:', createResponse.data);

      if (createResponse.data?.success && createResponse.data?.data?._id) {
        const paymentId = createResponse.data.data._id;
        console.log('[NEW_PAYMENT] ✅ Paiement créé avec succès:', paymentId);
        setPayment(createResponse.data.data);
        setCreatingPayment(false);
      } else {
        throw new Error(createResponse.data?.message || 'Erreur lors de la création du paiement');
      }
    } catch (err: any) {
      console.error('[NEW_PAYMENT] ❌ Erreur création paiement:', err);
      setCreatingPayment(false);
      
      let errorMessage = 'Erreur lors de la création du paiement.';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.';
      } else if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          setTimeout(() => router.push('/login'), 2000);
        } else if (err.response.status === 403) {
          errorMessage = err.response.data?.message || 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Données invalides. Vérifiez les informations.';
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.request) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = async (method: string) => {
    if (!payment) {
      setError('Paiement non trouvé');
      return;
    }

    setSelectedMethod(method);
    setError(null);
    setInstructions(null);
    setProcessing(true);

    try {
      const token = localStorage.getItem('token');

      if (method === 'carte_credit') {
        const response = await axios.post(
          `${API_URL}/payments/${payment._id}/stripe/create-intent`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        if (response.data.success && response.data.data) {
          setInstructions(response.data.data);
        } else {
          const errorMsg = response.data.message || 'Erreur lors de la création du paiement';
          if (errorMsg.includes('Stripe n\'est pas configuré')) {
            setError('Le paiement par carte n\'est pas disponible. Veuillez utiliser Interac ou virement bancaire.');
          } else {
            setError(errorMsg);
          }
          setSelectedMethod('');
        }
      } else if (method === 'interac') {
        if (!interacBank) {
          setError('Veuillez sélectionner votre banque');
          setProcessing(false);
          return;
        }

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
            timeout: 15000
          }
        );

        if (response.data.success) {
          setInstructions(response.data.data);
        } else {
          setError(response.data.message || 'Erreur lors de la génération des instructions');
        }
      } else if (method === 'virement') {
        const response = await axios.post(
          `${API_URL}/payments/${payment._id}/bank-transfer/instructions`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        if (response.data.success) {
          setInstructions(response.data.data);
        } else {
          setError(response.data.message || 'Erreur lors de la génération des instructions');
        }
      }
    } catch (err: any) {
      console.error('[NEW_PAYMENT] Erreur sélection méthode:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sélection de la méthode');
      setSelectedMethod('');
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

      const token = localStorage.getItem('token');
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
          timeout: 15000
        }
      );

      if (response.data.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      console.error('[NEW_PAYMENT] Erreur confirmation Stripe:', err);
      setProcessing(false);
      setError(err.response?.data?.message || 'Erreur lors de la confirmation du paiement');
    }
  };

  const handleManualPayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      if (!payment || !selectedMethod || !instructions?.referenceNumber) {
        setError('Veuillez d\'abord générer les instructions de paiement');
        setProcessing(false);
        return;
      }

      const token = localStorage.getItem('token');
      const paymentMethod = selectedMethod === 'interac' ? 'interac' : 'virement';

      const response = await axios.post(
        `${API_URL}/payments/${payment._id}/process`,
        {
          paymentMethod: paymentMethod,
          transactionId: instructions.referenceNumber,
          notes: `Paiement ${selectedMethod} effectué le ${new Date().toLocaleString('fr-FR')} - Montant: ${payment.amount} $CAD`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push(`/payments/${payment._id}/success`);
      } else {
        throw new Error(response.data.message || 'Erreur lors du traitement');
      }
    } catch (err: any) {
      console.error('[NEW_PAYMENT] Erreur traitement paiement:', err);
      setProcessing(false);
      setError(err.response?.data?.message || 'Erreur lors du traitement du paiement');
    }
  };

  if (authLoading || loading || creatingPayment) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              {creatingPayment ? 'Création du paiement...' : 'Chargement...'}
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error && !payment) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.back()}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!payment) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12 text-center">
            <p className="text-gray-600">Paiement non trouvé</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-primary-600 hover:underline"
            >
              Retour
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 py-8">
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
                  <span className="font-bold text-lg">{payment.amount?.toFixed(2)} $CAD</span>
                </div>
                {payment.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{payment.description}</span>
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
                      <StripePaymentForm
                        clientSecret={instructions.clientSecret}
                        paymentIntentId={instructions.paymentIntentId}
                        amount={payment.amount}
                        onSuccess={handleStripeSuccess}
                        onError={(err) => setError(err)}
                      />
                    ) : processing ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Création du PaymentIntent...</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">
                          Le paiement par carte nécessite une configuration Stripe. Veuillez utiliser Interac ou virement bancaire.
                        </p>
                        <button
                          onClick={() => {
                            setSelectedMethod('');
                            setError(null);
                            setInstructions(null);
                          }}
                          className="mt-4 w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm font-medium"
                        >
                          Choisir une autre méthode
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedMethod === 'interac' && !instructions && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">🏦</span>
                      <h3 className="font-semibold text-green-900">Configuration du virement Interac</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sélectionnez votre banque
                        </label>
                        <select
                          value={interacBank}
                          onChange={(e) => setInteracBank(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                              onChange={() => setInteracContactMethod('email')}
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
                              onChange={() => setInteracContactMethod('phone')}
                              className="mr-2"
                              disabled={processing}
                            />
                            <span className="text-sm">📱 Par téléphone</span>
                          </label>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleMethodSelect('interac')}
                        disabled={!interacBank || processing}
                        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                      <h3 className="font-semibold text-green-900">Instructions de paiement Interac</h3>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                      {instructions.steps ? (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-blue-900 mb-2">📋 Informations du virement:</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Montant:</span>
                                <span className="font-bold text-green-600">{instructions.amount || payment.amount} $CAD</span>
                              </div>
                              {instructions.recipientEmail && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Email:</span>
                                  <span className="font-mono text-xs break-all">{instructions.recipientEmail}</span>
                                </div>
                              )}
                              {instructions.securityQuestion && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Question:</span>
                                  <span className="font-medium">{instructions.securityQuestion}</span>
                                </div>
                              )}
                              {instructions.securityAnswer && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Réponse:</span>
                                  <span className="font-mono text-sm bg-yellow-100 px-2 py-1 rounded">{instructions.securityAnswer}</span>
                                </div>
                              )}
                              {instructions.referenceNumber && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Référence:</span>
                                  <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="border-t pt-3">
                            <p className="text-sm font-semibold text-gray-900 mb-2">📝 Étapes:</p>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                              {instructions.steps.map((step: string, index: number) => (
                                <li key={index} className="pl-2">{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(instructions)
                            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                            .map(([key, value]: [string, any]) => (
                              <div key={key} className="flex justify-between py-2 border-b">
                                <span className="font-medium text-gray-700">{key}:</span>
                                <span className="text-gray-900 font-mono text-sm">{String(value)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Important :</strong> Après avoir effectué le virement, cliquez sur "Confirmer le paiement".
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
                      <h3 className="font-semibold text-blue-900">Configuration du virement bancaire</h3>
                    </div>
                    
                    <button
                      onClick={() => handleMethodSelect('virement')}
                      disabled={processing}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
                    >
                      {processing ? 'Génération des instructions...' : 'Générer les instructions de virement'}
                    </button>
                  </div>
                )}

                {selectedMethod === 'virement' && instructions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-2">🏛️</span>
                      <h3 className="font-semibold text-blue-900">Instructions de virement bancaire</h3>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                      {instructions.steps ? (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-blue-900 mb-2">📋 Informations:</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Montant:</span>
                                <span className="font-bold text-blue-600">{instructions.amount || payment.amount} $CAD</span>
                              </div>
                              {instructions.accountNumber && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Compte:</span>
                                  <span className="font-mono text-xs">{instructions.accountNumber}</span>
                                </div>
                              )}
                              {instructions.transitNumber && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Transit:</span>
                                  <span className="font-mono text-xs">{instructions.transitNumber}</span>
                                </div>
                              )}
                              {instructions.referenceNumber && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Référence:</span>
                                  <span className="font-mono text-xs">{instructions.referenceNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="border-t pt-3">
                            <p className="text-sm font-semibold text-gray-900 mb-2">📝 Étapes:</p>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                              {instructions.steps.map((step: string, index: number) => (
                                <li key={index} className="pl-2">{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(instructions)
                            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                            .map(([key, value]: [string, any]) => (
                              <div key={key} className="flex justify-between py-2 border-b">
                                <span className="font-medium text-gray-700">{key}:</span>
                                <span className="text-gray-900 font-mono text-sm">{String(value)}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Important :</strong> Après avoir effectué le virement, cliquez sur "Confirmer le paiement".
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
      <Footer />
    </>
  );
}

