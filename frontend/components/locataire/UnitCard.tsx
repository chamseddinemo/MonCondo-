import Link from 'next/link'
import Image from 'next/image'
import { Unit } from '../../types/unit'
import { getUnitImagePath } from '../../utils/imageUtils'

interface UnitCardProps {
  unit: Unit
  onViewContract?: () => void
  onPayRent?: () => void
  onContactOwner?: () => void
}

export default function UnitCard({ unit, onViewContract, onPayRent, onContactOwner }: UnitCardProps) {
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

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden border border-gray-100">
      {/* Image de l'unité */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-200">
        {(() => {
          // Déterminer le chemin de l'image
          let imageSrc = getUnitImagePath(unit as any)
          const unitWithImages = unit as any
          if (unitWithImages.images && unitWithImages.images.length > 0) {
            const firstImage = unitWithImages.images[0]
            if (firstImage.startsWith('/images/')) {
              imageSrc = firstImage
            } else if (firstImage.startsWith('http')) {
              imageSrc = firstImage
            } else {
              imageSrc = `/images/unites/${firstImage}`
            }
          } else if (unitWithImages.imageUrl) {
            if (unitWithImages.imageUrl.startsWith('/images/')) {
              imageSrc = unitWithImages.imageUrl
            } else if (unitWithImages.imageUrl.startsWith('http')) {
              imageSrc = unitWithImages.imageUrl
            } else {
              imageSrc = `/images/unites/${unitWithImages.imageUrl}`
            }
          }
          
          return (
            <Image
              src={imageSrc}
              alt={`Unité ${unit.unitNumber}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/images/default/placeholder.jpg'
              }}
            />
          )
        })()}
      </div>
      
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">Unité {unit.unitNumber}</h3>
            {unit.building && (
              <p className="text-primary-100 text-sm">{unit.building.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {/* Informations principales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Type</p>
              <p className="font-semibold text-gray-900">{getTypeLabel(unit.type)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Étage</p>
              <p className="font-semibold text-gray-900">{unit.floor}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Superficie</p>
              <p className="font-semibold text-gray-900">{unit.size} m²</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Loyer mensuel</p>
              <p className="font-semibold text-primary-600">
                {unit.rentPrice ? `${unit.rentPrice.toFixed(2)} $CAD` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Statut du bail */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Statut du bail</p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                unit.status === 'loue' ? 'bg-green-100 text-green-800' :
                unit.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {unit.status === 'loue' ? 'Actif' :
                 unit.status === 'disponible' ? 'Disponible' :
                 unit.status}
              </span>
            </div>
          </div>

          {/* Contact propriétaire */}
          {unit.proprietaire && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Propriétaire</p>
              <p className="font-semibold text-gray-900">
                {unit.proprietaire.firstName} {unit.proprietaire.lastName}
              </p>
              <p className="text-sm text-gray-500">{unit.proprietaire.email}</p>
            </div>
          )}

          {/* Actions rapides */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {onViewContract && (
                <button
                  onClick={onViewContract}
                  className="w-full bg-primary-50 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
                >
                  📄 Voir contrat
                </button>
              )}
              {onPayRent && (
                <button
                  onClick={onPayRent}
                  className="w-full bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
                >
                  💳 Payer mon loyer
                </button>
              )}
              {onContactOwner && unit.proprietaire && (
                <button
                  onClick={onContactOwner}
                  className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  📧 Contacter le propriétaire
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

