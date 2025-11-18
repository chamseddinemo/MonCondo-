import Link from 'next/link'

interface QuickActionCardProps {
  icon: string
  title: string
  description?: string
  href: string
  color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple'
  badge?: string | number
}

export default function QuickActionCard({ 
  icon, 
  title, 
  description, 
  href, 
  color = 'primary',
  badge 
}: QuickActionCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
  }

  return (
    <Link href={href}>
      <div className={`${colorClasses[color]} rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer relative`}>
        {badge && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {badge}
          </span>
        )}
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        {description && (
          <p className="text-sm opacity-80">{description}</p>
        )}
      </div>
    </Link>
  )
}

