import { useState, useEffect } from 'react'
import axios from 'axios'
import DocumentList from './DocumentList'
import DocumentUpload from './DocumentUpload'
import DocumentFilters from './DocumentFilters'
import FolderTree from './FolderTree'
import CategoryManager from './CategoryManager'
import TagManager from './TagManager'

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

interface DocumentCategory {
  _id: string
  name: string
  description?: string
  color: string
  icon: string
  documentCount?: number
}

interface DocumentTag {
  _id: string
  name: string
  color: string
  usageCount: number
}

interface DocumentFolder {
  _id: string
  name: string
  description?: string
  parentFolder?: string
  documentCount: number
  subfolderCount: number
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [tags, setTags] = useState<DocumentTag[]>([])
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'documents' | 'categories' | 'tags' | 'folders'>('documents')
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    folder: '',
    tags: [] as string[],
    building: '',
    unit: '',
    isArchived: false,
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  })

  useEffect(() => {
    loadCategories()
    loadTags()
    loadFolders()
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [filters, pagination.page])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.folder) params.append('folder', filters.folder)
      if (filters.building) params.append('building', filters.building)
      if (filters.unit) params.append('unit', filters.unit)
      if (filters.isArchived) params.append('isArchived', 'true')
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      params.append('sortBy', filters.sortBy)
      params.append('sortOrder', filters.sortOrder)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/documents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setDocuments(response.data.data || [])
      setPagination({
        ...pagination,
        total: response.data.total || 0,
        pages: response.data.pages || 1
      })
    } catch (error) {
      console.error('Erreur chargement documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/documents/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Erreur chargement catégories:', error)
    }
  }

  const loadTags = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/documents/tags`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTags(response.data.data || [])
    } catch (error) {
      console.error('Erreur chargement tags:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/documents/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFolders(response.data.data || [])
    } catch (error) {
      console.error('Erreur chargement dossiers:', error)
    }
  }

  const handleDocumentUploaded = () => {
    loadDocuments()
    loadCategories()
    loadTags()
    loadFolders()
  }

  const handleDocumentDeleted = () => {
    loadDocuments()
  }

  const handleDocumentUpdated = () => {
    loadDocuments()
  }

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'documents', label: 'Documents', icon: '📄' },
            { id: 'categories', label: 'Catégories', icon: '📁' },
            { id: 'tags', label: 'Tags', icon: '🏷️' },
            { id: 'folders', label: 'Dossiers', icon: '📂' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar avec filtres et arborescence */}
          <div className="lg:col-span-1 space-y-4">
            <DocumentFilters
              filters={filters}
              categories={categories}
              tags={tags}
              folders={folders}
              onFiltersChange={setFilters}
            />
            <FolderTree
              folders={folders}
              selectedFolder={filters.folder}
              onFolderSelect={(folderId) => setFilters({ ...filters, folder: folderId })}
            />
          </div>

          {/* Zone principale */}
          <div className="lg:col-span-3 space-y-4">
            <DocumentUpload
              categories={categories}
              tags={tags}
              folders={folders}
              onUploaded={handleDocumentUploaded}
            />
            <DocumentList
              documents={documents}
              loading={loading}
              pagination={pagination}
              onPageChange={(page) => setPagination({ ...pagination, page })}
              onDelete={handleDocumentDeleted}
              onUpdate={handleDocumentUpdated}
            />
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoryManager
          categories={categories}
          onCategoriesChange={loadCategories}
        />
      )}

      {activeTab === 'tags' && (
        <TagManager
          tags={tags}
          onTagsChange={loadTags}
        />
      )}

      {activeTab === 'folders' && (
        <div>
          <p className="text-gray-600">Gestion des dossiers (à implémenter)</p>
        </div>
      )}
    </div>
  )
}

