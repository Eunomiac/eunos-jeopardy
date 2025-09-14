/**
 * Main application entry point for Euno's Jeopardy.
 *
 * This module serves as the root entry point for the React application,
 * handling initialization, global setup, and rendering the application
 * component tree with necessary providers and configuration.
 *
 * **Initialization Order:**
 * 1. Import React and DOM utilities
 * 2. Import application components and providers
 * 3. Import global styles
 * 4. Initialize global utilities (assert, etc.)
 * 5. Create React root and render application
 *
 * **Provider Hierarchy:**
 * - StrictMode: React development mode checks and warnings
 * - AuthProvider: Authentication context for the entire app
 * - App: Main application component with routing and state
 *
 * **Global Setup:**
 * - Initializes global utilities before React rendering
 * - Loads main SCSS styles for application theming
 * - Configures React 19 with createRoot API
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AuthProvider } from './contexts/AuthContext'
import './styles/main.scss'

// Initialize global utilities before React rendering
import { initializeGlobals } from './shared/utils/setup'

/**
 * Initialize global utilities required by the application.
 *
 * This must be called before React rendering to ensure global utilities
 * (like the assert function) are available throughout the component tree.
 *
 * **Global Utilities Initialized:**
 * - assert: Runtime validation and type narrowing function
 * - Future utilities can be added to the setup module
 */
initializeGlobals()

/**
 * Create React root and render the application component tree.
 *
 * Uses React 19's createRoot API for concurrent features and improved
 * performance. The component hierarchy provides authentication context
 * and development mode checks for the entire application.
 *
 * **Component Tree Structure:**
 * ```
 * StrictMode (React development checks)
 * └── AuthProvider (Authentication context)
 *     └── App (Main application logic)
 * ```
 *
 * **DOM Target:**
 * - Renders into #root element in index.html
 * - Uses non-null assertion as root element is guaranteed to exist
 *
 * **Development Features:**
 * - StrictMode enables additional checks and warnings
 * - Hot module replacement support via Vite
 * - Source maps for debugging
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)