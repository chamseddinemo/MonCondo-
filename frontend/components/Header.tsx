import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import NotificationBadge from './NotificationBadge'

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  const { user, isAuthenticated, logout, hasRole } = useAuth()
  const { stats: notificationStats } = useNotifications()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  // Fonction pour vérifier si un lien doit être affiché selon le rôle
  const canAccess = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true // Public
    if (!isAuthenticated) return false
    return hasRole(allowedRoles)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-lg backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <nav className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Redirige vers dashboard selon le rôle */}
          <Link 
            href={
              isAuthenticated && user 
                ? (user.role === 'proprietaire' || user.role === 'locataire' || user.role === 'admin') 
                  ? '/dashboard' 
                  : user.role === 'visiteur' 
                    ? '/dashboard/visiteur'
                    : '/'
                : '/'
            } 
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-150"
          >
            <div className="text-3xl">🏢</div>
            <span className="text-2xl font-bold text-primary-600">MonCondo+</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Menu pour propriétaire */}
            {isAuthenticated && user && user.role === 'proprietaire' ? (
              <>
                <Link href="/dashboard" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Mon Tableau
                </Link>
                <Link href="/proprietaire/mes-unites" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Mes Unités
                </Link>
                <Link href="/proprietaire/services" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Services
                </Link>
                <Link href="/proprietaire/consult-units" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Unités Disponibles
                </Link>
                <Link href="/messages" prefetch className="relative text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  💬 Messagerie
                  {notificationStats.byType.message > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] px-1.5 h-5 flex items-center justify-center">
                      {notificationStats.byType.message > 99 ? '99+' : notificationStats.byType.message}
                    </span>
                  )}
                </Link>
                {/* Menu utilisateur avec dropdown */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}
                    </div>
                    <span>{user.firstName} {user.lastName}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <Link
                        href="/dashboard"
                        prefetch
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Mon Tableau de Bord
                      </Link>
                      <Link
                        href="/proprietaire/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Mon Profil
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : isAuthenticated && user && user.role === 'admin' ? (
              <>
                <Link href="/dashboard" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Mon Tableau
                </Link>
                <Link href="/admin/units" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Immeubles & Unités
                </Link>
                <Link href="/services" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Services
                </Link>
                <Link href="/community" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Communauté
                </Link>
                <Link href="/messages" prefetch className="relative text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  💬 Messagerie
                  {notificationStats.byType.message > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] px-1.5 h-5 flex items-center justify-center">
                      {notificationStats.byType.message > 99 ? '99+' : notificationStats.byType.message}
                    </span>
                  )}
                </Link>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.firstName.charAt(0)}
                  </div>
                  <span className="text-gray-700 font-medium">{user.firstName}</span>
                </div>
                <button 
                  onClick={logout}
                  className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : isAuthenticated && user && user.role === 'locataire' ? (
              <>
                {/* Mon Tableau */}
                <Link 
                  href="/dashboard" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-all duration-200 hover:bg-gray-50 px-3 py-2 rounded-lg group"
                >
                  <span className="text-xl">📊</span>
                  <span>Mon Tableau</span>
                </Link>

                {/* Services avec badge de notification */}
                <Link 
                  href="/locataire/services" 
                  className="relative flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-all duration-200 hover:bg-gray-50 px-3 py-2 rounded-lg group"
                >
                  <span className="text-xl">🔧</span>
                  <span>Services</span>
                  <NotificationBadge type="request" className="absolute -top-1 -right-1" />
                </Link>

                {/* Communauté avec badge de notification */}
                <Link 
                  href="/community" 
                  className="relative flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-all duration-200 hover:bg-gray-50 px-3 py-2 rounded-lg group"
                >
                  <span className="text-xl">💬</span>
                  <span>Communauté</span>
                  <NotificationBadge type="message" className="absolute -top-1 -right-1" />
                </Link>

                {/* Messagerie */}
                <Link 
                  href="/messages" 
                  className="relative flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-all duration-200 hover:bg-gray-50 px-3 py-2 rounded-lg group"
                >
                  <span className="text-xl">💬</span>
                  <span>Messagerie</span>
                  {notificationStats.byType.message > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] px-1.5 h-5 flex items-center justify-center">
                      {notificationStats.byType.message > 99 ? '99+' : notificationStats.byType.message}
                    </span>
                  )}
                </Link>

                {/* Menu utilisateur avec dropdown */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-all duration-200 hover:bg-gray-50 px-3 py-2 rounded-lg group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-lg transition-shadow">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <span className="hidden lg:inline">{user.firstName} {user.lastName}</span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                      </div>
                      <Link
                        href="/locataire/profile"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors group"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="text-xl">👤</span>
                        <span>Profil</span>
                      </Link>
                      <Link
                        href="/locataire/settings"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors group"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <span className="text-xl">⚙️</span>
                        <span>Paramètres</span>
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="w-full flex items-center space-x-3 text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <span className="text-xl">🚪</span>
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : isAuthenticated && user && user.role === 'visiteur' ? (
              <>
                {/* Menu pour visiteur connecté */}
                <Link href="/dashboard/visiteur" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Mon Dashboard
                </Link>
                <Link href="/explorer" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Explorer
                </Link>
                <Link href="/request" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Faire une demande
                </Link>
                {(user.role === 'admin' || user.role === 'proprietaire' || user.role === 'visiteur') && (
                  <Link href="/loans/calculator" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                    💰 Calculatrice de prêt
                  </Link>
                )}
                
                {/* Menu utilisateur avec déconnexion */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}
                    </div>
                    <span className="text-gray-700 font-medium hidden lg:inline">{user.firstName} {user.lastName}</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="text-gray-700 hover:text-red-600 font-medium transition-colors duration-150 flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-red-50"
                  >
                    <span>🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Menu public */}
                <Link href="/" className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Accueil
                </Link>
                <Link href="/explorer" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Immeubles & Unités
                </Link>
                <Link href="/services" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Services
                </Link>
                <Link href="/community" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Communauté
                </Link>
                <Link href="/contact" prefetch className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150">
                  Contact
                </Link>
                <button 
                  onClick={() => router.push('/login')}
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-150"
                >
                  Connexion
                </button>
                <Link href="/request" prefetch className="btn-primary">
                  Demander une unité
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            {/* Menu mobile pour propriétaire */}
            {isAuthenticated && user && user.role === 'proprietaire' ? (
              <>
                <Link href="/dashboard" className="block text-gray-700 hover:text-primary-600">Mon Tableau</Link>
                <Link href="/proprietaire/mes-unites" className="block text-gray-700 hover:text-primary-600">Mes Unités</Link>
                <Link href="/proprietaire/services" className="block text-gray-700 hover:text-primary-600">Services</Link>
                <Link href="/proprietaire/consult-units" className="block text-gray-700 hover:text-primary-600">Unités Disponibles</Link>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mb-2">
                    Mon Tableau de Bord
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full btn-secondary border-red-500 text-red-600 hover:bg-red-50"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            ) : isAuthenticated && user && user.role === 'locataire' ? (
              <>
                {/* Mon Tableau */}
                <Link 
                  href="/dashboard" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-xl">📊</span>
                  <span>Mon Tableau</span>
                </Link>

                {/* Services avec badge */}
                <Link 
                  href="/locataire/services" 
                  className="relative flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-xl">🔧</span>
                  <span>Services</span>
                  <NotificationBadge type="request" className="absolute top-1 right-1" />
                </Link>

                {/* Communauté avec badge */}
                <Link 
                  href="/community" 
                  className="relative flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="text-xl">💬</span>
                  <span>Communauté</span>
                  <NotificationBadge type="message" className="absolute top-1 right-1" />
                </Link>

                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex items-center space-x-3 px-3 py-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-600 capitalize">Locataire</p>
                    </div>
                  </div>
                  <Link 
                    href="/locataire/profile"
                    className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg mb-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xl">👤</span>
                    <span>Profil</span>
                  </Link>
                  <Link 
                    href="/locataire/settings"
                    className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg mb-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xl">⚙️</span>
                    <span>Paramètres</span>
                  </Link>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center space-x-2 text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            ) : isAuthenticated && user && user.role === 'admin' ? (
              <>
                <Link href="/dashboard" className="block text-gray-700 hover:text-primary-600">Mon Tableau</Link>
                <Link href="/admin/units" className="block text-gray-700 hover:text-primary-600">Immeubles & Unités</Link>
                <Link href="/services" className="block text-gray-700 hover:text-primary-600">Services</Link>
                <Link href="/community" className="block text-gray-700 hover:text-primary-600">Communauté</Link>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="w-full btn-secondary border-red-500 text-red-600 hover:bg-red-50"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            ) : isAuthenticated && user && user.role === 'visiteur' ? (
              <>
                {/* Menu mobile pour visiteur connecté */}
                <Link 
                  href="/dashboard/visiteur" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl">📊</span>
                  <span>Mon Dashboard</span>
                </Link>
                <Link 
                  href="/explorer" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl">🔍</span>
                  <span>Explorer</span>
                </Link>
                <Link 
                  href="/request" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl">📝</span>
                  <span>Faire une demande</span>
                </Link>
                
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex items-center space-x-3 px-3 py-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-600 capitalize">Visiteur</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center space-x-2 text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/" className="block text-gray-700 hover:text-primary-600">Accueil</Link>
                <Link href="/explorer" className="block text-gray-700 hover:text-primary-600">Immeubles & Unités</Link>
                <Link href="/services" className="block text-gray-700 hover:text-primary-600">Services</Link>
                <Link href="/community" className="block text-gray-700 hover:text-primary-600">Communauté</Link>
                <Link href="/contact" className="block text-gray-700 hover:text-primary-600">Contact</Link>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push('/login')
                  }} 
                  className="block w-full text-left text-gray-700 hover:text-primary-600"
                >
                  Connexion
                </button>
                <Link href="/request" className="btn-primary w-full block text-center">
                  Demander une unité
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
