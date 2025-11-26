import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DocumentTag {
  _id: string
  name: string
  color: string
  usageCount: number
}

interface TagManagerProps {
  tags: DocumentTag[]
  onTagsChange: () => void
}

export default function TagManager({ tags, onTagsChange }: TagManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#6B7280')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/documents/tags`,
        { name: tagName, color: tagColor },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      setTagName('')
      setTagColor('#6B7280')
      setShowForm(false)
      onTagsChange()
    } catch (error: any) {
      console.error('Erreur création tag:', error)
      alert(error.response?.data?.message || 'Erreur lors de la création')
    }
  }

  const handleDelete = async (tagId: string) => {
    if (!confirm('Supprimer ce tag ?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/documents/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onTagsChange()
    } catch (error: any) {
      console.error('Erreur suppression tag:', error)
      alert(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Créer un tag
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du tag *
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <input
                type="color"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tags</h3>
        </div>
        <div className="p-6">
          {tags.length === 0 ? (
            <p className="text-gray-500">Aucun tag</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag._id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  <span>{tag.name}</span>
                  <span className="ml-2 text-xs opacity-75">({tag.usageCount})</span>
                  <button
                    onClick={() => handleDelete(tag._id)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

