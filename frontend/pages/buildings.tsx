/**
 * Redirection de /buildings vers /admin/buildings
 * Cette page n'est plus utilisée, toutes les fonctionnalités sont dans /admin/buildings
 */

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../components/ProtectedRoute'

export default function Buildings() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger automatiquement vers /admin/buildings
    router.replace('/admin/buildings')
  }, [router])

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Redirection vers la page de gestion des immeubles...</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
