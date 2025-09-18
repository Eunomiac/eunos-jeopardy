/**
 * @fileoverview Tests for ClueSetSummary component
 *
 * Tests component rendering, loading states, error handling,
 * data display, and integration with ClueSetService.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { ClueSetSummary } from './ClueSetSummary'
import { ClueSetService } from '../../services/clueSets/clueSetService'
import { mockUser } from '../../test/__mocks__/commonTestData'

// Mock dependencies
jest.mock('../../services/clueSets/clueSetService')
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn()
  })
}))

const mockClueSetService = ClueSetService as jest.Mocked<typeof ClueSetService>

describe('ClueSetSummary', () => {
  const mockProps = {
    clueSetId: 'clue-set-123',
    onDeleted: jest.fn(),
    onError: jest.fn()
  }

  const mockSummary = {
    id: 'clue-set-123',
    name: 'Test Clue Set',
    rounds: {
      jeopardy: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 'Category 6'],
      doubleJeopardy: ['Double Cat 1', 'Double Cat 2', 'Double Cat 3', 'Double Cat 4', 'Double Cat 5', 'Double Cat 6'],
      finalJeopardy: 'Final Category'
    },
    createdAt: '2023-01-01T00:00:00Z',
    totalClues: 61
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render clue set summary component', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      expect(screen.getByText('Clue Set Preview')).toBeInTheDocument()
      expect(screen.getByText('Loading clue set details...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Test Clue Set')).toBeInTheDocument()
      })
    })

    it('should not render when no clue set ID provided', () => {
      const { container } = render(<ClueSetSummary {...mockProps} clueSetId="" />)
      expect(container.firstChild).toBeNull()
    })

    it('should have correct CSS classes', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Clue Set')).toBeInTheDocument()
      })

      expect(document.querySelector('.clue-set-summary')).toBeInTheDocument()
      expect(document.querySelector('.summary-header')).toBeInTheDocument()
      expect(document.querySelector('.summary-content')).toBeInTheDocument()
      expect(document.querySelector('.summary-details')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      mockClueSetService.getClueSetSummary.mockImplementation(() => new Promise(() => {}))

      render(<ClueSetSummary {...mockProps} />)

      expect(screen.getByText('Loading clue set details...')).toBeInTheDocument()
    })

    it('should hide loading state after data loads', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading clue set details...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error States', () => {
    it('should display error message when service fails', async () => {
      mockClueSetService.getClueSetSummary.mockRejectedValue(new Error('Service error'))

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error: Service error')).toBeInTheDocument()
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockClueSetService.getClueSetSummary.mockRejectedValue('String error')

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load clue set summary')).toBeInTheDocument()
      })
    })

    it('should clear error when clue set ID changes', async () => {
      mockClueSetService.getClueSetSummary.mockRejectedValueOnce(new Error('Service error'))

      const { rerender } = render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error: Service error')).toBeInTheDocument()
      })

      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)
      rerender(<ClueSetSummary {...mockProps} clueSetId="different-id" />)

      await waitFor(() => {
        expect(screen.queryByText('Error: Service error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Display', () => {
    it('should display clue set name and creation date', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Clue Set')).toBeInTheDocument()
        expect(screen.getByText(/Created:/)).toBeInTheDocument()
        // Check for the date content more flexibly due to timezone differences
        expect(screen.getByText(/2023|2022/)).toBeInTheDocument()
      })
    })

    it('should display all Jeopardy round categories', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Jeopardy Round')).toBeInTheDocument()
        expect(screen.getByText('Category 1')).toBeInTheDocument()
        expect(screen.getByText('Category 2')).toBeInTheDocument()
        expect(screen.getByText('Category 6')).toBeInTheDocument()
      })
    })

    it('should display all Double Jeopardy round categories', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Double Jeopardy Round')).toBeInTheDocument()
        expect(screen.getByText('Double Cat 1')).toBeInTheDocument()
        expect(screen.getByText('Double Cat 2')).toBeInTheDocument()
        expect(screen.getByText('Double Cat 6')).toBeInTheDocument()
      })
    })

    it('should display Final Jeopardy category', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Final Jeopardy')).toBeInTheDocument()
        expect(screen.getByText('Final Category')).toBeInTheDocument()
      })
    })

    it('should handle empty categories gracefully', async () => {
      const emptySummary = {
        ...mockSummary,
        rounds: {
          jeopardy: [],
          doubleJeopardy: [],
          finalJeopardy: ''
        }
      }

      mockClueSetService.getClueSetSummary.mockResolvedValue(emptySummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Jeopardy Round')).toBeInTheDocument()
        expect(screen.getByText('Double Jeopardy Round')).toBeInTheDocument()
        expect(screen.getByText('Final Jeopardy')).toBeInTheDocument()
      })
    })
  })

  describe('Delete Integration', () => {
    it('should render delete button with correct props', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete clue set/i })).toBeInTheDocument()
      })
    })

    it('should handle missing onDeleted callback', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} onDeleted={undefined} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete clue set/i })).toBeInTheDocument()
      })
    })

    it('should handle missing onError callback', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      render(<ClueSetSummary {...mockProps} onError={undefined} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete clue set/i })).toBeInTheDocument()
      })
    })
  })

  describe('Component Lifecycle', () => {
    it('should reload data when clue set ID changes', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      const { rerender } = render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Clue Set')).toBeInTheDocument()
      })

      expect(mockClueSetService.getClueSetSummary).toHaveBeenCalledTimes(1)

      rerender(<ClueSetSummary {...mockProps} clueSetId="different-id" />)

      expect(mockClueSetService.getClueSetSummary).toHaveBeenCalledTimes(2)
      expect(mockClueSetService.getClueSetSummary).toHaveBeenLastCalledWith('different-id')
    })

    it('should handle empty clue set ID gracefully', async () => {
      mockClueSetService.getClueSetSummary.mockResolvedValue(mockSummary)

      const { rerender } = render(<ClueSetSummary {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Clue Set')).toBeInTheDocument()
      })

      rerender(<ClueSetSummary {...mockProps} clueSetId="" />)

      expect(mockClueSetService.getClueSetSummary).toHaveBeenCalledTimes(1)
    })
  })
})
