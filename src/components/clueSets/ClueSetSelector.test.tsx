import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClueSetSelector } from './ClueSetSelector'

// Mock the dependencies
jest.mock('../../services/clueSets/loader', () => ({
  loadClueSetFromCSV: jest.fn(),
  saveClueSetToDatabase: jest.fn()
}))

jest.mock('../../utils/questionSetUtils', () => ({
  getAvailableQuestionSets: jest.fn(),
  filenameToDisplayName: jest.fn()
}))

// Mock the auth context
const mockUser = { id: 'user-123', email: 'test@example.com' }

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { user: mockUser },
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  })
}))

describe('ClueSetSelector', () => {
  // Get the mocked functions
  const mockLoadClueSetFromCSV = require('../../services/clueSets/loader').loadClueSetFromCSV as jest.Mock
  const mockSaveClueSetToDatabase = require('../../services/clueSets/loader').saveClueSetToDatabase as jest.Mock
  const mockGetAvailableQuestionSets = require('../../utils/questionSetUtils').getAvailableQuestionSets as jest.Mock
  const mockFilenameToDisplayName = require('../../utils/questionSetUtils').filenameToDisplayName as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetAvailableQuestionSets.mockReturnValue(['test-game-1.csv', 'world-capitals.csv'])
    mockFilenameToDisplayName.mockImplementation((filename: string) =>
      filename.replace('.csv', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    )
  })

  it('should render clue set selector with available files', () => {
    render(<ClueSetSelector />)

    expect(screen.getByRole('heading', { name: 'Load Question Set' })).toBeInTheDocument()
    expect(screen.getByLabelText('Select Question Set:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load Question Set' })).toBeInTheDocument()
    expect(screen.getByText('Choose a clue set...')).toBeInTheDocument()
  })

  it('should populate dropdown with available question sets', () => {
    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    // Check that options are rendered
    expect(screen.getByText('Choose a clue set...')).toBeInTheDocument()
    
    // The actual option text will be the display names
    expect(mockGetAvailableQuestionSets).toHaveBeenCalled()
    expect(mockFilenameToDisplayName).toHaveBeenCalledWith('test-game-1.csv')
    expect(mockFilenameToDisplayName).toHaveBeenCalledWith('world-capitals.csv')
  })

  it('should handle file selection', () => {
    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })

    expect(select.value).toBe('test-game-1.csv')
  })

  it('should disable load button when no file is selected', () => {
    render(<ClueSetSelector />)

    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })
    expect(loadButton).toBeDisabled()
  })

  it('should enable load button when file is selected', () => {
    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })

    expect(loadButton).not.toBeDisabled()
  })

  it('should disable load button when no file is selected', () => {
    render(<ClueSetSelector />)

    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })
    expect(loadButton).toBeDisabled()
  })

  it('should show message when user is not logged in', () => {
    // Mock useAuth to return no user
    const mockUseAuth = jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn()
    })

    render(<ClueSetSelector />)

    expect(screen.getByText('Please log in to load clue sets.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load Question Set' })).not.toBeInTheDocument()

    mockUseAuth.mockRestore()
  })

  it('should handle successful clue set loading', async () => {
    const mockClueSetData = {
      name: 'Test Game 1',
      filename: 'test-game-1.csv',
      rounds: {
        jeopardy: [],
        double: [],
        final: { name: 'Final', clues: [] }
      }
    }

    mockLoadClueSetFromCSV.mockResolvedValue(mockClueSetData)
    mockSaveClueSetToDatabase.mockResolvedValue('clue-set-123')

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })
    fireEvent.click(loadButton)

    // Should show success message eventually
    await waitFor(() => {
      expect(screen.getByText('Successfully loaded "Test Game 1" (ID: clue-set-123)')).toBeInTheDocument()
    })

    expect(mockLoadClueSetFromCSV).toHaveBeenCalledWith('test-game-1.csv')
    expect(mockSaveClueSetToDatabase).toHaveBeenCalledWith(mockClueSetData, 'user-123')
  })

  it('should handle CSV loading error', async () => {
    const loadError = new Error('Failed to load CSV')
    mockLoadClueSetFromCSV.mockRejectedValue(loadError)

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to load clue set: Failed to load CSV')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load clue set:', loadError)
    consoleSpy.mockRestore()
  })

  it('should handle database saving error', async () => {
    const mockClueSetData = {
      name: 'Test Game 1',
      filename: 'test-game-1.csv',
      rounds: {
        jeopardy: [],
        double: [],
        final: { name: 'Final', clues: [] }
      }
    }

    const saveError = new Error('Database connection failed')
    mockLoadClueSetFromCSV.mockResolvedValue(mockClueSetData)
    mockSaveClueSetToDatabase.mockRejectedValue(saveError)

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to load clue set: Database connection failed')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load clue set:', saveError)
    consoleSpy.mockRestore()
  })

  it('should disable controls during loading', async () => {
    mockLoadClueSetFromCSV.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    expect(select).toBeDisabled()
    expect(loadButton).toBeDisabled()
  })

  it('should clear selection after successful load', async () => {
    const mockClueSetData = {
      name: 'Test Game 1',
      filename: 'test-game-1.csv',
      rounds: {
        jeopardy: [],
        double: [],
        final: { name: 'Final', clues: [] }
      }
    }

    mockLoadClueSetFromCSV.mockResolvedValue(mockClueSetData)
    mockSaveClueSetToDatabase.mockResolvedValue('clue-set-123')

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    const loadButton = screen.getByRole('button', { name: 'Load Question Set' })

    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })
    fireEvent.click(loadButton)

    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument()
    })

    expect(select.value).toBe('')
  })

  it('should have proper accessibility attributes', () => {
    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    const labeledSelect = screen.getByLabelText('Select Question Set:')

    expect(select).toHaveAttribute('id', 'clue-set-select')
    expect(labeledSelect).toBe(select) // The labeled element should be the select itself
  })

  it('should handle empty available question sets', () => {
    mockGetAvailableQuestionSets.mockReturnValue([])

    render(<ClueSetSelector />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Choose a clue set...')).toBeInTheDocument()
  })
})
