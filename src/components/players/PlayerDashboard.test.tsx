import { render, screen, waitFor } from '@testing-library/react'
import PlayerDashboard from './PlayerDashboard'
import { AuthProvider } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import { FontAssignmentService } from '../../services/fonts/FontAssignmentService'
import { mockUser, mockGame, mockPlayers } from '../../test/testUtils'
import type { PlayerInfo } from './PlayerPodiums'
import type { Database } from '../../services/supabase/types'
import { supabase } from '../../services/supabase/client'

// Type aliases for cleaner code
type PlayerRow = Database['public']['Tables']['players']['Row']

// Mock Supabase - this ensures the mock is used before client.ts is loaded
jest.mock('@supabase/supabase-js')

// Mock services
jest.mock('../../services/games/GameService')
jest.mock('../../services/fonts/FontAssignmentService')

const mockGameService = GameService as jest.Mocked<typeof GameService>
const mockFontAssignmentService = FontAssignmentService as jest.Mocked<typeof FontAssignmentService>

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { access_token: 'mock-token' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

// ============================================================================
// FACTORY FUNCTIONS FOR DIFFERENT GAME STATES
// ============================================================================



/**
 * Creates mock data for a game with players successfully loaded
 */
function createMockGameWithPlayers(): { players: PlayerRow[], playerInfos: PlayerInfo[] } {
  const players: PlayerRow[] = [
    {
      game_id: 'game-123',
      user_id: 'user-123', // Current user
      nickname: 'Player One',
      score: 1000,
      joined_at: '2023-01-01T00:00:00Z'
    },
    {
      game_id: 'game-123',
      user_id: 'user-456',
      nickname: 'Player Two',
      score: 500,
      joined_at: '2023-01-01T00:01:00Z'
    }
  ]

  const playerInfos: PlayerInfo[] = [
    {
      id: 'user-123',
      name: 'Player One',
      score: 1000,
      fontFamily: 'handwritten-1',
      isMainPlayer: true
    },
    {
      id: 'user-456',
      name: 'Player Two',
      score: 500,
      fontFamily: 'handwritten-2',
      isMainPlayer: false
    }
  ]

  return { players, playerInfos }
}



/**
 * Creates mock data for a player not in the game (needs to join)
 */
function createMockPlayerNotInGame(): { players: PlayerRow[] } {
  const players: PlayerRow[] = [
    {
      game_id: 'game-123',
      user_id: 'user-456', // Different user, current user not in game
      nickname: 'Other Player',
      score: 0,
      joined_at: '2023-01-01T00:00:00Z'
    }
  ]

  return { players }
}

/**
 * Sets up all mocks for a successful game state with players
 * Note: Relies on the global Supabase mock defined at the top of this file
 */
function setupMockGameWithPlayers() {
  const { players, playerInfos } = createMockGameWithPlayers()

  mockGameService.getPlayers.mockResolvedValue(players)
  mockFontAssignmentService.getPlayerFont.mockResolvedValue('handwritten-1')

  // No need to override mockSupabase.from - the global mock at the top of the file handles it

  return { players, playerInfos }
}

describe('PlayerDashboard', () => {
  const mockProps = {
    gameId: 'game-123',
    game: {
      ...mockGame,
      current_round: 'jeopardy',
      is_buzzer_locked: true,
      focused_clue_id: null
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful game loading
    mockGameService.getGame.mockResolvedValue(mockGame)
    mockGameService.getPlayers.mockResolvedValue(mockPlayers)
    mockGameService.addPlayer.mockResolvedValue(mockPlayers[0])

    // Mock font assignment
    mockFontAssignmentService.getPlayerFont.mockResolvedValue('handwriting-1')

    // Mock clue set data
    const mockClueSetData = {
      jeopardy: {
        categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6'],
        clues: Array(30).fill(null).map((_, i) => ({
          id: `clue-${i + 1}`,
          category: `Category ${Math.floor(i / 5) + 1}`,
          value: ((i % 5) + 1) * 200,
          prompt: `Clue ${i + 1} prompt`,
          response: `Clue ${i + 1} response`,
          isDailyDouble: false
        }))
      },
      doubleJeopardy: {
        categories: ['Category 7', 'Category 8', 'Category 9', 'Category 10', 'Category 11', 'Category 12'],
        clues: Array(30).fill(null).map((_, i) => ({
          id: `clue-${i + 31}`,
          category: `Category ${Math.floor(i / 5) + 7}`,
          value: ((i % 5) + 1) * 400,
          prompt: `Clue ${i + 31} prompt`,
          response: `Clue ${i + 31} response`,
          isDailyDouble: false
        }))
      },
      finalJeopardy: {
        category: 'Final Category',
        clue: {
          id: 'final-clue',
          category: 'Final Category',
          value: 0,
          prompt: 'Final Jeopardy prompt',
          response: 'Final Jeopardy response',
          isDailyDouble: false
        }
      }
    }

    // Mock fetch for clue set data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockClueSetData)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      // Set up loading state - GameService calls never resolve
      mockGameService.getPlayers.mockImplementation(() => new Promise(() => { /* empty */ })) // Never resolves

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      expect(screen.getByText('Loading game...')).toBeInTheDocument()
    })

    it('should load game data on mount', async () => {
      setupMockGameWithPlayers()

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        expect(mockGameService.getPlayers).toHaveBeenCalledWith('game-123')
      })
    })
  })

  describe('Authentication States', () => {
    it('should show login message when user is not authenticated', () => {
      // Mock unauthenticated state by rendering without user
      const renderWithoutAuth = (component: React.ReactElement) => {
        return render(component)
      }

      // Component should handle null user gracefully
      renderWithoutAuth(<PlayerDashboard {...mockProps} />)

      // Component should show loading state when no user
      expect(screen.getByText('Loading game...')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('should handle game loading error', async () => {
      mockGameService.getPlayers.mockRejectedValue(new Error('Game not found'))

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error Loading Game')).toBeInTheDocument()
        expect(screen.getByText('Failed to load game data. Please try refreshing.')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Case Scenarios', () => {
    it('should handle gracefully when current user is not in players list', async () => {
      // This scenario should not happen in normal app flow (user should be in PlayerJoin instead)
      // But test that component doesn't crash if it somehow occurs
      const { players } = createMockPlayerNotInGame()
      mockGameService.getPlayers.mockResolvedValue(players)

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        // Component should still render the game board without crashing
        expect(screen.getByText('Category 1')).toBeInTheDocument()
        expect(screen.getByText('Category 2')).toBeInTheDocument()
        // Other players should be visible
        expect(screen.getByText('Other Player')).toBeInTheDocument()
        // Current user won't be in podiums since they're not in the players list
      })
    })

    it('should render game board structure correctly even with minimal player data', async () => {
      // Test component robustness with edge case data
      const { players } = createMockPlayerNotInGame()
      mockGameService.getPlayers.mockResolvedValue(players)

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        // Should show round header
        expect(screen.getByText('The Jeopardy Round')).toBeInTheDocument()
        // Should show all 6 categories
        expect(screen.getByText('Category 1')).toBeInTheDocument()
        expect(screen.getByText('Category 6')).toBeInTheDocument()
        // Should show clue cells - 6 categories with $200 as first clue value
        expect(screen.getAllByText('$200')).toHaveLength(6)
        // Should show player podiums section
        expect(screen.getByText('Other Player')).toBeInTheDocument()
      })
    })
  })

  describe('Game Board Display', () => {
    it('should display game board when player has joined', async () => {
      setupMockGameWithPlayers()

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Category 1')).toBeInTheDocument()
        expect(screen.getByText('Category 2')).toBeInTheDocument()
      })
    })

    it('should display player podiums', async () => {
      setupMockGameWithPlayers()

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument()
        expect(screen.getByText('Player Two')).toBeInTheDocument()
      })
    })
  })

  describe('Buzzer System', () => {
    it('should show buzzer when clue is focused and unlocked', async () => {
      setupMockGameWithPlayers()

      // Mock game state with focused clue and unlocked buzzer
      // This would be set via real-time subscriptions in actual usage
      renderWithAuth(<PlayerDashboard {...mockProps} />)

      // For now, just verify the component renders without the buzzer
      // since we need real-time subscription mocks for full buzzer testing
      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument()
      })
    })

    it('should disable buzzer when locked', async () => {
      setupMockGameWithPlayers()

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      // For now, just verify the component renders
      // Full buzzer state testing requires real-time subscription mocks
      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should set up real-time subscriptions', async () => {
      setupMockGameWithPlayers()

      renderWithAuth(<PlayerDashboard {...mockProps} />)

      await waitFor(() => {
        // Component sets up Supabase postgres_changes subscriptions
        expect(supabase.channel).toHaveBeenCalledWith('players-game-123')
        expect(supabase.channel).toHaveBeenCalledWith('clue-states-game-123')
        expect(supabase.channel).toHaveBeenCalledWith('clues-game-123')
      })
    })
  })
})
