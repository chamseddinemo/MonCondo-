/**
 * Composant Image optimisé qui désactive automatiquement l'optimisation Next.js
 * pour les images locales afin d'éviter les erreurs 400
 */
import Image from 'next/image'
import { ComponentProps } from 'react'

interface OptimizedImageProps extends ComponentProps<typeof Image> {
  src: string
}

export default function OptimizedImage({ src, ...props }: OptimizedImageProps) {
  // Désactiver l'optimisation pour les images locales (commençant par /)
  // Garder l'optimisation pour les URLs externes (http/https)
  const isLocalImage = typeof src === 'string' && !src.startsWith('http')
  
  return (
    <Image
      {...props}
      src={src}
      unoptimized={isLocalImage}
    />
  )
}

