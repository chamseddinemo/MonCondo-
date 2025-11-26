import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Document {
  _id: string
  filename: string
  originalName: string
  description?: string
  category?: { _id: string; name: string; color: string; icon: string }
  folder?: { _id: string; name: string }
  tags?: Array<{ _id: string; name: string; color: string }>
  building?: { _id: string; name: string }
  unit?: { _id: string; unitNumber: string }
  uploadedBy?: { _id: string; firstName: string; lastName: string }
  size: number
  mimeType: string
  downloadCount: number
  createdAt: string
  isArchived: boolean
}

interface DocumentListProps {
  documents: Document[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  onPageChange: (page: number) => void
  onDelete: () => void
  onUpdate: () => void
}

export default function DocumentList({
  documents,
  loading,
  pagination,
  onPageChange,
  onDelete,
  onUpdate
}: DocumentListProps) {
  const { user } = useAuth()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erreur téléchargement:', error)
      alert('Erreur lors du téléchargement')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      setDeletingId(documentId)
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onDelete()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Chargement des documents...</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600">Aucun document trouvé</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taille
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc._id} className={doc.isArchived ? 'opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.originalName}</div>
                      {doc.description && (
                        <div className="text-sm text-gray-500">{doc.description}</div>
                      )}
                      {doc.building && (
                        <div className="text-xs text-gray-400">
                          {doc.building.name}
                          {doc.unit && ` - Unité ${doc.unit.unitNumber}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.category ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${doc.category.color}20`, color: doc.category.color }}
                      >
                        {doc.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags && doc.tags.length > 0 ? (
                        doc.tags.map((tag) => (
                          <span
                            key={tag._id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(doc.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(doc._id, doc.originalName)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Télécharger
                      </button>
                      {(user?.role === 'admin' || doc.uploadedBy?._id === user?.id) && (
                        <button
                          onClick={() => handleDelete(doc._id)}
                          disabled={deletingId === doc._id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deletingId === doc._id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            Page {pagination.page} sur {pagination.pages} ({pagination.total} documents)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

