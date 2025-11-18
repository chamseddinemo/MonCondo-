import React from 'react';
import { Payment } from '../../types/payment';

interface PaymentCardProps {
  payment: Payment;
  onPay?: (payment: Payment) => void;
  onView?: (payment: Payment) => void;
  showActions?: boolean;
}

export default function PaymentCard({ payment, onPay, onView, showActions = true }: PaymentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paye':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'en_retard':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'loyer':
        return 'Loyer';
      case 'charges':
        return 'Charges';
      case 'entretien':
        return 'Entretien';
      case 'stationnement':
        return 'Stationnement';
      default:
        return type;
    }
  };

  const isOverdue = payment.status === 'en_attente' && new Date(payment.dueDate) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getTypeLabel(payment.type)}
          </h3>
          {payment.building && (
            <p className="text-sm text-gray-600 mt-1">
              {payment.building.name} - {payment.unit?.unitNumber || 'N/A'}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
          {getStatusLabel(payment.status)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Montant:</span>
          <span className="font-semibold text-gray-900">{payment.amount.toFixed(2)} $CAD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date d'échéance:</span>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
          </span>
        </div>
        {payment.paidDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Date de paiement:</span>
            <span className="text-gray-900">
              {new Date(payment.paidDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}
        {payment.description && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">{payment.description}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4">
          {payment.status !== 'paye' && onPay && (
            <button
              onClick={() => onPay(payment)}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Payer maintenant
            </button>
          )}
          {onView && (
            <button
              onClick={() => onView(payment)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voir détails
            </button>
          )}
        </div>
      )}
    </div>
  );
}

