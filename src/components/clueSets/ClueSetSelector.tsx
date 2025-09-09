import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { loadClueSetFromCSV, saveClueSetToDatabase } from '../../services/clueSets/loader'
import { getAvailableQuestionSets, filenameToDisplayName } from '../../utils/questionSetUtils'

export function ClueSetSelector() {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const availableFiles = getAvailableQuestionSets()

  const handleLoadQuestionSet = async () => {
    if (!selectedFile) {
      setMessage('Please select a clue set file')
      setMessageType('error')
      return
    }

    if (!user) {
      setMessage('You must be logged in to load clue sets')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      // Load and parse CSV
      setMessage('Loading CSV file...')
      const clueSetData = await loadClueSetFromCSV(selectedFile)

      // Save to database
      setMessage('Saving to database...')
      const clueSetId = await saveClueSetToDatabase(clueSetData, user.id)

      setMessage(`Successfully loaded "${clueSetData.name}" (ID: ${clueSetId})`)
      setMessageType('success')
      setSelectedFile('')

    } catch (error) {
      console.error('Failed to load clue set:', error)
      setMessage(`Failed to load clue set: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="clue-set-selector">
        <p className="text-muted">Please log in to load clue sets.</p>
      </div>
    )
  }

  return (
    <div className="clue-set-selector">
      <h3>Load Question Set</h3>

      <div className="mb-3">
        <label htmlFor="clue-set-select" className="form-label">
          Select Question Set:
        </label>
        <select
          id="clue-set-select"
          className="form-select"
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          disabled={loading}
        >
          <option value="">Choose a clue set...</option>
          {availableFiles.map((filename) => (
            <option key={filename} value={filename}>
              {filenameToDisplayName(filename)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={handleLoadQuestionSet}
          disabled={loading || !selectedFile}
        >
          {loading ? 'Loading...' : 'Load Question Set'}
        </button>
      </div>

      {message && (
        <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {message}
        </div>
      )}

      <div className="text-muted mt-3">
        <small>
          <strong>Available Files:</strong>
          <ul className="mt-2">
            {availableFiles.map((filename) => (
              <li key={filename}>
                <code>{filename}</code> → "{filenameToDisplayName(filename)}"
              </li>
            ))}
          </ul>
        </small>
      </div>
    </div>
  )
}
