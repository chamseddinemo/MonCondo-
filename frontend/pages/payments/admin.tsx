import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Payment, PaymentStats } from '../../types/payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminPayments() {
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
    console.log('[ADMIN PAYMENTS PAGE] Router ready:', router.isReady, 'Query:', router.query);
    if (router.isReady) {
      if (router.query.status) {
        const status = router.query.status as string;
        console.log('[ADMIN PAYMENTS PAGE] Status depuis URL:', status);
        if (['all', 'en_attente', 'paye', 'en_retard'].includes(status)) {
          console.log('[ADMIN PAYMENTS PAGE] Filtre initialisé depuis URL:', status);
          setFilter(status as 'all' | 'en_attente' | 'paye' | 'en_retard');
        }
      } else {
        console.log('[ADMIN PAYMENTS PAGE] Aucun status dans l\'URL, filtre par défaut: all');
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

    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Attendre que router soit prêt et que le filtre soit initialisé
    if (isAuthenticated && router.isReady) {
      console.log('[ADMIN PAYMENTS PAGE] Chargement des paiements avec filtre:', filter);
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
      console.error('Erreur chargement paiements:', err);
      if (err.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à accéder à cette page. Veuillez vérifier votre session.');
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
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // Fonction centralisée pour recharger les données
  const refreshData = async () => {
    await Promise.all([loadPayments(), loadStats()]);
  };

  // Utiliser le hook de synchronisation centralisé
  usePaymentSync(refreshData, [user?._id, filter]);

  const formatPrice = (price?: number) => price ? `$${price.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
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
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link href="/dashboard/admin" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
              ← Retour au tableau de bord
            </Link>
            <h1 className="text-4xl font-bold mb-2">
              {filter === 'en_retard' ? '⚠️ Paiements en retard' :
               filter === 'paye' ? '✅ Paiements payés' :
               filter === 'en_attente' ? '⏳ Paiements en attente' :
               '💳 Gestion des paiements'}
            </h1>
            <p className="text-gray-600">
              {filter === 'en_retard' ? `${payments.length} paiement(s) nécessitent votre attention` :
               filter === 'paye' ? `${payments.length} paiement(s) payé(s)` :
               filter === 'en_attente' ? `${payments.length} paiement(s) en attente` :
               'Gérez tous les paiements du système'}
            </p>
          </div>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <p className="text-blue-100 text-sm mb-1">Total reçu</p>
                <p className="text-3xl font-bold">{formatPrice(stats.totalPaid)}</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <p className="text-yellow-100 text-sm mb-1">En attente</p>
                <p className="text-3xl font-bold">{stats.pendingCount || 0}</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
                <p className="text-red-100 text-sm mb-1">En retard</p>
                <p className="text-3xl font-bold">{stats.overdueCount || 0}</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <p className="text-green-100 text-sm mb-1">Payés</p>
                <p className="text-3xl font-bold">{stats.paidCount || 0}</p>
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

          {/* Liste des paiements */}
          {error ? (
            <div className="card p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-800">{error}</p>
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => {
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
                              {payment.payer?.firstName} {payment.payer?.lastName} • Unité {payment.unit?.unitNumber}
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
                {filter === 'en_retard' ? 'Excellent ! Tous les paiements sont à jour.' :
                 filter === 'paye' ? 'Aucun paiement payé pour le moment.' :
                 filter === 'en_attente' ? 'Aucun paiement en attente.' :
                 'Aucun paiement dans le système pour le moment.'}
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

