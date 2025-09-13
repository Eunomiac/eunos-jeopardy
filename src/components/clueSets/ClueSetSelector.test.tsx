import { render, screen, fireEvent } from '@testing-library/react'
import { ClueSetSelector } from './ClueSetSelector'

// Mock the dependencies
jest.mock('../../utils/clueSetUtils', () => ({
  getAvailableClueSets: jest.fn(),
  filenameToDisplayName: jest.fn()
}))

describe('ClueSetSelector', () => {
  const mockGetAvailableClueSets = require('../../utils/clueSetUtils').getAvailableClueSets as jest.Mock
  const mockFilenameToDisplayName = require('../../utils/clueSetUtils').filenameToDisplayName as jest.Mock
  const mockOnClueSetSelected = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetAvailableClueSets.mockReturnValue(['test-game-1.csv', 'test-game-2.csv'])
    mockFilenameToDisplayName.mockImplementation((filename: string) =>
      filename.replace('.csv', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    )
  })

  const defaultProps = {
    selectedClueSetId: '',
    onClueSetSelected: mockOnClueSetSelected
  }

  it('should render clue set selector with title', () => {
    render(<ClueSetSelector {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Clue Sets' })).toBeInTheDocument()
  })

  it('should render dropdown with available clue sets', () => {
    render(<ClueSetSelector {...defaultProps} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    // Check for default option
    expect(screen.getByText('Choose a Clue Set...')).toBeInTheDocument()

    // Check for available clue sets
    expect(screen.getByText('Test Game 1')).toBeInTheDocument()
    expect(screen.getByText('Test Game 2')).toBeInTheDocument()
  })

  it('should call onClueSetSelected when selection changes', () => {
    render(<ClueSetSelector {...defaultProps} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'test-game-1.csv' } })

    expect(mockOnClueSetSelected).toHaveBeenCalledWith('test-game-1.csv')
  })

  it('should display selected clue set', () => {
    render(<ClueSetSelector {...defaultProps} selectedClueSetId="test-game-1.csv" />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('test-game-1.csv')
  })

  it('should handle empty clue sets list', () => {
    mockGetAvailableClueSets.mockReturnValue([])

    render(<ClueSetSelector {...defaultProps} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    // Should only have the default option
    expect(screen.getByText('Choose a Clue Set...')).toBeInTheDocument()
    expect(select.children).toHaveLength(1)
  })

  it('should use filenameToDisplayName for option labels', () => {
    render(<ClueSetSelector {...defaultProps} />)

    expect(mockFilenameToDisplayName).toHaveBeenCalledWith('test-game-1.csv')
    expect(mockFilenameToDisplayName).toHaveBeenCalledWith('test-game-2.csv')
  })
})
