import { NextPageContext } from 'next'
import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorProps {
  statusCode?: number
  title?: string
  hasGetInitialPropsRun?: boolean
  err?: Error
}

function Error({ statusCode, title, hasGetInitialPropsRun, err }: ErrorProps) {
  useEffect(() => {
    // Log l'erreur pour le débogage
    if (err) {
      console.error('[ERROR PAGE] Error details:', err)
      console.error('[ERROR PAGE] Error message:', err.message)
      console.error('[ERROR PAGE] Error stack:', err.stack)
    }
  }, [err])

  const errorMessage = statusCode === 404
    ? 'La page que vous cherchez n\'existe pas.'
    : statusCode === 500
    ? 'Une erreur serveur est survenue. Veuillez réessayer plus tard.'
    : 'Une erreur inattendue s\'est produite.'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          {statusCode || 'Erreur'}
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {title || 'Une erreur est survenue'}
        </h2>
        <p className="text-gray-600 mb-8">
          {errorMessage}
        </p>
        {err && process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-800 font-mono break-all">
              {err.message || 'Erreur inconnue'}
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Retour à l'accueil
          </Link>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            }}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Actualiser
          </button>
        </div>
      </div>
    </div>
  )
}

// Utiliser getInitialProps pour Next.js 14 (compatible)
Error.getInitialProps = ({ res, err }: NextPageContext) => {
  let statusCode = 404
  
  if (res) {
    statusCode = res.statusCode || 500
  } else if (err) {
    statusCode = (err as any).statusCode || 500
  }
  
  return { 
    statusCode,
    hasGetInitialPropsRun: true,
    err: err || undefined
  }
}

export default Error
