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
      {/* Background Image/Video */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-800">
          <div className="w-full h-full bg-black opacity-40"></div>
        </div>
        <div className="absolute inset-0 bg-[url('/images/building.jpg')] bg-cover bg-center opacity-30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            {slides[currentSlide].title}
          </h1>
          <h2 className="text-2xl md:text-3xl mb-4 font-semibold animate-slide-up" style={{animationDelay: '0.2s'}}>
            {slides[currentSlide].subtitle}
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-gray-200 animate-slide-up" style={{animationDelay: '0.4s'}}>
            {slides[currentSlide].description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{animationDelay: '0.6s'}}>
            <button 
              onClick={() => router.push('/units')}
              className="btn-primary text-lg px-8 py-4"
            >
              Voir les appartements disponibles
            </button>
            <button 
              onClick={() => router.push('/request')}
              className="btn-secondary text-lg px-8 py-4 bg-white text-primary-600 hover:bg-gray-100"
            >
              Faire une demande maintenant
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

