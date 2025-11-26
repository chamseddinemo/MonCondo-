import { useState, useCallback } from 'react'
import ImageGallery from './ImageGallery'
import axios from 'axios'
import { showToast } from './Toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface ImageData {
  original: string
  thumbnail: string
  medium: string
  large: string
  webp?: {
    thumbnail?: string
    medium?: string
    large?: string
    original?: string
  }
  sizes?: {
    original?: number
    thumbnail?: number
    medium?: number
    large?: number
  }
  originalName?: string
}

interface ImageUploadAdvancedProps {
  type: 'units' | 'buildings'
  onUploadComplete?: (images: ImageData[]) => void
  existingImages?: ImageData[]
}

export default function ImageUploadAdvanced({
  type,
  onUploadComplete,
  existingImages = []
}: ImageUploadAdvancedProps) {
  const [images, setImages] = useState<ImageData[]>(existingImages)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      alert('Veuillez sélectionner des images')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      imageFiles.forEach(file => {
        formData.append('images', file)
      })

      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      const baseUrl = API_URL.replace('/api', '')
      const uploadUrl = `${baseUrl}/upload/${type}/images`

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success && response.data.images) {
        const newImages = response.data.images.map((img: any) => ({
          original: img.original,
          thumbnail: img.thumbnail,
          medium: img.medium,
          large: img.large,
          webp: img.webp,
          sizes: img.sizes,
          originalName: img.originalName
        }))

        setImages(prev => [...prev, ...newImages])
        
        if (onUploadComplete) {
          onUploadComplete(newImages)
        }

        showToast(`${newImages.length} image(s) uploadée(s) et traitée(s) avec succès!`, 'success')
      }
    } catch (error: any) {
      console.error('Erreur upload:', error)
      showToast(error.response?.data?.message || 'Erreur lors de l\'upload', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Zone de drag-and-drop */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          id="image-upload"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-lg font-medium text-gray-700 mb-2">
            {uploading ? 'Traitement en cours...' : 'Glissez-déposez des images ici'}
          </span>
          <span className="text-sm text-gray-500">
            ou cliquez pour sélectionner
          </span>
          <span className="text-xs text-gray-400 mt-2">
            Formats supportés: JPEG, PNG, GIF, WebP (max 20MB)
          </span>
        </label>
        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Galerie d'images */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Images uploadées ({images.length})
            </h3>
            <button
              onClick={() => setImages([])}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Tout supprimer
            </button>
          </div>
          <ImageGallery
            images={images}
            columns={4}
            showThumbnails={true}
            onImageClick={(index) => console.log('Image clicked:', index)}
          />
        </div>
      )}
    </div>
  )
}

