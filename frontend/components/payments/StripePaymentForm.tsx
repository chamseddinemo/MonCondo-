import React, { useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';

interface StripePaymentFormProps {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Composant interne pour le formulaire de carte
function CardForm({ clientSecret, paymentIntentId, amount, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe n\'est pas initialisé');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Élément de carte non trouvé');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Confirmer le paiement avec la carte
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (confirmError) {
        const errorMsg = confirmError.message || 'Erreur lors du paiement';
        console.error('[STRIPE FORM] Erreur confirmation:', confirmError);
        setError(errorMsg);
        onError(errorMsg);
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Paiement réussi
        console.log('[STRIPE FORM] Paiement réussi:', paymentIntent.id);
        setProcessing(false);
        onSuccess();
      } else {
        const errorMsg = `Le paiement n'a pas été confirmé. Statut: ${paymentIntent?.status || 'inconnu'}`;
        console.error('[STRIPE FORM] Paiement non confirmé:', paymentIntent);
        setError(errorMsg);
        onError(errorMsg);
        setProcessing(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du traitement du paiement';
      setError(errorMessage);
      onError(errorMessage);
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informations de carte
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Montant total:</span>
          <span className="text-xl font-bold text-gray-900">{amount.toFixed(2)} $CAD</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          🔒 Paiement sécurisé par Stripe. Vos informations de carte ne sont jamais stockées sur nos serveurs.
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
            Traitement du paiement...
          </span>
        ) : (
          `Payer ${amount.toFixed(2)} $CAD`
        )}
      </button>
    </form>
  );
}

// Composant principal avec Elements provider
export default function StripePaymentForm(props: StripePaymentFormProps) {
  if (!STRIPE_PUBLIC_KEY) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Stripe n'est pas configuré. Veuillez définir NEXT_PUBLIC_STRIPE_PUBLIC_KEY dans votre fichier .env.local
        </p>
      </div>
    );
  }

  const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

  const options: StripeElementsOptions = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CardForm {...props} />
    </Elements>
  );
}

