import { useState } from 'react'

interface DocumentCategory {
  _id: string
  name: string
}

interface DocumentTag {
  _id: string
  name: string
}

interface DocumentFolder {
  _id: string
  name: string
}

interface Filters {
  search: string
  category: string
  folder: string
  tags: string[]
  building: string
  unit: string
  isArchived: boolean
  sortBy: string
  sortOrder: string
}

interface DocumentFiltersProps {
  filters: Filters
  categories: DocumentCategory[]
  tags: DocumentTag[]
  folders: DocumentFolder[]
  onFiltersChange: (filters: Filters) => void
}

export default function DocumentFilters({
  filters,
  categories,
  tags,
  folders,
  onFiltersChange
}: DocumentFiltersProps) {
  const [showFilters, setShowFilters] = useState(true)

  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(id => id !== tagId)
      : [...filters.tags, tagId]
    updateFilter('tags', newTags)
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: '',
      folder: '',
      tags: [],
      building: '',
      unit: '',
      isArchived: false,
      sortBy: 'date',
      sortOrder: 'desc'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filtres</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-gray-500 hover:text-gray-700"
        >
          {showFilters ? '−' : '+'}
        </button>
      </div>

      {showFilters && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Nom, description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Toutes</option>
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
              value={filters.folder}
              onChange={(e) => updateFilter('folder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Tous</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {tags.map((tag) => (
                <label key={tag._id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag._id)}
                    onChange={() => toggleTag(tag._id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tri
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
            >
              <option value="date">Date</option>
              <option value="name">Nom</option>
              <option value="size">Taille</option>
              <option value="downloads">Téléchargements</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => updateFilter('sortOrder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isArchived"
              checked={filters.isArchived}
              onChange={(e) => updateFilter('isArchived', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isArchived" className="ml-2 block text-sm text-gray-700">
              Afficher les archives
            </label>
          </div>

          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  )
}

