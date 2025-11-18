import React from 'react';

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  disabled?: boolean;
}

const paymentMethods = [
  {
    id: 'carte_credit',
    name: 'Carte de crédit / débit',
    icon: '💳',
    description: 'Visa, Mastercard, AMEX via Stripe',
    available: true // Sera vérifié dynamiquement
  },
  {
    id: 'interac',
    name: 'Interac e-Transfer',
    icon: '🏦',
    description: 'Virement Interac en ligne'
  },
  {
    id: 'virement',
    name: 'Virement bancaire',
    icon: '🏛️',
    description: 'Virement bancaire manuel'
  },
  {
    id: 'portefeuille',
    name: 'Portefeuille MonCondo+',
    icon: '💰',
    description: 'Crédit interne (à venir)',
    disabled: true
  }
];

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  disabled = false
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choisissez votre méthode de paiement
        </h3>
        <p className="text-sm text-gray-600">
          Sélectionnez la méthode qui vous convient le mieux
        </p>
      </div>
      {paymentMethods.map((method) => (
        <button
          key={method.id}
          onClick={() => !method.disabled && !disabled && onSelectMethod(method.id)}
          disabled={method.disabled || disabled}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            selectedMethod === method.id
              ? 'border-primary-500 bg-primary-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-primary-300'
          } ${
            method.disabled || disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center">
            <span className="text-2xl mr-4">{method.icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-lg text-gray-900">{method.name}</h4>
              <p className="text-sm text-gray-600">{method.description}</p>
            </div>
          {selectedMethod === method.id && (
            <span className="text-primary-600 text-xl font-bold">✓</span>
          )}
          {method.disabled && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Bientôt</span>
          )}
          </div>
        </button>
      ))}
    </div>
  );
}

