import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { User, Session } from '@supabase/supabase-js'
import { App } from './App'
import { AuthProvider } from '../contexts/AuthContext'
import * as AuthContext from '../contexts/AuthContext'
import { GameService } from '../services/games/GameService'
import { loadClueSetFromCSV, saveClueSetToDatabase } from '../services/clueSets/loader'

// Mock the services
jest.mock('../services/games/GameService')
jest.mock('../services/clueSets/loader')

const mockGameService = GameService as jest.Mocked<typeof GameService>
const mockLoadClueSetFromCSV = loadClueSetFromCSV as jest.MockedFunction<typeof loadClueSetFromCSV>
const mockSaveClueSetToDatabase = saveClueSetToDatabase as jest.MockedFunction<typeof saveClueSetToDatabase>

// Helper function to render App with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>{ui}</AuthProvider>
  )
}

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2023-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2023-01-01T00:00:00Z',
  last_sign_in_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
}

const mockClueSetData = {
  name: 'Test Game 1',
  filename: 'test-game-1.csv',
  rounds: {
    jeopardy: [
      {
        name: 'Science',
        clues: [
          { value: 200, prompt: 'What is H2O?', response: 'Water', position: 1 }
        ]
      }
    ],
    double: [
      {
        name: 'History',
        clues: [
          { value: 400, prompt: 'Who was first president?', response: 'Washington', position: 1 }
        ]
      }
    ],
    final: {
      name: 'Geography',
      clues: [
        { value: 0, prompt: 'Largest country?', response: 'Russia', position: 1 }
      ]
    }
  }
}

const mockGame = {
  id: 'game-123',
  host_id: 'user-123',
  clue_set_id: 'clue-set-123',
  status: 'in_progress' as const,
  current_round: 'jeopardy' as const,
  is_buzzer_locked: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadClueSetFromCSV.mockResolvedValue(mockClueSetData)
    mockSaveClueSetToDatabase.mockResolvedValue('clue-set-123')
    mockGameService.createGame.mockResolvedValue(mockGame)
    // Mock GameService methods used by GameHostDashboard
    mockGameService.getGame.mockResolvedValue(mockGame)
    mockGameService.getPlayers.mockResolvedValue([])
  })

  it('renders the project name', () => {
    renderWithAuth(<App />)

    expect(screen.getByText("Eunomiac's")).toBeInTheDocument()
    expect(screen.getByText("Jeopardy!")).toBeInTheDocument()
  })

  it('renders login form when user is not authenticated', async () => {
    renderWithAuth(<App />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('displays clue set selector when authenticated', () => {
    // Mock authenticated user
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    expect(screen.getByText('Clue Sets')).toBeInTheDocument()
    expect(screen.getByText('Host Game')).toBeInTheDocument()
  })



  it('renders footer with copyright', () => {
    renderWithAuth(<App />)

    expect(screen.getByText(/© 2025.*Built with React/)).toBeInTheDocument()
  })

  it('shows user email when authenticated', () => {
    // Mock authenticated user
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    expect(screen.getByText('Currently logged in as')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  describe('Game Creation Workflow', () => {
    beforeEach(() => {
      // Mock authenticated user for all game creation tests
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })
    })

    it('should handle successful game creation and switch to dashboard mode', async () => {
      renderWithAuth(<App />)

      // Select a clue set
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'test-game-1.csv' } })

      // Click Host Game button
      const hostButton = screen.getByText('Host Game')
      fireEvent.click(hostButton)

      // Wait for game creation to complete
      await waitFor(() => {
        expect(mockLoadClueSetFromCSV).toHaveBeenCalledWith('test-game-1.csv')
        expect(mockSaveClueSetToDatabase).toHaveBeenCalledWith(mockClueSetData, 'user-123')
        expect(mockGameService.createGame).toHaveBeenCalledWith('user-123', 'clue-set-123')
      })

      // Should switch to dashboard mode
      await waitFor(() => {
        expect(screen.getByText('Game Dashboard')).toBeInTheDocument()
      })

      // Wait for GameHostDashboard to load
      await waitFor(() => {
        expect(screen.getByText('GAME HOST DASHBOARD')).toBeInTheDocument()
      })
    })

    it('should handle game creation error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockLoadClueSetFromCSV.mockRejectedValue(new Error('Failed to load CSV'))

      renderWithAuth(<App />)

      // Select a clue set
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'test-game-1.csv' } })

      // Click Host Game button
      const hostButton = screen.getByText('Host Game')
      fireEvent.click(hostButton)

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create game:', expect.any(Error))
      })

      // Should remain in clue-sets mode
      expect(screen.getByText('Host Game')).toBeInTheDocument()
      expect(screen.queryByText('Game Dashboard')).not.toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should not create game when no clue set is selected', async () => {
      renderWithAuth(<App />)

      // Click Host Game button without selecting a clue set
      const hostButton = screen.getByText('Host Game')
      expect(hostButton).toBeDisabled()

      // Services should not be called
      expect(mockLoadClueSetFromCSV).not.toHaveBeenCalled()
      expect(mockSaveClueSetToDatabase).not.toHaveBeenCalled()
      expect(mockGameService.createGame).not.toHaveBeenCalled()
    })

    it('should not create game when user is not authenticated', async () => {
      // Override mock to return no user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      renderWithAuth(<App />)

      // Should show login form instead of game creation UI
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
      expect(screen.queryByText('Host Game')).not.toBeInTheDocument()
    })
  })

  describe('Navigation and State Management', () => {
    beforeEach(() => {
      // Mock authenticated user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })
    })

    it('should handle back to creator navigation from dashboard', async () => {
      renderWithAuth(<App />)

      // Select a clue set and create a game
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'test-game-1.csv' } })

      const hostButton = screen.getByText('Host Game')
      fireEvent.click(hostButton)

      // Wait for dashboard to appear
      await waitFor(() => {
        expect(screen.getByText('Game Dashboard')).toBeInTheDocument()
      })

      // Wait for GameHostDashboard to load and find back button
      await waitFor(() => {
        expect(screen.getByText('GAME HOST DASHBOARD')).toBeInTheDocument()
      })

      // Click back to creator
      const backButton = screen.getByText('Back to Creator')
      fireEvent.click(backButton)

      // Should return to clue set selection
      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
        expect(screen.queryByText('Game Dashboard')).not.toBeInTheDocument()
      })

      // Clue set should be cleared
      const dropdownAfterBack = screen.getByRole('combobox') as HTMLSelectElement
      expect(dropdownAfterBack.value).toBe('')
    })

    it('should clear state when user logs out', async () => {
      const { rerender } = renderWithAuth(<App />)

      // First render with authenticated user
      expect(screen.getByText('Host Game')).toBeInTheDocument()

      // Mock user logout
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Re-render with no user
      rerender(<AuthProvider><App /></AuthProvider>)

      // Should show login form and clear game state
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
        expect(screen.queryByText('Host Game')).not.toBeInTheDocument()
      })
    })
  })
})
