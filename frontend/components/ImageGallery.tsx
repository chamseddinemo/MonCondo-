import { useState, useEffect } from 'react'
import Image from 'next/image'

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

interface ImageGalleryProps {
  images: ImageData[]
  onImageClick?: (index: number) => void
  showThumbnails?: boolean
  columns?: number
}

export default function ImageGallery({
  images,
  onImageClick,
  showThumbnails = true,
  columns = 3
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return

      if (e.key === 'Escape') {
        setIsLightboxOpen(false)
        setSelectedIndex(null)
      } else if (e.key === 'ArrowLeft' && selectedIndex !== null && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1)
      } else if (e.key === 'ArrowRight' && selectedIndex !== null && selectedIndex < images.length - 1) {
        setSelectedIndex(selectedIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, selectedIndex, images.length])

  const handleImageClick = (index: number) => {
    setSelectedIndex(index)
    setIsLightboxOpen(true)
    if (onImageClick) {
      onImageClick(index)
    }
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    setSelectedIndex(null)
  }

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  // Détecter le support WebP
  const supportsWebP = typeof window !== 'undefined' && 
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0

  const getImageSrc = (image: ImageData, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium') => {
    // Utiliser WebP si disponible et supporté
    if (supportsWebP && image.webp) {
      return image.webp[size] || image[size] || image.original
    }
    return image[size] || image.original
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucune image à afficher
      </div>
    )
  }

  return (
    <>
      {/* Galerie principale */}
      <div className={`grid gap-4 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {images.map((image, index) => (
          <div
            key={index}
            className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
            onClick={() => handleImageClick(index)}
          >
            <div className="aspect-square relative bg-gray-200">
              <Image
                src={getImageSrc(image, 'thumbnail')}
                alt={image.originalName || `Image ${index + 1}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  👁️ Voir
                </span>
              </div>
            </div>
            {image.sizes && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatFileSize(image.sizes.thumbnail)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Bouton fermer */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold z-10"
            aria-label="Fermer"
          >
            ×
          </button>

          {/* Bouton précédent */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-4xl font-bold z-10"
              aria-label="Image précédente"
            >
              ‹
            </button>
          )}

          {/* Image principale */}
          <div className="relative max-w-7xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={getImageSrc(images[selectedIndex], 'large')}
              alt={images[selectedIndex].originalName || `Image ${selectedIndex + 1}`}
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain"
              priority
            />
            {images[selectedIndex].originalName && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4">
                <p className="text-lg font-medium">{images[selectedIndex].originalName}</p>
                {images[selectedIndex].sizes && (
                  <p className="text-sm text-gray-300">
                    Taille originale: {formatFileSize(images[selectedIndex].sizes.original)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bouton suivant */}
          {selectedIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-4xl font-bold z-10"
              aria-label="Image suivante"
            >
              ›
            </button>
          )}

          {/* Indicateur de position */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Miniatures en bas */}
          {showThumbnails && images.length > 1 && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-4xl overflow-x-auto px-4">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedIndex(index)
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded overflow-hidden border-2 transition-all ${
                    index === selectedIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={getImageSrc(image, 'thumbnail')}
                    alt={`Miniature ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

