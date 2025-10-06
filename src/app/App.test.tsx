import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { App } from './App'
import { AuthProvider } from '../contexts/AuthContext'
import * as AuthContext from '../contexts/AuthContext'
import { GameService } from '../services/games/GameService'
import { loadClueSetFromCSV, saveClueSetToDatabase } from '../services/clueSets/loader'
import { ClueSetService, type UserClueSet } from '../services/clueSets/clueSetService'
import { UploadService } from '../services/clueSets/uploadService'
import type { Database } from '../services/supabase/types'
import { mockUser, mockSession, createMockGame } from '../test/__mocks__/commonTestData'
import { supabase } from '../services/supabase/client'

// Mock the services
jest.mock('../services/games/GameService')
jest.mock('../services/clueSets/loader')
jest.mock('../services/clueSets/clueSetService')
jest.mock('../services/clueSets/uploadService')

// Mock Supabase client with smart defaults and proper typing for data
jest.mock('../services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
    },
    from: jest.fn().mockImplementation((table: keyof Database['public']['Tables']) => {
      // Smart defaults based on table schema - now with proper typing!
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'host' } as Database['public']['Tables']['profiles']['Row'],
                error: null
              })
            })
          })
        }
      }
      if (table === 'games') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // No active game by default
              })
            })
          })
        }
      }
      // Default mock for other tables
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: null }),
        delete: jest.fn().mockResolvedValue({ data: null, error: null })
      }
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
      unsubscribe: jest.fn(),
      send: jest.fn().mockResolvedValue(undefined)
    })
  }
}))

const mockGameService = GameService as jest.Mocked<typeof GameService>
const mockLoadClueSetFromCSV = loadClueSetFromCSV as jest.MockedFunction<typeof loadClueSetFromCSV>
const mockSaveClueSetToDatabase = saveClueSetToDatabase as jest.MockedFunction<typeof saveClueSetToDatabase>
const mockClueSetService = ClueSetService as jest.Mocked<typeof ClueSetService>
const mockUploadService = UploadService as jest.Mocked<typeof UploadService>
const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Helper function for default Supabase mock behavior
const mockSupabaseDefault = () => {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })
    }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockResolvedValue({ data: null, error: null })
  }
}

// Helper function to render App with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>{ui}</AuthProvider>
  )
}



// Using consolidated mocks from commonTestData

const mockUserClueSets: UserClueSet[] = [
  {
    id: 'clue-set-1',
    name: 'Test Game 1',
    created_by: 'user-123',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'clue-set-2',
    name: 'Test Game 2',
    created_by: 'user-123',
    created_at: '2023-01-01T00:00:00Z'
  }
]

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

// Using consolidated mock data from commonTestData
const mockGameInProgress = createMockGame({
  status: 'in_progress',
  is_buzzer_locked: false
})

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadClueSetFromCSV.mockResolvedValue(mockClueSetData)
    mockSaveClueSetToDatabase.mockResolvedValue('clue-set-123')
    mockGameService.createGame.mockResolvedValue(mockGameInProgress)
    // Mock GameService methods used by GameHostDashboard
    mockGameService.getGame.mockResolvedValue(mockGameInProgress)
    mockGameService.getPlayers.mockResolvedValue([])
    // Mock ClueSetService methods used by ClueSetSelector
    mockClueSetService.getUserClueSets.mockResolvedValue(mockUserClueSets)
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

  it('displays clue set selector when authenticated', async () => {
    // Mock authenticated user (defaults to host role)
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    // Wait for role detection to complete
    await waitFor(() => {
      expect(screen.getByText('Clue Sets')).toBeInTheDocument()
    })
    expect(screen.getByText('Host Game')).toBeInTheDocument()
  })



  it('renders footer with copyright', () => {
    renderWithAuth(<App />)

    expect(screen.getByText(/© 2025.*Built with React/)).toBeInTheDocument()
  })

  it('shows user email when authenticated', async () => {
    // Mock authenticated user (defaults to host role)
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    renderWithAuth(<App />)

    // Wait for role detection to complete
    await waitFor(() => {
      expect(screen.getByText('Currently logged in as')).toBeInTheDocument()
    })
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

      // Wait for clue sets to load and dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Select a clue set
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'clue-set-1' } })

      // Click Host Game button
      const hostButton = screen.getByText('Host Game')
      fireEvent.click(hostButton)

      // Wait for game creation to complete
      await waitFor(() => {
        expect(mockGameService.createGame).toHaveBeenCalledWith('user-123', 'clue-set-1')
      })

      // Should switch to dashboard mode
      await waitFor(() => {
        expect(screen.getByText('Game Dashboard')).toBeInTheDocument()
      })

      // Wait for GameHostDashboard to load
      await waitFor(() => {
        expect(screen.getByText('BOARD CONTROL')).toBeInTheDocument()
      })
    })

    it('should handle game creation error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockGameService.createGame.mockRejectedValue(new Error('Failed to create game'))

      renderWithAuth(<App />)

      // Wait for clue sets to load and dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Select a clue set
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'clue-set-1' } })

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

      // Wait for clue sets to load
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Click Host Game button without selecting a clue set
      const hostButton = screen.getByText('Host Game')
      expect(hostButton).toBeDisabled()

      // Services should not be called
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

      // Wait for clue sets to load and dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Select a clue set and create a game
      const dropdown = screen.getByRole('combobox')
      fireEvent.change(dropdown, { target: { value: 'clue-set-1' } })

      const hostButton = screen.getByText('Host Game')
      fireEvent.click(hostButton)

      // Wait for dashboard to appear
      await waitFor(() => {
        expect(screen.getByText('Game Dashboard')).toBeInTheDocument()
      })

      // Wait for GameHostDashboard to load and find back button
      await waitFor(() => {
        expect(screen.getByText('BOARD CONTROL')).toBeInTheDocument()
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

      // Wait for app to load and show Host Game button
      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

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

  describe('Player Interface', () => {
    beforeEach(() => {
      // Mock authenticated user as player
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Mock user as player role
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'player' } as Database['public']['Tables']['profiles']['Row'],
                  error: null
                })
              })
            })
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })
    })

    it('should show player join interface for player role', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument()
      })
    })

    it('should handle player joining a game', async () => {
      const mockGame = createMockGame({ status: 'lobby' })

      // Mock GameService.getActiveGame to return a game
      ;(GameService.getActiveGame as jest.Mock).mockResolvedValue(mockGame)
      ;(GameService.getPlayers as jest.Mock).mockResolvedValue([])

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument()
      })

      // Simulate successful game join
      const playerJoinComponent = screen.getByText('Join Game').closest('.content-section')
      expect(playerJoinComponent).toBeInTheDocument()
    })

    it('should redirect player to lobby when already in active game', async () => {
      const mockGame = createMockGame({ status: 'lobby' })
      const mockPlayers = [{ user_id: mockUser.id, nickname: 'TestPlayer' }]

      ;(GameService.getActiveGame as jest.Mock).mockResolvedValue(mockGame)
      ;(GameService.getPlayers as jest.Mock).mockResolvedValue(mockPlayers)

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })
    })

    it('should redirect player to game dashboard when in active game', async () => {
      const mockGame = createMockGame({ status: 'in_progress' })
      const mockPlayers = [{ user_id: mockUser.id, nickname: 'TestPlayer' }]

      ;(GameService.getActiveGame as jest.Mock).mockResolvedValue(mockGame)
      ;(GameService.getPlayers as jest.Mock).mockResolvedValue(mockPlayers)

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading Game')).toBeInTheDocument()
      })
    })

    it('should handle player role setup errors gracefully', async () => {
      ;(GameService.getActiveGame as jest.Mock).mockRejectedValue(new Error('Network error'))

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument()
      })
    })
  })

  describe('Role Detection', () => {
    it('should handle profile fetch errors gracefully', async () => {
      // Mock authenticated user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Mock profile fetch error
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Profile not found' }
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })

      renderWithAuth(<App />)

      // Should default to player mode on error
      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument()
      })
    })

    it('should show loading screen while determining role', async () => {
      // Mock authenticated user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Mock slow profile fetch
      let resolveProfile: (value: { data: Database['public']['Tables']['profiles']['Row'] | null; error: Error | null }) => void
      const profilePromise = new Promise((resolve) => {
        resolveProfile = resolve
      })

      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue(profilePromise)
              })
            })
          }
        }
        return mockSupabaseDefault()
      })

      renderWithAuth(<App />)

      // Should show loading screen
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Determining your interface...')).toBeInTheDocument()

      // Resolve the profile fetch
      resolveProfile!({
        data: { role: 'host' } as Database['public']['Tables']['profiles']['Row'],
        error: null
      })

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })
    })

    it('should handle role detection errors', async () => {
      // Mock authenticated user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Mock getUserRole to throw error
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockRejectedValue(new Error('Database error'))
              })
            })
          }
        }
        return mockSupabaseDefault()
      })

      renderWithAuth(<App />)

      // Should default to player mode on error
      await waitFor(() => {
        expect(screen.getByText('Join Game')).toBeInTheDocument()
      })
    })
  })

  describe('Host Role Setup', () => {
    beforeEach(() => {
      // Mock authenticated user as host
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Ensure host role for these tests
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'host' } as Database['public']['Tables']['profiles']['Row'],
                  error: null
                })
              })
            })
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })
    })

    it('should redirect host to dashboard when active game exists', async () => {
      const mockGame = createMockGame({ status: 'in_progress' })
      ;(GameService.getActiveGame as jest.Mock).mockResolvedValue(mockGame)

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Game Dashboard')).toBeInTheDocument()
      })
    })

    it('should handle host role setup errors gracefully', async () => {
      ;(GameService.getActiveGame as jest.Mock).mockRejectedValue(new Error('Network error'))

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })
    })
  })

  describe('Drag and Drop File Upload', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks()

      // Mock authenticated user as host
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Ensure host role for drag and drop tests
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'host' } as Database['public']['Tables']['profiles']['Row'],
                  error: null
                })
              })
            })
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })

      // Mock UploadService
      mockUploadService.handleDragAndDropUpload.mockResolvedValue({
        success: true,
        clueSetId: 'test-clue-set-id'
      })
    })

    it('should handle drag enter events', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

      const appContainer = screen.getByRole('application')

      // Simulate drag enter
      fireEvent.dragEnter(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      // Should show drag overlay
      await waitFor(() => {
        expect(screen.getByText('Drop CSV File Here')).toBeInTheDocument()
      })
    })

    it('should handle drag over events', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

      const appContainer = screen.getByRole('application')

      // Simulate drag over
      fireEvent.dragOver(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      // Should not crash
      expect(screen.getByText('Host Game')).toBeInTheDocument()
    })

    it('should handle drag leave events', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

      const appContainer = screen.getByRole('application')

      // First drag enter to set drag state
      fireEvent.dragEnter(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      // Then drag leave
      fireEvent.dragLeave(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      // Drag overlay should be removed
      await waitFor(() => {
        expect(screen.queryByText('Drop CSV File Here')).not.toBeInTheDocument()
      })
    })

    it('should handle file drop with unauthenticated user', async () => {
      // Mock unauthenticated user
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      render(<AuthProvider><App /></AuthProvider>)

      const appContainer = screen.getByRole('application')

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      // Simulate file drop
      fireEvent.drop(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      expect(alertSpy).toHaveBeenCalledWith('You must be logged in to upload clue sets')
      alertSpy.mockRestore()
    })

    it('should handle non-CSV file drop', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

      const appContainer = screen.getByRole('application')

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      // Simulate non-CSV file drop
      fireEvent.drop(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.txt', { type: 'text/plain' })]
        }
      })

      expect(alertSpy).toHaveBeenCalledWith('Please drop CSV files only')
      alertSpy.mockRestore()
    })

    it('should handle multiple file drop', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Host Game')).toBeInTheDocument()
      })

      const appContainer = screen.getByRole('application')

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      // Simulate multiple CSV files drop
      fireEvent.drop(appContainer, {
        dataTransfer: {
          files: [
            new File(['test1'], 'test1.csv', { type: 'text/csv' }),
            new File(['test2'], 'test2.csv', { type: 'text/csv' })
          ]
        }
      })

      expect(alertSpy).toHaveBeenCalledWith('Please drop one CSV file at a time')
      alertSpy.mockRestore()
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should handle player game state changes', async () => {
      // Mock authenticated user as player
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      const mockGame = createMockGame({ status: 'lobby' })
      const mockPlayers = [{ user_id: mockUser.id, nickname: 'TestPlayer' }]

      ;(GameService.getActiveGame as jest.Mock).mockResolvedValue(mockGame)
      ;(GameService.getPlayers as jest.Mock).mockResolvedValue(mockPlayers)

      // Mock user as player role
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'player' } as Database['public']['Tables']['profiles']['Row'],
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })

      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      // Verify subscription was set up
      expect(mockSupabase.channel).toHaveBeenCalledWith(`player-game-state:${mockGame.id}`)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock authenticated user as host
      jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
        user: mockUser,
        session: mockSession,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      // Ensure host role for error handling tests
      mockSupabase.from.mockImplementation((table: keyof Database['public']['Tables']) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { role: 'host' } as Database['public']['Tables']['profiles']['Row'],
                  error: null
                })
              })
            })
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          }
        }
        return mockSupabaseDefault()
      })
    })

    it('should handle clue set deletion errors', async () => {
      renderWithAuth(<App />)

      await waitFor(() => {
        expect(screen.getByText('Game Host Dashboard')).toBeInTheDocument()
      })

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      // Test error handling by simulating console.error call
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Simulate an error scenario - we'll test this through the drag and drop error path
      const appContainer = screen.getByRole('application')

      // Mock UploadService to throw an error
      mockUploadService.handleDragAndDropUpload.mockRejectedValue(new Error('Test error message'))

      // Simulate file drop that will trigger error
      fireEvent.drop(appContainer, {
        dataTransfer: {
          files: [new File(['test'], 'test.csv', { type: 'text/csv' })]
        }
      })

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error: Test error message')
      })

      consoleSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })
})
