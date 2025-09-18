import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  GameService,
  type Game,
  type Player,
  type Buzz,
} from "../../services/games/GameService";
import {
  ClueService,
  type Clue,
  type ClueState,
} from "../../services/clues/ClueService";
import { ClueSetService } from "../../services/clueSets/clueSetService";
import type { ClueSetData, ClueData } from "../../services/clueSets/loader";
import { SupabaseConnection } from "../../services/supabase/connection";
// import { SimplePlayerConnectionStatus } from "../debug/PlayerConnectionStatus";
import { supabase } from "../../services/supabase/client";
import "./GameHostDashboard.scss";

/**
 * Helper function to determine if panels should be disabled based on game status.
 */
const isPanelDisabled = (game: Game | null): boolean =>
  game?.status === "lobby";

/**
 * Helper function to get the appropriate button configuration for Start/End Game.
 */
const getGameControlButton = (game: Game | null) => {
  if (!game) {
    return { text: "Loading...", handler: () => {}, disabled: true };
  }

  if (game.status === "lobby") {
    return {
      text: "Start Game",
      handler: "start" as const,
      disabled: false,
    };
  }

  if (game.status === "in_progress") {
    return {
      text: "End Game",
      handler: "end" as const,
      disabled: false,
    };
  }

  return { text: "Game Complete", handler: () => {}, disabled: true };
};

/**
 * Helper function to calculate clue completion progress.
 */
const calculateClueProgress = (
  clueStates: ClueState[],
  currentRound: string
) => {
  const completedCount = clueStates.filter((state) => state.completed).length;
  const totalClues = currentRound === "final" ? 1 : 30;
  const percentage = totalClues > 0 ? (completedCount / totalClues) * 100 : 0;
  return {
    completedCount,
    totalClues,
    percentage: Math.round(percentage),
  };
};

/**
 * Helper function to format game status for display.
 */
const formatGameStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Helper function to calculate game progress.
 */
const renderGameStatusInfo = (game: Game, clueStates: ClueState[]) => {
  return (
    <div className="game-status-info">
      <div className="status-row">
        <div className="status-item">
          <span className="text-uppercase jeopardy-gold">Round:</span>
          <span className="text-capitalize">{game.current_round}</span>
        </div>
        <div className="status-item">
          <span className="text-uppercase jeopardy-gold">Status:</span>
          <span>{formatGameStatus(game.status)}</span>
        </div>
        <div className="status-item">
          <span className="text-uppercase jeopardy-gold">Clues Left:</span>
          <span>
            {(() => {
              const progress = calculateClueProgress(
                clueStates,
                game.current_round
              );
              return progress.totalClues - progress.completedCount;
            })()}
          </span>
        </div>
      </div>
      <div className="round-progress">
        <div className="progress-container">
          <label htmlFor="round-progress-bar" className="progress-label">
            Round Progress
          </label>
          <progress
            id="round-progress-bar"
            className="progress-bar w-100"
            value={
              calculateClueProgress(clueStates, game.current_round).percentage
            }
            max={100}
          >
            {calculateClueProgress(clueStates, game.current_round).percentage}%
            Complete
          </progress>
        </div>
      </div>
    </div>
  );
};

/**
 * Props interface for the GameHostDashboard component.
 *
 * Defines the required properties for the host dashboard component,
 * including game identification and navigation callbacks.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
interface GameHostDashboardProps {
  /** UUID of the game to display and control */
  readonly gameId: string;

  /** Callback function to navigate back to the game creation interface */
  readonly onBackToCreator: () => void;
}

/**
 * Game Host Dashboard component providing real-time game control and monitoring.
 *
 * This component serves as the primary interface for game hosts to manage active
 * Jeopardy games. It provides comprehensive game controls, player monitoring,
 * and real-time status updates for the hosting experience.
 *
 * **Key Features:**
 * - Real-time game state monitoring and updates
 * - Buzzer system control (lock/unlock functionality)
 * - Player list with scores and join timestamps
 * - Game status and round progression tracking
 * - Host-only operations with proper authorization
 * - Comprehensive error handling and user feedback
 *
 * **State Management:**
 * - game: Current game data including status and settings
 * - players: List of joined players with scores and metadata
 * - loading: Loading state for initial data fetch
 * - message/messageType: User feedback system for operations
 *
 * **Security Features:**
 * - Authentication checks for all operations
 * - Host authorization validation via GameService
 * - Proper error handling for unauthorized access
 * - Confirmation dialogs for destructive actions
 *
 * **Integration Points:**
 * - Uses AuthContext for user session management
 * - Integrates with GameService for all game operations
 * - Provides navigation callback to parent App component
 *
 * **Future Enhancements:**
 * - Game board display with clue selection
 * - Buzzer queue management and ordering
 * - Answer adjudication interface
 * - Advanced scoring and wager management
 * - Round progression controls
 *
 * @param props - Component props containing game ID and navigation callback
 * @returns JSX element representing the host dashboard interface
 *
 * @example
 * ```typescript
 * <GameHostDashboard
 *   gameId="123e4567-e89b-12d3-a456-426614174000"
 *   onBackToCreator={() => setMode('clue-sets')}
 * />
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function GameHostDashboard({
  gameId,
  onBackToCreator,
}: Readonly<GameHostDashboardProps>) {
  // Authentication and user context
  /** Current authenticated user from AuthContext */
  const { user } = useAuth();

  // Component state management
  /** Current game data including status, settings, and metadata */
  const [game, setGame] = useState<Game | null>(null);

  /** Complete clue set data for the current game */
  const [clueSetData, setClueSetData] = useState<ClueSetData | null>(null);

  /** List of players who have joined the game with scores and timestamps */
  const [players, setPlayers] = useState<Player[]>([]);

  /** Current focused clue data */
  const [focusedClue, setFocusedClue] = useState<Clue | null>(null);

  /** All clue states for the current game */
  const [clueStates, setClueStates] = useState<ClueState[]>([]);

  /** Current buzzer queue for the focused clue */
  const [buzzerQueue, setBuzzerQueue] = useState<Buzz[]>([]);

  /** Daily Double positions for the current round */
  const [dailyDoublePositions, setDailyDoublePositions] = useState<
    Array<{ category: number; row: number }>
  >([]);

  /** Loading state for initial data fetch and UI feedback */
  const [loading, setLoading] = useState(true);

  /** User feedback message for operations and errors */
  const [message, setMessage] = useState("");

  /** Type of message for appropriate styling (success/error) */
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  /** Connection status monitoring */
  const [connectionStatus, setConnectionStatus] = useState<
    "ACTIVE" | "DISCONNECTED" | "SLOW"
  >("ACTIVE");

  /** Score adjustment input values for each player */
  const [scoreAdjustments, setScoreAdjustments] = useState<
    Record<string, string>
  >({});

  /** Buzzer timeout in milliseconds for automatic resolution */
  const [buzzerTimeoutMs, setBuzzerTimeoutMs] = useState(500);

  /** Clue timeout timer reference */
  const [clueTimeoutId, setClueTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );

  /** Buzzer resolution timeout ID */
  const [buzzerResolutionTimeoutId, setBuzzerResolutionTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  /** ID of the player that was auto-selected by the buzzer timeout */
  const [autoSelectedPlayerId, setAutoSelectedPlayerId] = useState<
    string | null
  >(null);

  /** Remaining time for current clue (in seconds) */
  const [clueTimeRemaining, setClueTimeRemaining] = useState<number | null>(
    null
  );

  /** Clue timeout duration in seconds */
  const CLUE_TIMEOUT_SECONDS = 5;

  /**
   * Effect to monitor connection status with periodic health checks.
   *
   * Monitors the Supabase connection status and updates the UI accordingly.
   * Runs connection tests every 30 seconds to provide real-time status updates.
   *
   * **Status Categories:**
   * - ACTIVE: Connection healthy (latency < 500ms)
   * - SLOW: Connection working but slow (latency >= 500ms)
   * - DISCONNECTED: Connection failed or error occurred
   */
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { connected, latency } =
          await SupabaseConnection.testConnection();

        if (!connected) {
          setConnectionStatus("DISCONNECTED");
        } else if (latency && latency >= 500) {
          setConnectionStatus("SLOW");
        } else {
          setConnectionStatus("ACTIVE");
        }
      } catch (error) {
        console.error("Connection check failed:", error);
        setConnectionStatus("DISCONNECTED");
      }
    };

    // Initial check
    checkConnection();

    // Set up periodic checks every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  /**
   * Effect to load initial game data when component mounts or dependencies change.
   *
   * Fetches both game details and player list from the database, with proper
   * error handling and loading state management. Only executes when both
   * user and gameId are available.
   *
   * **Data Loading Process:**
   * 1. Validates user authentication and game ID presence
   * 2. Sets loading state and clears previous messages
   * 3. Fetches game data with host authorization check
   * 4. Fetches current player list for the game
   * 5. Updates component state with fetched data
   * 6. Handles errors with user-friendly messages
   *
   * **Error Handling:**
   * - Catches and logs all database operation errors
   * - Displays user-friendly error messages
   * - Maintains loading state consistency
   * - Prevents component crashes from network issues
   *
   * **Dependencies:**
   * - user: Re-runs when authentication state changes
   * - gameId: Re-runs when switching between games
   */
  useEffect(() => {
    // Early return if prerequisites not met
    if (!user || !gameId) {
      return;
    }

    /**
     * Async function to handle the complete data loading process.
     * Separated into its own function to enable proper async/await usage
     * within the useEffect hook.
     */
    const loadGameData = async () => {
      try {
        // Set loading state and clear previous feedback
        setLoading(true);
        setMessage("");
        setMessageType("");

        // Fetch game details with host authorization
        // This validates that the current user is authorized to host this game
        const gameData = await GameService.getGame(gameId, user.id);
        setGame(gameData);

        // Fetch complete clue set data for the game board
        // This provides all categories and clues needed for the dashboard
        // Validate that game has a clue set assigned
        if (!gameData.clue_set_id) {
          throw new Error("Game does not have a clue set assigned");
        }

        const loadedClueSetData = await ClueSetService.loadClueSetFromDatabase(
          gameData.clue_set_id
        );
        setClueSetData(loadedClueSetData);

        // Fetch current player list for the game
        // This provides real-time player information for the dashboard
        const playersData = await GameService.getPlayers(gameId);
        console.log("🎮 Initial players loaded:", playersData);
        setPlayers(playersData);

        // Load clue states for the game
        const clueStatesData = await ClueService.getGameClueStates(gameId);
        setClueStates(clueStatesData);

        // Load Daily Double positions for the current round
        const dailyDoubleData = await ClueService.getDailyDoublePositions(
          gameData.clue_set_id,
          gameData.current_round
        );
        setDailyDoublePositions(dailyDoubleData);

        // Load focused clue if one is set
        if (gameData.focused_clue_id) {
          const focusedClueData = await ClueService.getClueById(
            gameData.focused_clue_id
          );
          setFocusedClue(focusedClueData);
        } else {
          setFocusedClue(null);
        }
      } catch (error) {
        // Log error for debugging and development
        console.error("Failed to load game data:", error);

        // Display user-friendly error message
        setMessage(
          `Failed to load game: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setMessageType("error");
      } finally {
        // Always clear loading state regardless of success/failure
        setLoading(false);
      }
    };

    // Execute the data loading process
    loadGameData();
  }, [user, gameId]);

  /**
   * Clears the clue timeout timer.
   *
   * Cancels any active timeout and resets the countdown display.
   * Called when a player buzzes in or when the clue is completed.
   */
  const clearClueTimeout = useCallback(() => {
    if (clueTimeoutId) {
      clearTimeout(clueTimeoutId);
      setClueTimeoutId(null);
    }
    setClueTimeRemaining(null);
  }, [clueTimeoutId]);

  /**
   * Effect to set up real-time subscriptions for game state changes.
   */
  useEffect(() => {
    if (!gameId) {
      return undefined;
    }

    // Set up real-time subscription for this game
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          console.log("🎮 Player change detected via real-time");
          // Refresh player list when players join/leave
          try {
            const updatedPlayers = await GameService.getPlayers(gameId);
            console.log("🎮 Updated players:", updatedPlayers);
            setPlayers(updatedPlayers);
          } catch (error) {
            console.error("❌ Failed to refresh players:", error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buzzes",
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          console.log("Buzz change detected");

          // Refresh buzzer queue when new buzzes arrive
          // Only refresh if we have a focused clue
          if (focusedClue) {
            try {
              const updatedBuzzes = await GameService.getBuzzesForClue(
                gameId,
                focusedClue.id
              );

              // Sort by reaction time (fastest first), with null times at the end
              const sortedBuzzes = updatedBuzzes.sort((a, b) => {
                const timeA = a.reaction_time ?? Infinity;
                const timeB = b.reaction_time ?? Infinity;
                return timeA - timeB;
              });

              setBuzzerQueue(sortedBuzzes);

              // Clear clue timeout when first player buzzes (prevents timeout during latency period)
              if (sortedBuzzes.length === 1) {
                clearClueTimeout();
              }

              // Start auto-selection timeout when first player buzzes
              if (sortedBuzzes.length === 1) {
                // Clear any existing timeout
                if (buzzerResolutionTimeoutId) {
                  clearTimeout(buzzerResolutionTimeoutId);
                }

                // Start new timeout
                const timeoutId = setTimeout(() => {
                  // Use the sorted buzzes from when timeout was set
                  if (sortedBuzzes.length > 0) {
                    // The fastest player is at index 0 (since we sorted)
                    const fastestBuzz = sortedBuzzes[0];

                    // Mark this player as auto-selected
                    setAutoSelectedPlayerId(fastestBuzz.user_id);

                    // Click the fastest player's button
                    const fastestPlayerButton = document.querySelector(
                      `[data-player-id="${fastestBuzz.user_id}"]`
                    ) as HTMLElement;
                    if (fastestPlayerButton) {
                      fastestPlayerButton.click();
                      setMessage(
                        `Auto-selected fastest player (${fastestBuzz.reaction_time}ms)`
                      );
                      setMessageType("success");
                    }
                  }
                }, buzzerTimeoutMs);

                setBuzzerResolutionTimeoutId(timeoutId);
              }
            } catch (error) {
              console.error("Failed to refresh buzzes:", error);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        async () => {
          console.log("Game state change detected");
          // Refresh game state when host makes changes from another session
          try {
            if (user) {
              const updatedGame = await GameService.getGame(gameId, user.id);
              setGame(updatedGame);
            }
          } catch (error) {
            console.error("Failed to refresh game state:", error);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [
    gameId,
    user,
    focusedClue,
    clearClueTimeout,
    buzzerResolutionTimeoutId,
    buzzerTimeoutMs,
  ]);

  // Effect to manage full-screen layout classes
  useEffect(() => {
    // Add classes for full-screen dashboard layout
    document.body.classList.add("dashboard-active");
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.classList.add("dashboard-active");
    }

    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove("dashboard-active");
      if (rootElement) {
        rootElement.classList.remove("dashboard-active");
      }
    };
  }, []);

  /**
   * Loads the current buzzer queue for the focused clue.
   */
  const loadBuzzerQueue = useCallback(async () => {
    if (!focusedClue) {
      setBuzzerQueue([]);
      setAutoSelectedPlayerId(null); // Clear auto-selection when no focused clue
      return;
    }

    try {
      const buzzes = await GameService.getBuzzesForClue(gameId, focusedClue.id);

      // Sort by reaction time (fastest first), with null times at the end
      const sortedBuzzes = buzzes.sort((a, b) => {
        const timeA = a.reaction_time ?? Infinity;
        const timeB = b.reaction_time ?? Infinity;
        return timeA - timeB;
      });

      setBuzzerQueue(sortedBuzzes);
    } catch (error) {
      console.error("Failed to load buzzer queue:", error);
      setBuzzerQueue([]);
    }
  }, [focusedClue, gameId]);

  // Load buzzer queue when focused clue changes
  useEffect(() => {
    loadBuzzerQueue();
  }, [loadBuzzerQueue]);

  /**
   * Determines the current state of the multi-state reveal/buzzer button
   */
  const getRevealBuzzerButtonState = () => {
    if (!focusedClue || !game) {
      return "disabled";
    }

    const clueState = clueStates.find(
      (state) => state.clue_id === focusedClue.id
    );
    const isRevealed = clueState?.revealed || false;

    if (!isRevealed) {
      return "reveal";
    }
    if (game.is_buzzer_locked) {
      return "unlock";
    }
    return "lock";
  };

  /**
   * Handles the multi-state reveal/buzzer button click
   */
  const handleRevealBuzzerButton = async () => {
    const state = getRevealBuzzerButtonState();

    switch (state) {
      case "reveal":
        await handleRevealClue();
        break;
      case "unlock":
      case "lock":
        await handleToggleBuzzer();
        break;
      case "disabled":
        // No action when disabled
        break;
      default:
        console.warn("Unknown button state:", state);
        break;
    }
  };

  /**
   * Starts the clue timeout timer.
   *
   * Initiates a countdown timer that will automatically complete the clue
   * if no player buzzes in within the timeout period. Updates the remaining
   * time display and handles timeout completion.
   */
  const handleClueTimeout = useCallback(async () => {
    if (!user || !game || !focusedClue) {
      return;
    }

    try {
      setMessage("Time expired - completing clue...");

      // Mark clue as completed
      const { error: clueStateError } = await supabase
        .from("clue_states")
        .update({ completed: true })
        .eq("game_id", gameId)
        .eq("clue_id", focusedClue.id);

      if (clueStateError) {
        throw new Error(
          `Failed to mark clue completed: ${clueStateError.message}`
        );
      }

      // Clear focused clue and player, lock buzzer
      const updatedGame = await GameService.updateGame(
        gameId,
        {
          focused_clue_id: null,
          focused_player_id: null,
          is_buzzer_locked: true,
        },
        user.id
      );

      setGame(updatedGame);
      setFocusedClue(null);

      // Update clue states
      const updatedClueStates = await ClueService.getGameClueStates(gameId);
      setClueStates(updatedClueStates);

      // Show correct answer to host
      alert(`Time expired! The correct answer was: ${focusedClue.response}`);

      setMessage("Clue completed due to timeout");
      setMessageType("success");
    } catch (error) {
      console.error("Failed to handle clue timeout:", error);
      setMessage(
        `Failed to handle timeout: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  }, [user, game, focusedClue, gameId]);

  const startClueTimeout = useCallback(() => {
    // Clear any existing timeout
    if (clueTimeoutId) {
      clearTimeout(clueTimeoutId);
      setClueTimeoutId(null);
    }

    // Add a small delay to ensure state has settled before starting timeout
    // This prevents the timeout from being cancelled immediately if called too quickly
    setTimeout(() => {
      // Start countdown display
      setClueTimeRemaining(CLUE_TIMEOUT_SECONDS);

      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setClueTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Set main timeout
      const timeoutId = setTimeout(async () => {
        clearInterval(countdownInterval);
        setClueTimeRemaining(null);
        await handleClueTimeout();
      }, CLUE_TIMEOUT_SECONDS * 1000);

      setClueTimeoutId(timeoutId);
    }, 100); // 100ms delay to ensure state stability
  }, [clueTimeoutId, CLUE_TIMEOUT_SECONDS, handleClueTimeout]);

  /**
   * Handles clue selection from the game board.
   *
   * Toggles the focused clue state - if the same clue is clicked again, it unfocuses.
   * Otherwise, sets the selected clue as the focused clue for the game, which highlights
   * it on both the host dashboard and player interfaces. The clue selection
   * can be changed until the clue is revealed.
   *
   * @param clueId - UUID of the clue to select
   * @param clueData - The clue data for immediate UI updates
   */
  const handleClueSelection = async (clueId: string, clueData: ClueData) => {
    if (!user || !game) {
      return;
    }

    try {
      // If clicking the same clue that's already focused, unfocus it
      if (focusedClue && focusedClue.id === clueId) {
        setMessage("Unfocusing clue...");

        // Clear focused clue in game state
        const clearedGame = await GameService.setFocusedClue(
          gameId,
          null,
          user.id
        );
        setGame(clearedGame);
        setFocusedClue(null);

        setMessage("Clue unfocused");
        setMessageType("success");
        return;
      }

      setMessage("Selecting clue...");

      // Set focused clue in game state
      const updatedGame = await GameService.setFocusedClue(
        gameId,
        clueId,
        user.id
      );
      setGame(updatedGame);

      // Get full clue data and set as focused
      const fullClueData = await ClueService.getClueById(clueId);
      setFocusedClue(fullClueData);

      // Check if this is a Daily Double
      const isDailyDouble = await ClueService.isDailyDouble(clueId);

      if (isDailyDouble) {
        setMessage(
          `🎯 Daily Double selected! Get player's wager before revealing.`
        );
        setMessageType("success");
      } else {
        setMessage(`Clue selected: ${clueData.prompt.substring(0, 50)}...`);
        setMessageType("success");
      }
    } catch (error) {
      console.error("Failed to select clue:", error);
      setMessage(
        `Failed to select clue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles revealing the focused clue to all players.
   *
   * Marks the clue as revealed in the database and locks the clue selection.
   * After revelation, players can see the clue prompt and the host can unlock
   * the buzzer for player responses.
   */
  const handleRevealClue = async () => {
    if (!user || !game || !focusedClue) {
      return;
    }

    try {
      setMessage("Revealing clue...");

      // Mark clue as revealed
      await ClueService.revealClue(gameId, focusedClue.id);

      // Lock the buzzer when revealing clue (host must unlock it manually)
      if (!game.is_buzzer_locked) {
        const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id);
        setGame(updatedGame);
      }

      // Update clue states
      const updatedClueStates = await ClueService.getGameClueStates(gameId);
      setClueStates(updatedClueStates);

      setMessage("Clue revealed to all players");
      setMessageType("success");
    } catch (error) {
      console.error("Failed to reveal clue:", error);
      setMessage(
        `Failed to reveal clue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles selecting a player from the buzzer queue.
   *
   * Sets the selected player as the focused player for answer adjudication.
   *
   * @param playerId - UUID of the player to select
   */
  const handlePlayerSelection = useCallback(
    async (playerId: string) => {
      if (!user || !game) {
        return;
      }

      // Clear clue timeout (safety measure - should already be cleared when first player buzzed)
      clearClueTimeout();

      // Clear buzzer resolution timeout if it exists
      if (buzzerResolutionTimeoutId) {
        clearTimeout(buzzerResolutionTimeoutId);
        setBuzzerResolutionTimeoutId(null);
      }

      try {
        setMessage("Selecting player...");

        const updatedGame = await GameService.setFocusedPlayer(
          gameId,
          playerId,
          user.id
        );
        setGame(updatedGame);

        // Find player name for feedback
        const player = players.find((p) => p.user_id === playerId);
        const playerName = player?.nickname || "Unknown Player";

        setMessage(`Selected player: ${playerName}`);
        setMessageType("success");
      } catch (error) {
        console.error("Failed to select player:", error);
        setMessage(
          `Failed to select player: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setMessageType("error");
      }
    },
    [user, game, gameId, players, clearClueTimeout, buzzerResolutionTimeoutId]
  );

  /**
   * Handles marking a player's answer as correct.
   *
   * This function manages the complete workflow when a player answers correctly:
   * 1. Records the correct answer in the database
   * 2. Updates the player's score (adds points)
   * 3. Completes the clue and clears focus
   * 4. Refreshes UI state to reflect changes
   */
  const handleMarkCorrect = async () => {
    if (!user || !game || !focusedClue || !game.focused_player_id) {
      return;
    }

    try {
      // Clear timeout since player answered
      clearClueTimeout();

      setMessage("Marking answer correct...");

      // For now, use a placeholder response - in a real implementation,
      // this would come from the player's actual response
      const playerResponse = "Correct response";

      // Use clue value for scoring (Daily Double wagers would be handled separately)
      const scoreValue = focusedClue.value;

      // Mark player correct - this will complete the clue
      const updatedGame = await GameService.markPlayerCorrect(
        gameId,
        focusedClue.id,
        game.focused_player_id,
        playerResponse,
        scoreValue,
        user.id
      );

      setGame(updatedGame);

      // Clear focused clue since it's now completed
      setFocusedClue(null);

      // Update clue states and player scores
      const [updatedClueStates, updatedPlayers] = await Promise.all([
        ClueService.getGameClueStates(gameId),
        GameService.getPlayers(gameId),
      ]);

      setClueStates(updatedClueStates);
      setPlayers(updatedPlayers);

      setMessage("Answer marked correct, score updated");
      setMessageType("success");
    } catch (error) {
      console.error("Failed to mark answer correct:", error);
      setMessage(
        `Failed to mark answer correct: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles marking a player's answer as wrong.
   *
   * This function manages the workflow when a player answers incorrectly:
   * 1. Records the wrong answer in the database
   * 2. Updates the player's score (subtracts points)
   * 3. Keeps clue active for other players or completes if all are wrong
   * 4. Refreshes UI state to reflect changes
   */
  const handleMarkWrong = async () => {
    if (!user || !game || !focusedClue || !game.focused_player_id) {
      return;
    }

    try {
      // Clear timeout since player answered
      clearClueTimeout();

      setMessage("Marking answer incorrect...");

      // For now, use a placeholder response - in a real implementation,
      // this would come from the player's actual response
      const playerResponse = "Incorrect response";

      // Use clue value for scoring (Daily Double wagers would be handled separately)
      const scoreValue = focusedClue.value;

      // Mark player wrong - this may keep clue active or complete it
      const updatedGame = await GameService.markPlayerWrong(
        gameId,
        focusedClue.id,
        game.focused_player_id,
        playerResponse,
        scoreValue,
        user.id
      );

      setGame(updatedGame);

      // Only clear focused clue if it was completed (all players wrong)
      if (updatedGame.focused_clue_id === null) {
        setFocusedClue(null);
        setMessage(
          "Answer marked incorrect, all players have attempted - clue completed"
        );
        // Show correct answer when all players are wrong
        alert(
          `All players answered incorrectly. The correct answer was: ${focusedClue.response}`
        );
      } else {
        setMessage(
          "Answer marked incorrect, buzzer unlocked for other players"
        );
        // Restart timeout for remaining players
        startClueTimeout();
      }

      // Update clue states and player scores
      const [updatedClueStates, updatedPlayers] = await Promise.all([
        ClueService.getGameClueStates(gameId),
        GameService.getPlayers(gameId),
      ]);

      setClueStates(updatedClueStates);
      setPlayers(updatedPlayers);

      setMessageType("success");
    } catch (error) {
      console.error("Failed to mark answer wrong:", error);
      setMessage(
        `Failed to mark answer wrong: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles toggling the buzzer lock state for the current game.
   *
   * This is a core host control that manages when players can buzz in to answer
   * questions. The buzzer should be locked during clue reading and unlocked when
   * players are allowed to respond.
   *
   * **Buzzer Control Logic:**
   * - Locked: Players cannot buzz in (default state, clue reading)
   * - Unlocked: Players can buzz in to answer (after clue is fully read)
   *
   * **User Feedback:**
   * - Shows loading message during operation
   * - Displays success message with new state
   * - Shows error message if operation fails
   * - Updates UI immediately with new buzzer state
   *
   * **Security:**
   * - Validates user authentication and game presence
   * - Uses host authorization through GameService
   * - Handles unauthorized access gracefully
   *
   * **Future Enhancement:**
   * - Could add keyboard shortcut (SPACE) for quick toggling
   * - Could integrate with game board clue selection
   */

  const handleToggleBuzzer = async () => {
    // Validate prerequisites
    if (!user || !game) {
      return;
    }

    try {
      // Provide immediate user feedback
      setMessage("Updating buzzer state...");

      // Toggle buzzer state via GameService
      const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id);

      // Update local state with new game data
      setGame(updatedGame);

      // If buzzer was unlocked and there's a focused clue, start timeout
      if (!updatedGame.is_buzzer_locked && focusedClue) {
        startClueTimeout();
        setMessage("Buzzer unlocked - players have 5 seconds to buzz in");
      } else if (updatedGame.is_buzzer_locked) {
        // If buzzer was locked, clear any active timeout
        clearClueTimeout();
        setMessage("Buzzer locked");
      } else {
        setMessage(
          `Buzzer ${updatedGame.is_buzzer_locked ? "locked" : "unlocked"}`
        );
      }

      setMessageType("success");
    } catch (error) {
      // Log error for debugging
      console.error("Failed to toggle buzzer:", error);

      // Display user-friendly error message
      setMessage(
        `Failed to toggle buzzer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles starting the game by transitioning from lobby to in_progress state.
   */
  const handleStartGame = async () => {
    if (!user || !game) {
      return;
    }

    try {
      // Transition game from lobby to in_progress
      const updatedGame = await GameService.startGame(gameId, user.id);
      setGame(updatedGame);

      // Provide user feedback
      setMessage("Game started successfully!");
      setMessageType("success");

      // Clear message after delay
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 2000);
    } catch (error) {
      console.error("Failed to start game:", error);
      setMessage(
        `Failed to start game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles ending the current game with confirmation and cleanup.
   *
   * This is a destructive operation that marks the game as completed and
   * navigates back to the game creation interface. Includes user confirmation
   * to prevent accidental game termination.
   *
   * **End Game Process:**
   * 1. Shows confirmation dialog to prevent accidents
   * 2. Updates game status to 'completed' in database
   * 3. Displays success message to user
   * 4. Automatically navigates back to creator after delay
   *
   * **User Experience:**
   * - Confirmation dialog prevents accidental termination
   * - Loading message during database operation
   * - Success message with automatic navigation
   * - Error handling for failed operations
   *
   * **Navigation:**
   * - 2-second delay allows user to see success message
   * - Calls onBackToCreator callback to return to main interface
   * - Maintains app state consistency
   */
  const handleEndGame = async () => {
    // Validate prerequisites
    if (!user || !game) {
      return;
    }

    // Confirmation dialog to prevent accidental game termination
    if (!confirm("Are you sure you want to end this game?")) {
      return;
    }

    try {
      // Provide immediate user feedback
      setMessage("Ending game...");

      // End game with appropriate status (completed or cancelled)
      await GameService.endGame(gameId, user.id);

      // Show success message
      setMessage("Game ended successfully");
      setMessageType("success");

      // Navigate back to creator after delay to show success message
      setTimeout(() => {
        onBackToCreator();
      }, 2000);
    } catch (error) {
      // Log error for debugging
      console.error("Failed to end game:", error);

      // Display user-friendly error message
      setMessage(
        `Failed to end game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles score adjustment input changes for players.
   */
  const handleScoreAdjustmentChange = (playerId: string, value: string) => {
    setScoreAdjustments((prev) => ({
      ...prev,
      [playerId]: value,
    }));
  };

  /**
   * Handles adding points to a player's score.
   */
  const handleAddScore = async (playerId: string) => {
    if (!user || !game) return;

    const adjustmentValue = scoreAdjustments[playerId];
    if (!adjustmentValue || adjustmentValue.trim() === "") return;

    const scoreChange = parseInt(adjustmentValue, 10);
    if (isNaN(scoreChange)) return;

    try {
      setMessage("Adjusting player score...");
      await GameService.updatePlayerScore(
        gameId,
        playerId,
        scoreChange,
        user.id
      );

      // Refresh players list
      const updatedPlayers = await GameService.getPlayers(gameId);
      setPlayers(updatedPlayers);

      // Clear the input
      setScoreAdjustments((prev) => ({
        ...prev,
        [playerId]: "",
      }));

      setMessage(`Added ${scoreChange} points to player score`);
      setMessageType("success");

      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 2000);
    } catch (error) {
      console.error("Failed to adjust score:", error);
      setMessage(
        `Failed to adjust score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  /**
   * Handles subtracting points from a player's score.
   */
  const handleSubtractScore = async (playerId: string) => {
    if (!user || !game) return;

    const adjustmentValue = scoreAdjustments[playerId];
    if (!adjustmentValue || adjustmentValue.trim() === "") return;

    const scoreChange = parseInt(adjustmentValue, 10);
    if (isNaN(scoreChange)) return;

    // Use absolute value to ensure we always subtract
    const absoluteScoreChange = Math.abs(scoreChange);

    try {
      setMessage("Adjusting player score...");
      await GameService.updatePlayerScore(
        gameId,
        playerId,
        -absoluteScoreChange,
        user.id
      );

      // Refresh players list
      const updatedPlayers = await GameService.getPlayers(gameId);
      setPlayers(updatedPlayers);

      // Clear the input
      setScoreAdjustments((prev) => ({
        ...prev,
        [playerId]: "",
      }));

      setMessage(`Subtracted ${absoluteScoreChange} points from player score`);
      setMessageType("success");

      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 2000);
    } catch (error) {
      console.error("Failed to adjust score:", error);
      setMessage(
        `Failed to adjust score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setMessageType("error");
    }
  };

  // Authentication guard: Ensure user is logged in
  if (!user) {
    return (
      <div className="game-host-dashboard">
        <p className="text-muted">
          Please log in to access the game dashboard.
        </p>
      </div>
    );
  }

  // Loading state: Show loading indicator while fetching data
  if (loading) {
    return (
      <div className="game-host-dashboard">
        <h3>Loading Game...</h3>
        <p className="text-muted">Please wait while we load the game data.</p>
      </div>
    );
  }

  // Error state: Handle case where game data couldn't be loaded
  if (!game) {
    return (
      <div className="game-host-dashboard">
        <h3>Game Not Found</h3>
        <p className="text-muted">
          The requested game could not be found or you don't have permission to
          access it.
        </p>
        <button className="btn btn-secondary" onClick={onBackToCreator}>
          Back to Game Creator
        </button>
      </div>
    );
  }

  // Main dashboard render: Display full host interface with 6-panel layout
  return (
    <div className="game-host-dashboard" data-game-id={gameId}>
      {/* Dashboard header with title and navigation */}
      <header className="dashboard-header">
        <div className="d-flex justify-content-between align-items-center">
          <h1 className="jeopardy-logo">Game Host Dashboard</h1>
          <button className="jeopardy-button" onClick={onBackToCreator}>
            Back to Creator
          </button>
        </div>
        <p className="text-muted mb-0">Game ID: {gameId}</p>
      </header>

      {/* User feedback messages for operations */}
      {message && (
        <div
          className={`alert ${
            messageType === "success" ? "alert-success" : "alert-danger"
          } jeopardy-alert`}
        >
          {message}
        </div>
      )}

      {/* 4-panel dashboard grid layout */}
      <div className="dashboard-grid">
        {/* Top Row - Panel 2: Game Board Control */}
        <div
          className={`dashboard-panel game-board-panel ${
            isPanelDisabled(game) ? "disabled" : ""
          }`}
        >
          <div className="panel-header">
            <h5>BOARD CONTROL</h5>
          </div>
          <div className="panel-content">
            <div className="board-scale-wrapper">
              <div className="jeopardy-board">
                {/* Game board with real clue set data */}
                {clueSetData && game ? (
                  <>
                    {/* Category headers from current round - direct children of jeopardy-board */}
                    {(() => {
                      // Handle different round types with proper data structure
                      if (game.current_round === "final") {
                        // Final jeopardy has single category
                        return (
                          <div key="final-category" className="category-header">
                            {clueSetData.rounds.final.name}
                          </div>
                        );
                      } else {
                        // Regular rounds have array of categories
                        const currentRoundData =
                          clueSetData.rounds[game.current_round] || [];
                        return currentRoundData.map((category, index) => (
                          <div
                            key={`category-${index}-${category.name}`}
                            className="category-header"
                          >
                            {category.name}
                          </div>
                        ));
                      }
                    })()}

                    {/* Clue cells from current round - direct children of jeopardy-board */}
                    {(() => {
                      if (game.current_round === "final") {
                        // Final Jeopardy has only one clue
                        const finalClue = clueSetData.rounds.final.clues?.[0];
                        return finalClue ? (
                          <div className="clue-cell final-jeopardy">
                            Final Jeopardy
                          </div>
                        ) : null;
                      }

                      // Regular rounds: create grid of all clues
                      const currentRoundData =
                        clueSetData.rounds[game.current_round] || [];
                      const allClues: Array<{
                        categoryIndex: number;
                        clue: ClueData;
                      }> = [];

                      currentRoundData.forEach((category, categoryIndex) => {
                        category.clues.forEach((clue) => {
                          allClues.push({ categoryIndex, clue });
                        });
                      });

                      // Sort by position to maintain proper board order
                      allClues.sort((a, b) => {
                        if (a.clue.position !== b.clue.position) {
                          return a.clue.position - b.clue.position;
                        }
                        return a.categoryIndex - b.categoryIndex;
                      });

                      return allClues.map((item, index) => {
                        // Find clue state for this clue using the clue ID
                        const clueState = clueStates.find(
                          (state) => state.clue_id === item.clue.id
                        );

                        const isRevealed = clueState?.revealed || false;
                        const isCompleted = clueState?.completed || false;
                        const isFocused =
                          focusedClue && focusedClue.id === item.clue.id;

                        // Check if this clue is a Daily Double
                        const isDailyDouble = dailyDoublePositions.some(
                          (position) =>
                            position.category === item.categoryIndex + 1 &&
                            position.row === item.clue.position
                        );

                        let cellClass = "clue-cell";
                        if (isCompleted) {
                          cellClass += " completed";
                        } else if (isRevealed) {
                          cellClass += " revealed";
                        }
                        if (isFocused) {
                          cellClass += " focused";
                        }
                        if (isDailyDouble) {
                          cellClass += " daily-double";
                        }

                        const handleClick = () => {
                          if (!isCompleted && !isRevealed && item.clue.id) {
                            handleClueSelection(item.clue.id, item.clue);
                          }
                        };

                        const isInteractive = !isCompleted && !isRevealed;

                        // Build aria-label without nested ternary
                        let ariaLabel = `Clue for $${item.clue.value}`;
                        if (isDailyDouble) {
                          ariaLabel += " - Daily Double";
                        }
                        if (isCompleted) {
                          ariaLabel += " - Completed";
                        } else if (isRevealed) {
                          ariaLabel += " - Revealed";
                        }

                        return (
                          <button
                            key={`clue-${item.clue.id || index}-${
                              item.clue.value
                            }`}
                            type="button"
                            className={cellClass}
                            onClick={handleClick}
                            disabled={!isInteractive}
                            aria-label={ariaLabel}
                            style={{
                              cursor: isInteractive ? "pointer" : "default",
                            }}
                          >
                            ${item.clue.value}
                          </button>
                        );
                      });
                    })()}
                  </>
                ) : (
                  /* Loading placeholder - direct children of jeopardy-board */
                  <>
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={`loading-category-${i}`}
                        className="category-header"
                      >
                        Loading...
                      </div>
                    ))}
                    {Array.from({ length: 30 }, (_, i) => (
                      <div key={`loading-clue-${i}`} className="clue-cell">
                        ...
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Row - Panel 1: Player Control */}
        <div className="dashboard-panel player-scores-panel">
          <div className="panel-header">
            <h5>PLAYER CONTROL</h5>
          </div>
          <div className="panel-content">
            {/* Game Control Buttons - moved from Clue Control Panel */}
            <div className="game-control-buttons d-flex gap-2 mb-3">
              <button
                className="jeopardy-button flex-1"
                onClick={() => {
                  const buttonConfig = getGameControlButton(game);
                  if (buttonConfig.handler === "start") {
                    handleStartGame();
                  } else if (buttonConfig.handler === "end") {
                    handleEndGame();
                  }
                }}
                disabled={getGameControlButton(game).disabled}
              >
                {getGameControlButton(game).text}
              </button>
              <button
                className="jeopardy-button flex-1"
                disabled
                title="Round progression controls"
              >
                Next Round
              </button>
            </div>

            {/* Game Status Info - moved from Game Status Panel */}
            {renderGameStatusInfo(game, clueStates)}

            {players.length === 0 ? (
              <p className="text-muted">No players joined yet</p>
            ) : (
              <div className="player-scores-list">
                {players.map((player, index) => (
                  <div key={player.user_id} className="player-score-item">
                    <div className="player-details">
                      {/* <SimplePlayerConnectionStatus playerId={player.user_id} /> */}
                      <strong>
                        {player.nickname || `Player ${index + 1}`}
                      </strong>
                      <small className="player-email">
                        {(() => {
                          // Use enhanced player data with profile information
                          const playerWithProfile = player as Player & {
                            profiles?: {
                              display_name?: string;
                              username?: string;
                              email?: string;
                            };
                          };
                          return (
                            playerWithProfile.profiles?.email ||
                            "No email available"
                          );
                        })()}
                      </small>
                    </div>
                    <div
                      className={`player-score ${
                        player.score < 0 ? "negative" : ""
                      }`}
                    >
                      ${player.score}
                    </div>
                    <div className="player-score-adjustment">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="±"
                        value={scoreAdjustments[player.user_id] || ""}
                        onChange={(e) =>
                          handleScoreAdjustmentChange(
                            player.user_id,
                            e.target.value
                          )
                        }
                        disabled={game?.status !== "in_progress"}
                        style={{ width: "60px" }}
                      />
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAddScore(player.user_id)}
                        disabled={
                          game?.status !== "in_progress" ||
                          !scoreAdjustments[player.user_id]?.trim()
                        }
                        title="Add points"
                      >
                        +
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleSubtractScore(player.user_id)}
                        disabled={
                          game?.status !== "in_progress" ||
                          !scoreAdjustments[player.user_id]?.trim()
                        }
                        title="Subtract points"
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="player-count">
              <small className="text-muted">
                Total Players: {players.length}
              </small>
            </div>
          </div>
        </div>

        {/* Top Row - Panel 2: Buzzer Queue */}
        <div
          className={`dashboard-panel buzzer-queue-panel ${
            isPanelDisabled(game) ? "disabled" : ""
          }`}
        >
          <div className="panel-header">
            <h5>BUZZER QUEUE</h5>
          </div>
          <div className="panel-content">
            {/* Connection & Latency Status - moved from Buzzer Control Panel */}
            <div className="connection-status">
              <span>
                <span className="status-label">Connection Status:</span>
                <span
                  className={(() => {
                    if (connectionStatus === "ACTIVE") {
                      return "text-success";
                    }
                    if (connectionStatus === "SLOW") {
                      return "text-warning";
                    }
                    return "text-danger";
                  })()}
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
                    if (!isNaN(value) && value >= 100 && value <= 5000) {
                      setBuzzerTimeoutMs(value);
                      // TODO: Save to database when implemented
                    }
                  }}
                  min="100"
                  max="5000"
                  step="50"
                  style={{
                    width: "80px",
                    display: "inline-block",
                    marginLeft: "8px",
                  }}
                />
                <span
                  style={{
                    marginLeft: "4px",
                    fontSize: "0.8em",
                    color: "#ccc",
                  }}
                >
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
                  const player = players.find(
                    (p) => p.user_id === buzz.user_id
                  );

                  // Use enhanced buzz data with player nickname
                  const buzzWithPlayerData = buzz as Buzz & {
                    profiles?: { display_name?: string; username?: string };
                    playerNickname?: string | null;
                  };

                  // Priority: game-specific nickname > profile display_name > profile username > fallback
                  const gameNickname =
                    buzzWithPlayerData.playerNickname || player?.nickname;
                  const profileName =
                    buzzWithPlayerData.profiles?.display_name ||
                    buzzWithPlayerData.profiles?.username;
                  const playerName =
                    gameNickname || profileName || "Unknown Player";
                  // Use stored reaction time if available, otherwise fall back to timestamp difference
                  const reactionTime = buzz.reaction_time;
                  let timingText: string;

                  if (reactionTime !== null && reactionTime !== undefined) {
                    // Use client-calculated reaction time (most accurate)
                    timingText =
                      index === 0
                        ? `${reactionTime} ms`
                        : `+${reactionTime} ms`;
                  } else {
                    // Fallback to timestamp difference (less accurate)
                    const buzzTime = new Date(buzz.created_at);
                    const firstBuzzTime = new Date(buzzerQueue[0].created_at);
                    const timeDiff =
                      buzzTime.getTime() - firstBuzzTime.getTime();
                    timingText = timeDiff === 0 ? "0 ms" : `+${timeDiff} ms`;
                  }
                  const ariaLabel = `Select player ${playerName} (position ${
                    index + 1
                  }, ${timingText})`;

                  return (
                    <button
                      key={buzz.id}
                      type="button"
                      className={`queue-item ${
                        game?.focused_player_id === buzz.user_id
                          ? "selected"
                          : ""
                      } ${
                        autoSelectedPlayerId === buzz.user_id
                          ? "auto-selected"
                          : ""
                      }`}
                      onClick={() => handlePlayerSelection(buzz.user_id)}
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

            {/* Clear Queue Button - positioned at bottom center */}
            <div className="clear-queue-container">
              <button
                className="jeopardy-button-small"
                onClick={() => setBuzzerQueue([])}
                disabled={buzzerQueue.length === 0}
              >
                Clear Queue
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row - Panel 3: Clue Control */}
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
                <div
                  className={`jeopardy-clue-display ${
                    !focusedClue ? "no-clue-selected" : ""
                  }`}
                >
                  {focusedClue ? (
                    <div className="clue-text">{focusedClue.prompt}</div>
                  ) : (
                    <div className="clue-text">No clue selected</div>
                  )}
                </div>

                {/* Multi-state Reveal/Buzzer Button */}
                <div className="clue-control-button">
                  {(() => {
                    const buttonState = getRevealBuzzerButtonState();
                    const isDisabled = buttonState === "disabled";
                    const buttonText = {
                      disabled: "Select Clue",
                      reveal: "Reveal Prompt",
                      unlock: "Unlock Buzzer",
                      lock: "Lock Buzzer",
                    }[buttonState];
                    const buttonClass = {
                      disabled: "",
                      reveal: "",
                      unlock: "red",
                      lock: "green",
                    }[buttonState];

                    return (
                      <button
                        className={`jeopardy-button ${buttonClass}`}
                        onClick={handleRevealBuzzerButton}
                        disabled={isDisabled}
                      >
                        {buttonText}
                      </button>
                    );
                  })()}
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
            </div>

            {/* Bottom section with Correct Response and Mark buttons */}
            <div className="clue-control-bottom">
              <div
                className={`clue-response-row ${
                  !focusedClue ? "no-clue-focused" : ""
                }`}
              >
                <span className="response-label">Correct Response:</span>
                <span className="response-text">
                  {focusedClue ? focusedClue.response : "No Clue Selected"}
                </span>
              </div>

              {/* Adjudication Control Buttons */}
              <div className="clue-control-buttons">
                <div className="d-flex gap-2">
                  <button
                    className="jeopardy-button flex-1"
                    onClick={handleMarkCorrect}
                    disabled={!focusedClue || !game.focused_player_id}
                  >
                    Mark Correct
                  </button>
                  <button
                    className="jeopardy-button flex-1"
                    onClick={handleMarkWrong}
                    disabled={!focusedClue || !game.focused_player_id}
                  >
                    Mark Wrong
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
