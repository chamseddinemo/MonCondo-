import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Document {
  _id: string
  originalName: string
  filename: string
  mimeType: string
  size: number
  category: string
  description?: string
  createdAt: string
  downloadCount: number
  building?: {
    _id: string
    name: string
  }
  unit?: {
    _id: string
    unitNumber: string
  }
  uploadedBy?: {
    firstName: string
    lastName: string
  }
}

interface GeneratedDocument {
  _id: string
  type: string
  filename: string
  signed: boolean
  signedAt?: string
  generatedAt?: string
  signedBy?: {
    firstName: string
    lastName: string
  }
  requestId: string
  requestTitle: string
  unit?: {
    _id: string
    unitNumber: string
  }
  building?: {
    _id: string
    name: string
  }
}

interface Unit {
  _id: string
  unitNumber: string
  building: {
    _id: string
    name: string
  }
}

export default function Documents() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { unit: unitParam } = router.query // Paramètre d'URL pour filtrer par unité
  const [documents, setDocuments] = useState<Document[]>([])
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [myUnit, setMyUnit] = useState<any>(null) // Unité assignée pour les locataires
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState(unitParam ? String(unitParam) : '')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [signingDoc, setSigningDoc] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    category: 'autre',
    description: '',
    unit: '',
    building: ''
  })

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'proprietaire' || user?.role === 'locataire' || user?.role === 'admin')) {
      if (user?.role === 'locataire') {
        loadMyUnit().then(() => {
          loadDocuments()
          loadGeneratedDocuments()
        })
      } else {
        loadDocuments()
        loadGeneratedDocuments()
        if (user?.role !== 'admin') {
          loadUnits()
        } else {
          loadAllUnits()
        }
      }
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'proprietaire' || user?.role === 'locataire' || user?.role === 'admin')) {
      loadDocuments()
      loadGeneratedDocuments()
    }
  }, [categoryFilter, unitFilter, myUnit])

  // Mettre à jour le filtre unité si un paramètre d'URL est fourni
  useEffect(() => {
    if (unitParam) {
      setUnitFilter(String(unitParam))
    }
  }, [unitParam])

  const loadMyUnit = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/locataire/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success && response.data.data.myUnit) {
        setMyUnit(response.data.data.myUnit)
        // Si pas de filtre unité et qu'on a une unité assignée, filtrer automatiquement
        if (!unitFilter && response.data.data.myUnit._id) {
          setUnitFilter(response.data.data.myUnit._id)
        }
      }
    } catch (error) {
      console.error('Erreur chargement unité:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (categoryFilter) params.append('category', categoryFilter)
      
      // Pour les locataires, charger seulement les documents de leur unité
      // Pour les propriétaires et admin, charger selon le filtre (ou tous si pas de filtre)
      if (user?.role === 'locataire' && myUnit?._id) {
        params.append('unit', myUnit._id)
      } else if (unitFilter && user?.role !== 'admin') {
        // Pour les propriétaires, filtrer par unité si sélectionnée
        params.append('unit', unitFilter)
      } else if (unitFilter && user?.role === 'admin') {
        // Pour l'admin, filtrer par unité si sélectionnée
        params.append('unit', unitFilter)
      }
      // Si pas de filtre pour l'admin, charger tous les documents (pas de paramètre unit)

      const response = await axios.get(`${API_URL}/documents?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        setDocuments(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnits = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/proprietaire/my-units`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        // S'assurer que les unités ont le building._id
        const unitsWithBuilding = (response.data.data || []).map((unit: any) => ({
          ...unit,
          building: unit.building?._id ? unit.building : { _id: unit.building, name: unit.building?.name || '' }
        }))
        setUnits(unitsWithBuilding)
      }
    } catch (error) {
      console.error('Erreur chargement unités:', error)
    }
  }

  const loadAllUnits = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/units`, {
        params: { populate: 'building' },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        // S'assurer que les unités ont le building._id
        const unitsWithBuilding = (response.data.data || []).map((unit: any) => ({
          ...unit,
          building: unit.building?._id ? unit.building : { _id: unit.building, name: unit.building?.name || '' }
        }))
        setUnits(unitsWithBuilding)
      }
    } catch (error) {
      console.error('Erreur chargement unités:', error)
    }
  }

  const loadGeneratedDocuments = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.log('[DOCUMENTS] Pas de token, impossible de charger les documents générés')
        return
      }

      // Construire les paramètres de requête
      const params = new URLSearchParams()
      params.append('status', 'accepte') // Seulement les demandes acceptées ont des documents générés
      
      // Pour les locataires, filtrer seulement les demandes de leur unité
      if (user?.role === 'locataire' && myUnit?._id) {
        // Les demandes seront automatiquement filtrées par l'API pour le locataire
      }
      // Pour les propriétaires avec filtre unité, on peut filtrer côté client

      // Charger les demandes acceptées avec leurs documents générés
      const response = await axios.get(`${API_URL}/requests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.success) {
        const requests = response.data.data || []
        const generatedDocs: GeneratedDocument[] = []
        
        console.log('[DOCUMENTS] Total demandes trouvées:', requests.length)
        
        requests.forEach((request: any) => {
          // Filtrer seulement les demandes acceptées avec des documents générés
          if (request.status === 'accepte' && request.generatedDocuments && request.generatedDocuments.length > 0) {
            // Pour les locataires, filtrer seulement les documents de leur unité
            if (user?.role === 'locataire' && myUnit?._id) {
              const requestUnitId = request.unit?._id?.toString() || request.unit?.toString()
              const myUnitId = myUnit._id?.toString() || String(myUnit._id)
              if (requestUnitId !== myUnitId) {
                return // Ignorer les documents d'autres unités
              }
            }
            // Pour les propriétaires et admin avec filtre unité, filtrer seulement cette unité
            else if ((user?.role === 'proprietaire' || user?.role === 'admin') && unitFilter) {
              const requestUnitId = request.unit?._id?.toString() || request.unit?.toString()
              if (requestUnitId !== unitFilter) {
                return // Ignorer les documents d'autres unités
              }
            }
            
            console.log('[DOCUMENTS] Demande acceptée trouvée:', request._id, 'Titre:', request.title, 'Documents:', request.generatedDocuments.length)
            
            request.generatedDocuments.forEach((doc: any) => {
              // Vérifier que le document a bien un _id
              const docId = doc._id?.toString() || (doc._id ? String(doc._id) : null)
              if (!docId) {
                console.warn('[DOCUMENTS] Document sans _id ignoré:', doc)
                return
              }
              
              console.log('[DOCUMENTS] Document ajouté:', doc.filename, 'Type:', doc.type, 'ID:', docId)
              
              generatedDocs.push({
                _id: docId,
                type: doc.type || 'autre',
                filename: doc.filename || 'Document sans nom',
                signed: doc.signed === true || doc.signed === 'true',
                signedAt: doc.signedAt,
                generatedAt: doc.generatedAt || doc.createdAt || request.approvedAt,
                signedBy: doc.signedBy,
                requestId: request._id?.toString() || String(request._id),
                requestTitle: request.title || 'Demande sans titre',
                unit: request.unit,
                building: request.building
              })
            })
          }
        })
        
        console.log('[DOCUMENTS] Total documents générés à afficher:', generatedDocs.length)
        setGeneratedDocuments(generatedDocs)
      } else {
        console.log('[DOCUMENTS] Réponse API non réussie:', response.data)
      }
    } catch (error: any) {
      console.error('Erreur chargement documents générés:', error)
      if (error.response) {
        console.error('Détails erreur:', error.response.status, error.response.data)
      }
    }
  }

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_URL}/documents/${documentId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      })

      // Vérifier que la réponse est bien un blob
      if (response.data instanceof Blob || response.data instanceof ArrayBuffer) {
        // Créer un lien de téléchargement
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename || 'document')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        // Recharger les documents pour mettre à jour le compteur
        await loadDocuments()
      } else {
        // Si ce n'est pas un blob, essayer de le convertir en texte pour voir l'erreur
        try {
          const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
          const errorData = JSON.parse(text)
          alert(errorData.message || 'Erreur lors du téléchargement du document')
        } catch {
          alert('Erreur: Le serveur n\'a pas retourné un fichier valide')
        }
      }
    } catch (error: any) {
      console.error('Erreur téléchargement:', error)
      if (error.response?.status === 404) {
        alert('Document non trouvé sur le serveur. Le fichier peut avoir été déplacé ou supprimé.')
      } else if (error.response?.status === 403) {
        alert('Vous n\'avez pas les permissions pour télécharger ce document')
      } else {
        alert(error.response?.data?.message || 'Erreur lors du téléchargement du document. Veuillez réessayer.')
      }
    }
  }

  const handleDownloadGenerated = async (requestId: string, docId: string, filename: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('Vous devez être connecté pour télécharger ce document')
        return
      }

      console.log('[DOWNLOAD] Téléchargement document généré:', {
        requestId,
        docId,
        filename,
        url: `${API_URL}/requests/${requestId}/documents/${docId}/download`
      })

      const response = await axios.get(`${API_URL}/requests/${requestId}/documents/${docId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      })

      // Vérifier que la réponse est bien un blob
      if (response.data instanceof Blob || response.data instanceof ArrayBuffer) {
        // Créer un lien de téléchargement
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        console.log('[DOWNLOAD] Document téléchargé avec succès')
      } else {
        // Si ce n'est pas un blob, essayer de le convertir en texte pour voir l'erreur
        try {
          const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
          const errorData = JSON.parse(text)
          alert(errorData.message || 'Erreur lors du téléchargement du document')
        } catch {
          alert('Erreur: Le serveur n\'a pas retourné un fichier valide')
        }
      }
    } catch (error: any) {
      console.error('Erreur téléchargement document généré:', error)
      console.error('Détails:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
      
      if (error.response?.status === 404) {
        const errorMessage = error.response?.data?.message || 'Document non trouvé sur le serveur'
        const debugInfo = error.response?.data?.debug
        if (debugInfo) {
          console.error('Info debug:', debugInfo)
        }
        alert(`${errorMessage}\n\nLe fichier peut avoir été déplacé ou supprimé. Veuillez contacter l'administrateur.`)
      } else if (error.response?.status === 403) {
        alert('Vous n\'avez pas les permissions pour télécharger ce document')
      } else {
        alert(error.response?.data?.message || 'Erreur lors du téléchargement du document. Veuillez réessayer.')
      }
    }
  }

  const handleSignGenerated = async (requestId: string, docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir signer ce document électroniquement ? Cette action est irréversible.')) {
      return
    }

    setSigningDoc(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.put(
        `${API_URL}/requests/${requestId}/documents/${docId}/sign`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.status === 200 && response.data && response.data.success) {
        alert('Document signé avec succès ! L\'administrateur a été notifié.')
        // Recharger les documents générés
        loadGeneratedDocuments()
      } else {
        alert(response.data?.message || 'Une erreur est survenue lors de la signature du document.')
      }
    } catch (error: any) {
      console.error('Erreur signature:', error)
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la signature du document.')
    } finally {
      setSigningDoc(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      alert('Veuillez sélectionner un fichier')
      return
    }

    // Validation de la taille du fichier (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (uploadFile.size > maxSize) {
      alert('Le fichier est trop volumineux. La taille maximale est de 10MB.')
      return
    }

    // Validation du type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
    if (!allowedTypes.includes(uploadFile.type)) {
      alert('Type de fichier non autorisé. Types autorisés: PDF, images (JPEG, PNG, GIF), documents Word/Excel, fichiers texte.')
      return
    }

    // Si une unité est sélectionnée, s'assurer que le building est fourni
    if (uploadData.unit && !uploadData.building) {
      const selectedUnit = units.find(u => u._id === uploadData.unit)
      if (selectedUnit && selectedUnit.building?._id) {
        uploadData.building = selectedUnit.building._id
      } else {
        alert('Erreur: Impossible de déterminer l\'immeuble pour cette unité. Veuillez réessayer.')
        return
      }
    }

    // Si aucune unité n'est sélectionnée mais qu'on est admin/propriétaire, le building est requis
    if (!uploadData.unit && user?.role !== 'locataire') {
      if (!uploadData.building) {
        alert('Veuillez sélectionner une unité ou un immeuble pour ce document.')
        return
      }
    }

    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('category', uploadData.category)
      formData.append('description', uploadData.description || '')
      
      // Toujours envoyer l'unité si elle est sélectionnée
      if (uploadData.unit) {
        formData.append('unit', uploadData.unit)
      }
      
      // Toujours envoyer le building si disponible (requis par le modèle)
      if (uploadData.building) {
        formData.append('building', uploadData.building)
      } else if (uploadData.unit) {
        // Si on a une unité mais pas de building, essayer de le récupérer
        const selectedUnit = units.find(u => u._id === uploadData.unit)
        if (selectedUnit?.building?._id) {
          formData.append('building', selectedUnit.building._id)
        } else {
          alert('Erreur: Impossible de déterminer l\'immeuble. Veuillez réessayer.')
          return
        }
      }

      const response = await axios.post(`${API_URL}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data && response.data.success) {
        // Réinitialiser le formulaire et recharger les documents
        setUploadFile(null)
        setUploadData({ category: 'autre', description: '', unit: '', building: '' })
        setShowUploadModal(false)
        await loadDocuments()
        await loadGeneratedDocuments()
        alert('Document uploadé avec succès!')
      } else {
        alert(response.data?.message || 'Erreur lors de l\'upload du document')
      }
    } catch (error: any) {
      console.error('Erreur upload:', error)
      if (error.response?.status === 400) {
        alert(error.response?.data?.message || 'Erreur de validation. Veuillez vérifier les informations saisies.')
      } else if (error.response?.status === 413) {
        alert('Le fichier est trop volumineux. La taille maximale est de 10MB.')
      } else {
        alert(error.response?.data?.message || 'Erreur lors de l\'upload du document. Veuillez réessayer.')
      }
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'contrat': 'Contrat',
      'facture': 'Facture',
      'maintenance': 'Maintenance',
      'reglement': 'Règlement',
      'autre': 'Autre'
    }
    return labels[category] || category
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'contrat': '📄',
      'facture': '🧾',
      'maintenance': '🔧',
      'reglement': '📋',
      'autre': '📎'
    }
    return icons[category] || '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Combiner les documents uploadés et les documents générés pour l'affichage
  const allDocuments = [
    ...documents.map(doc => ({
      ...doc,
      isGenerated: false,
      documentId: doc._id
    })),
    ...generatedDocuments.map(doc => ({
      _id: `generated-${doc._id}-${doc.requestId}`, // ID unique pour éviter les conflits
      originalName: doc.filename,
      filename: doc.filename,
      category: doc.type === 'bail' ? 'contrat' : doc.type === 'contrat_vente' ? 'contrat' : 'autre',
      description: `Document généré depuis la demande: ${doc.requestTitle}`,
      createdAt: doc.generatedAt || doc.signedAt || new Date().toISOString(),
      downloadCount: 0,
      size: 0, // Taille inconnue pour les documents générés
      building: doc.building,
      unit: doc.unit,
      uploadedBy: doc.signedBy,
      isGenerated: true,
      requestId: doc.requestId,
      signed: doc.signed,
      signedAt: doc.signedAt,
      signedBy: doc.signedBy,
      documentId: doc._id,
      generatedDocId: doc._id // Garder l'ID original pour le téléchargement
    }))
  ]

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !categoryFilter || doc.category === categoryFilter
    
    // Pour les locataires, filtrer seulement leur unité
    // Pour les propriétaires, filtrer selon le filtre sélectionné
    let matchesUnit = true
    if (user?.role === 'locataire' && myUnit?._id) {
      const docUnitId = doc.unit?._id?.toString() || doc.unit?.toString()
      const myUnitId = myUnit._id?.toString() || String(myUnit._id)
      matchesUnit = docUnitId === myUnitId
    } else if (unitFilter) {
      const docUnitId = doc.unit?._id?.toString() || doc.unit?.toString()
      matchesUnit = docUnitId === unitFilter
    }
    
    return matchesSearch && matchesCategory && matchesUnit
  })

  if (!isAuthenticated || (user?.role !== 'proprietaire' && user?.role !== 'locataire' && user?.role !== 'admin')) {
    return (
      <ProtectedRoute requiredRoles={['proprietaire', 'locataire', 'admin']}>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
            <p className="text-gray-600">Cette page est réservée aux administrateurs, propriétaires et locataires.</p>
          </div>
        </div>
        <Footer />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['proprietaire', 'locataire', 'admin']}>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">Gestion Documentaire</h1>
                <p className="text-xl text-gray-300">
                  Retrouvez tous vos contrats, factures, reçus et documents officiels en un seul endroit
                </p>
              </div>
              {(user?.role === 'proprietaire' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-white text-slate-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  + Uploader un document
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* En-tête avec information de l'unité */}
          {(myUnit || (unitFilter && units.find(u => u._id === unitFilter))) && (
            <div className="card p-6 mb-6 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    📋 Documents de l'unité
                  </h2>
                  {myUnit ? (
                    <p className="text-gray-700">
                      <span className="font-semibold">Unité {myUnit.unitNumber}</span>
                      {myUnit.building?.name && ` - ${myUnit.building.name}`}
                    </p>
                  ) : unitFilter && units.find(u => u._id === unitFilter) ? (
                    <p className="text-gray-700">
                      <span className="font-semibold">Unité {units.find(u => u._id === unitFilter)?.unitNumber}</span>
                      {units.find(u => u._id === unitFilter)?.building?.name && ` - ${units.find(u => u._id === unitFilter)?.building.name}`}
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-600 mt-1">
                    Tous les documents liés à cette unité (uploadés par l'admin, propriétaires, et documents générés)
                  </p>
                </div>
                {(user?.role === 'proprietaire' || user?.role === 'admin') && (
                  <button
                    onClick={() => {
                      setUnitFilter('')
                      loadDocuments()
                      loadGeneratedDocuments()
                    }}
                    className="btn-secondary text-sm"
                  >
                    Voir tous les documents
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filtres et recherche */}
          <div className="card p-6 mb-8">
            <div className={`grid grid-cols-1 ${(user?.role === 'proprietaire' || user?.role === 'admin') ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom du document, description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes les catégories</option>
                  <option value="contrat">Contrat</option>
                  <option value="facture">Facture</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reglement">Règlement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {(user?.role === 'proprietaire' || user?.role === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unité</label>
                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Toutes les unités</option>
                    {units.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.unitNumber} - {unit.building.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section Documents à signer */}
          {generatedDocuments && generatedDocuments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Documents à signer</h2>
              {generatedDocuments.every(doc => doc.signed) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    ✅ Tous les documents ont été signés. L'administrateur va maintenant procéder à l'attribution de l'unité.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedDocuments.map((doc, index) => (
                  <div key={doc._id || index} className="card p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">📄</div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {doc.type === 'bail' ? 'Bail de location' : 
                         doc.type === 'contrat_vente' ? 'Contrat de vente' : 
                         'Document'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate" title={doc.filename}>
                      {doc.filename}
                    </h3>

                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      {doc.building && (
                        <div className="flex items-center">
                          <span className="mr-2">🏢</span>
                          <span>{doc.building.name}</span>
                        </div>
                      )}
                      {doc.unit && (
                        <div className="flex items-center">
                          <span className="mr-2">🏠</span>
                          <span>Unité {doc.unit.unitNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="mr-2">📋</span>
                        <span>{doc.requestTitle}</span>
                      </div>
                      {doc.signed ? (
                        <div className="flex items-center text-green-600">
                          <span className="mr-2">✅</span>
                          <span>
                            Signé le {doc.signedAt ? new Date(doc.signedAt).toLocaleDateString('fr-CA') : ''}
                            {doc.signedBy && ` par ${doc.signedBy.firstName} ${doc.signedBy.lastName}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <span className="mr-2">⏳</span>
                          <span>En attente de signature</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadGenerated(doc.requestId, doc._id, doc.filename)}
                        className="flex-1 btn-secondary text-sm"
                      >
                        📥 Télécharger
                      </button>
                      {!doc.signed && (
                        <button
                          onClick={() => handleSignGenerated(doc.requestId, doc._id)}
                          disabled={signingDoc}
                          className="flex-1 btn-primary text-sm"
                        >
                          {signingDoc ? 'Signature...' : '✍️ Signer'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des documents */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <div key={doc._id} className="card p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{getCategoryIcon(doc.category)}</div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
                      {getCategoryLabel(doc.category)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 truncate" title={doc.originalName}>
                    {doc.originalName}
                  </h3>

                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.description}</p>
                  )}

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    {doc.building && (
                      <div className="flex items-center">
                        <span className="mr-2">🏢</span>
                        <span>{doc.building.name}</span>
                      </div>
                    )}
                    {doc.unit && (
                      <div className="flex items-center">
                        <span className="mr-2">🏠</span>
                        <span>Unité {doc.unit.unitNumber}</span>
                      </div>
                    )}
                    {doc.isGenerated && (
                      <div className="flex items-center">
                        <span className="mr-2">📋</span>
                        <span className="text-xs text-blue-600">Document généré</span>
                      </div>
                    )}
                    {doc.isGenerated && doc.signed !== undefined && (
                      <div className="flex items-center">
                        {doc.signed ? (
                          <span className="text-green-600 text-xs">✅ Signé</span>
                        ) : (
                          <span className="text-yellow-600 text-xs">⏳ En attente de signature</span>
                        )}
                      </div>
                    )}
                    {!doc.isGenerated && (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">📦</span>
                          <span>{formatFileSize(doc.size || 0)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">📥</span>
                          <span>{doc.downloadCount || 0} téléchargement(s)</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Date inconnue'}</span>
                    </div>
                    {doc.uploadedBy && (
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-2">👤</span>
                        <span>Par {doc.uploadedBy.firstName || ''} {doc.uploadedBy.lastName || ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {doc.isGenerated ? (
                      <>
                        <button
                          onClick={() => handleDownloadGenerated(doc.requestId, doc.generatedDocId || doc.documentId, doc.filename || doc.originalName)}
                          className="flex-1 btn-primary"
                        >
                          📥 Télécharger
                        </button>
                        {!doc.signed && (
                          <button
                            onClick={() => handleSignGenerated(doc.requestId, doc.generatedDocId || doc.documentId)}
                            disabled={signingDoc}
                            className="flex-1 btn-secondary"
                          >
                            {signingDoc ? 'Signature...' : '✍️ Signer'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleDownload(doc._id, doc.originalName)}
                        className="w-full btn-primary"
                      >
                        Télécharger
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-2xl font-bold mb-2">Aucun document trouvé</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || categoryFilter || unitFilter
                  ? 'Aucun document ne correspond à vos critères de recherche.'
                  : generatedDocuments.length > 0
                    ? 'Vous n\'avez pas d\'autres documents uploadés, mais vous avez des documents à signer ci-dessus.'
                    : 'Vous n\'avez pas encore de documents. Commencez par uploader votre premier document.'}
              </p>
              {(user?.role === 'proprietaire' || user?.role === 'admin') && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary"
                >
                  Uploader un document
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'upload - Pour les propriétaires et administrateurs */}
      {showUploadModal && (user?.role === 'proprietaire' || user?.role === 'admin') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Uploader un document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={uploadData.category}
                  onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="contrat">Contrat</option>
                  <option value="facture">Facture</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reglement">Règlement</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unité (optionnel)</label>
                <select
                  value={uploadData.unit}
                  onChange={(e) => {
                    const selectedUnit = units.find(u => u._id === e.target.value)
                    setUploadData({
                      ...uploadData,
                      unit: e.target.value,
                      building: selectedUnit?.building?._id || ''
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Aucune unité</option>
                  {units.map((unit) => (
                    <option key={unit._id} value={unit._id}>
                      {unit.unitNumber} - {unit.building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={!uploadFile}
                >
                  Uploader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </ProtectedRoute>
  )
}

