export interface Payment {
  _id: string;
  unit: {
    _id: string;
    unitNumber: string;
    floor?: number;
  };
  building: {
    _id: string;
    name: string;
    address?: string;
  };
  payer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  recipient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  type: 'loyer' | 'charges' | 'entretien' | 'stationnement' | 'autre';
  amount: number;
  description?: string;
  dueDate: string;
  paidDate?: string;
  status: 'en_attente' | 'paye' | 'en_retard' | 'annule';
  paymentMethod?: 'carte_credit' | 'interac' | 'virement' | 'portefeuille' | 'autre';
  transactionId?: string;
  referenceNumber?: string;
  receipt?: {
    filename: string;
    path: string;
    url: string;
    generatedAt: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalAmount: number;
}

