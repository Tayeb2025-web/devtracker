import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { TimerProvider } from './contexts/TimerContext'
import { MusicProvider } from './contexts/MusicContext'
import { AuthProvider } from './contexts/AuthProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <ToastProvider>
        <ThemeProvider>
          <CalendarProvider>
            <TimerProvider>
              <MusicProvider>
                <App />
              </MusicProvider>
            </TimerProvider>
          </CalendarProvider>
        </ThemeProvider>
      </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
