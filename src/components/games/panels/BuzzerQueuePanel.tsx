import type { Game, Player, Buzz } from "../../../services/games/GameService";
import { isPanelDisabled } from "./panelUtils";

export interface BuzzerQueuePanelProps {
  readonly game: Game | null;
  readonly players: Player[];
  readonly connectionStatus: "ACTIVE" | "DISCONNECTED" | "SLOW";
  readonly buzzerTimeoutMs: number;
  readonly setBuzzerTimeoutMs: (ms: number) => void;
  readonly buzzerQueue: Buzz[];
  readonly autoSelectedPlayerId: string | null;
  readonly onSelectPlayer: (playerId: string) => void;
  readonly onClearQueue: () => void;
}

export function BuzzerQueuePanel(props: Readonly<BuzzerQueuePanelProps>) {
  const {
    game,
    players,
    connectionStatus,
    buzzerTimeoutMs,
    setBuzzerTimeoutMs,
    buzzerQueue,
    autoSelectedPlayerId,
    onSelectPlayer,
    onClearQueue,
  } = props;

  return (
    <div
      className={`dashboard-panel buzzer-queue-panel ${
        isPanelDisabled(game) ? "disabled" : ""
      }`}
    >
      <div className="panel-header">
        <h5>BUZZER QUEUE</h5>
      </div>
      <div className="panel-content">
        {/* Connection & Latency Status */}
        <div className="connection-status">
          <span>
            <span className="status-label">Connection Status:</span>
            <span
              className={{
                ACTIVE: "text-success",
                SLOW: "text-warning",
                DISCONNECTED: "text-danger",
              }[connectionStatus]
            }
            >
              {connectionStatus}
            </span>
          </span>
          <span>
            <span className="status-label">Auto-Resolution Timeout:</span>
            <input
              type="number"
              className="form-control form-control-sm"
              value={buzzerTimeoutMs}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value) && value >= 100 && value <= 5000) {
                  setBuzzerTimeoutMs(value);
                }
              }}
              min={100}
              max={5000}
              step={50}
              style={{ width: "80px", display: "inline-block", marginLeft: "8px" }}
            />
            <span style={{ marginLeft: "4px", fontSize: "0.8em", color: "#ccc" }}>
              ms
            </span>
          </span>
        </div>

        {buzzerQueue.length === 0 ? (
          <div className="queue-status">
            <p className="text-muted">No active buzzes</p>
          </div>
        ) : (
          <div className="queue-list">
            {buzzerQueue.map((buzz, index) => {
              const player = players.find((p) => p.user_id === buzz.user_id);

              const buzzWithPlayerData = buzz as Buzz & {
                profiles?: { display_name?: string; username?: string };
                playerNickname?: string | null;
              };

              const gameNickname = buzzWithPlayerData.playerNickname ?? player?.nickname;
              const profileName =
                buzzWithPlayerData.profiles?.display_name ??
                buzzWithPlayerData.profiles?.username;
              const playerName = (gameNickname ?? profileName) ?? "Unknown Player";

              const reactionTime = buzz.reaction_time;
              let timingText: string;
              if (typeof reactionTime === "number") {
                timingText = index === 0 ? `${reactionTime} ms` : `+${reactionTime} ms`;
              } else {
                const buzzTime = new Date(buzz.created_at);
                const firstBuzz = buzzerQueue[0];
                if (!firstBuzz) {
                  throw new Error('First buzz in queue is undefined');
                }
                const firstBuzzTime = new Date(firstBuzz.created_at);
                const timeDiff = buzzTime.getTime() - firstBuzzTime.getTime();
                timingText = timeDiff === 0 ? "0 ms" : `+${timeDiff} ms`;
              }

              const ariaLabel = `Select player ${playerName} (position ${index + 1}, ${timingText})`;

              return (
                <button
                  key={buzz.id}
                  type="button"
                  className={`queue-item ${
                    game?.focused_player_id === buzz.user_id ? "selected" : ""
                  } ${autoSelectedPlayerId === buzz.user_id ? "auto-selected" : ""}`}
                  onClick={() => { onSelectPlayer(buzz.user_id); }}
                  data-player-id={buzz.user_id}
                  aria-label={ariaLabel}
                  style={{ cursor: "pointer" }}
                >
                  <span className="queue-position">{index + 1}.</span>
                  <span className="queue-player">{playerName}</span>
                  <span className="queue-timing">{timingText}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Clear Queue Button */}
        <div className="clear-queue-container">
          <button
            className="jeopardy-button-small"
            onClick={onClearQueue}
            disabled={buzzerQueue.length === 0}
          >
            Clear Queue
          </button>
        </div>
      </div>
    </div>
  );
}
