import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import DocumentManager from '../../components/documents/DocumentManager'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function DocumentsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  if (!isAuthenticated || !user) {
    return <ProtectedRoute />
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestion Documentaire
            </h1>
            <p className="text-gray-600">
              Gérez vos documents avec catégories, tags et dossiers
            </p>
          </div>
          <DocumentManager />
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  )
}

