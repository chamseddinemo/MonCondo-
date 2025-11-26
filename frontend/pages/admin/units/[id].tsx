'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'
import { getUnitImagePath } from '../../../utils/imageUtils'
import { authenticatedAxios } from '../../../utils/axiosInstances'
import { getUnitById, updateUnit, getAllBuildings } from '../../../services/realEstateService'
import GoogleMapCard from '../../../components/maps/GoogleMapCard'

interface Unit {
  _id: string
  unitNumber: string
  floor?: number
  type: string
  size: number
  bedrooms: number
  bathrooms?: number
  status: string
  rentPrice?: number
  salePrice?: number
  monthlyCharges?: number
  availableFrom?: string
  description?: string
  images?: string[]
  imageUrl?: string
  isAvailable?: boolean
  building: {
    _id: string
    name: string
    address: {
      street: string
      city: string
      province?: string
      postalCode?: string
    }
  }
}

interface Building {
  _id: string
  name: string
}

export default function EditUnit() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
  const [unit, setUnit] = useState<Unit | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    building: '',
    unitNumber: '',
    floor: '',
    type: '1br' as 'studio' | '1br' | '2br' | '3br' | '4br' | 'penthouse' | 'commercial',
    size: '',
    bedrooms: '1',
    bathrooms: '1',
    status: 'disponible' as 'disponible' | 'loue' | 'vendu' | 'maintenance' | 'negociation' | 'vendue_louee',
    rentPrice: '',
    salePrice: '',
    monthlyCharges: '0',
    description: '',
    transactionType: 'location' as 'vente' | 'location',
    isAvailable: true
  })
  
  // États pour l'upload d'images
  const [uploadingImages, setUploadingImages] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  useEffect(() => {
    if (id) {
      loadUnit()
      loadBuildings()
    }
  }, [id])

  const loadUnit = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const unitData = await getUnitById(id as string)
      setUnit(unitData)
      
      // Initialiser le formulaire avec les données de l'unité
      setFormData({
        building: unitData.building._id,
        unitNumber: unitData.unitNumber,
        floor: unitData.floor?.toString() || '',
        type: unitData.type as any,
        size: unitData.size.toString(),
        bedrooms: unitData.bedrooms.toString(),
        bathrooms: (unitData.bathrooms || 1).toString(),
        status: unitData.status as any,
        rentPrice: unitData.rentPrice?.toString() || '',
        salePrice: unitData.salePrice?.toString() || '',
        monthlyCharges: (unitData.monthlyCharges || 0).toString(),
        description: unitData.description || '',
        transactionType: unitData.salePrice ? 'vente' : 'location',
        isAvailable: unitData.isAvailable !== false
      })
      
      // Initialiser les images uploadées
      if (unitData.images && unitData.images.length > 0) {
        setUploadedImages(unitData.images)
      }
    } catch (err: any) {
      console.error('Erreur chargement unité:', err)
      setError(err.message || 'Erreur lors du chargement de l\'unité')
    } finally {
      setLoading(false)
    }
  }

  const loadBuildings = async () => {
    try {
      const buildingsList = await getAllBuildings()
      setBuildings(buildingsList)
    } catch (err) {
      console.error('Erreur chargement immeubles:', err)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Veuillez sélectionner uniquement des images')
      return
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles])
    
    // Créer des aperçus
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewImages(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return
    
    setUploadingImages(true)
    
    try {
      const formDataUpload = new FormData()
      selectedFiles.forEach(file => {
        formDataUpload.append('images', file)
      })
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const baseUrl = API_BASE_URL.replace('/api', '')
      const uploadUrl = `${baseUrl}/upload/units/images`
      
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }))
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data && data.success) {
        const uploadedPaths = data.files.map((f: any) => f.path)
        setUploadedImages(prev => [...prev, ...uploadedPaths])
        setSelectedFiles([])
        setPreviewImages([])
        alert(`${data.files.length} image(s) uploadée(s) avec succès`)
      } else {
        throw new Error('Erreur lors de l\'upload')
      }
    } catch (err: any) {
      console.error('Erreur upload images:', err)
      alert('Erreur lors de l\'upload des images: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unit) return
    
    setSaving(true)
    setError(null)
    
    try {
      const unitData: any = {
        building: formData.building,
        unitNumber: formData.unitNumber.trim(),
        floor: parseInt(formData.floor),
        type: formData.type,
        size: parseFloat(formData.size),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        status: formData.status,
        isAvailable: formData.isAvailable
      }
      
      if (formData.rentPrice) {
        unitData.rentPrice = parseFloat(formData.rentPrice)
      }
      
      if (formData.salePrice) {
        unitData.salePrice = parseFloat(formData.salePrice)
      }
      
      if (formData.monthlyCharges) {
        unitData.monthlyCharges = parseFloat(formData.monthlyCharges)
      }
      
      if (formData.description) {
        unitData.description = formData.description.trim()
      }
      
      if (uploadedImages.length > 0) {
        unitData.images = uploadedImages
      }
      
      await updateUnit(unit._id, unitData)
      
      alert('✅ Unité mise à jour avec succès!')
      router.push(`/buildings/${unit.building._id}`)
    } catch (err: any) {
      console.error('Erreur mise à jour unité:', err)
      setError(err.message || 'Erreur lors de la mise à jour de l\'unité')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Chargement de l'unité...</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  if (error && !unit) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <Link href="/admin/units" className="mt-4 inline-block btn-secondary">
              ← Retour à la liste des unités
            </Link>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <Link href={`/buildings/${unit?.building._id}`} className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
              ← Retour aux détails de l'immeuble
            </Link>
            <h1 className="text-4xl font-bold mb-2">✏️ Modifier l'unité {unit?.unitNumber}</h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {/* Immeuble */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Immeuble <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.building}
                  onChange={(e) => handleFormChange('building', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={saving}
                >
                  <option value="">Sélectionner un immeuble</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Numéro d'unité */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro d'unité <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unitNumber}
                    onChange={(e) => handleFormChange('unitNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={saving}
                  />
                </div>
                
                {/* Étage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Étage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => handleFormChange('floor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={saving}
                  >
                    <option value="studio">Studio</option>
                    <option value="1br">1 chambre</option>
                    <option value="2br">2 chambres</option>
                    <option value="3br">3 chambres</option>
                    <option value="4br">4 chambres</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                
                {/* Superficie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Superficie (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.size}
                    onChange={(e) => handleFormChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Chambres */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chambres</label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => handleFormChange('bedrooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                    disabled={saving}
                  />
                </div>
                
                {/* Salles de bain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salles de bain</label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => handleFormChange('bathrooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="1"
                    disabled={saving}
                  />
                </div>
                
                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={saving}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="loue">Loué</option>
                    <option value="vendu">Vendu</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="negociation">En négociation</option>
                    <option value="vendue_louee">Vendue/Louée</option>
                  </select>
                </div>
              </div>
              
              {/* Type de transaction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de transaction</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => handleFormChange('transactionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={saving}
                >
                  <option value="location">Location</option>
                  <option value="vente">Vente</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Prix de location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix de location ($/mois)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rentPrice}
                    onChange={(e) => handleFormChange('rentPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={saving}
                  />
                </div>
                
                {/* Prix de vente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => handleFormChange('salePrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={saving}
                  />
                </div>
              </div>
              
              {/* Charges mensuelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charges mensuelles ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthlyCharges}
                  onChange={(e) => handleFormChange('monthlyCharges', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={saving}
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  disabled={saving}
                />
              </div>
              
              {/* Images - Upload avec drag and drop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                
                {/* Zone de drag and drop */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${saving || uploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!saving && !uploadingImages) setDragActive(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragActive(false)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragActive(false)
                    if (saving || uploadingImages) return
                    
                    const files = Array.from(e.dataTransfer.files).filter(file => 
                      file.type.startsWith('image/')
                    )
                    if (files.length > 0) {
                      handleFileSelect(files)
                    }
                  }}
                  onClick={() => {
                    if (!saving && !uploadingImages) {
                      document.getElementById('file-input-unit')?.click()
                    }
                  }}
                >
                  <input
                    id="file-input-unit"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileSelect(Array.from(e.target.files))
                      }
                    }}
                    disabled={saving || uploadingImages}
                  />
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      {uploadingImages ? (
                        <>⏳ Upload en cours...</>
                      ) : (
                        <>
                          📤 Glissez-déposez vos images ici ou cliquez pour sélectionner
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Formats acceptés: JPG, PNG, GIF (max 10MB)
                    </p>
                  </div>
                </div>
                
                {/* Aperçu des images sélectionnées */}
                {previewImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Images sélectionnées
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {previewImages.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                            <Image
                              src={preview}
                              alt={`Preview ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newPreviews = [...previewImages]
                                newPreviews.splice(idx, 1)
                                setPreviewImages(newPreviews)
                                const newFiles = [...selectedFiles]
                                newFiles.splice(idx, 1)
                                setSelectedFiles(newFiles)
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={saving || uploadingImages}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!uploadingImages && (
                      <button
                        type="button"
                        onClick={handleUploadImages}
                        className="mt-3 btn-primary text-sm"
                        disabled={selectedFiles.length === 0 || saving}
                      >
                        📤 Uploader les images
                      </button>
                    )}
                  </div>
                )}
                
                {/* Images uploadées */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Images actuelles
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedImages.map((image, idx) => (
                        <div key={idx} className="relative group">
                          <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                            <Image
                              src={getUnitImagePath({ images: [image] } as any)}
                              alt={`Image ${idx + 1}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/default/placeholder.jpg'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = [...uploadedImages]
                                newImages.splice(idx, 1)
                                setUploadedImages(newImages)
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={saving || uploadingImages}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Disponibilité */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => handleFormChange('isAvailable', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  disabled={saving}
                />
                <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-700">
                  Unité disponible
                </label>
              </div>
            </div>

            {/* Carte Google Maps - Afficher si l'unité a un immeuble avec adresse */}
            {unit?.building?.address && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <GoogleMapCard
                  address={unit.building.address}
                  title="Localisation de l'immeuble"
                  height="400px"
                />
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3">
              <Link
                href={`/buildings/${unit?.building._id}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </ProtectedRoute>
  )
}

