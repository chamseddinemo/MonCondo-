import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DocumentCategory {
  _id: string
  name: string
  description?: string
  color: string
  icon: string
  documentCount?: number
}

interface CategoryManagerProps {
  categories: DocumentCategory[]
  onCategoriesChange: () => void
}

export default function CategoryManager({ categories, onCategoriesChange }: CategoryManagerProps) {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'file'
  })

  const isAdmin = user?.role === 'admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      alert('Seuls les administrateurs peuvent créer des catégories')
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/documents/categories`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      alert('Catégorie créée avec succès !')
      setFormData({ name: '', description: '', color: '#3B82F6', icon: 'file' })
      setShowForm(false)
      onCategoriesChange()
    } catch (error: any) {
      console.error('Erreur création catégorie:', error)
      alert(error.response?.data?.message || 'Erreur lors de la création')
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Créer une catégorie
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Couleur
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icône
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="file, folder, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Catégories</h3>
        </div>
        <div className="p-6">
          {categories.length === 0 ? (
            <p className="text-gray-500">Aucune catégorie</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="p-4 border border-gray-200 rounded-lg"
                  style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.documentCount || 0} docs
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

