import { useMemo } from "react";
import type { Game } from "../../../services/games/GameService";
import type { Clue } from "../../../services/clues/ClueService";
import type { ClueSetData } from "../../../services/clueSets/loader";
import { isPanelDisabled } from "./panelUtils";

export type RevealBuzzerButtonState = "disabled" | "daily-double" | "daily-double-wager" | "reveal" | "unlock" | "lock";
export interface ClueControlPanelProps {
  readonly game: Game | null;
  readonly focusedClue: Clue | null;
  readonly clueSetData: ClueSetData | null;
  readonly dailyDoublePositions: { category: number; row: number }[];
  readonly getRevealBuzzerButtonState: () => RevealBuzzerButtonState;
  readonly handleRevealBuzzerButton: () => void | Promise<void>;
  readonly clueTimeRemaining: number | null;
  readonly dailyDoubleWager: number | null;
  readonly handleClearDailyDoubleWager: () => void | Promise<void>;
  readonly wagerInput: string;
  readonly setWagerInput: (v: string) => void;
  readonly handleDailyDoubleWager: () => void | Promise<void>;
  readonly handleMarkCorrect: () => void | Promise<void>;
  readonly handleMarkWrong: () => void | Promise<void>;
}

export function ClueControlPanel(props: Readonly<ClueControlPanelProps>) {
  const {
    game,
    focusedClue,
    clueSetData,
    dailyDoublePositions,
    getRevealBuzzerButtonState,
    handleRevealBuzzerButton,
    clueTimeRemaining,
    dailyDoubleWager,
    handleClearDailyDoubleWager,
    wagerInput,
    setWagerInput,
    handleDailyDoubleWager,
    handleMarkCorrect,
    handleMarkWrong,
  } = props;

  const isDailyDoubleForFocused = useMemo(() => {
    if (!focusedClue || !game) {return false;}
    const clueData = clueSetData?.rounds[game.current_round];
    if (!Array.isArray(clueData)) {return false;}

    for (let categoryIndex = 0; categoryIndex < clueData.length; categoryIndex++) {
      const category = clueData[categoryIndex];
      if (!category) {
        throw new Error(`Category at index ${categoryIndex} is undefined`);
      }
      const clueInCategory = category.clues.find((c) => c.id === focusedClue.id);
      if (clueInCategory) {
        return dailyDoublePositions.some(
          (position) =>
            position.category === categoryIndex + 1 &&
            position.row === clueInCategory.position
        );
      }
    }
    return false;
  }, [focusedClue, game, clueSetData, dailyDoublePositions]);

  const btnState = getRevealBuzzerButtonState();
  const isDisabled = btnState === "disabled";
  const buttonText = {
    disabled: "Select Clue",
    "daily-double": "Daily Double!",
    "daily-double-wager": "Set Wager First",
    reveal: "Reveal Prompt",
    unlock: "Unlock Buzzer",
    lock: "Lock Buzzer",
  }[btnState];
  const buttonClass = {
    disabled: "",
    "daily-double": "daily-double",
    "daily-double-wager": "disabled",
    reveal: "",
    unlock: "red",
    lock: "green",
  }[btnState];

  return (
    <div
      className={`dashboard-panel clue-control-panel ${
        isPanelDisabled(game) ? "disabled" : ""
      }`}
    >
      <div className="panel-header">
        <h5>CLUE CONTROL</h5>
      </div>
      <div className="panel-content">
        {/* Focused Clue Display */}
        <div className="focused-clue-display">
          <div className="clue-display-row">
            <div className={`jeopardy-clue-display ${!focusedClue ? "no-clue-selected" : ""}`}>
              {focusedClue ? (
                <div className="clue-text">{focusedClue.prompt}</div>
              ) : (
                <div className="clue-text">No clue selected</div>
              )}
            </div>

            {/* Multi-state Reveal/Buzzer Button */}
            <div className="clue-control-button">
              <button className={`jeopardy-button ${buttonClass}`} onClick={() => { void handleRevealBuzzerButton(); /* NOSONAR (Void return is intentional) */ }} disabled={isDisabled}>
                {buttonText}
              </button>
            </div>
          </div>

          {/* Timeout Display */}
          {clueTimeRemaining !== null && (
            <div className="clue-timeout-display">
              <div className="timeout-message">
                ⏱️ Time remaining: <strong>{clueTimeRemaining}s</strong>
              </div>
            </div>
          )}

          {/* Daily Double Wager Interface */}
          {focusedClue && isDailyDoubleForFocused && (
            <div className="daily-double-wager-section">
              {dailyDoubleWager ? (
                <div className="wager-display">
                  <div className="wager-amount">
                    Wager: <strong>${dailyDoubleWager.toLocaleString()}</strong>
                  </div>
                  <button className="jeopardy-button-small" onClick={() => { void handleClearDailyDoubleWager(); /* NOSONAR (Void return is intentional) */  }}>
                    Clear Wager
                  </button>
                </div>
              ) : (
                <div className="wager-display">
                  <div className="wager-input-row">
                    <input
                      type="number"
                      className="wager-input"
                      placeholder="Enter wager amount"
                      value={wagerInput}
                      onChange={(e) => { setWagerInput(e.target.value); }}
                      min={1}
                    />
                    <button
                      className="jeopardy-button-small"
                      onClick={() => { void handleDailyDoubleWager(); /* NOSONAR (Void return is intentional) */ }}
                      disabled={!wagerInput || parseInt(wagerInput, 10) <= 0}
                    >
                      Set Wager
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom section with Correct Response and Mark buttons */}
        <div className="clue-control-bottom">
          <div className={`clue-response-row ${!focusedClue ? "no-clue-focused" : ""}`}>
            <span className="response-label">Correct Response:</span>
            <span className="response-text">{focusedClue ? focusedClue.response : "No Clue Selected"}</span>
          </div>

          {/* Adjudication Control Buttons */}
          <div className="clue-control-buttons">
            <div className="d-flex gap-2">
              <button className="jeopardy-button flex-1" onClick={() => { void handleMarkCorrect(); /* NOSONAR (Void return is intentional) */ }} disabled={!focusedClue || !game?.focused_player_id}>
                Mark Correct
              </button>
              <button className="jeopardy-button flex-1" onClick={() => { void handleMarkWrong(); /* NOSONAR (Void return is intentional) */ }} disabled={!focusedClue || !game?.focused_player_id}>
                Mark Wrong
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
