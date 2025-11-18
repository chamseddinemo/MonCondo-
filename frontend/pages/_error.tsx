import { NextPageContext } from 'next'
import Link from 'next/link'

interface ErrorProps {
  statusCode?: number
  title?: string
}

function Error({ statusCode, title }: ErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          {statusCode || 'Erreur'}
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {title || 'Une erreur est survenue'}
        </h2>
        <p className="text-gray-600 mb-8">
          {statusCode === 404
            ? 'La page que vous cherchez n\'existe pas.'
            : statusCode === 500
            ? 'Une erreur serveur est survenue.'
            : 'Une erreur inattendue s\'est produite.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-primary">
            Retour à l'accueil
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Actualiser
          </button>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error



