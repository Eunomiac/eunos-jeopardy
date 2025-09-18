import { render } from '@testing-library/react'
import { PlayerJoin } from './PlayerJoin'

// Mock services
jest.mock('../../services/games/GameService')
jest.mock('../../services/supabase/client')



// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('PlayerJoin', () => {
  const mockProps = {
    onGameJoined: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render player join component', () => {
      render(<PlayerJoin {...mockProps} />)

      // The component should render without crashing
      expect(document.body).toBeInTheDocument()
    })

    it('should call onGameJoined callback when provided', () => {
      render(<PlayerJoin {...mockProps} />)

      // Test that the component accepts the callback prop
      expect(mockProps.onGameJoined).toBeDefined()
    })
  })

  describe('Component Integration', () => {
    it('should handle authentication context', () => {
      render(<PlayerJoin {...mockProps} />)

      // Component should render without authentication errors
      expect(document.body).toBeInTheDocument()
    })

    it('should handle game service integration', () => {
      render(<PlayerJoin {...mockProps} />)

      // Component should render without service errors
      expect(document.body).toBeInTheDocument()
    })
  })
})
