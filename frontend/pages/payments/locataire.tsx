import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { usePaymentSync } from '../../hooks/usePaymentSync';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import PaymentCard from '../../components/payments/PaymentCard';
import { Payment, PaymentStats } from '../../types/payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function LocatairePayments() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'paye' | 'en_retard'>('all');

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = { sort: 'dueDate', order: 'desc' };
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await axios.get(`${API_URL}/payments`, { params });
      
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
      const response = await axios.get(`${API_URL}/payments/stats`);
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'locataire') {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, authLoading, user, filter]);

  // Utiliser le hook de synchronisation centralisé
  usePaymentSync(refreshData, [user?._id, filter]);

  const handlePay = (payment: Payment) => {
    router.push(`/payments/${payment._id}/pay`);
  };

  const handleView = (payment: Payment) => {
    router.push(`/payments/${payment._id}`);
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Chargement de vos paiements...</p>
            <p className="mt-2 text-sm text-gray-500">Veuillez patienter</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error && error.includes('403') || error?.includes('non autorisé')) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/locataire')}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retour au dashboard
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Se connecter
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.status === filter);

  const overduePayments = payments.filter(p => 
    p.status === 'en_attente' && new Date(p.dueDate) < new Date()
  );

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Link 
                  href="/dashboard/locataire" 
                  className="text-primary-600 hover:text-primary-700 mb-2 inline-block flex items-center gap-2"
                >
                  <span>←</span>
                  <span>Retour au tableau de bord</span>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Mes paiements</h1>
                <p className="mt-2 text-gray-600">Gérez vos factures et paiements</p>
              </div>
            </div>
          </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total payé</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalAmount.toFixed(2)} $CAD
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalPending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalOverdue}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Payés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPaid}</p>
            </div>
          </div>
        )}

        {/* Alerte paiements en retard */}
        {overduePayments.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-red-500 text-2xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-red-800">
                  {overduePayments.length} paiement(s) en retard
                </h3>
                <p className="mt-2 text-sm text-red-700">
                  Veuillez régler vos paiements en retard dès que possible pour éviter des frais supplémentaires.
                </p>
                <div className="mt-3">
                  {overduePayments.slice(0, 3).map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between bg-white rounded p-2 mb-2">
                      <span className="text-sm text-gray-700">
                        {payment.type} - {payment.amount.toFixed(2)} $CAD
                      </span>
                      <button
                        onClick={() => handlePay(payment)}
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                      >
                        Payer maintenant
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('en_attente')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'en_attente'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('en_retard')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'en_retard'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            En retard
          </button>
          <button
            onClick={() => setFilter('paye')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'paye'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Payés
          </button>
        </div>

        {/* Liste des paiements */}
        {error && !error.includes('403') && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun paiement trouvé</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "Vous n'avez aucun paiement pour le moment."
                : `Aucun paiement avec le statut "${filter}" trouvé.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPayments.map((payment) => (
              <PaymentCard
                key={payment._id}
                payment={payment}
                onPay={handlePay}
                onView={handleView}
              />
            ))}
          </div>
        )}
        </div>
      </div>
      <Footer />
    </>
  );
}

