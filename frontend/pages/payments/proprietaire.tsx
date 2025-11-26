import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import { useSocket } from '../../contexts/SocketContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Payment, PaymentStats } from '../../types/payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProprietairePayments() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { refreshPaymentStatus } = usePayment();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'paye' | 'en_retard'>('all');

  // Initialiser le filtre depuis l'URL si présent (priorité haute)
  useEffect(() => {
    console.log('[PAYMENTS PAGE] Router ready:', router.isReady, 'Query:', router.query);
    if (router.isReady) {
      if (router.query.status) {
        const status = router.query.status as string;
        console.log('[PAYMENTS PAGE] Status depuis URL:', status);
        if (['all', 'en_attente', 'paye', 'en_retard'].includes(status)) {
          console.log('[PAYMENTS PAGE] Filtre initialisé depuis URL:', status);
          setFilter(status as 'all' | 'en_attente' | 'paye' | 'en_retard');
        }
      } else {
        console.log('[PAYMENTS PAGE] Aucun status dans l\'URL, filtre par défaut: all');
        setFilter('all');
      }
    }
  }, [router.isReady, router.query.status]);

  // Charger les données après que le filtre soit initialisé
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'proprietaire') {
      router.push('/dashboard');
      return;
    }

    // Attendre que router soit prêt et que le filtre soit initialisé
    if (isAuthenticated && router.isReady) {
      console.log('[PAYMENTS PAGE] Chargement des paiements avec filtre:', filter);
      loadPayments();
      loadStats();
    }
  }, [isAuthenticated, authLoading, user, filter, router.isReady]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const params: any = { sort: 'dueDate', order: 'desc' };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await axios.get(`${API_URL}/payments`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPayments(response.data.data || []);
      } else {
        setError(response.data.message || 'Erreur lors du chargement des paiements');
      }
    } catch (err: any) {
      console.error('[PAYMENTS PAGE] ❌ Erreur chargement paiements:', err);
      console.error('[PAYMENTS PAGE] Détails:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url
      });
      
      if (err.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à accéder à cette page. Veuillez vérifier votre session.');
      } else if (err.response?.status >= 500) {
        const serverMessage = err.response?.data?.message || '';
        setError(serverMessage || 'Erreur serveur. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande. Veuillez réessayer plus tard.');
      } else if (err.response?.status === 404) {
        setError('Route non trouvée. Vérifiez que le backend est démarré et que la route existe.');
      } else if (!err.response && err.request) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.');
      } else {
        setError(err.response?.data?.message || 'Erreur lors du chargement des paiements');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/payments/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        console.error('[PAYMENTS PAGE] ⚠️ Stats non disponibles:', response.data.message);
        // Initialiser avec des stats vides plutôt que de laisser null
        setStats({
          totalPaid: 0,
          totalPending: 0,
          totalOverdue: 0,
          paidCount: 0,
          pendingCount: 0,
          overdueCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0
        });
      }
    } catch (err: any) {
      console.error('[PAYMENTS PAGE] ❌ Erreur chargement stats:', err);
      console.error('[PAYMENTS PAGE] Détails:', {
        status: err.response?.status,
        message: err.response?.data?.message
      });
      
      // Initialiser avec des stats vides en cas d'erreur
      setStats({
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
      });
    }
  };

  // Fonction centralisée pour recharger les données
  const refreshData = async () => {
    await Promise.all([loadPayments(), loadStats()]);
  };

  // Utiliser le hook de synchronisation centralisé avec rafraîchissement automatique
  usePaymentSync(refreshData, [user?._id, filter]);
  
  // Utiliser Socket.io pour synchronisation en temps réel
  const { socket, connected } = useSocket();
  
  // Écouter les événements Socket.io pour synchronisation en temps réel
  useEffect(() => {
    if (!socket || !connected) return;
    
    const handlePaymentSync = () => {
      console.log('[PAYMENTS PAGE] 🔄 Événement paymentSync reçu, rafraîchissement...');
      refreshData();
    };
    
    const handlePaymentPaid = () => {
      console.log('[PAYMENTS PAGE] ✅ Événement paymentPaid reçu, rafraîchissement...');
      refreshData();
    };
    
    const handleGlobalSync = (data: any) => {
      if (data.type === 'payment') {
        console.log('[PAYMENTS PAGE] 🔄 Événement globalSync (payment) reçu, rafraîchissement...');
        refreshData();
      }
    };
    
    socket.on('paymentSync', handlePaymentSync);
    socket.on('paymentPaid', handlePaymentPaid);
    socket.on('globalSync', handleGlobalSync);
    
    return () => {
      socket.off('paymentSync', handlePaymentSync);
      socket.off('paymentPaid', handlePaymentPaid);
      socket.off('globalSync', handleGlobalSync);
    };
  }, [socket, connected]);

  const formatPrice = (price?: number) => price ? `$${price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRoles={['proprietaire']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Chargement de vos paiements...</p>
            <p className="mt-2 text-sm text-gray-500">Veuillez patienter</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['proprietaire']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link href="/dashboard/proprietaire" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
              ← Retour au tableau de bord
            </Link>
            <h1 className="text-4xl font-bold mb-2">
              {filter === 'en_retard' ? '⚠️ Paiements en retard' :
               filter === 'paye' ? '✅ Paiements payés' :
               filter === 'en_attente' ? '⏳ Paiements en attente' :
               'Mes paiements'}
            </h1>
            <p className="text-gray-600">
              {filter === 'en_retard' ? `${payments.length} paiement(s) nécessitent votre attention` :
               filter === 'paye' ? `${payments.length} paiement(s) payé(s)` :
               filter === 'en_attente' ? `${payments.length} paiement(s) en attente` :
               'Gérez vos paiements et transactions'}
            </p>
          </div>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <p className="text-blue-100 text-sm mb-1">Total reçu</p>
                <p className="text-3xl font-bold">{formatPrice(stats.totalAmount || stats.totalPaid)}</p>
                <p className="text-blue-100 text-xs mt-1">{stats.paidCount || stats.totalPaid || 0} paiement(s) payé(s)</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <p className="text-yellow-100 text-sm mb-1">En attente</p>
                <p className="text-3xl font-bold">{stats.pendingCount || stats.totalPending || 0}</p>
                <p className="text-yellow-100 text-xs mt-1">{formatPrice(stats.pendingAmount || 0)}</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
                <p className="text-red-100 text-sm mb-1">En retard</p>
                <p className="text-3xl font-bold">{stats.overdueCount || stats.totalOverdue || 0}</p>
                <p className="text-red-100 text-xs mt-1">{formatPrice(stats.overdueAmount || 0)}</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <p className="text-green-100 text-sm mb-1">Payés</p>
                <p className="text-3xl font-bold">{stats.paidCount || stats.totalPaid || 0}</p>
                <p className="text-green-100 text-xs mt-1">{formatPrice(stats.paidAmount || stats.totalAmount || 0)}</p>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div className="card p-6 mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('en_attente')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'en_attente' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                En attente
              </button>
              <button
                onClick={() => setFilter('paye')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'paye' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Payés
              </button>
              <button
                onClick={() => setFilter('en_retard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'en_retard' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                En retard
              </button>
            </div>
          </div>

          {/* Liste des paiements - Organisés par unité */}
          {error ? (
            <div className="card p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-800">{error}</p>
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-6">
              {/* Grouper les paiements par unité */}
              {(() => {
                // Grouper par unité
                const paymentsByUnit: { [key: string]: Payment[] } = {};
                payments.forEach(payment => {
                  const unitId = payment.unit?._id || payment.unit || 'unknown';
                  if (!paymentsByUnit[unitId]) {
                    paymentsByUnit[unitId] = [];
                  }
                  paymentsByUnit[unitId].push(payment);
                });

                // Calculer les totaux par unité
                const unitStats: { [key: string]: { total: number; paid: number; pending: number; overdue: number } } = {};
                Object.keys(paymentsByUnit).forEach(unitId => {
                  const unitPayments = paymentsByUnit[unitId];
                  unitStats[unitId] = {
                    total: unitPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
                    paid: unitPayments.filter(p => p.status === 'paye').reduce((sum, p) => sum + (p.amount || 0), 0),
                    pending: unitPayments.filter(p => p.status === 'en_attente').reduce((sum, p) => sum + (p.amount || 0), 0),
                    overdue: unitPayments.filter(p => p.status === 'en_retard' || (p.status === 'en_attente' && p.dueDate && new Date(p.dueDate) < new Date())).reduce((sum, p) => sum + (p.amount || 0), 0)
                  };
                });

                return Object.keys(paymentsByUnit).map(unitId => {
                  const unitPayments = paymentsByUnit[unitId];
                  const firstPayment = unitPayments[0];
                  const unitNumber = firstPayment.unit?.unitNumber || 'Inconnue';
                  const buildingName = firstPayment.building?.name || 'Immeuble inconnu';
                  const stats = unitStats[unitId];

                  return (
                    <div key={unitId} className="card p-6 border-l-4 border-primary-500">
                      {/* En-tête de l'unité */}
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              🏠 Unité {unitNumber}
                            </h3>
                            <p className="text-sm text-gray-600">{buildingName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Total unité</p>
                            <p className="text-lg font-bold text-primary-600">{formatPrice(stats.total)}</p>
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-green-600">✅ {formatPrice(stats.paid)}</span>
                              <span className="text-yellow-600">⏳ {formatPrice(stats.pending)}</span>
                              {stats.overdue > 0 && <span className="text-red-600">⚠️ {formatPrice(stats.overdue)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Liste des paiements de l'unité */}
                      <div className="space-y-3">
                        {unitPayments.map((payment) => {
                // Déterminer si le paiement est en retard (même si status est 'en_attente')
                const isOverdue = payment.status === 'en_retard' || 
                  (payment.status === 'en_attente' && payment.dueDate && new Date(payment.dueDate) < new Date());
                const daysOverdue = isOverdue && payment.dueDate 
                  ? Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <div key={payment._id} className={`card p-6 hover:shadow-lg transition-shadow ${
                    isOverdue ? 'border-l-4 border-red-500 bg-red-50' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{isOverdue ? '⚠️' : '💰'}</span>
                          <div>
                            <p className={`font-semibold text-lg ${isOverdue ? 'text-red-900' : ''}`}>
                              {formatPrice(payment.amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {payment.payer?.firstName} {payment.payer?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payment.description || 'Paiement'}
                            </p>
                            {isOverdue && daysOverdue > 0 && (
                              <p className="text-xs text-red-600 font-semibold mt-1">
                                ⚠️ En retard depuis {daysOverdue} jour{daysOverdue > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'paye' ? 'bg-green-100 text-green-800' :
                          isOverdue ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'paye' ? 'Payé' :
                           isOverdue ? 'En retard' :
                           'En attente'}
                        </span>
                        {payment.dueDate && (
                          <p className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Échéance: {formatDate(payment.dueDate)}
                          </p>
                        )}
                        <Link 
                          href={`/payments/${payment._id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          Voir détails →
                        </Link>
                      </div>
                    </div>
                  </div>
                        );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">
                {filter === 'en_retard' ? '✅' : filter === 'paye' ? '💵' : filter === 'en_attente' ? '⏳' : '💳'}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {filter === 'en_retard' ? 'Aucun paiement en retard' :
                 filter === 'paye' ? 'Aucun paiement payé' :
                 filter === 'en_attente' ? 'Aucun paiement en attente' :
                 'Aucun paiement'}
              </h2>
              <p className="text-gray-600 mb-4">
                {filter === 'en_retard' ? 'Excellent ! Tous vos paiements sont à jour.' :
                 filter === 'paye' ? 'Vous n\'avez pas encore de paiements payés.' :
                 filter === 'en_attente' ? 'Vous n\'avez pas de paiements en attente.' :
                 'Vous n\'avez aucun paiement pour le moment.'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Voir tous les paiements
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  );
}

