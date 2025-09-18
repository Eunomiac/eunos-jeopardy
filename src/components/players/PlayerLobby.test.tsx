import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PlayerLobby } from './PlayerLobby'
import { AuthProvider } from '../../contexts/AuthContext'
import { GameService } from '../../services/games/GameService'
import { mockUser, mockSession } from '../../test/__mocks__/commonTestData'
import type { Player } from '../../services/games/GameService'

// Mock GameService
jest.mock('../../services/games/GameService')
const mockGameService = GameService as jest.Mocked<typeof GameService>

// Mock Supabase client
jest.mock('../../services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: jest.fn()
      })
    }))
  }
}))

// Mock AuthContext
const mockAuthContext = {
  user: mockUser as typeof mockUser | null,
  session: mockSession,
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn()
}

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('PlayerLobby', () => {
  const mockProps = {
    gameId: 'game-123',
    onLeaveGame: jest.fn()
  }

  const mockPlayers: Player[] = [
    {
      game_id: 'game-123',
      user_id: 'user-123', // Current user
      nickname: 'Player One',
      score: 0,
      joined_at: '2023-01-01T00:00:00Z'
    },
    {
      game_id: 'game-123',
      user_id: 'user-456',
      nickname: 'Player Two',
      score: 0,
      joined_at: '2023-01-01T00:01:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockGameService.getPlayers.mockResolvedValue(mockPlayers)
  })

  const renderWithAuth = (component: React.ReactElement) => {
    return render(
      <AuthProvider>
        {component}
      </AuthProvider>
    )
  }

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      // Delay the mock to keep loading state visible
      mockGameService.getPlayers.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockPlayers), 100))
      )

      renderWithAuth(<PlayerLobby {...mockProps} />)

      expect(screen.getByText('Loading game...')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we connect you to the game.')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading game...')).not.toBeInTheDocument()
      })
    })

    it('should load game data on mount', async () => {
      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(mockGameService.getPlayers).toHaveBeenCalledWith('game-123')
      })

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      expect(screen.getByText('Game Code:')).toBeInTheDocument()
      expect(screen.getByText('game-123')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('should handle game loading error', async () => {
      const errorMessage = 'Failed to load players'
      mockGameService.getPlayers.mockRejectedValue(new Error(errorMessage))

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to load game information')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back to Join')
      expect(backButton).toBeInTheDocument()
    })

    it('should call onLeaveGame when back button clicked in error state', async () => {
      mockGameService.getPlayers.mockRejectedValue(new Error('Network error'))

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back to Join')
      fireEvent.click(backButton)

      expect(mockProps.onLeaveGame).toHaveBeenCalled()
    })
  })

  describe('Player List Display', () => {
    it('should display players with nicknames', async () => {
      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      // Use getAllByText since "Player One" appears in both header and player list
      const playerOneElements = screen.getAllByText('Player One')
      expect(playerOneElements).toHaveLength(2) // Header and player list
      expect(screen.getByText('Player Two')).toBeInTheDocument()
      expect(screen.getByText('Players in Game (2)')).toBeInTheDocument()
    })

    it('should highlight current player', async () => {
      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      // Current player should have "You" indicator
      expect(screen.getByText('(You)')).toBeInTheDocument()
      expect(screen.getByText('Playing as:')).toBeInTheDocument()
      expect(screen.getAllByText('Player One')).toHaveLength(2) // Header and player list
    })

    it('should show empty state when no players', async () => {
      mockGameService.getPlayers.mockResolvedValue([])

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('No players have joined yet.')).toBeInTheDocument()
      })

      expect(screen.getByText('Players in Game (0)')).toBeInTheDocument()
    })

    it('should show default player names when nickname is missing', async () => {
      const playersWithoutNicknames: Player[] = [
        {
          game_id: 'game-123',
          user_id: 'user-123',
          nickname: null,
          score: 0,
          joined_at: '2023-01-01T00:00:00Z'
        },
        {
          game_id: 'game-123',
          user_id: 'user-456',
          nickname: null,
          score: 0,
          joined_at: '2023-01-01T00:01:00Z'
        }
      ]
      mockGameService.getPlayers.mockResolvedValue(playersWithoutNicknames)

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument()
        expect(screen.getByText('Player 2')).toBeInTheDocument()
      })
    })
  })

  describe('Game Information', () => {
    it('should display game code and lobby status', async () => {
      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      expect(screen.getByText('Game Code:')).toBeInTheDocument()
      expect(screen.getByText('game-123')).toBeInTheDocument()
      expect(screen.getByText('Waiting for Host')).toBeInTheDocument()
      expect(screen.getByText('The game host will start the game when ready. Please wait...')).toBeInTheDocument()
    })

    it('should show current player info when available', async () => {
      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      expect(screen.getByText('Playing as:')).toBeInTheDocument()
      expect(screen.getAllByText('Player One')).toHaveLength(2) // Header and player list
    })

    it('should not show player info when current user not in game', async () => {
      const otherPlayers: Player[] = [
        {
          game_id: 'game-123',
          user_id: 'user-456',
          nickname: 'Other Player',
          score: 0,
          joined_at: '2023-01-01T00:00:00Z'
        }
      ]
      mockGameService.getPlayers.mockResolvedValue(otherPlayers)

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Other Player')).toBeInTheDocument()
      })

      expect(screen.queryByText('Playing as:')).not.toBeInTheDocument()
    })
  })

  describe('Leave Game Functionality', () => {
    it('should handle successful leave game', async () => {
      mockGameService.removePlayer.mockResolvedValue()

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Leave Game')).toBeInTheDocument()
      })

      const leaveButton = screen.getByText('Leave Game')
      fireEvent.click(leaveButton)

      await waitFor(() => {
        expect(mockGameService.removePlayer).toHaveBeenCalledWith('game-123', 'user-123')
        expect(mockProps.onLeaveGame).toHaveBeenCalled()
      })
    })

    it('should handle leave game error', async () => {
      const errorMessage = 'Failed to remove player'
      mockGameService.removePlayer.mockRejectedValue(new Error(errorMessage))

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Leave Game')).toBeInTheDocument()
      })

      const leaveButton = screen.getByText('Leave Game')
      fireEvent.click(leaveButton)

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      // Should not call onLeaveGame on error
      expect(mockProps.onLeaveGame).not.toHaveBeenCalled()
    })

    it('should not attempt leave game when user is not authenticated', async () => {
      // Mock no user
      mockAuthContext.user = null

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Leave Game')).toBeInTheDocument()
      })

      const leaveButton = screen.getByText('Leave Game')
      fireEvent.click(leaveButton)

      // Should not call removePlayer when no user
      expect(mockGameService.removePlayer).not.toHaveBeenCalled()
      expect(mockProps.onLeaveGame).not.toHaveBeenCalled()

      // Reset for other tests
      mockAuthContext.user = mockUser
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should set up real-time subscriptions for player changes', async () => {
      const { supabase } = await import('../../services/supabase/client')

      renderWithAuth(<PlayerLobby {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Game Lobby')).toBeInTheDocument()
      })

      expect(supabase.channel).toHaveBeenCalledWith('player-lobby:game-123')
    })
  })
})
