import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { Payment } from '../../../types/payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function PaymentSuccess() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id) {
      loadPayment();
    }
  }, [id, isAuthenticated, authLoading]);

  const loadPayment = async () => {
    try {
      console.log('[SUCCESS PAGE] Chargement paiement:', id);
      const response = await axios.get(`${API_URL}/payments/${id}`);
      if (response.data.success) {
        console.log('[SUCCESS PAGE] Paiement chargé:', response.data.data);
        setPayment(response.data.data);
      } else {
        console.error('[SUCCESS PAGE] Réponse non réussie:', response.data);
      }
    } catch (error: any) {
      console.error('[SUCCESS PAGE] Erreur chargement paiement:', error);
      if (error.response?.status === 404) {
        console.error('[SUCCESS PAGE] Paiement non trouvé');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Paiement confirmé avec succès!
          </h1>
          
          {payment && (
            <div className="mt-6 bg-gray-50 rounded-lg p-6 text-left">
              <h2 className="text-lg font-semibold mb-4">Détails du paiement</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{payment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant:</span>
                  <span className="font-bold text-lg text-green-600">
                    {payment.amount.toFixed(2)} $CAD
                  </span>
                </div>
                {payment.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Méthode de paiement:</span>
                    <span className="font-medium capitalize">
                      {payment.paymentMethod.replace('_', ' ').replace('interac', 'Interac e-Transfer').replace('virement', 'Virement bancaire')}
                    </span>
                  </div>
                )}
                {payment.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID de transaction:</span>
                    <span className="font-mono text-sm text-gray-700 break-all">
                      {payment.transactionId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Date de paiement:</span>
                  <span className="font-medium">
                    {payment.paidDate 
                      ? new Date(payment.paidDate).toLocaleDateString('fr-FR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : new Date().toLocaleDateString('fr-FR')
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut:</span>
                  <span className="font-medium text-green-600">
                    ✅ Payé
                  </span>
                </div>
                {payment.receipt && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-gray-600">Reçu:</span>
                    <a
                      href={payment.receipt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Télécharger le reçu PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <button
              onClick={() => router.push('/payments/locataire')}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Retour à mes paiements
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p>Un email de confirmation a été envoyé à votre adresse email.</p>
            {payment?.receipt && (
              <p className="mt-2">Votre reçu est disponible en téléchargement ci-dessus.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

