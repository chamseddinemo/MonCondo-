import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { authenticatedAxios } from '../../utils/axiosInstances'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useAuth } from '../../contexts/AuthContext'
import { getBuildingImagePath, getUnitImagePath } from '../../utils/imageUtils'
import { getAllBuildings, getAllUnits, updateBuilding, createUnit, type Building, type Unit } from '../../services/realEstateService'
import GoogleMapComponent from '../../components/maps/GoogleMap'
import GoogleMapCard from '../../components/maps/GoogleMapCard'

export default function BuildingDetail() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [building, setBuilding] = useState<Building | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal des documents administratifs
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  
  // Modal d'édition d'immeuble
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  
  // États pour l'upload d'images
  const [uploadingImages, setUploadingImages] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  
  // Modal d'ajout d'unité
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [addUnitSaving, setAddUnitSaving] = useState(false)
  const [addUnitError, setAddUnitError] = useState<string | null>(null)
  const [addUnitFormData, setAddUnitFormData] = useState({
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
  
  // États pour l'upload d'images dans le modal d'ajout d'unité
  const [addUnitUploadingImages, setAddUnitUploadingImages] = useState(false)
  const [addUnitDragActive, setAddUnitDragActive] = useState(false)
  const [addUnitSelectedFiles, setAddUnitSelectedFiles] = useState<File[]>([])
  const [addUnitPreviewImages, setAddUnitPreviewImages] = useState<string[]>([])
  const [addUnitUploadedImages, setAddUnitUploadedImages] = useState<string[]>([])

  useEffect(() => {
    // Attendre que le router soit prêt
    if (!router.isReady) return
    
    // Valider l'ID avant de charger
    const buildingId = id as string | undefined
    if (!buildingId || typeof buildingId !== 'string' || buildingId.trim() === '') {
      setError('ID d\'immeuble invalide')
      setLoading(false)
      console.warn('[BUILDING DETAIL] ⚠️ ID invalide:', buildingId)
      return
    }
    
    loadBuilding()
    loadUnits()
  }, [id, router.isReady])

  const loadBuilding = async () => {
    const buildingId = id as string | undefined
    if (!buildingId || typeof buildingId !== 'string' || buildingId.trim() === '') {
      setError('ID d\'immeuble invalide')
      setLoading(false)
      console.warn('[BUILDING DETAIL] ⚠️ Tentative de chargement avec ID invalide')
      return
    }
    
    try {
      // Utiliser le service centralisé pour récupérer tous les immeubles
      const buildings = await getAllBuildings()
      const foundBuilding = buildings.find((b: Building) => b._id === buildingId)
      
      if (foundBuilding) {
        setBuilding(foundBuilding)
        setError('')
      } else {
        // Fallback : essayer directement avec axios si le service ne trouve pas
        try {
          const response = await authenticatedAxios.get(`/buildings/${buildingId}`)
          if (response.data && response.data.success) {
            setBuilding(response.data.data)
            setError('')
          } else {
            setError('Immeuble non trouvé')
          }
        } catch (fallbackError: any) {
          setError('Immeuble non trouvé')
        }
      }
    } catch (error: any) {
      console.error('[BUILDING_DETAIL] ❌ Erreur chargement immeuble:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du chargement de l\'immeuble'
      setError(errorMessage)
      
      // Rediriger vers explorer si l'immeuble n'existe pas
      if (error.response?.status === 404) {
        console.warn('[BUILDING_DETAIL] ⚠️ Immeuble non trouvé, redirection vers explorer dans 3 secondes')
        setTimeout(() => {
          router.push('/explorer')
        }, 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadUnits = async () => {
    const buildingId = id as string | undefined
    if (!buildingId || typeof buildingId !== 'string' || buildingId.trim() === '') {
      console.warn('[BUILDING DETAIL] ⚠️ ID invalide pour charger les unités')
      return
    }
    
    try {
      // Utiliser le service centralisé pour récupérer les unités avec toutes les informations
      const allUnits = await getAllUnits({ building: buildingId })
      // S'assurer que toutes les unités ont toutes les propriétés nécessaires
      setUnits(allUnits.map((unit: any) => ({
        ...unit,
        floor: unit.floor || 0,
        size: unit.size || 0,
        bedrooms: unit.bedrooms || 0,
        bathrooms: unit.bathrooms || 1,
        images: unit.images || [],
        imageUrl: unit.imageUrl || (unit.images && unit.images.length > 0 ? unit.images[0] : null)
      })))
    } catch (error: any) {
      console.error('Erreur chargement unités:', error)
      // Ne pas afficher d'erreur si c'est juste un problème de récupération
      setUnits([])
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des détails de l'immeuble...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (error || !building) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">😕</div>
              <h1 className="text-4xl font-bold mb-4">Immeuble non trouvé</h1>
              <p className="text-xl text-gray-600 mb-8">{error || 'Cet immeuble n\'existe pas.'}</p>
              <Link href={authUser?.role === 'admin' ? '/admin/buildings' : authUser ? '/dashboard' : '/explorer'} className="btn-primary">
                Retour {authUser?.role === 'admin' ? 'à la liste des immeubles' : authUser ? 'au tableau de bord' : "à l'explorateur"}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const formatAddress = () => {
    const addr = building.address
    return `${addr.street}, ${addr.city}, ${addr.province} ${addr.postalCode}`
  }
  
  // Gérer l'ouverture du modal d'édition
  const handleEditBuilding = () => {
    if (!building) return
    
    setEditFormData({
      name: building.name,
      address: {
        street: building.address.street || '',
        city: building.address.city || '',
        province: building.address.province || '',
        postalCode: building.address.postalCode || '',
        country: (building.address as any).country || 'Canada'
      },
      yearBuilt: building.yearBuilt?.toString() || '',
      description: (building as any).description || '',
      isActive: building.isActive !== false,
      image: building.image || ''
    })
    setSelectedFiles([])
    setPreviewImages([])
    setShowEditModal(true)
    setEditError(null)
  }
  
  // Gérer la fermeture du modal d'édition
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditFormData(null)
    setEditError(null)
    setSelectedFiles([])
    setPreviewImages([])
    setUploadingImages(false)
    setDragActive(false)
  }
  
  // Gérer la sélection de fichiers
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
  
  // Gérer l'upload des images
  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return
    
    setUploadingImages(true)
    
    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('images', file)
      })
      
      // Utiliser l'URL complète car la route est montée sur /upload, pas /api/upload
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const baseUrl = API_BASE_URL.replace('/api', '')
      const uploadUrl = `${baseUrl}/upload/buildings/images`
      
      console.log('[BuildingDetail] Upload URL:', uploadUrl)
      
      // Récupérer le token pour l'upload
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }))
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data && data.success) {
        // Pour les immeubles, on utilise généralement une seule image principale
        // Prendre la première image uploadée
        const uploadedPath = data.files[0]?.path || ''
        if (uploadedPath) {
          setEditFormData({
            ...editFormData,
            image: uploadedPath
          })
        }
        
        // Réinitialiser les fichiers sélectionnés et les aperçus
        setSelectedFiles([])
        setPreviewImages([])
        
        alert(`${data.files.length} image(s) uploadée(s) avec succès`)
      } else {
        throw new Error('Erreur lors de l\'upload')
      }
    } catch (err: any) {
      console.error('[BuildingDetail] ❌ Erreur upload images:', err)
      alert('Erreur lors de l\'upload des images: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setUploadingImages(false)
    }
  }
  
  // Gérer la soumission de l'édition
  const handleSubmitEditBuilding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!building || !editFormData) return
    
    setEditSaving(true)
    setEditError(null)
    
    try {
      const buildingData: any = {
        name: editFormData.name.trim(),
        address: {
          street: editFormData.address.street.trim(),
          city: editFormData.address.city.trim(),
          province: editFormData.address.province.trim(),
          postalCode: editFormData.address.postalCode.trim(),
          country: (editFormData.address as any).country || 'Canada'
        },
        isActive: editFormData.isActive
      }
      
      if (editFormData.yearBuilt) {
        const year = parseInt(editFormData.yearBuilt)
        if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear()) {
          buildingData.yearBuilt = year
        }
      }
      
      if (editFormData.description) {
        buildingData.description = editFormData.description.trim()
      }
      
      if (editFormData.image) {
        buildingData.image = editFormData.image
      }
      
      await updateBuilding(building._id, buildingData)
      
      // Recharger les données
      await loadBuilding()
      
      handleCloseEditModal()
      
      console.log('[BuildingDetail] ✅ Immeuble mis à jour avec succès')
    } catch (err: any) {
      console.error('[BuildingDetail] ❌ Erreur mise à jour immeuble:', err)
      setEditError(err.message || 'Erreur lors de la mise à jour de l\'immeuble')
    } finally {
      setEditSaving(false)
    }
  }
  
  // Gérer l'ouverture du modal d'ajout d'unité
  const handleOpenAddUnitModal = () => {
    setAddUnitFormData({
      unitNumber: '',
      floor: '',
      type: '1br',
      size: '',
      bedrooms: '1',
      bathrooms: '1',
      status: 'disponible',
      rentPrice: '',
      salePrice: '',
      monthlyCharges: '0',
      description: '',
      transactionType: 'location',
      isAvailable: true
    })
    setAddUnitError(null)
    setAddUnitSelectedFiles([])
    setAddUnitPreviewImages([])
    setAddUnitUploadedImages([])
    setAddUnitDragActive(false)
    setShowAddUnitModal(true)
  }
  
  // Gérer la fermeture du modal d'ajout d'unité
  const handleCloseAddUnitModal = () => {
    setShowAddUnitModal(false)
    setAddUnitError(null)
    setAddUnitFormData({
      unitNumber: '',
      floor: '',
      type: '1br',
      size: '',
      bedrooms: '1',
      bathrooms: '1',
      status: 'disponible',
      rentPrice: '',
      salePrice: '',
      monthlyCharges: '0',
      description: '',
      transactionType: 'location',
      isAvailable: true
    })
    setAddUnitSelectedFiles([])
    setAddUnitPreviewImages([])
    setAddUnitUploadedImages([])
    setAddUnitDragActive(false)
  }
  
  // Gérer la sélection de fichiers pour l'ajout d'unité
  const handleAddUnitFileSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Veuillez sélectionner uniquement des images')
      return
    }
    
    setAddUnitSelectedFiles(prev => [...prev, ...imageFiles])
    
    // Créer des aperçus
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setAddUnitPreviewImages(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }
  
  // Gérer l'upload des images pour l'ajout d'unité
  const handleAddUnitUploadImages = async () => {
    if (addUnitSelectedFiles.length === 0) return
    
    setAddUnitUploadingImages(true)
    
    try {
      const formData = new FormData()
      addUnitSelectedFiles.forEach(file => {
        formData.append('images', file)
      })
      
      // Utiliser l'URL complète car la route est montée sur /upload, pas /api/upload
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const baseUrl = API_BASE_URL.replace('/api', '')
      const uploadUrl = `${baseUrl}/upload/units/images`
      
      console.log('[BuildingDetail] Upload URL:', uploadUrl)
      
      // Récupérer le token pour l'upload
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }))
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data && data.success) {
        // Récupérer les chemins des images uploadées
        const uploadedPaths = data.files.map((file: any) => file.path)
        setAddUnitUploadedImages(prev => [...prev, ...uploadedPaths])
        
        // Réinitialiser les fichiers sélectionnés et les aperçus
        setAddUnitSelectedFiles([])
        setAddUnitPreviewImages([])
        
        alert(`${data.files.length} image(s) uploadée(s) avec succès`)
      } else {
        throw new Error('Erreur lors de l\'upload')
      }
    } catch (err: any) {
      console.error('[BuildingDetail] ❌ Erreur upload images:', err)
      alert('Erreur lors de l\'upload des images: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setAddUnitUploadingImages(false)
    }
  }
  
  // Gérer la soumission de l'ajout d'unité
  const handleSubmitAddUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!building) return
    
    setAddUnitSaving(true)
    setAddUnitError(null)
    
    try {
      // Validation
      if (!addUnitFormData.unitNumber.trim()) {
        throw new Error('Le numéro d\'unité est requis')
      }
      if (!addUnitFormData.floor || isNaN(parseInt(addUnitFormData.floor))) {
        throw new Error('L\'étage est requis et doit être un nombre')
      }
      if (!addUnitFormData.size || isNaN(parseFloat(addUnitFormData.size))) {
        throw new Error('La superficie est requise et doit être un nombre')
      }
      
      // Préparer les données
      const unitData: any = {
        building: building._id,
        unitNumber: addUnitFormData.unitNumber.trim(),
        floor: parseInt(addUnitFormData.floor),
        type: addUnitFormData.type,
        size: parseFloat(addUnitFormData.size),
        bedrooms: addUnitFormData.bedrooms ? parseInt(addUnitFormData.bedrooms) : 0,
        bathrooms: addUnitFormData.bathrooms ? parseInt(addUnitFormData.bathrooms) : 1,
        status: addUnitFormData.status,
        transactionType: addUnitFormData.transactionType,
        isAvailable: addUnitFormData.isAvailable
      }
      
      if (addUnitFormData.rentPrice && !isNaN(parseFloat(addUnitFormData.rentPrice))) {
        unitData.rentPrice = parseFloat(addUnitFormData.rentPrice)
      }
      
      if (addUnitFormData.salePrice && !isNaN(parseFloat(addUnitFormData.salePrice))) {
        unitData.salePrice = parseFloat(addUnitFormData.salePrice)
      }
      
      if (addUnitFormData.monthlyCharges && !isNaN(parseFloat(addUnitFormData.monthlyCharges))) {
        unitData.monthlyCharges = parseFloat(addUnitFormData.monthlyCharges)
      }
      
      if (addUnitFormData.description.trim()) {
        unitData.description = addUnitFormData.description.trim()
      }
      
      // Ajouter les images uploadées
      if (addUnitUploadedImages.length > 0) {
        unitData.images = addUnitUploadedImages
      }
      
      // Créer l'unité
      await createUnit(unitData)
      
      // Fermer le modal et recharger les données
      handleCloseAddUnitModal()
      await loadUnits()
      await loadBuilding()
      
      console.log('[BuildingDetail] ✅ Unité créée avec succès')
    } catch (err: any) {
      console.error('[BuildingDetail] ❌ Erreur création unité:', err)
      setAddUnitError(err.message || 'Erreur lors de la création de l\'unité')
    } finally {
      setAddUnitSaving(false)
    }
  }
  
  // Gérer les changements dans le formulaire d'ajout d'unité
  const handleAddUnitFormChange = (field: string, value: any) => {
    setAddUnitFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Gérer l'ouverture du modal des documents
  const handleOpenDocumentsModal = async () => {
    if (!building) return
    
    setShowDocumentsModal(true)
    setDocumentsLoading(true)
    setDocumentsError(null)
    
    try {
      const response = await authenticatedAxios.get(`/documents?building=${building._id}`)
      if (response.data && response.data.success) {
        setDocuments(response.data.data || [])
      } else {
        setDocuments([])
      }
    } catch (err: any) {
      console.error('[BuildingDetail] Erreur chargement documents:', err)
      setDocumentsError(err.response?.data?.message || 'Erreur lors du chargement des documents')
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }
  
  // Gérer la fermeture du modal des documents
  const handleCloseDocumentsModal = () => {
    setShowDocumentsModal(false)
    setDocuments([])
    setDocumentsError(null)
  }
  
  // Télécharger un document
  const handleDownloadDocument = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('Token d\'authentification manquant')
        return
      }
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('[BuildingDetail] Erreur téléchargement document:', err)
      alert('Erreur lors du téléchargement du document: ' + (err.message || 'Erreur inconnue'))
    }
  }
  
  // Formater la taille du fichier
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  // Obtenir l'icône selon la catégorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contrat':
        return '📋'
      case 'facture':
        return '🧾'
      case 'maintenance':
        return '🔧'
      case 'reglement':
        return '📜'
      default:
        return '📄'
    }
  }

  // Fonction pour créer une demande de location/achat
  const handleCreateRequest = async (unitId: string, type: 'location' | 'achat') => {
    try {
      const response = await authenticatedAxios.post('/requests', {
        unit: unitId,
        building: building?._id,
        type: type,
        title: `Demande de ${type === 'location' ? 'location' : 'achat'}`,
        description: `Demande de ${type === 'location' ? 'location' : 'achat'} pour une unité dans ${building?.name}`,
        status: 'en_attente'
      })

      if (response.data.success) {
        alert(`✅ Demande de ${type === 'location' ? 'location' : 'achat'} créée avec succès!`)
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Erreur création demande:', error)
      alert(error.response?.data?.message || `Erreur lors de la création de la demande de ${type}`)
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          {/* En-tête */}
          <div className="mb-8">
            <Link 
              href={authUser?.role === 'admin' ? '/admin/buildings' : '/explorer'} 
              className="text-primary-600 hover:text-primary-700 mb-2 inline-block"
            >
              ← Retour {authUser?.role === 'admin' ? 'à la liste des immeubles' : "à l'explorateur"}
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{building.name}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    building.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {building.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              {authUser?.role === 'admin' && (
                <button
                  onClick={handleEditBuilding}
                  className="btn-primary"
                >
                  ✏️ Modifier
                </button>
              )}
            </div>
          </div>

          {/* Image principale de l'immeuble */}
          <div className="mb-8">
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-gray-200 shadow-lg">
              <Image
                src={getBuildingImagePath(building)}
                alt={building.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/images/default/placeholder.jpg'
                }}
              />
              <div className="absolute top-4 right-4 z-10">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${building.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {building.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Google Maps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📍 Localisation</h2>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <GoogleMapComponent
                buildings={[building]}
                height="400px"
                selectedBuildingId={building._id}
                enableDirections={true}
                enableClustering={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations de l'immeuble */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-4">Informations de l'immeuble</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <p className="text-gray-900">{building.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <p className="text-gray-900">
                      <span className="font-semibold">📍</span> {formatAddress()}
                    </p>
                  </div>
                  {building.yearBuilt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Année de construction</label>
                      <p className="text-gray-900">
                        <span className="font-semibold">📅</span> {building.yearBuilt}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'unités</label>
                    <p className="text-gray-900">
                      <span className="font-semibold">🏠</span> {building.totalUnits || 0} unités
                    </p>
                  </div>
                  {building.admin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Administrateur assigné</label>
                      <p className="text-gray-900">
                        {building.admin.firstName} {building.admin.lastName}
                        <span className="text-gray-500 ml-2">({building.admin.email})</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                    <p className="text-gray-900">{new Date(building.createdAt).toLocaleDateString('fr-CA')}</p>
                  </div>
                </div>
              </div>

              {/* Carte Google Maps - Afficher uniquement si l'utilisateur n'est pas locataire */}
              {authUser?.role !== 'locataire' && building.address && (
                <div className="card p-6">
                  <GoogleMapCard
                    address={building.address}
                    title="Localisation"
                    height="400px"
                  />
                </div>
              )}

              {/* Liste des unités */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Unités de l'immeuble ({units.length})</h2>
                  {authUser?.role === 'admin' && (
                    <Link href={`/units?building=${building._id}`} className="btn-secondary text-sm">
                      Voir toutes les unités →
                    </Link>
                  )}
                </div>
                {units.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {units.map((unit: any) => (
                      <div key={unit._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                        {/* Image de l'unité */}
                        <div className="relative h-48 bg-gray-200 overflow-hidden">
                          <Image
                            src={getUnitImagePath(unit as any)}
                            alt={`Unité ${unit.unitNumber}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/default/placeholder.jpg'
                            }}
                          />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              unit.status === 'disponible' ? 'bg-green-500 text-white' :
                              unit.status === 'loue' ? 'bg-blue-500 text-white' :
                              unit.status === 'vendu' ? 'bg-gray-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {unit.status === 'disponible' ? 'Disponible' :
                               unit.status === 'loue' ? 'Loué' :
                               unit.status === 'vendu' ? 'Vendu' : unit.status}
                            </span>
                          </div>
                        </div>
                        
                        {/* Informations de l'unité */}
                        <div className="p-4">
                          <h3 className="text-xl font-bold mb-2">Unité {unit.unitNumber}</h3>
                          
                          {/* Informations détaillées */}
                          <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
                            {unit.floor !== undefined && (
                              <div className="flex items-center gap-1">
                                <span>🏢</span>
                                <span>Étage: {unit.floor}</span>
                              </div>
                            )}
                            {unit.type && (
                              <div className="flex items-center gap-1">
                                <span>🏠</span>
                                <span>Type: {unit.type}</span>
                              </div>
                            )}
                            {unit.size && (
                              <div className="flex items-center gap-1">
                                <span>📐</span>
                                <span>{unit.size} m²</span>
                              </div>
                            )}
                            {unit.bedrooms !== undefined && (
                              <div className="flex items-center gap-1">
                                <span>🛏️</span>
                                <span>{unit.bedrooms} chambre{unit.bedrooms > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {unit.bathrooms !== undefined && (
                              <div className="flex items-center gap-1">
                                <span>🚿</span>
                                <span>{unit.bathrooms} salle{unit.bathrooms > 1 ? 's' : ''} de bain</span>
                              </div>
                            )}
                          </div>

                          {/* Prix */}
                          <div className="mb-3">
                            {unit.rentPrice && (
                              <div className="text-lg font-semibold text-primary-600">
                                ${unit.rentPrice.toLocaleString()}/mois
                                {unit.monthlyCharges && unit.monthlyCharges > 0 && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    (+ ${unit.monthlyCharges.toLocaleString()} charges)
                                  </span>
                                )}
                              </div>
                            )}
                            {unit.salePrice && (
                              <div className="text-lg font-semibold text-primary-600">
                                ${unit.salePrice.toLocaleString()}
                              </div>
                            )}
                            {!unit.rentPrice && !unit.salePrice && (
                              <div className="text-sm text-gray-500">Prix non disponible</div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-4">
                            {unit._id ? (
                              <Link href={`/units/${unit._id}`} className="flex-1 btn-secondary text-sm text-center">
                                Voir détails
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="flex-1 btn-secondary text-sm text-center opacity-50 cursor-not-allowed"
                                title="ID d'unité manquant"
                                onClick={() => console.warn('[BUILDING_DETAIL] ⚠️ ID manquant pour navigation unité')}
                              >
                                Voir détails
                              </button>
                            )}
                            {unit.status === 'disponible' && authUser && authUser.role !== 'admin' && (
                              <>
                                {unit.rentPrice && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleCreateRequest(unit._id, 'location')
                                    }}
                                    className="flex-1 btn-primary text-sm"
                                  >
                                    📝 Demander location
                                  </button>
                                )}
                                {unit.salePrice && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleCreateRequest(unit._id, 'achat')
                                    }}
                                    className="flex-1 btn-primary text-sm"
                                  >
                                    💰 Demander achat
                                  </button>
                                )}
                              </>
                            )}
                            {authUser?.role === 'admin' && (
                              <Link href={`/admin/units/${unit._id}`} className="flex-1 btn-primary text-sm text-center">
                                ✏️ Modifier
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucune unité dans cet immeuble</p>
                    {authUser?.role === 'admin' && (
                      <button
                        onClick={handleOpenAddUnitModal}
                        className="btn-primary mt-4 inline-block"
                      >
                        ➕ Ajouter une unité
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions rapides - Admin seulement */}
              {authUser?.role === 'admin' && (
                <div className="card p-6">
                  <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
                  <div className="space-y-2">
                    <Link href={`/admin/units?building=${building._id}`} className="btn-primary w-full text-center block">
                      🏢 Voir dans la gestion des unités
                    </Link>
                    <button
                      onClick={() => setShowAddUnitModal(true)}
                      className="btn-secondary w-full text-center block"
                    >
                      ➕ Ajouter une unité
                    </button>
                    <button
                      onClick={handleOpenDocumentsModal}
                      className="btn-secondary w-full text-center block"
                    >
                      📄 Voir les documents administratifs
                    </button>
                  </div>
                </div>
              )}

              {/* Statistiques */}
              <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">Statistiques</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total unités</span>
                    <span className="font-bold">{units.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disponibles</span>
                    <span className="font-bold text-green-600">
                      {units.filter(u => u.status === 'disponible').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Louées</span>
                    <span className="font-bold text-blue-600">
                      {units.filter(u => u.status === 'loue').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendues</span>
                    <span className="font-bold text-gray-600">
                      {units.filter(u => u.status === 'vendu' || u.status === 'Vendu').length}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">Taux d'occupation</span>
                      <span className="font-bold text-primary-600">
                        {units.length > 0 
                          ? Math.round(((units.length - units.filter(u => u.status === 'disponible').length) / units.length) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal d'édition d'immeuble */}
      {showEditModal && building && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">✏️ Modifier l'immeuble {building.name}</h2>
                <button
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={editSaving}
                >
                  ×
                </button>
              </div>
              
              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {editError}
                </div>
              )}
              
              <form onSubmit={handleSubmitEditBuilding}>
                <div className="space-y-4">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de l'immeuble <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={editSaving}
                    />
                  </div>
                  
                  {/* Adresse */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse (rue) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.address.street}
                      onChange={(e) => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={editSaving}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Ville */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.address.city}
                        onChange={(e) => setEditFormData({...editFormData, address: {...editFormData.address, city: e.target.value}})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
                      />
                    </div>
                    
                    {/* Province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.address.province}
                        onChange={(e) => setEditFormData({...editFormData, address: {...editFormData.address, province: e.target.value}})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
                      />
                    </div>
                  </div>
                  
                  {/* Code postal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code postal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.address.postalCode}
                      onChange={(e) => setEditFormData({...editFormData, address: {...editFormData.address, postalCode: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={editSaving}
                    />
                  </div>
                  
                  {/* Année de construction */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Année de construction
                    </label>
                    <input
                      type="number"
                      value={editFormData.yearBuilt}
                      onChange={(e) => setEditFormData({...editFormData, yearBuilt: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1800"
                      max={new Date().getFullYear()}
                      disabled={editSaving}
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      disabled={editSaving}
                    />
                  </div>
                  
                  {/* Image - Upload avec drag and drop */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Image principale</label>
                    
                    {/* Zone de drag and drop */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${editSaving || uploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!editSaving && !uploadingImages) setDragActive(true)
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
                        if (editSaving || uploadingImages) return
                        
                        const files = Array.from(e.dataTransfer.files).filter(file => 
                          file.type.startsWith('image/')
                        )
                        if (files.length > 0) {
                          handleFileSelect(files)
                        }
                      }}
                      onClick={() => {
                        if (!editSaving && !uploadingImages) {
                          document.getElementById('file-input-building')?.click()
                        }
                      }}
                    >
                      <input
                        id="file-input-building"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFileSelect(Array.from(e.target.files))
                          }
                        }}
                        disabled={editSaving || uploadingImages}
                      />
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          {uploadingImages ? (
                            <>⏳ Upload en cours...</>
                          ) : (
                            <>
                              📤 Glissez-déposez votre image ici ou cliquez pour sélectionner
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Formats acceptés: JPG, PNG, GIF (max 10MB)
                        </p>
                      </div>
                    </div>
                    
                    {/* Aperçu de l'image sélectionnée */}
                    {previewImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Image sélectionnée
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
                                  disabled={editSaving || uploadingImages}
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
                            disabled={selectedFiles.length === 0 || editSaving}
                          >
                            📤 Uploader l'image
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Image actuelle */}
                    {editFormData.image && !previewImages.length && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Image actuelle
                        </p>
                        <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                          <Image
                            src={editFormData.image.startsWith('/images/') ? editFormData.image : `/images/immeubles/${editFormData.image}`}
                            alt="Image actuelle"
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/default/placeholder.jpg'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditFormData({...editFormData, image: ''})}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                            disabled={editSaving || uploadingImages}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Statut actif */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editIsActive"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={editSaving}
                    />
                    <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-700">
                      Immeuble actif
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={editSaving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={editSaving}
                  >
                    {editSaving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal d'ajout d'unité */}
      {showAddUnitModal && building && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">➕ Ajouter une unité à {building.name}</h2>
                <button
                  onClick={handleCloseAddUnitModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={addUnitSaving}
                >
                  ×
                </button>
              </div>
              
              {addUnitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {addUnitError}
                </div>
              )}
              
              <form onSubmit={handleSubmitAddUnit}>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Immeuble:</strong> {building.name} - {building.address.city}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Numéro d'unité */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numéro d'unité <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addUnitFormData.unitNumber}
                        onChange={(e) => handleAddUnitFormChange('unitNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={addUnitSaving}
                      />
                    </div>
                    
                    {/* Étage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Étage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={addUnitFormData.floor}
                        onChange={(e) => handleAddUnitFormChange('floor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={addUnitSaving}
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
                        value={addUnitFormData.type}
                        onChange={(e) => handleAddUnitFormChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={addUnitSaving}
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
                        value={addUnitFormData.size}
                        onChange={(e) => handleAddUnitFormChange('size', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={addUnitSaving}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Chambres */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chambres</label>
                      <input
                        type="number"
                        value={addUnitFormData.bedrooms}
                        onChange={(e) => handleAddUnitFormChange('bedrooms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="0"
                        disabled={addUnitSaving}
                      />
                    </div>
                    
                    {/* Salles de bain */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salles de bain</label>
                      <input
                        type="number"
                        value={addUnitFormData.bathrooms}
                        onChange={(e) => handleAddUnitFormChange('bathrooms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                        disabled={addUnitSaving}
                      />
                    </div>
                    
                    {/* Statut */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select
                        value={addUnitFormData.status}
                        onChange={(e) => handleAddUnitFormChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={addUnitSaving}
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
                      value={addUnitFormData.transactionType}
                      onChange={(e) => handleAddUnitFormChange('transactionType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={addUnitSaving}
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
                        value={addUnitFormData.rentPrice}
                        onChange={(e) => handleAddUnitFormChange('rentPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={addUnitSaving}
                      />
                    </div>
                    
                    {/* Prix de vente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={addUnitFormData.salePrice}
                        onChange={(e) => handleAddUnitFormChange('salePrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={addUnitSaving}
                      />
                    </div>
                  </div>
                  
                  {/* Charges mensuelles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Charges mensuelles ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addUnitFormData.monthlyCharges}
                      onChange={(e) => handleAddUnitFormChange('monthlyCharges', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={addUnitSaving}
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={addUnitFormData.description}
                      onChange={(e) => handleAddUnitFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      disabled={addUnitSaving}
                    />
                  </div>
                  
                  {/* Images - Upload avec drag and drop */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photos de l'unité</label>
                    
                    {/* Zone de drag and drop */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        addUnitDragActive
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${addUnitSaving || addUnitUploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!addUnitSaving && !addUnitUploadingImages) setAddUnitDragActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setAddUnitDragActive(false)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setAddUnitDragActive(false)
                        if (addUnitSaving || addUnitUploadingImages) return
                        
                        const files = Array.from(e.dataTransfer.files).filter(file => 
                          file.type.startsWith('image/')
                        )
                        if (files.length > 0) {
                          handleAddUnitFileSelect(files)
                        }
                      }}
                      onClick={() => {
                        if (!addUnitSaving && !addUnitUploadingImages) {
                          document.getElementById('file-input-add-unit')?.click()
                        }
                      }}
                    >
                      <input
                        id="file-input-add-unit"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleAddUnitFileSelect(Array.from(e.target.files))
                          }
                        }}
                        disabled={addUnitSaving || addUnitUploadingImages}
                      />
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          {addUnitUploadingImages ? (
                            <>⏳ Upload en cours...</>
                          ) : (
                            <>
                              📤 Glissez-déposez vos photos ici ou cliquez pour sélectionner
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Formats acceptés: JPG, PNG, GIF (max 10MB par image)
                        </p>
                      </div>
                    </div>
                    
                    {/* Aperçu des images sélectionnées */}
                    {addUnitPreviewImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images sélectionnées ({addUnitPreviewImages.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {addUnitPreviewImages.map((preview, idx) => (
                            <div key={idx} className="relative group">
                              <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden">
                                <Image
                                  src={preview}
                                  alt={`Preview ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPreviews = [...addUnitPreviewImages]
                                    newPreviews.splice(idx, 1)
                                    setAddUnitPreviewImages(newPreviews)
                                    const newFiles = [...addUnitSelectedFiles]
                                    newFiles.splice(idx, 1)
                                    setAddUnitSelectedFiles(newFiles)
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={addUnitSaving || addUnitUploadingImages}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!addUnitUploadingImages && (
                          <button
                            type="button"
                            onClick={handleAddUnitUploadImages}
                            className="mt-3 btn-primary text-sm"
                            disabled={addUnitSelectedFiles.length === 0 || addUnitSaving}
                          >
                            📤 Uploader les images
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Images déjà uploadées */}
                    {addUnitUploadedImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images uploadées ({addUnitUploadedImages.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {addUnitUploadedImages.map((imagePath, idx) => (
                            <div key={idx} className="relative group">
                              <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden">
                                <Image
                                  src={imagePath.startsWith('/images/') ? imagePath : imagePath}
                                  alt={`Uploaded ${idx + 1}`}
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
                                    const newUploaded = [...addUnitUploadedImages]
                                    newUploaded.splice(idx, 1)
                                    setAddUnitUploadedImages(newUploaded)
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={addUnitSaving || addUnitUploadingImages}
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
                  
                  {/* Disponible */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="addUnitIsAvailable"
                      checked={addUnitFormData.isAvailable}
                      onChange={(e) => handleAddUnitFormChange('isAvailable', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={addUnitSaving}
                    />
                    <label htmlFor="addUnitIsAvailable" className="ml-2 block text-sm text-gray-700">
                      Unité disponible
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAddUnitModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={addUnitSaving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={addUnitSaving}
                  >
                    {addUnitSaving ? '⏳ Création...' : '✅ Créer l\'unité'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal des documents administratifs */}
      {showDocumentsModal && building && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">📄 Documents administratifs - {building.name}</h2>
                <button
                  onClick={handleCloseDocumentsModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {documentsError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {documentsError}
                </div>
              )}
              
              {documentsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-gray-600">Chargement des documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucun document administratif disponible pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>{documents.length}</strong> document(s) administratif(s) disponible(s) pour cet immeuble
                    </p>
                  </div>
                  
                  {documents.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
                            <h3 className="font-semibold text-lg">{doc.originalName || doc.filename}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              doc.category === 'reglement' ? 'bg-blue-100 text-blue-800' :
                              doc.category === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                              doc.category === 'contrat' ? 'bg-green-100 text-green-800' :
                              doc.category === 'facture' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {doc.category}
                            </span>
                          </div>
                          
                          {doc.description && (
                            <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📏 {formatFileSize(doc.size)}</span>
                            <span>📅 {new Date(doc.createdAt).toLocaleDateString('fr-CA')}</span>
                            {doc.uploadedBy && (
                              <span>👤 {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadDocument(doc._id, doc.originalName || doc.filename)}
                          className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                        >
                          ⬇️ Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  )
}


