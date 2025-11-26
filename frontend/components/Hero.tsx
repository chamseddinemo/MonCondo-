import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const router = useRouter()

  const slides = [
    {
      image: '/images/hero-1.jpg',
      title: 'MonCondo+',
      subtitle: 'La plateforme moderne pour gérer votre condo ou trouver votre logement idéal',
      description: 'Communication centralisée, paiement en ligne, suivi des demandes'
    },
    {
      image: '/images/hero-2.jpg',
      title: 'Gestion Simplifiée',
      subtitle: 'Tout ce dont vous avez besoin au même endroit',
      description: 'Messagerie instantanée, suivi des paiements, gestion documentaire'
    }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/default/acceuiimage.jpg')"
          }}
        >
          {/* Overlay pour améliorer la lisibilité du texte avec la palette Montréal Skyline */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/80 via-neutral-500/70 to-primary-600/80"></div>
          {/* Overlay supplémentaire pour effet de profondeur */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Titre principal */}
          <h1 className="text-6xl md:text-8xl font-extrabold mb-6 animate-slide-up leading-tight">
            <span className="bg-gradient-to-r from-white via-accent-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
              {slides[currentSlide].title}
            </span>
          </h1>

          {/* Sous-titre */}
          <h2 className="text-2xl md:text-4xl mb-6 font-semibold animate-slide-up leading-relaxed" style={{animationDelay: '0.2s'}}>
            <span className="text-white drop-shadow-lg">
              {slides[currentSlide].subtitle}
            </span>
          </h2>

          {/* Description */}
          <div className="mb-10 animate-slide-up" style={{animationDelay: '0.4s'}}>
            <p className="text-lg md:text-2xl text-white/90 font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-md">
              {slides[currentSlide].description}
            </p>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-slide-up" style={{animationDelay: '0.6s'}}>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                router.push('/explorer')
              }}
              className="group relative bg-primary-500 hover:bg-primary-600 text-white font-bold text-lg px-10 py-5 rounded-xl shadow-2xl hover:shadow-[0_20px_50px_rgba(31,59,87,0.5)] transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 border-primary-400/50"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>Voir les appartements disponibles</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-500/20 to-accent2-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                router.push('/explorer')
              }}
              className="group relative bg-white/95 hover:bg-white text-primary-500 hover:text-primary-600 font-bold text-lg px-10 py-5 rounded-xl shadow-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 border-accent-500/30 hover:border-accent-500"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>Faire une demande maintenant</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-accent2-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white opacity-50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 animate-bounce">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}

