import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { User, Session } from '@supabase/supabase-js'
import { ClueSetSelector } from './ClueSetSelector'
import { AuthProvider } from '../../contexts/AuthContext'
import * as AuthContext from '../../contexts/AuthContext'
import * as clueSetUtils from '../../utils/clueSetUtils'

// Mock the dependencies
jest.mock('../../utils/clueSetUtils', () => ({
  getAvailableClueSets: jest.fn(),
  filenameToDisplayName: jest.fn()
}))

// Mock clue set service
jest.mock('../../services/clueSets/clueSetService', () => ({
  ClueSetService: {
    getUserClueSets: jest.fn()
  }
}))

import { ClueSetService } from '../../services/clueSets/clueSetService'

describe('ClueSetSelector', () => {
  const mockGetAvailableClueSets = clueSetUtils.getAvailableClueSets as jest.Mock
  const mockFilenameToDisplayName = clueSetUtils.filenameToDisplayName as jest.Mock
  const mockOnClueSetSelected = jest.fn()
  const mockGetUserClueSets = ClueSetService.getUserClueSets as jest.Mock

  // Create mock user and session like in App.test.tsx
  const mockUser: User = {
    id: '123',
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

  // Mock clue sets data
  const mockClueSets = [
    { id: 'clue-set-1', name: 'Test Game 1', created_at: '2023-01-01T00:00:00Z' },
    { id: 'clue-set-2', name: 'Test Game 2', created_at: '2023-01-01T00:00:00Z' }
  ]

  // Helper function to render with AuthProvider
  const renderWithAuth = (component: React.ReactElement) => {
    return render(<AuthProvider>{component}</AuthProvider>)
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user using spyOn like App.test.tsx
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    // Mock ClueSetService to return mock data
    mockGetUserClueSets.mockResolvedValue(mockClueSets)

    // Default mock implementations (these are for legacy file-based clue sets)
    mockGetAvailableClueSets.mockReturnValue(['test-game-1.csv', 'test-game-2.csv'])
    mockFilenameToDisplayName.mockImplementation((filename: string) =>
      filename.replace('.csv', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    )
  })

  const defaultProps = {
    selectedClueSetId: '',
    onClueSetSelected: mockOnClueSetSelected
  }

  it('should render clue set selector with title', async () => {
    renderWithAuth(<ClueSetSelector {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Clue Sets' })).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })
  })

  it('should render dropdown with available clue sets', async () => {
    renderWithAuth(<ClueSetSelector {...defaultProps} />)

    // Wait for loading to complete and dropdown to appear
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    // Check for default option
    expect(screen.getByText('Choose or Upload a Clue Set...')).toBeInTheDocument()

    // Check for available clue sets
    expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    expect(screen.getByText('Test Game 2')).toBeInTheDocument()
  })

  it('should call onClueSetSelected when selection changes', async () => {
    renderWithAuth(<ClueSetSelector {...defaultProps} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'clue-set-1' } })

    expect(mockOnClueSetSelected).toHaveBeenCalledWith('clue-set-1')
  })

  it('should display selected clue set', async () => {
    renderWithAuth(<ClueSetSelector {...defaultProps} selectedClueSetId="clue-set-1" />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('clue-set-1')
  })

  it('should handle empty clue sets list', async () => {
    mockGetUserClueSets.mockResolvedValue([])

    renderWithAuth(<ClueSetSelector {...defaultProps} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    // Should only have the default option
    expect(screen.getByText('Upload a CSV to get started!')).toBeInTheDocument()
    expect(select.children).toHaveLength(1)
  })

  it('should load clue sets from database', async () => {
    renderWithAuth(<ClueSetSelector {...defaultProps} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading your clue sets...')).not.toBeInTheDocument()
    })

    expect(mockGetUserClueSets).toHaveBeenCalledWith('123')
    expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    expect(screen.getByText('Test Game 2')).toBeInTheDocument()
  })
})
