import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/main.scss'

// Initialize global utilities
import { initializeGlobals } from './shared/utils/setup'
initializeGlobals()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)