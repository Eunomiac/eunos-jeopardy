import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClueSetSelector } from './ClueSetSelector'
import { AuthProvider } from '../../contexts/AuthContext'
import * as AuthContext from '../../contexts/AuthContext'
import * as clueSetUtils from '../../utils/clueSetUtils'
import type { Database } from '../../services/supabase/types'
import { mockUser, mockSession, mockClueSets } from '../../test/__mocks__/commonTestData'

// Type definitions for better mock typing
type ClueSetRow = Database['public']['Tables']['clue_sets']['Row']

// Mock the dependencies with proper typing
jest.mock('../../utils/clueSetUtils', () => ({
  getAvailableClueSets: jest.fn() as jest.MockedFunction<() => string[]>,
  filenameToDisplayName: jest.fn() as jest.MockedFunction<(filename: string) => string>
}))

// Mock clue set service with proper typing
jest.mock('../../services/clueSets/clueSetService', () => ({
  ClueSetService: {
    getUserClueSets: jest.fn() as jest.MockedFunction<() => Promise<ClueSetRow[]>>
  }
}))

import { ClueSetService } from '../../services/clueSets/clueSetService'

describe('ClueSetSelector', () => {
  const mockGetAvailableClueSets = clueSetUtils.getAvailableClueSets as jest.Mock
  const mockOnClueSetSelected = jest.fn()
  const mockGetUserClueSets = ClueSetService.getUserClueSets as jest.Mock

  // Using consolidated mock data from commonTestData

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
    // Note: filenameToDisplayName is now used directly (no mocking needed)
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
