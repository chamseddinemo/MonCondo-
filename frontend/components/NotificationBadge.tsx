import { useNotifications } from '../contexts/NotificationContext'

interface NotificationBadgeProps {
  type?: 'request' | 'payment' | 'message' | 'alert' | 'maintenance' | 'total'
  className?: string
  maxCount?: number
}

export default function NotificationBadge({ type, className = '', maxCount = 99 }: NotificationBadgeProps) {
  const { stats } = useNotifications()

  const getCount = () => {
    if (type === 'total') return stats.totalUnread
    return stats.byType[type || 'request'] || 0
  }

  const count = getCount()

  if (count === 0) return null

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-pulse ${className}`}
    >
      {count > maxCount ? `${maxCount}+` : count}
    </span>
  )
}


