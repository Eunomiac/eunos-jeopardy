import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlayerJoin } from './PlayerJoin'
import { GameService } from '../../services/games/GameService'
import { supabase } from '../../services/supabase/client'
import { useAuth } from '../../contexts/AuthContext'
import { mockUser } from '../../test/__mocks__/commonTestData'

// Mock services
jest.mock('../../services/games/GameService')
jest.mock('../../services/supabase/client')
jest.mock('../../contexts/AuthContext')

const mockGameService = GameService as jest.Mocked<typeof GameService>
const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock Supabase channel
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn()
} as unknown as ReturnType<typeof import('../../services/supabase/client').supabase.channel>

// Mock Supabase query builder
const createMockQueryBuilder = (data: unknown = null, error: unknown = null) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data, error }), // This should resolve the promise
  single: jest.fn().mockResolvedValue({ data, error }),
  update: jest.fn().mockReturnThis()
})

describe('PlayerJoin', () => {
  const mockProps = {
    onGameJoined: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default auth state
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    // Default Supabase mocks
    mockSupabase.channel.mockReturnValue(mockChannel)

    // Default mock: no profile, no games
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createMockQueryBuilder(null, null) // No profile data
      }
      if (table === 'games') {
        return createMockQueryBuilder([], null) // No games available
      }
      return createMockQueryBuilder()
    })
  })

  describe('Basic Rendering', () => {
    it('should render player join component', async () => {
      render(<PlayerJoin {...mockProps} />)

      expect(screen.getByText('Join Game')).toBeInTheDocument()
      expect(screen.getByLabelText('Nickname')).toBeInTheDocument()
      expect(screen.getByText('How It Works')).toBeInTheDocument()
    })

    it('should show correct initial state when checking for games', async () => {
      render(<PlayerJoin {...mockProps} />)

      expect(screen.getByText('Checking for Games...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Checking for Games...' })).toBeDisabled()
    })

    it('should have correct form elements', async () => {
      render(<PlayerJoin {...mockProps} />)

      const nicknameInput = screen.getByLabelText('Nickname')
      expect(nicknameInput).toHaveAttribute('type', 'text')
      expect(nicknameInput).toHaveAttribute('maxLength', '50')
      expect(nicknameInput).toHaveAttribute('placeholder', 'Your display name for this game...')
    })
  })

  describe('Authentication States', () => {
    it('should handle no user logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Waiting for Game')).toBeInTheDocument()
      })
    })

    it('should load user nickname from profile', async () => {
      const mockProfile = { display_name: 'TestUser' }
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(mockProfile, null)
        }
        if (table === 'games') {
          return createMockQueryBuilder([], null) // No games available
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument()
      })
    })

    it('should fallback to email prefix when no profile display name', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null)
        }
        if (table === 'games') {
          return createMockQueryBuilder([], null) // No games available
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('test')).toBeInTheDocument()
      })
    })

    it('should handle profile loading error gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, { message: 'Profile error' })
        }
        if (table === 'games') {
          return createMockQueryBuilder([], null) // No games available
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('test')).toBeInTheDocument()
      })
    })
  })

  describe('Game Availability', () => {
    it('should show available game state', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('A game is available! Enter your nickname and join.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })
    })

    it('should show waiting state when no games available', async () => {
      // Default mock already set up for no games
      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Waiting for a host to create a game...')).toBeInTheDocument()
        expect(screen.getByText('Waiting for Game')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Waiting for Game' })).toBeDisabled()
      })
    })

    it('should handle game check error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(null, { message: 'Database error' }) // Error checking games
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to check for available games')).toBeInTheDocument()
      })
    })
  })

  describe('Form Handling', () => {
    it('should update nickname input', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).toBeInTheDocument()
      })

      const nicknameInput = screen.getByLabelText('Nickname')
      fireEvent.change(nicknameInput, { target: { value: 'NewNickname' } })

      expect(nicknameInput).toHaveValue('NewNickname')
    })

    it('should disable form during loading states', async () => {
      render(<PlayerJoin {...mockProps} />)

      const nicknameInput = screen.getByLabelText('Nickname')
      expect(nicknameInput).toBeDisabled() // Disabled during initial checking
    })

    it('should handle form submission', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockResolvedValue({
        game_id: 'game-123',
        user_id: mockUser.id,
        nickname: 'testuser',
        score: 0,
        joined_at: new Date().toISOString()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const form = screen.getByTestId('join-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockGameService.addPlayer).toHaveBeenCalledWith('game-123', mockUser.id, 'test')
        expect(mockProps.onGameJoined).toHaveBeenCalledWith('game-123')
      })
    })

    it('should use custom nickname when provided', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockResolvedValue({
        game_id: 'game-123',
        user_id: mockUser.id,
        nickname: 'CustomName',
        score: 0,
        joined_at: new Date().toISOString()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const nicknameInput = screen.getByLabelText('Nickname')
      fireEvent.change(nicknameInput, { target: { value: 'CustomName' } })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockGameService.addPlayer).toHaveBeenCalledWith('game-123', mockUser.id, 'CustomName')
      })
    })

    it('should trim whitespace from nickname', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockResolvedValue({
        game_id: 'game-123',
        user_id: mockUser.id,
        nickname: 'SpacedName',
        score: 0,
        joined_at: new Date().toISOString()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const nicknameInput = screen.getByLabelText('Nickname')
      fireEvent.change(nicknameInput, { target: { value: '  SpacedName  ' } })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockGameService.addPlayer).toHaveBeenCalledWith('game-123', mockUser.id, 'SpacedName')
      })
    })
  })

  describe('Join Game Process', () => {
    it('should show loading state during join process', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockGames, null))
      mockGameService.addPlayer.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText('Joining...')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Joining...' })).toBeDisabled()
      })
    })

    it('should update user profile with nickname', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      const mockUpdateBuilder = {
        ...createMockQueryBuilder(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return mockUpdateBuilder
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockResolvedValue({
        game_id: 'game-123',
        user_id: mockUser.id,
        nickname: 'test',
        score: 0,
        joined_at: new Date().toISOString()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ display_name: 'test' })
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('id', mockUser.id)
      })
    })

    it('should handle profile update error gracefully', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      const mockUpdateBuilder = {
        ...createMockQueryBuilder(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Profile update failed' } })
      }
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return mockUpdateBuilder
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockResolvedValue({
        game_id: 'game-123',
        user_id: mockUser.id,
        nickname: 'test',
        score: 0,
        joined_at: new Date().toISOString()
      })

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      // Should still proceed with joining game despite profile update error
      await waitFor(() => {
        expect(mockGameService.addPlayer).toHaveBeenCalled()
        expect(mockProps.onGameJoined).toHaveBeenCalledWith('game-123')
      })
    })

    it('should handle join game errors', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockRejectedValue(new Error('Failed to join'))

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to join')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle non-Error exceptions during join', async () => {
      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createMockQueryBuilder(null, null) // No profile data
        }
        if (table === 'games') {
          return createMockQueryBuilder(mockGames, null) // Games available
        }
        return createMockQueryBuilder()
      })
      mockGameService.addPlayer.mockRejectedValue('String error')

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Game' })).not.toBeDisabled()
      })

      const joinButton = screen.getByRole('button', { name: 'Join Game' })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to join game')).toBeInTheDocument()
      })
    })

    it('should prevent join when no user authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      const mockGames = [{ id: 'game-123', host_id: 'host-456' }]
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockGames, null))

      render(<PlayerJoin {...mockProps} />)

      // Manually trigger join (since button would be disabled)
      const component = screen.getByText('Join Game').closest('.player-join')
      const form = component?.querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.getByText('You must be logged in to join a game')).toBeInTheDocument()
      })
    })

    it('should prevent join when no game available', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([], null))

      render(<PlayerJoin {...mockProps} />)

      // Manually trigger join (since button would be disabled)
      const component = screen.getByText('Join Game').closest('.player-join')
      const form = component?.querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(screen.getByText('No game available to join')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should set up real-time subscription for game changes', async () => {
      render(<PlayerJoin {...mockProps} />)

      expect(mockSupabase.channel).toHaveBeenCalledWith(`lobby-games-${mockUser.id}`)
      expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, expect.any(Function))
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should unsubscribe on component unmount', async () => {
      const { unmount } = render(<PlayerJoin {...mockProps} />)

      unmount()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })

    it('should handle subscription errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<PlayerJoin {...mockProps} />)

      // Simulate subscription callback with error
      const subscribeCallback = (mockChannel.subscribe as jest.Mock).mock.calls[0][0]
      subscribeCallback('CHANNEL_ERROR', { message: 'Subscription failed' })

      expect(consoleSpy).toHaveBeenCalledWith('📡 Subscription error:', { message: 'Subscription failed' })

      consoleSpy.mockRestore()
    })

    it('should log successful subscription', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(<PlayerJoin {...mockProps} />)

      // Simulate successful subscription
      const subscribeCallback = (mockChannel.subscribe as jest.Mock).mock.calls[0][0]
      subscribeCallback('SUBSCRIBED', null)

      expect(consoleSpy).toHaveBeenCalledWith('✅ Real-time subscription active')

      consoleSpy.mockRestore()
    })
  })

  describe('Utility Functions', () => {
    it('should extract username from email correctly', async () => {
      const testUser = { ...mockUser, email: 'john.doe@example.com' }
      mockUseAuth.mockReturnValue({
        user: testUser,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(null, null))

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('john.doe')).toBeInTheDocument()
      })
    })

    it('should handle empty email gracefully', async () => {
      const testUser = { ...mockUser, email: '' }
      mockUseAuth.mockReturnValue({
        user: testUser,
        session: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn()
      })

      mockSupabase.from.mockReturnValue(createMockQueryBuilder(null, null))

      render(<PlayerJoin {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Player')).toBeInTheDocument()
      })
    })
  })
})
