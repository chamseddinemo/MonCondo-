'use client'

interface MapFiltersProps {
  filters: {
    status?: string
    city?: string
    minPrice?: number
    maxPrice?: number
  }
  cities: string[]
  onFilterChange: (filters: {
    status?: string
    city?: string
    minPrice?: number
    maxPrice?: number
  }) => void
}

export default function MapFilters({
  filters,
  cities,
  onFilterChange
}: MapFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFilterChange({
      ...filters,
      status: status === 'all' ? undefined : status
    })
  }

  const handleCityChange = (city: string) => {
    onFilterChange({
      ...filters,
      city: city === 'all' ? undefined : city
    })
  }

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
    onFilterChange({
      ...filters,
      [field]: value ? parseFloat(value) : undefined
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <h3 className="font-bold text-lg mb-4">🔍 Filtres de la carte</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filtre par statut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statut
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tous</option>
            <option value="available">Disponibles</option>
            <option value="full">Complets</option>
          </select>
        </div>

        {/* Filtre par ville */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ville
          </label>
          <select
            value={filters.city || 'all'}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes les villes</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Prix minimum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prix min ($)
          </label>
          <input
            type="number"
            value={filters.minPrice || ''}
            onChange={(e) => handlePriceChange('minPrice', e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Prix maximum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prix max ($)
          </label>
          <input
            type="number"
            value={filters.maxPrice || ''}
            onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
            placeholder="1000000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Bouton réinitialiser */}
      {(filters.status || filters.city || filters.minPrice || filters.maxPrice) && (
        <button
          onClick={() => onFilterChange({})}
          className="mt-4 text-sm text-primary-600 hover:text-primary-700"
        >
          ✖️ Réinitialiser les filtres
        </button>
      )}
    </div>
  )
}

