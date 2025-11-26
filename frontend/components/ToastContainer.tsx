import { useState } from 'react'
import Toast, { useToastListener, ToastItem } from './Toast'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useToastListener((toast) => {
    setToasts(prev => [...prev, toast])
  })

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

