import { useState } from 'react'
import Link from 'next/link'

interface Request {
  _id: string
  title: string
  description?: string
  type: string
  status: string
  priority: string
  createdAt: string
  unit?: {
    unitNumber: string
  }
}

interface RequestCardProps {
  request: Request
  onViewDetails?: () => void
}

export default function RequestCard({ request, onViewDetails }: RequestCardProps) {
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'en_attente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'en_cours': 'bg-blue-100 text-blue-800 border-blue-300',
      'termine': 'bg-green-100 text-green-800 border-green-300',
      'accepte': 'bg-green-100 text-green-800 border-green-300',
      'refuse': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'en_cours': 'En cours',
      'termine': 'Terminée',
      'accepte': 'Acceptée',
      'refuse': 'Refusée'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      'urgente': 'bg-red-100 text-red-800',
      'haute': 'bg-orange-100 text-orange-800',
      'moyenne': 'bg-yellow-100 text-yellow-800',
      'faible': 'bg-green-100 text-green-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'maintenance': 'Maintenance',
      'location': 'Location',
      'achat': 'Achat',
      'service': 'Service',
      'reclamation': 'Réclamation',
      'autre': 'Autre'
    }
    return labels[type] || type
  }

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'maintenance': '🔧',
      'location': '🏠',
      'achat': '💰',
      'service': '🛠️',
      'reclamation': '📢',
      'autre': '📋'
    }
    return icons[type] || '📋'
  }

  return (
    <div 
      className="bg-white rounded-lg border-l-4 border-primary-500 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{getTypeIcon(request.type)}</span>
            <h3 className="font-semibold text-lg">{request.title}</h3>
          </div>
          {request.description && (
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{request.description}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
            <span className="capitalize">Type: {getTypeLabel(request.type)}</span>
            {request.unit && <span>Unité: {request.unit.unitNumber}</span>}
            <span>{new Date(request.createdAt).toLocaleDateString('fr-CA')}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
              {getStatusLabel(request.status)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(request.priority)}`}>
              {request.priority || 'moyenne'}
            </span>
          </div>
        </div>
        <Link 
          href={`/locataire/requests/${request._id}`}
          className="ml-4 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          Voir détails
        </Link>
      </div>
    </div>
  )
}

