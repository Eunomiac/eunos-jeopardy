import { useState, useEffect } from 'react'
import { ClueSetService, type ClueSetSummary as ClueSetSummaryData } from '../../services/clueSets/clueSetService'
import { DeleteClueSetButton } from './DeleteClueSetButton'
import './ClueSetSummary.scss'

/**
 * Props interface for the ClueSetSummary component.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface ClueSetSummaryProps {
  /** ID of the clue set to display summary for */
  readonly clueSetId: string
  /** Callback when clue set is deleted */
  readonly onDeleted?: () => void
  /** Callback when deletion error occurs */
  readonly onError?: (error: string) => void
}

/**
 * Clue Set Summary component displaying categories for all rounds.
 *
 * Shows a preview of the selected clue set's categories to help users
 * identify and recall the content before starting a game. Displays
 * categories organized by round with collapsible sections.
 *
 * **Key Features:**
 * - Displays categories for Jeopardy, Double Jeopardy, and Final Jeopardy rounds
 * - Collapsible/expandable sections for space efficiency
 * - Loading and error state management
 * - Real-time updates when clue set changes
 * - Jeopardy-themed styling and layout
 *
 * **Database Integration:**
 * - Uses ClueSetService to fetch clue set summary from database
 * - Handles loading states during database queries
 * - Provides error feedback for failed operations
 *
 * @param props - Component props containing clue set ID
 * @returns JSX element representing the clue set summary
 *
 * @example
 * ```typescript
 * <ClueSetSummary clueSetId="123e4567-e89b-12d3-a456-426614174000" />
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function ClueSetSummary({ clueSetId, onDeleted, onError }: Readonly<ClueSetSummaryProps>) {
  // State for managing summary data and loading
  const [summary, setSummary] = useState<ClueSetSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Load clue set summary from database
  useEffect(() => {
    async function loadSummary() {
      if (!clueSetId) {
        setSummary(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const summaryData = await ClueSetService.getClueSetSummary(clueSetId)
        setSummary(summaryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clue set summary')
        setSummary(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSummary()
  }, [clueSetId])

  // Don't render if no clue set selected
  if (!clueSetId) {
    return null
  }

  return (
    <div className="clue-set-summary">
      {/* Fixed header */}
      <div className="summary-header">
        <h4 className="jeopardy-category section-title">
          Clue Set Preview
        </h4>
      </div>

      {/* Always visible content */}
      <div className="summary-content">
          {/* Loading state */}
          {isLoading && (
            <div className="loading-message">
              Loading clue set details...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {/* Summary content */}
          {summary && !isLoading && !error && (
            <div className="summary-details">
              {/* Clue set name and metadata */}
              <div className="summary-meta">
                <h5 className="clue-set-name">{summary.name}</h5>
                <p className="created-date">
                  Created: {new Date(summary.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Delete button at top right of panel */}
              <div className="delete-section">
                <DeleteClueSetButton
                  clueSetId={clueSetId}
                  clueSetName={summary.name}
                  onDeleted={onDeleted ?? (() => { /* empty */ })}
                  onError={onError ?? (() => { /* empty */ })}
                />
              </div>

              {/* Two-column grid layout */}
              <div className="rounds-grid">
                {/* Jeopardy Round */}
                <div className="round-section jeopardy-round">
                  <h6 className="round-title">Jeopardy Round</h6>
                  <div className="categories-list">
                    {summary.rounds.jeopardy.map((category) => (
                      <div key={category} className="category-item">
                        {category}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Double Jeopardy Round */}
                <div className="round-section double-jeopardy-round">
                  <h6 className="round-title">Double Jeopardy Round</h6>
                  <div className="categories-list">
                    {summary.rounds.doubleJeopardy.map((category) => (
                      <div key={category} className="category-item">
                        {category}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Jeopardy - spans both columns */}
                <div className="round-section final-jeopardy-round">
                  <h6 className="round-title">Final Jeopardy</h6>
                  <div className="final-category">
                    {summary.rounds.finalJeopardy}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
