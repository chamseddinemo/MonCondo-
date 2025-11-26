'use client'

import { Building } from '../../services/realEstateService'
import Link from 'next/link'

interface BuildingInfoWindowProps {
  building: Building
  userRole?: string
  onViewDetails?: () => void
  onGetDirections?: () => void
}

export default function BuildingInfoWindow({
  building,
  userRole,
  onViewDetails,
  onGetDirections
}: BuildingInfoWindowProps) {
  const formatAddress = () => {
    const addr = building.address
    if (!addr) return 'Adresse non disponible'
    
    const parts = [
      addr.street,
      addr.city,
      addr.province,
      addr.postalCode
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  const isAdmin = userRole === 'admin'
  const isProprietaire = userRole === 'proprietaire'
  const isClient = userRole === 'visiteur' || !userRole

  return (
    <div className="p-3 max-w-xs">
      <h3 className="font-bold text-lg mb-2">{building.name}</h3>
      
      <div className="space-y-2 text-sm">
        {/* Adresse */}
        <div className="flex items-start">
          <span className="mr-2">📍</span>
          <span className="text-gray-700">{formatAddress()}</span>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <span className="text-gray-500">Total unités:</span>
            <span className="font-semibold ml-1">{building.totalUnits || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Disponibles:</span>
            <span className={`font-semibold ml-1 ${
              (building.availableUnits || 0) > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {building.availableUnits || 0}
            </span>
          </div>
        </div>

        {/* Année de construction */}
        {building.yearBuilt && (
          <div className="text-gray-600">
            <span className="text-gray-500">Construit en:</span> {building.yearBuilt}
          </div>
        )}

        {/* Actions selon le rôle */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Admin/Propriétaire : Voir détails complets */}
          {(isAdmin || isProprietaire) && (
            building._id ? (
              <Link
                href={`/buildings/${building._id}`}
                className="btn-primary text-center text-xs py-2"
              >
                📋 Voir les détails
              </Link>
            ) : (
              <button
                disabled
                className="btn-primary text-center text-xs py-2 opacity-50 cursor-not-allowed"
                title="ID d'immeuble manquant"
                onClick={() => console.warn('[BUILDING_INFO_WINDOW] ⚠️ ID manquant pour navigation')}
              >
                📋 Voir les détails
              </button>
            )
          )}

          {/* Client : Voir détails ou faire demande */}
          {isClient && (
            <>
              {building._id ? (
                <Link
                  href={`/buildings/${building._id}`}
                  className="btn-secondary text-center text-xs py-2"
                >
                  👁️ Voir les détails
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-secondary text-center text-xs py-2 opacity-50 cursor-not-allowed"
                  title="ID d'immeuble manquant"
                  onClick={() => console.warn('[BUILDING_INFO_WINDOW] ⚠️ ID manquant pour navigation')}
                >
                  👁️ Voir les détails
                </button>
              )}
              {(building.availableUnits || 0) > 0 && building._id && (
                <Link
                  href={`/request?building=${building._id}`}
                  className="btn-primary text-center text-xs py-2"
                >
                  📝 Faire une demande
                </Link>
              )}
            </>
          )}

          {/* Itinéraire */}
          {onGetDirections && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onGetDirections()
              }}
              className="btn-secondary text-center text-xs py-2"
            >
              🗺️ Itinéraire
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

