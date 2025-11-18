import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface SyncData {
  requests: any[]
  payments: any[]
  messages: any[]
  lastSync: number
}

interface UseDataSyncOptions {
  enabled?: boolean
  interval?: number
  limit?: number
  onUpdate?: (data: SyncData) => void
}

/**
 * Hook pour la synchronisation automatique des données en temps réel
 * Met à jour les données toutes les X secondes (par défaut 30s)
 */
export function useDataSync(options: UseDataSyncOptions = {}) {
  const { enabled = true, interval = 30000, limit = 20, onUpdate } = options
  const [data, setData] = useState<SyncData>({
    requests: [],
    payments: [],
    messages: [],
    lastSync: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setLoading(false)
        return
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const effectiveLimit = Math.max(1, Math.min(limit, 200))
      const requestsParams = {
        limit: effectiveLimit,
        sort: 'createdAt',
        order: 'desc'
      }
      const paymentsParams = {
        limit: effectiveLimit,
        sort: 'dueDate',
        order: 'desc'
      }
      const messagesParams = {
        limit: effectiveLimit,
        sort: 'createdAt',
        order: 'desc'
      }

      // Fetch all data in parallel
      const [requestsRes, paymentsRes, messagesRes] = await Promise.all([
        axios.get(`${API_URL}/requests`, { headers, params: requestsParams }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/payments`, { headers, params: paymentsParams }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`${API_URL}/messages`, { headers, params: messagesParams }).catch(() => ({ data: { success: true, data: [] } }))
      ])

      const newData: SyncData = {
        requests: requestsRes.data.success ? (requestsRes.data.data || []) : [],
        payments: paymentsRes.data.success ? (paymentsRes.data.data || []) : [],
        messages: messagesRes.data.success ? (messagesRes.data.data || []) : [],
        lastSync: Date.now()
      }

      setData(newData)

      // Callback for external updates
      if (onUpdate) {
        onUpdate(newData)
      }
    } catch (err: any) {
      console.error('Erreur synchronisation données:', err)
      setError(err.message || 'Erreur de synchronisation')
    } finally {
      setLoading(false)
    }
  }, [enabled, limit, onUpdate])

  useEffect(() => {
    if (!enabled) return

    // Initial sync
    syncData()

    // Set up interval for auto-refresh
    const syncInterval = setInterval(() => {
      syncData()
    }, interval)

    return () => {
      clearInterval(syncInterval)
    }
  }, [enabled, interval, syncData])

  return {
    data,
    loading,
    error,
    syncData,
    lastSync: data.lastSync
  }
}

/**
 * Hook pour la synchronisation spécifique des demandes
 */
export function useRequestsSync(options: UseDataSyncOptions = {}) {
  const { data, loading, error, syncData } = useDataSync(options)
  
  return {
    requests: data.requests,
    loading,
    error,
    refresh: syncData,
    stats: {
      total: data.requests.length,
      pending: data.requests.filter((r: any) => r.status === 'en_attente').length,
      inProgress: data.requests.filter((r: any) => r.status === 'en_cours').length,
      completed: data.requests.filter((r: any) => r.status === 'termine').length
    }
  }
}

/**
 * Hook pour la synchronisation spécifique des paiements
 */
export function usePaymentsSync(options: UseDataSyncOptions = {}) {
  const { data, loading, error, syncData } = useDataSync(options)
  
  return {
    payments: data.payments,
    loading,
    error,
    refresh: syncData,
    stats: {
      total: data.payments.length,
      pending: data.payments.filter((p: any) => p.status === 'en_attente').length,
      overdue: data.payments.filter((p: any) => 
        p.status === 'en_retard' || 
        (p.status === 'en_attente' && p.dueDate && new Date(p.dueDate) < new Date())
      ).length,
      paid: data.payments.filter((p: any) => p.status === 'paye').length
    }
  }
}


