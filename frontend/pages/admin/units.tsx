'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../contexts/AuthContext'
import { getUnitImagePath, getBuildingImagePath } from '../../utils/imageUtils'
import { authenticatedAxios } from '../../utils/axiosInstances'
import { getAllBuildings, createUnit, getUnitById, updateUnit, deleteUnit } from '../../services/realEstateService'

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
    image?: string
    imageUrl?: string
    address: {
      street: string
      city: string
      province?: string
      postalCode?: string
    }
  }
  proprietaire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  locataire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
}

interface Building {
  _id: string
  name: string
  address: {
    street: string
    city: string
    province?: string
    postalCode?: string
  }
  totalUnits?: number
  isActive: boolean
}

export default function AdminUnits() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  // États locaux pour les filtres (doivent être définis avant useRealEstateData)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  
  // États pour les stats des unités (UNIQUEMENT unités)
  const [unitsStats, setUnitsStats] = useState({
    totalUnits: 0,
    availableUnits: 0,
    rentedUnits: 0,
    onSaleUnits: 0,
    soldUnits: 0,
    monthlyRevenue: 0,
    occupancyRate: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  
  // États locaux pour les unités
  const [allUnits, setAllUnits] = useState<Unit[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  
  // Modal d'ajout d'unité
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Modal de détails d'unité
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  
  // Modal d'édition d'unité
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null)
  
  // États pour l'upload d'images (modal d'édition)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewImages, setPreviewImages] = useState<string[]>([])
  
  // États pour l'upload d'images (modal d'ajout)
  const [addUploadingImages, setAddUploadingImages] = useState(false)
  const [addDragActive, setAddDragActive] = useState(false)
  const [addSelectedFiles, setAddSelectedFiles] = useState<File[]>([])
  const [addPreviewImages, setAddPreviewImages] = useState<string[]>([])
  const [addUploadedImages, setAddUploadedImages] = useState<string[]>([])
  
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
  
  // Utiliser les unités filtrées selon les filtres locaux
  const units = useMemo(() => {
    // S'assurer que allUnits est un tableau
    if (!Array.isArray(allUnits)) {
      return []
    }
    
    let filtered = allUnits
    
    // Filtre par immeuble
    if (selectedBuilding) {
      filtered = filtered.filter(u => u?.building?._id === selectedBuilding)
    }
    
    return filtered
  }, [allUnits, selectedBuilding])
  
  // Charger les stats des unités (UNIQUEMENT endpoint units/stats)
  const loadUnitsStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const response = await authenticatedAxios.get('/units/stats')
      
      if (response.data?.success && response.data.data) {
        setUnitsStats({
          totalUnits: response.data.data.totalUnits || 0,
          availableUnits: response.data.data.availableUnits || 0,
          rentedUnits: response.data.data.rentedUnits || 0,
          onSaleUnits: response.data.data.onSaleUnits || 0,
          soldUnits: response.data.data.soldUnits || 0,
          monthlyRevenue: response.data.data.monthlyRevenue || 0,
          occupancyRate: response.data.data.occupancyRate || 0
        })
      }
    } catch (err: any) {
      console.error('[AdminUnits] Error loading units stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])
  
  // Charger les unités (UNIQUEMENT endpoint units)
  const loadUnits = useCallback(async () => {
    try {
      setDataLoading(true)
      setDataError(null)
      
      // Charger les unités
      const unitsResponse = await authenticatedAxios.get('/units')
      let units: Unit[] = []
      if (unitsResponse.data?.success && Array.isArray(unitsResponse.data.data)) {
        units = unitsResponse.data.data
      } else if (Array.isArray(unitsResponse.data?.data)) {
        units = unitsResponse.data.data
      } else if (Array.isArray(unitsResponse.data)) {
        units = unitsResponse.data
      }
      setAllUnits(units)
      
      // Charger les immeubles UNIQUEMENT pour les filtres (pas pour les stats)
      // Utiliser le service centralisé pour uniformiser les appels API
      try {
        const buildingsList = await getAllBuildings()
        setBuildings(buildingsList)
      } catch (buildingsError) {
        console.warn('[AdminUnits] Error loading buildings for filters:', buildingsError)
        setBuildings([])
      }
      
      // Charger les stats des unités séparément
      await loadUnitsStats()
    } catch (err: any) {
      console.error('[AdminUnits] Error loading units:', err)
      setDataError('Erreur lors du chargement des unités')
      setAllUnits([])
    } finally {
      setDataLoading(false)
    }
  }, [loadUnitsStats])
  
  // Fonction pour recharger toutes les données
  const loadData = useCallback(async () => {
    await loadUnits()
    await loadUnitsStats()
  }, [loadUnits, loadUnitsStats])
  
  // Charger au montage
  useEffect(() => {
    loadUnits()
  }, [loadUnits])
  
  // Détecter le paramètre action=add dans l'URL
  useEffect(() => {
    if (router.isReady && router.query.action === 'add') {
      setShowAddModal(true)
      // Nettoyer l'URL
      router.replace('/admin/units', undefined, { shallow: true })
    }
  }, [router.isReady, router.query.action, router])
  
  // Gérer l'ouverture/fermeture du modal
  const handleOpenAddModal = () => {
    setShowAddModal(true)
    setFormError(null)
    setFormData({
      building: '',
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
    setAddSelectedFiles([])
    setAddPreviewImages([])
    setAddUploadedImages([])
    setAddDragActive(false)
  }
  
  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setFormError(null)
    setFormData({
      building: '',
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
    setAddSelectedFiles([])
    setAddPreviewImages([])
    setAddUploadedImages([])
    setAddDragActive(false)
  }
  
  // Gérer la sélection de fichiers pour l'ajout d'unité
  const handleAddFileSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Veuillez sélectionner uniquement des images')
      return
    }
    
    setAddSelectedFiles(prev => [...prev, ...imageFiles])
    
    // Créer des aperçus
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setAddPreviewImages(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }
  
  // Gérer l'upload des images pour l'ajout d'unité
  const handleAddUploadImages = async () => {
    if (addSelectedFiles.length === 0) return
    
    setAddUploadingImages(true)
    
    try {
      const formData = new FormData()
      addSelectedFiles.forEach(file => {
        formData.append('images', file)
      })
      
      // Utiliser l'URL complète car la route est montée sur /upload, pas /api/upload
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const baseUrl = API_BASE_URL.replace('/api', '')
      const uploadUrl = `${baseUrl}/upload/units/images`
      
      console.log('[AdminUnits] Upload URL:', uploadUrl)
      
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
        setAddUploadedImages(prev => [...prev, ...uploadedPaths])
        
        // Réinitialiser les fichiers sélectionnés et les aperçus
        setAddSelectedFiles([])
        setAddPreviewImages([])
        
        alert(`${data.files.length} image(s) uploadée(s) avec succès`)
      } else {
        throw new Error('Erreur lors de l\'upload')
      }
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur upload images:', err)
      alert('Erreur lors de l\'upload des images: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setAddUploadingImages(false)
    }
  }
  
  // Gérer la soumission du formulaire
  const handleSubmitAddUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    
    try {
      // Validation
      if (!formData.building) {
        throw new Error('L\'immeuble est requis')
      }
      if (!formData.unitNumber.trim()) {
        throw new Error('Le numéro d\'unité est requis')
      }
      if (!formData.floor || isNaN(parseInt(formData.floor))) {
        throw new Error('L\'étage est requis et doit être un nombre')
      }
      if (!formData.size || isNaN(parseFloat(formData.size))) {
        throw new Error('La superficie est requise et doit être un nombre')
      }
      
      // Préparer les données
      const unitData: any = {
        building: formData.building,
        unitNumber: formData.unitNumber.trim(),
        floor: parseInt(formData.floor),
        type: formData.type,
        size: parseFloat(formData.size),
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 0,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 1,
        status: formData.status,
        transactionType: formData.transactionType,
        isAvailable: formData.isAvailable
      }
      
      if (formData.rentPrice && !isNaN(parseFloat(formData.rentPrice))) {
        unitData.rentPrice = parseFloat(formData.rentPrice)
      }
      
      if (formData.salePrice && !isNaN(parseFloat(formData.salePrice))) {
        unitData.salePrice = parseFloat(formData.salePrice)
      }
      
      if (formData.monthlyCharges && !isNaN(parseFloat(formData.monthlyCharges))) {
        unitData.monthlyCharges = parseFloat(formData.monthlyCharges)
      }
      
      if (formData.description.trim()) {
        unitData.description = formData.description.trim()
      }
      
      // Ajouter les images uploadées
      if (addUploadedImages.length > 0) {
        unitData.images = addUploadedImages
      }
      
      // Créer l'unité
      await createUnit(unitData)
      
      // Fermer le modal et recharger la liste
      handleCloseAddModal()
      await loadData()
      
      console.log('[AdminUnits] ✅ Unité créée avec succès')
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur création unité:', err)
      setFormError(err.message || 'Erreur lors de la création de l\'unité')
    } finally {
      setSaving(false)
    }
  }
  
  // Gérer les changements dans le formulaire
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Gérer l'ouverture du modal de détails
  const handleViewDetails = async (unit: Unit) => {
    try {
      // Charger les détails complets de l'unité
      const fullUnit = await getUnitById(unit._id)
      setSelectedUnit(fullUnit)
      setShowDetailModal(true)
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur chargement détails:', err)
      alert('Erreur lors du chargement des détails: ' + err.message)
    }
  }
  
  // Gérer l'ouverture du modal d'édition
  const handleEditUnit = async (unit: Unit) => {
    try {
      // Charger les détails complets de l'unité
      const fullUnit = await getUnitById(unit._id)
      setEditingUnit(fullUnit)
      setEditFormData({
        building: fullUnit.building._id,
        unitNumber: fullUnit.unitNumber,
        floor: fullUnit.floor?.toString() || '',
        type: fullUnit.type,
        size: fullUnit.size.toString(),
        bedrooms: fullUnit.bedrooms.toString(),
        bathrooms: fullUnit.bathrooms?.toString() || '1',
        status: fullUnit.status,
        rentPrice: fullUnit.rentPrice?.toString() || '',
        salePrice: fullUnit.salePrice?.toString() || '',
        monthlyCharges: fullUnit.monthlyCharges?.toString() || '0',
        description: fullUnit.description || '',
        transactionType: (fullUnit as any).transactionType || 'location',
        isAvailable: fullUnit.isAvailable !== false,
        images: fullUnit.images || []
      })
      setSelectedFiles([])
      setPreviewImages([])
      setShowEditModal(true)
      setEditError(null)
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur chargement unité pour édition:', err)
      alert('Erreur lors du chargement de l\'unité: ' + err.message)
    }
  }
  
  // Gérer la fermeture du modal d'édition
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingUnit(null)
    setEditFormData(null)
    setEditError(null)
    setSelectedFiles([])
    setPreviewImages([])
    setUploadingImages(false)
    setDragActive(false)
  }
  
  // Gérer la soumission de l'édition
  const handleSubmitEditUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUnit) return
    
    setEditSaving(true)
    setEditError(null)
    
    try {
      const unitData: any = {
        building: editFormData.building,
        unitNumber: editFormData.unitNumber.trim(),
        floor: parseInt(editFormData.floor),
        type: editFormData.type,
        size: parseFloat(editFormData.size),
        bedrooms: parseInt(editFormData.bedrooms),
        bathrooms: parseInt(editFormData.bathrooms),
        status: editFormData.status,
        transactionType: editFormData.transactionType,
        isAvailable: editFormData.isAvailable
      }
      
      if (editFormData.rentPrice && !isNaN(parseFloat(editFormData.rentPrice))) {
        unitData.rentPrice = parseFloat(editFormData.rentPrice)
      }
      
      if (editFormData.salePrice && !isNaN(parseFloat(editFormData.salePrice))) {
        unitData.salePrice = parseFloat(editFormData.salePrice)
      }
      
      if (editFormData.monthlyCharges && !isNaN(parseFloat(editFormData.monthlyCharges))) {
        unitData.monthlyCharges = parseFloat(editFormData.monthlyCharges)
      }
      
      if (editFormData.description) {
        unitData.description = editFormData.description.trim()
      }
      
      if (editFormData.images && Array.isArray(editFormData.images)) {
        unitData.images = editFormData.images
      }
      
      await updateUnit(editingUnit._id, unitData)
      
      handleCloseEditModal()
      await loadData()
      
      console.log('[AdminUnits] ✅ Unité mise à jour avec succès')
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur mise à jour unité:', err)
      setEditError(err.message || 'Erreur lors de la mise à jour de l\'unité')
    } finally {
      setEditSaving(false)
    }
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
      const uploadUrl = `${baseUrl}/upload/units/images`
      
      console.log('[AdminUnits] Upload URL:', uploadUrl)
      
      // Récupérer le token pour l'upload
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Token d\'authentification manquant')
      }
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Ne pas mettre Content-Type, le navigateur le définira automatiquement avec la boundary
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }))
        throw new Error(errorData.message || `Erreur HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data && data.success) {
        const uploadedPaths = data.files.map((f: any) => f.path)
        const currentImages = Array.isArray(editFormData.images) ? editFormData.images : []
        setEditFormData({
          ...editFormData,
          images: [...currentImages, ...uploadedPaths]
        })
        
        // Réinitialiser les fichiers sélectionnés et les aperçus
        setSelectedFiles([])
        setPreviewImages([])
        
        alert(`${uploadedPaths.length} image(s) uploadée(s) avec succès`)
      } else {
        throw new Error('Erreur lors de l\'upload')
      }
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur upload images:', err)
      alert('Erreur lors de l\'upload des images: ' + (err.message || 'Erreur inconnue'))
    } finally {
      setUploadingImages(false)
    }
  }
  
  // Gérer la suppression d'une unité
  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette unité ? Cette action est irréversible.')) {
      return
    }
    
    setDeletingUnitId(unitId)
    
    try {
      await deleteUnit(unitId)
      await loadData()
      alert('Unité supprimée avec succès')
    } catch (err: any) {
      console.error('[AdminUnits] ❌ Erreur suppression unité:', err)
      alert('Erreur lors de la suppression: ' + err.message)
    } finally {
      setDeletingUnitId(null)
    }
  }
  
  // Fonction d'export Excel
  const handleExportExcel = () => {
    try {
      // Préparer les données
      const data = filteredUnits.map(unit => ({
        'ID Unité': unit.unitNumber,
        'Immeuble': unit.building.name,
        'Adresse': `${unit.building.address.street}, ${unit.building.address.city}`,
        'Propriétaire': unit.proprietaire ? `${unit.proprietaire.firstName} ${unit.proprietaire.lastName}` : 'Non assigné',
        'Locataire': unit.locataire ? `${unit.locataire.firstName} ${unit.locataire.lastName}` : 'Vacant',
        'État': unit.status,
        'Loyer': unit.rentPrice ? `$${unit.rentPrice}/mois` : 'N/A',
        'Surface': `${unit.size} m²`,
        'Chambres': unit.bedrooms,
        'Type': unit.type
      }))
      
      // Convertir en CSV (format simple pour Excel)
      const headers = Object.keys(data[0] || {})
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n')
      
      // Créer et télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `unites_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('[AdminUnits] ❌ Erreur export Excel:', err)
      alert('Erreur lors de l\'export Excel')
    }
  }
  
  // Fonction d'export PDF (simplifiée - utilise window.print)
  const handleExportPDF = () => {
    try {
      // Créer une nouvelle fenêtre avec le contenu formaté
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Veuillez autoriser les pop-ups pour exporter en PDF')
        return
      }
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Liste des Unités</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Liste des Unités - ${new Date().toLocaleDateString()}</h1>
          <table>
            <thead>
              <tr>
                <th>ID Unité</th>
                <th>Immeuble</th>
                <th>Adresse</th>
                <th>Propriétaire</th>
                <th>Locataire</th>
                <th>État</th>
                <th>Loyer</th>
                <th>Surface</th>
                <th>Chambres</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUnits.map(unit => `
                <tr>
                  <td>${unit.unitNumber}</td>
                  <td>${unit.building.name}</td>
                  <td>${unit.building.address.street}, ${unit.building.address.city}</td>
                  <td>${unit.proprietaire ? `${unit.proprietaire.firstName} ${unit.proprietaire.lastName}` : 'Non assigné'}</td>
                  <td>${unit.locataire ? `${unit.locataire.firstName} ${unit.locataire.lastName}` : 'Vacant'}</td>
                  <td>${unit.status}</td>
                  <td>${unit.rentPrice ? `$${unit.rentPrice}/mois` : 'N/A'}</td>
                  <td>${unit.size} m²</td>
                  <td>${unit.bedrooms}</td>
                  <td>${unit.type}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `
      
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.print()
    } catch (err) {
      console.error('[AdminUnits] ❌ Erreur export PDF:', err)
      alert('Erreur lors de l\'export PDF')
    }
  }

  // Filtrer les unités
  const filteredUnits = useMemo(() => {
    // S'assurer que units est un tableau
    if (!Array.isArray(units)) {
      return []
    }
    
    return units.filter(unit => {
      // Vérifier que unit existe et a les propriétés nécessaires
      if (!unit || !unit.building) {
        return false
      }
      // Recherche globale
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          unit.unitNumber.toLowerCase().includes(search) ||
          unit.building.name.toLowerCase().includes(search) ||
          unit.building.address.street.toLowerCase().includes(search) ||
          unit.building.address.city.toLowerCase().includes(search) ||
          (unit.proprietaire && `${unit.proprietaire.firstName} ${unit.proprietaire.lastName}`.toLowerCase().includes(search)) ||
          (unit.proprietaire && unit.proprietaire.email.toLowerCase().includes(search)) ||
          (unit.locataire && `${unit.locataire.firstName} ${unit.locataire.lastName}`.toLowerCase().includes(search)) ||
          (unit.locataire && unit.locataire.email.toLowerCase().includes(search))
        
        if (!matchesSearch) return false
      }

      // Filtre par immeuble
      if (selectedBuilding && unit.building._id !== selectedBuilding) {
        return false
      }

      // Filtre par statut
      if (selectedStatus) {
        const statusMap: { [key: string]: string[] } = {
          'disponible': ['disponible', 'Disponible'],
          'loue': ['loue', 'Loué', 'en_location'],
          'en_vente': ['en_vente', 'En vente', 'negociation'],
          'vendu': ['vendu', 'Vendu', 'vendue']
        }
        
        if (selectedStatus !== 'tous') {
          const allowedStatuses = statusMap[selectedStatus] || [selectedStatus]
          if (!allowedStatuses.includes(unit.status)) {
            // Vérifier aussi par locataire/proprietaire
            if (selectedStatus === 'disponible' && unit.locataire) return false
            if (selectedStatus === 'loue' && !unit.locataire) return false
            if (!allowedStatuses.includes(unit.status)) return false
          }
        }
      }

      // Filtre par ville
      if (selectedCity && unit.building.address.city !== selectedCity) {
        return false
      }

      // Filtre par prix
      if (priceMin && unit.rentPrice && unit.rentPrice < Number(priceMin)) {
        return false
      }
      if (priceMax && unit.rentPrice && unit.rentPrice > Number(priceMax)) {
        return false
      }

      return true
    })
  }, [units, searchTerm, selectedBuilding, selectedStatus, selectedCity, priceMin, priceMax])

  // Utiliser les statistiques des unités (UNIQUEMENT stats unités)
  // Si aucun filtre n'est appliqué, utiliser les stats depuis l'endpoint units/stats
  // Sinon, calculer les stats pour les unités filtrées
  const stats = useMemo(() => {
    // Si aucun filtre n'est appliqué, utiliser les stats des unités depuis l'endpoint
    const hasFilters = searchTerm || selectedBuilding || selectedStatus !== '' || selectedCity || priceMin || priceMax
    
    if (!hasFilters && !statsLoading && unitsStats.totalUnits > 0) {
      return {
        totalUnits: unitsStats.totalUnits,
        disponibles: unitsStats.availableUnits,
        enLocation: unitsStats.rentedUnits,
        enVente: unitsStats.onSaleUnits || 0,
        vendues: unitsStats.soldUnits,
        revenusMensuels: unitsStats.monthlyRevenue,
        tauxOccupation: unitsStats.occupancyRate
      }
    }
    
    // Sinon, calculer les stats pour les unités filtrées
    const filtered = filteredUnits
    
    // Compter les statuts
    const disponibles = filtered.filter(u => 
      u.status === 'disponible' || u.status === 'Disponible' || 
      (u.isAvailable !== false && !u.locataire)
    ).length
    
    const enLocation = filtered.filter(u => 
      u.status === 'loue' || u.status === 'Loué' || u.status === 'en_location' ||
      (u.locataire && u.status !== 'vendu' && u.status !== 'Vendu')
    ).length
    
    const enVente = filtered.filter(u => 
      u.status === 'en_vente' || u.status === 'En vente' || u.status === 'negociation'
    ).length
    
    const vendues = filtered.filter(u => 
      u.status === 'vendu' || u.status === 'Vendu' || u.status === 'vendue'
    ).length

    // Calculer les revenus mensuels (somme des loyers des unités louées)
    const revenusMensuels = filtered
      .filter(u => u.locataire && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0)

    // Calculer le taux d'occupation
    const totalOccupables = filtered.length
    const occupees = filtered.filter(u => u.locataire).length
    const tauxOccupation = totalOccupables > 0 
      ? Math.round((occupees / totalOccupables) * 100) 
      : 0

    // Obtenir les immeubles uniques
    const uniqueBuildings = new Set(filtered.map(u => u.building._id))
    
    return {
      totalUnits: filtered.length,
      disponibles,
      enLocation,
      enVente,
      vendues,
      revenusMensuels,
      tauxOccupation
    }
  }, [filteredUnits, searchTerm, selectedBuilding, selectedStatus, selectedCity, priceMin, priceMax, unitsStats, statsLoading])

  // Obtenir les villes uniques
  const uniqueCities = useMemo(() => {
    const cities = new Set(units.map(u => u.building.address.city).filter(Boolean))
    return Array.from(cities).sort()
  }, [units])

  // Obtenir le statut d'affichage
  const getStatusDisplay = (unit: Unit) => {
    if (unit.status === 'vendu' || unit.status === 'Vendu' || unit.status === 'vendue') {
      return { text: 'Vendue', color: 'text-red-600', bg: 'bg-red-100', emoji: '🔴' }
    }
    if (unit.status === 'en_vente' || unit.status === 'En vente' || unit.status === 'negociation') {
      return { text: 'En vente', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '🔵' }
    }
    if (unit.locataire || unit.status === 'loue' || unit.status === 'Loué' || unit.status === 'en_location') {
      return { text: 'En location', color: 'text-yellow-600', bg: 'bg-yellow-100', emoji: '🟡' }
    }
    return { text: 'Disponible', color: 'text-green-600', bg: 'bg-green-100', emoji: '🟢' }
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedBuilding('')
    setSelectedStatus('')
    setSelectedCity('')
    setPriceMin('')
    setPriceMax('')
  }

  // Utiliser le loading du hook centralisé
  const loading = dataLoading
  const error = dataError

  if (loading && units.length === 0 && buildings.length === 0) {
    return (
      <ProtectedRoute requiredRoles={['admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-600">Chargement des données...</p>
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
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">🏠 Gestion des Unités</h1>
                <p className="text-gray-600">Vue complète et gestion de toutes les unités</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadData}
                  className="btn-secondary"
                  disabled={dataLoading}
                >
                  {dataLoading ? '🔄 Actualisation...' : '🔄 Actualiser'}
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="btn-primary"
                >
                  ➕ Ajouter une unité
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques (UNIQUEMENT unités) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total unités</p>
              <p className="text-2xl font-bold">{stats.totalUnits}</p>
              <p className="text-2xl mt-1">🏠</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Disponibles</p>
              <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
              <p className="text-2xl mt-1">🟢</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">En location</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.enLocation}</p>
              <p className="text-2xl mt-1">🟡</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">En vente</p>
              <p className="text-2xl font-bold text-blue-600">{stats.enVente}</p>
              <p className="text-2xl mt-1">🔵</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Vendues</p>
              <p className="text-2xl font-bold text-red-600">{stats.vendues}</p>
              <p className="text-2xl mt-1">🔴</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Revenus mensuels</p>
              <p className="text-xl font-bold text-primary-600">
                ${stats.revenusMensuels.toLocaleString()}
              </p>
              <p className="text-2xl mt-1">💰</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Taux d'occupation</p>
              <p className="text-2xl font-bold text-primary-600">{stats.tauxOccupation}%</p>
              <p className="text-2xl mt-1">📉</p>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Filtres et recherche</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche globale
                </label>
                <input
                  type="text"
                  placeholder="Unité, immeuble, adresse, propriétaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Immeuble
                </label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tous les immeubles</option>
                  {buildings.map(building => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  État
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="tous">Tous les états</option>
                  <option value="disponible">Disponible</option>
                  <option value="loue">En location</option>
                  <option value="en_vente">En vente</option>
                  <option value="vendu">Vendue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Toutes les villes</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix min
                </label>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix max
                </label>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={resetFilters}
                className="btn-secondary"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Résultats */}
          <div className="mb-4">
            <p className="text-gray-600">
              <strong>{filteredUnits.length}</strong> unité(s) trouvée(s)
              {unitsStats.totalUnits > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (Total: {unitsStats.totalUnits} unités)
                </span>
              )}
            </p>
          </div>

          {/* Tableau des unités */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
              <button
                onClick={refreshData}
                className="mt-2 btn-secondary text-sm"
              >
                🔄 Réessayer
              </button>
            </div>
          )}
          
          {!error && units.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
              <p>Aucune unité trouvée dans la base de données.</p>
              <p className="text-sm mt-1">Créez votre première unité pour commencer.</p>
            </div>
          )}

          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Liste des unités</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportExcel}
                  className="btn-secondary text-sm"
                  disabled={filteredUnits.length === 0}
                >
                  📤 Exporter Excel
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="btn-secondary text-sm"
                  disabled={filteredUnits.length === 0}
                >
                  📄 Exporter PDF
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Unité ↑
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Immeuble
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adresse
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locataire
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Surface
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambres
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((unit) => {
                    const statusDisplay = getStatusDisplay(unit)
                    return (
                      <tr key={unit._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                            {(unit.imageUrl || (unit.images && unit.images.length > 0)) ? (
                              <Image
                                src={unit.imageUrl || unit.images?.[0] || getUnitImagePath(unit)}
                                alt={`Unité ${unit.unitNumber}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🏠
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {unit.unitNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.building.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {unit.building.address.street}
                          <br />
                          <span className="text-gray-500">
                            {unit.building.address.city}, {unit.building.address.province || 'QC'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.proprietaire ? (
                            <>
                              {unit.proprietaire.firstName} {unit.proprietaire.lastName}
                              <br />
                              <span className="text-gray-500 text-xs">{unit.proprietaire.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Non assigné</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.locataire ? (
                            <>
                              {unit.locataire.firstName} {unit.locataire.lastName}
                              <br />
                              <span className="text-gray-500 text-xs">{unit.locataire.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Vacant</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}>
                            {statusDisplay.emoji} {statusDisplay.text}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.rentPrice ? `$${unit.rentPrice.toLocaleString()}/mois` : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.size} m²
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.bedrooms} {unit.bedrooms === 1 ? 'chambre' : 'chambres'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.type}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewDetails(unit)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Voir détails"
                            >
                              🔍
                            </button>
                            <button
                              onClick={() => handleEditUnit(unit)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Supprimer"
                              disabled={deletingUnitId === unit._id}
                            >
                              {deletingUnitId === unit._id ? '⏳' : '❌'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      Aucune unité trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modal d'ajout d'unité */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">➕ Ajouter une unité</h2>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={saving}
                >
                  ×
                </button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleSubmitAddUnit}>
                <div className="space-y-4">
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
                      {buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.name} - {building.address.city}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chambres
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salles de bain
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de transaction
                    </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix de location ($/mois)
                      </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix de vente ($)
                      </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Charges mensuelles ($)
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      disabled={saving}
                    />
                  </div>
                  
                  {/* Images - Upload avec drag and drop */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photos de l'unité</label>
                    
                    {/* Zone de drag and drop */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        addDragActive
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${saving || addUploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onDragEnter={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!saving && !addUploadingImages) setAddDragActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setAddDragActive(false)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setAddDragActive(false)
                        if (saving || addUploadingImages) return
                        
                        const files = Array.from(e.dataTransfer.files).filter(file => 
                          file.type.startsWith('image/')
                        )
                        if (files.length > 0) {
                          handleAddFileSelect(files)
                        }
                      }}
                      onClick={() => {
                        if (!saving && !addUploadingImages) {
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
                            handleAddFileSelect(Array.from(e.target.files))
                          }
                        }}
                        disabled={saving || addUploadingImages}
                      />
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          {addUploadingImages ? (
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
                    {addPreviewImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images sélectionnées ({addPreviewImages.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {addPreviewImages.map((preview, idx) => (
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
                                    const newPreviews = [...addPreviewImages]
                                    newPreviews.splice(idx, 1)
                                    setAddPreviewImages(newPreviews)
                                    const newFiles = [...addSelectedFiles]
                                    newFiles.splice(idx, 1)
                                    setAddSelectedFiles(newFiles)
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={saving || addUploadingImages}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!addUploadingImages && (
                          <button
                            type="button"
                            onClick={handleAddUploadImages}
                            className="mt-3 btn-primary text-sm"
                            disabled={addSelectedFiles.length === 0 || saving}
                          >
                            📤 Uploader les images
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Images déjà uploadées */}
                    {addUploadedImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images uploadées ({addUploadedImages.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {addUploadedImages.map((imagePath, idx) => (
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
                                    const newUploaded = [...addUploadedImages]
                                    newUploaded.splice(idx, 1)
                                    setAddUploadedImages(newUploaded)
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={saving || addUploadingImages}
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
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? '⏳ Création...' : '✅ Créer l\'unité'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de détails d'unité */}
      {showDetailModal && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🔍 Détails de l'unité {selectedUnit.unitNumber}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                {selectedUnit.images && selectedUnit.images.length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-3">Photos</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedUnit.images.map((img, idx) => (
                        <div key={idx} className="relative h-48 bg-gray-200 rounded-lg overflow-hidden">
                          <Image
                            src={img.startsWith('/images/') ? img : `/images/unites/${img}`}
                            alt={`Photo ${idx + 1}`}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/default/placeholder.jpg'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Informations générales */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informations générales</h3>
                  <div className="space-y-2">
                    <p><strong>Numéro d'unité:</strong> {selectedUnit.unitNumber}</p>
                    <p><strong>Immeuble:</strong> {selectedUnit.building.name}</p>
                    <p><strong>Adresse:</strong> {selectedUnit.building.address.street}, {selectedUnit.building.address.city}</p>
                    <p><strong>Étage:</strong> {selectedUnit.floor || 'N/A'}</p>
                    <p><strong>Type:</strong> {selectedUnit.type}</p>
                    <p><strong>Surface:</strong> {selectedUnit.size} m²</p>
                    <p><strong>Chambres:</strong> {selectedUnit.bedrooms}</p>
                    <p><strong>Salles de bain:</strong> {selectedUnit.bathrooms || 'N/A'}</p>
                    <p><strong>Statut:</strong> {selectedUnit.status}</p>
                    <p><strong>Disponible:</strong> {selectedUnit.isAvailable !== false ? 'Oui' : 'Non'}</p>
                  </div>
                </div>
                
                {/* Informations financières */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Informations financières</h3>
                  <div className="space-y-2">
                    {selectedUnit.rentPrice && (
                      <p><strong>Prix de location:</strong> ${selectedUnit.rentPrice.toLocaleString()}/mois</p>
                    )}
                    {selectedUnit.salePrice && (
                      <p><strong>Prix de vente:</strong> ${selectedUnit.salePrice.toLocaleString()}</p>
                    )}
                    {selectedUnit.monthlyCharges && (
                      <p><strong>Charges mensuelles:</strong> ${selectedUnit.monthlyCharges.toLocaleString()}</p>
                    )}
                    {(selectedUnit as any).transactionType && (
                      <p><strong>Type de transaction:</strong> {(selectedUnit as any).transactionType}</p>
                    )}
                  </div>
                </div>
                
                {/* Propriétaire */}
                {selectedUnit.proprietaire && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Propriétaire</h3>
                    <div className="space-y-2">
                      <p><strong>Nom:</strong> {selectedUnit.proprietaire.firstName} {selectedUnit.proprietaire.lastName}</p>
                      <p><strong>Email:</strong> {selectedUnit.proprietaire.email}</p>
                      {selectedUnit.proprietaire.phone && (
                        <p><strong>Téléphone:</strong> {selectedUnit.proprietaire.phone}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Locataire */}
                {selectedUnit.locataire && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Locataire</h3>
                    <div className="space-y-2">
                      <p><strong>Nom:</strong> {selectedUnit.locataire.firstName} {selectedUnit.locataire.lastName}</p>
                      <p><strong>Email:</strong> {selectedUnit.locataire.email}</p>
                      {selectedUnit.locataire.phone && (
                        <p><strong>Téléphone:</strong> {selectedUnit.locataire.phone}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Description */}
                {selectedUnit.description && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-3">Description</h3>
                    <p className="text-gray-700">{selectedUnit.description}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal d'édition d'unité */}
      {showEditModal && editingUnit && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">✏️ Modifier l'unité {editingUnit.unitNumber}</h2>
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
              
              <form onSubmit={handleSubmitEditUnit}>
                <div className="space-y-4">
                  {/* Immeuble */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Immeuble <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.building}
                      onChange={(e) => setEditFormData({...editFormData, building: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      disabled={editSaving}
                    >
                      {buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.name} - {building.address.city}
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
                        value={editFormData.unitNumber}
                        onChange={(e) => setEditFormData({...editFormData, unitNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
                      />
                    </div>
                    
                    {/* Étage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Étage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editFormData.floor}
                        onChange={(e) => setEditFormData({...editFormData, floor: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
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
                        value={editFormData.type}
                        onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
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
                        value={editFormData.size}
                        onChange={(e) => setEditFormData({...editFormData, size: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={editSaving}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Chambres */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chambres</label>
                      <input
                        type="number"
                        value={editFormData.bedrooms}
                        onChange={(e) => setEditFormData({...editFormData, bedrooms: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="0"
                        disabled={editSaving}
                      />
                    </div>
                    
                    {/* Salles de bain */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salles de bain</label>
                      <input
                        type="number"
                        value={editFormData.bathrooms}
                        onChange={(e) => setEditFormData({...editFormData, bathrooms: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min="1"
                        disabled={editSaving}
                      />
                    </div>
                    
                    {/* Statut */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={editSaving}
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
                      value={editFormData.transactionType}
                      onChange={(e) => setEditFormData({...editFormData, transactionType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={editSaving}
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
                        value={editFormData.rentPrice}
                        onChange={(e) => setEditFormData({...editFormData, rentPrice: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={editSaving}
                      />
                    </div>
                    
                    {/* Prix de vente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.salePrice}
                        onChange={(e) => setEditFormData({...editFormData, salePrice: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={editSaving}
                      />
                    </div>
                  </div>
                  
                  {/* Charges mensuelles */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Charges mensuelles ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.monthlyCharges}
                      onChange={(e) => setEditFormData({...editFormData, monthlyCharges: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={editSaving}
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      disabled={editSaving}
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
                          document.getElementById('file-input-edit')?.click()
                        }
                      }}
                    >
                      <input
                        id="file-input-edit"
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
                              📤 Glissez-déposez vos images ici ou cliquez pour sélectionner
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Formats acceptés: JPG, PNG, GIF (max 10MB par image)
                        </p>
                      </div>
                    </div>
                    
                    {/* Aperçu des images sélectionnées */}
                    {previewImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images sélectionnées ({previewImages.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {previewImages.map((preview, idx) => (
                            <div key={idx} className="relative group">
                              <div className="relative h-24 bg-gray-200 rounded-lg overflow-hidden">
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
                            📤 Uploader les images
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Images existantes */}
                    {editFormData.images && Array.isArray(editFormData.images) && editFormData.images.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Images actuelles ({editFormData.images.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {editFormData.images.map((img: string, idx: number) => {
                            const imgSrc = img.startsWith('/images/') ? img : `/images/unites/${img}`
                            return (
                              <div key={idx} className="relative group">
                                <div className="relative h-24 bg-gray-200 rounded-lg overflow-hidden">
                                  <Image
                                    src={imgSrc}
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
                                      const newImages = [...editFormData.images]
                                      newImages.splice(idx, 1)
                                      setEditFormData({...editFormData, images: newImages})
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    disabled={editSaving || uploadingImages}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Disponible */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editIsAvailable"
                      checked={editFormData.isAvailable}
                      onChange={(e) => setEditFormData({...editFormData, isAvailable: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      disabled={editSaving}
                    />
                    <label htmlFor="editIsAvailable" className="ml-2 block text-sm text-gray-700">
                      Unité disponible
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
      
      <Footer />
    </ProtectedRoute>
  )
}

