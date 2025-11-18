import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface PaymentStatus {
  requestId: string;
  paymentStatus: 'en_attente' | 'paye' | 'en_retard';
  paymentDate: string | null;
  paymentAmount: number | null;
  paymentMethod: string | null;
  transactionId: string | null;
  initialPayment?: any;
  payment?: any;
  requestStatus?: string;
  requestType?: string;
}

interface PaymentContextType {
  paymentStatuses: Map<string, PaymentStatus>;
  getPaymentStatus: (requestId: string) => Promise<PaymentStatus | null>;
  refreshPaymentStatus: (requestId: string) => Promise<void>;
  clearPaymentStatus: (requestId: string) => void;
  clearAllPaymentStatuses: () => void;
  isLoading: (requestId: string) => boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paymentStatuses, setPaymentStatuses] = useState<Map<string, PaymentStatus>>(new Map());
  const [loadingRequests, setLoadingRequests] = useState<Set<string>>(new Set());

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || localStorage.getItem('token');
    }
    return null;
  };

  const getPaymentStatus = useCallback(async (requestId: string): Promise<PaymentStatus | null> => {
    if (!requestId) return null;

    // Vérifier si on a déjà le statut en cache
    const cached = paymentStatuses.get(requestId);
    if (cached) {
      return cached;
    }

    // Charger depuis le backend
    await refreshPaymentStatus(requestId);
    return paymentStatuses.get(requestId) || null;
  }, [paymentStatuses]);

  const refreshPaymentStatus = useCallback(async (requestId: string) => {
    if (!requestId || loadingRequests.has(requestId)) return;

    const token = getAuthToken();
    if (!token) return;

    setLoadingRequests(prev => new Set(prev).add(requestId));

    try {
      const response = await axios.get(`${API_URL}/requests/${requestId}/payment-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data?.success && response.data.data) {
        const statusData: PaymentStatus = {
          requestId: response.data.data.requestId || requestId,
          paymentStatus: response.data.data.paymentStatus || 'en_attente',
          paymentDate: response.data.data.paymentDate || null,
          paymentAmount: response.data.data.paymentAmount || null,
          paymentMethod: response.data.data.paymentMethod || null,
          transactionId: response.data.data.transactionId || null,
          initialPayment: response.data.data.initialPayment,
          payment: response.data.data.payment,
          requestStatus: response.data.data.requestStatus,
          requestType: response.data.data.requestType
        };

        setPaymentStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(requestId, statusData);
          return newMap;
        });

        // Émettre un événement personnalisé pour notifier les composants
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('paymentStatusUpdated', {
            detail: { requestId, status: statusData }
          }));
        }
      }
    } catch (error: any) {
      console.error('[PAYMENT CONTEXT] Erreur récupération statut:', error);
    } finally {
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  }, [loadingRequests]);

  const clearPaymentStatus = useCallback((requestId: string) => {
    setPaymentStatuses(prev => {
      const newMap = new Map(prev);
      newMap.delete(requestId);
      return newMap;
    });
  }, []);

  const clearAllPaymentStatuses = useCallback(() => {
    setPaymentStatuses(new Map());
  }, []);

  const isLoading = useCallback((requestId: string) => {
    return loadingRequests.has(requestId);
  }, [loadingRequests]);

  // Écouter les événements de mise à jour de paiement
  useEffect(() => {
    const handlePaymentProcessed = (event: any) => {
      const { requestId, paymentId } = event.detail || {};
      if (requestId) {
        // Recharger le statut après un court délai
        setTimeout(() => {
          refreshPaymentStatus(requestId);
        }, 500);
      }
      // Si un paymentId est fourni, on peut aussi recharger les listes de paiements
      if (paymentId) {
        console.log('[PAYMENT CONTEXT] Paiement traité, synchronisation globale nécessaire');
        // Émettre un événement pour forcer le rechargement des listes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('paymentListRefresh', {
            detail: { paymentId }
          }));
        }
      }
    };

    const handlePaymentSync = (event: any) => {
      const { paymentId, status, unitId, payerId } = event.detail || {};
      if (paymentId && status === 'paye') {
        console.log('[PAYMENT CONTEXT] Synchronisation globale déclenchée pour paiement:', paymentId);
        // Forcer le rechargement de toutes les listes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('paymentListRefresh', {
            detail: { paymentId, status, unitId, payerId }
          }));
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('paymentProcessed', handlePaymentProcessed);
      window.addEventListener('paymentStatusUpdated', handlePaymentSync);
      return () => {
        window.removeEventListener('paymentProcessed', handlePaymentProcessed);
        window.removeEventListener('paymentStatusUpdated', handlePaymentSync);
      };
    }
  }, [refreshPaymentStatus]);

  return (
    <PaymentContext.Provider
      value={{
        paymentStatuses,
        getPaymentStatus,
        refreshPaymentStatus,
        clearPaymentStatus,
        clearAllPaymentStatuses,
        isLoading
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

