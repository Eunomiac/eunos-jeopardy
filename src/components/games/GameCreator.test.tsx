import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GameCreator } from './GameCreator'
import { GameService } from '../../services/games/GameService'

// Mock GameService
jest.mock('../../services/games/GameService')
const mockGameService = GameService as jest.Mocked<typeof GameService>

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com'
    },
    session: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  })
}))

describe('GameCreator', () => {
  const mockOnGameCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render game creator with clue sets', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 'clue-set-2',
        name: 'Test Game 2',
        owner_id: 'user-123',
        created_at: '2025-01-02T00:00:00Z'
      }
    ]

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    expect(screen.getByText('Loading clue sets...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Select Clue Set:')).toBeInTheDocument()
    expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    expect(screen.getByText('Test Game 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Game' })).toBeDisabled()
  })

  it('should show message when no clue sets available', async () => {
    mockGameService.getAvailableClueSets.mockResolvedValue([])

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('No clue sets available.')).toBeInTheDocument()
    })

    expect(screen.getByText(/You need to load at least one clue set/)).toBeInTheDocument()
  })

  it('should enable create button when clue set is selected', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Select Clue Set:')
    const createButton = screen.getByRole('button', { name: 'Create Game' })

    expect(createButton).toBeDisabled()

    fireEvent.change(select, { target: { value: 'clue-set-1' } })

    expect(createButton).toBeEnabled()
  })

  it('should create game successfully', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    const mockGame = {
      id: 'game-123',
      host_id: 'user-123',
      question_set_id: 'clue-set-1',
      status: 'lobby' as const,
      current_round: 'jeopardy' as const,
      is_buzzer_locked: true,
      created_at: '2025-01-01T00:00:00Z'
    }

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)
    mockGameService.createGame.mockResolvedValue(mockGame)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Select Clue Set:')
    const createButton = screen.getByRole('button', { name: 'Create Game' })

    fireEvent.change(select, { target: { value: 'clue-set-1' } })
    fireEvent.click(createButton)

    expect(screen.getByText('Creating Game...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Game created successfully!/)).toBeInTheDocument()
    })

    expect(mockGameService.createGame).toHaveBeenCalledWith('user-123', 'clue-set-1')
    expect(mockOnGameCreated).toHaveBeenCalledWith('game-123')
  })

  it('should handle game creation error', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)
    mockGameService.createGame.mockRejectedValue(new Error('Database error'))

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Select Clue Set:')
    const createButton = screen.getByRole('button', { name: 'Create Game' })

    fireEvent.change(select, { target: { value: 'clue-set-1' } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to create game: Database error/)).toBeInTheDocument()
    })

    expect(mockOnGameCreated).not.toHaveBeenCalled()
  })

  it('should handle clue sets loading error', async () => {
    mockGameService.getAvailableClueSets.mockRejectedValue(new Error('Network error'))

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load clue sets: Network error/)).toBeInTheDocument()
    })
  })

  it('should prevent creation without clue set selection', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: 'Create Game' })
    fireEvent.click(createButton)

    expect(screen.getByText('Please select a clue set')).toBeInTheDocument()
    expect(mockGameService.createGame).not.toHaveBeenCalled()
  })

  it('should display clue set information', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    expect(screen.getByText('Available Clue Sets:')).toBeInTheDocument()
    expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
  })

  it('should reset form after successful creation', async () => {
    const mockClueSets = [
      {
        id: 'clue-set-1',
        name: 'Test Game 1',
        owner_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z'
      }
    ]

    const mockGame = {
      id: 'game-123',
      host_id: 'user-123',
      question_set_id: 'clue-set-1',
      status: 'lobby' as const,
      current_round: 'jeopardy' as const,
      is_buzzer_locked: true,
      created_at: '2025-01-01T00:00:00Z'
    }

    mockGameService.getAvailableClueSets.mockResolvedValue(mockClueSets)
    mockGameService.createGame.mockResolvedValue(mockGame)

    render(<GameCreator onGameCreated={mockOnGameCreated} />)

    await waitFor(() => {
      expect(screen.getByText('Create New Game')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Select Clue Set:') as HTMLSelectElement
    const createButton = screen.getByRole('button', { name: 'Create Game' })

    fireEvent.change(select, { target: { value: 'clue-set-1' } })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText(/Game created successfully!/)).toBeInTheDocument()
    })

    expect(select.value).toBe('')
    expect(createButton).toBeDisabled()
  })
})
