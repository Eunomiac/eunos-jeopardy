import { getAvailableClueSets, filenameToDisplayName } from '../../utils/clueSetUtils'

interface ClueSetSelectorProps {
  readonly selectedClueSetId: string
  readonly onClueSetSelected: (clueSetId: string) => void
}

export function ClueSetSelector({ selectedClueSetId, onClueSetSelected }: Readonly<ClueSetSelectorProps>) {
  const availableFiles = getAvailableClueSets()

  return (
    <div className="clue-set-selector game-creator">
      <h3 className="jeopardy-category section-title">
        Clue Sets
      </h3>

      <div className="form-group">
        <select
          id="clue-set-select"
          className="jeopardy-input jeopardy-dropdown"
          value={selectedClueSetId}
          onChange={(e) => onClueSetSelected(e.target.value)}
        >
          <option value="">Choose a Clue Set...</option>
          {availableFiles.map((filename) => (
            <option key={filename} value={filename}>
              {filenameToDisplayName(filename)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
