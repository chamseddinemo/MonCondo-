import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, Suspense, startTransition } from 'react'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { SocketProvider } from '../contexts/SocketContext'
import { ChatProvider } from '../contexts/ChatContext'
import { PaymentProvider } from '../contexts/PaymentContext'
import dynamic from 'next/dynamic'
import ToastContainer from '../components/ToastContainer'

// Lazy loading des composants lourds pour améliorer les performances
// Gestion d'erreur améliorée pour éviter les erreurs 404
const ChatButton = dynamic(
  () => import('../components/ChatButton').catch(() => ({ default: () => null })),
  {
    ssr: false,
    loading: () => null
  }
)

const FloatingChatWindow = dynamic(
  () => import('../components/FloatingChatWindow').catch(() => ({ default: () => null })),
  {
    ssr: false,
    loading: () => null
  }
)

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    // Optimisation de la navigation avec prefetching
    const handleRouteChangeStart = () => {
      startTransition(() => {
        // Transition fluide
        document.body.style.transition = 'opacity 0.2s ease-in-out'
        document.body.style.opacity = '0.98'
      })
    }

    const handleRouteChangeComplete = () => {
      startTransition(() => {
        // Restaurer l'opacité après la navigation
        document.body.style.opacity = '1'
        // Scroll en haut de la page avec animation fluide
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }

    const handleRouteChangeError = () => {
      startTransition(() => {
        // Restaurer l'opacité en cas d'erreur
        document.body.style.opacity = '1'
      })
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeError)

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [router])

  return (
    <AuthProvider>
      <PaymentProvider>
        <NotificationProvider>
          <SocketProvider>
            <ChatProvider>
              <div className="transition-opacity duration-200 ease-in-out">
                <Component {...pageProps} />
              </div>
              <Suspense fallback={null}>
                <ChatButton />
                <FloatingChatWindow />
              </Suspense>
              <ToastContainer />
            </ChatProvider>
          </SocketProvider>
        </NotificationProvider>
      </PaymentProvider>
    </AuthProvider>
  )
}

export default MyApp

