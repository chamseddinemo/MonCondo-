import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose?: () => void
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300) // Attendre l'animation de sortie
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className="text-xl">{icons[type]}</span>
      <p className="flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onClose?.(), 300)
        }}
        className="text-white hover:text-gray-200 text-xl font-bold"
      >
        ×
      </button>
    </div>
  )
}

// Types pour le système de toast
export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

type ToastListener = (toast: ToastItem) => void

// Système de toast simple et performant
let toastId = 0
const toastListeners: ToastListener[] = []

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) {
  if (typeof window === 'undefined') {
    // Fallback pour SSR
    console.log(`[Toast ${type}]: ${message}`)
    return
  }
  
  const id = ++toastId
  const toast: ToastItem = { id, message, type, duration }
  
  // Notifier tous les listeners
  toastListeners.forEach(listener => listener(toast))
}

export function useToastListener(callback: ToastListener) {
  useEffect(() => {
    toastListeners.push(callback)
    return () => {
      const index = toastListeners.indexOf(callback)
      if (index > -1) toastListeners.splice(index, 1)
    }
  }, [callback])
}

