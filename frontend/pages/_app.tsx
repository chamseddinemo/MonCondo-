import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { SocketProvider } from '../contexts/SocketContext'
import { ChatProvider } from '../contexts/ChatContext'
import { PaymentProvider } from '../contexts/PaymentContext'
import ChatButton from '../components/ChatButton'
import FloatingChatWindow from '../components/FloatingChatWindow'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <PaymentProvider>
        <NotificationProvider>
          <SocketProvider>
            <ChatProvider>
              <Component {...pageProps} />
              <ChatButton />
              <FloatingChatWindow />
            </ChatProvider>
          </SocketProvider>
        </NotificationProvider>
      </PaymentProvider>
    </AuthProvider>
  )
}

