import { useState } from 'react'
import axios from 'axios'
import { showToast } from '../Toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface DocumentCategory {
  _id: string
  name: string
  color: string
  icon: string
}

interface DocumentTag {
  _id: string
  name: string
  color: string
}

interface DocumentFolder {
  _id: string
  name: string
}

interface DocumentUploadProps {
  categories: DocumentCategory[]
  tags: DocumentTag[]
  folders: DocumentFolder[]
  onUploaded: () => void
}

export default function DocumentUpload({
  categories,
  tags,
  folders,
  onUploaded
}: DocumentUploadProps) {
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    file: null as File | null,
    category: '',
    folder: '',
    tags: [] as string[],
    description: '',
    isPublic: false
  })
  const [tagInput, setTagInput] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] })
    }
  }

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const handleTagRemove = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file) {
      alert('Veuillez sélectionner un fichier')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('token')
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      if (formData.category) uploadFormData.append('category', formData.category)
      if (formData.folder) uploadFormData.append('folder', formData.folder)
      if (formData.tags.length > 0) uploadFormData.append('tags', formData.tags.join(','))
      if (formData.description) uploadFormData.append('description', formData.description)
      uploadFormData.append('isPublic', formData.isPublic.toString())

      await axios.post(`${API_URL}/documents`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      showToast('Document uploadé avec succès !', 'success')
      setFormData({
        file: null,
        category: '',
        folder: '',
        tags: [],
        description: '',
        isPublic: false
      })
      setShowForm(false)
      onUploaded()
    } catch (error: any) {
      console.error('Erreur upload:', error)
      showToast(error.response?.data?.message || 'Erreur lors de l\'upload', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Uploader un document
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dossier
            </label>
            <select
              value={formData.folder}
              onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Aucun dossier</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                placeholder="Ajouter un tag"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                type="button"
                onClick={handleTagAdd}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Ajouter
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              Document public
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Upload en cours...' : 'Uploader'}
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
  )
}

