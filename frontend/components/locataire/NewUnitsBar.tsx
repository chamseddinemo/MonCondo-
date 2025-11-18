import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useRouter } from 'next/router'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Unit {
  _id: string
  unitNumber: string
  floor: number
  type: string
  size: number
  bedrooms: number
  rentPrice?: number
  salePrice?: number
  status: string
  transactionType?: 'vente' | 'location'
  datePublication?: string
  updatedAt?: string
  building: {
    _id: string
    name: string
    address?: string | {
      street?: string
      city?: string
    }
  }
  proprietaire?: {
    _id: string
    firstName: string
    lastName: string
  }
}

export default function NewUnitsBar() {
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadNewUnits()
  }, [])

  const loadNewUnits = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/units/nouvelles?limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data?.success) {
        setUnits(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement nouvelles unités:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'studio': 'Studio',
      '1br': '1½',
      '2br': '2½',
      '3br': '3½',
      '4br': '4½',
      'penthouse': 'Penthouse',
      'commercial': 'Commercial'
    }
    return labels[type] || type
  }

  const getDaysSincePublication = (date?: string) => {
    if (!date) return ''
    const pubDate = new Date(date)
    const now = new Date()
    const diffTime = now.getTime() - pubDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return 'Il y a 1 jour'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
    return `Il y a ${Math.floor(diffDays / 30)} mois`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (units.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* En-tête cliquable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏠</div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-gray-900">
              Nouvelles unités disponibles
            </h3>
            <p className="text-sm text-gray-600">
              {units.length} nouvelle{units.length > 1 ? 's' : ''} unité{units.length > 1 ? 's' : ''} postée{units.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {units.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {units.length}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Liste des unités */}
      {expanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {units.map((unit) => (
              <div
                key={unit._id}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                onClick={() => router.push(`/units/${unit._id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">
                        Unité {unit.unitNumber}
                      </h4>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-semibold">
                        {getTypeLabel(unit.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {unit.building.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{unit.size} m²</span>
                      <span>{unit.bedrooms} ch.</span>
                      {unit.rentPrice && (
                        <span className="font-semibold text-primary-600">
                          {unit.rentPrice.toFixed(2)} $/mois
                        </span>
                      )}
                      {unit.salePrice && (
                        <span className="font-semibold text-primary-600">
                          {unit.salePrice.toLocaleString()} $
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      unit.transactionType === 'vente' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {unit.transactionType === 'vente' ? 'À vendre' : 'À louer'}
                    </span>
                    {unit.datePublication && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getDaysSincePublication(unit.datePublication)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {unit.proprietaire 
                      ? `Par ${unit.proprietaire.firstName} ${unit.proprietaire.lastName}`
                      : 'Par Administration'}
                  </span>
                  <Link
                    href={`/units/${unit._id}`}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Voir détails →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Link
              href="/units"
              className="block text-center text-primary-600 hover:text-primary-700 font-semibold text-sm"
            >
              Voir toutes les unités disponibles →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

