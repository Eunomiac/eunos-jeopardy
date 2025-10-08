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

import { supabase } from "../../services/supabase/client";
import { AnimationService } from "../../services/animations/AnimationService";
import { BroadcastService } from "../../services/realtime/BroadcastService";
import { BuzzerQueueManager } from "../../services/buzzer/BuzzerQueueManager";
import type { BroadcastSubscription, PlayerBuzzPayload } from "../../types/BroadcastEvents";
import "./GameHostDashboard.scss";

import { BuzzerQueuePanel } from "./panels/BuzzerQueuePanel";
import { ClueControlPanel } from "./panels/ClueControlPanel";
import { Alert, useAlert } from "../common/Alert";

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

  if (String(game.status) === "game_intro") {
    return {
      text: "End Game",
      handler: "end" as const,
      disabled: false,
    };
  }

  if (String(game.status) === "introducing_categories") {
    return {
      text: "End Game",
      handler: "end" as const,
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
 * Helper to extract clue IDs for a specific round from clue set data.
 *
 * Filters clues by round to ensure progress tracking only counts
 * clues from the current round, not previous rounds.
 *
 * @param clueSetData - Complete clue set data structure
 * @param round - Round type to get clues for
 * @returns Array of clue IDs for the specified round
 */
const getCurrentRoundClueIds = (
  clueSetData: ClueSetData,
  round: string
): string[] => {
  if (round === "final") {
    return (clueSetData.rounds.final.clues?.map((c) => c.id).filter((id): id is string => id !== undefined)) || [];
  }

  const roundData = clueSetData.rounds[round as "jeopardy" | "double"];
  if (!Array.isArray(roundData)) {return [];}

  return roundData.flatMap((category) =>
    category.clues.map((clue) => clue.id).filter((id): id is string => id !== undefined)
  );
};

/**
 * Helper function to calculate clue completion progress for current round only.
 *
 * Filters clue states to only include clues from the current round,
 * ensuring accurate progress tracking for round transitions.
 *
 * @param clueStates - All clue states for the game
 * @param currentRound - Current round type
 * @param clueSetData - Complete clue set data (needed to filter by round)
 * @returns Object with completedCount, totalClues, and percentage
 */
const calculateClueProgress = (
  clueStates: ClueState[],
  currentRound: string,
  clueSetData: ClueSetData | null
) => {
  if (!clueSetData) {
    return { completedCount: 0, totalClues: 0, percentage: 0 };
  }

  // Get clue IDs for current round
  const currentRoundClueIds = getCurrentRoundClueIds(clueSetData, currentRound);

  // Filter clue states to only include current round
  const currentRoundStates = clueStates.filter((state) =>
    currentRoundClueIds.includes(state.clue_id)
  );

  const completedCount = currentRoundStates.filter((state) => state.completed).length;
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
const renderGameStatusInfo = (game: Game, clueStates: ClueState[], clueSetData: ClueSetData | null) => {
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
                game.current_round,
                clueSetData
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
              calculateClueProgress(clueStates, game.current_round, clueSetData).percentage
            }
            max={100}
          >
            {calculateClueProgress(clueStates, game.current_round, clueSetData).percentage}%
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

  /** Centralized alert management */
  const { alertState, showStatus, showNotification, showConfirmation } = useAlert();

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

  /** Game introduction animation state */
  const [isPlayingGameIntro, setIsPlayingGameIntro] = useState(false);
  const [gameIntroComplete, setGameIntroComplete] = useState(false);

  /** Broadcast subscription for real-time buzzer events */
  const [, setBroadcastSubscription] = useState<BroadcastSubscription | null>(null);

  /** Buzzer queue manager for tracking buzzes and determining fastest player */
  const [buzzerQueueManager] = useState(() => new BuzzerQueueManager());

  /** Timestamp when buzzer was unlocked (for debugging) */
  const [, setBuzzerUnlockTime] = useState<number | null>(null);

  /** Animation service instance */
  const animationService = AnimationService.getInstance();

  /** Category introduction state */
  const [isIntroducingCategories, setIsIntroducingCategories] = useState(false);

  /** Current category being introduced (1-6) */
  const [currentIntroductionCategory, setCurrentIntroductionCategory] = useState(0);

  /** Daily Double wager state */
  const [dailyDoubleWager, setDailyDoubleWager] = useState<number | null>(null);

  /** Daily Double wager input value */
  const [wagerInput, setWagerInput] = useState("");

  /** Round completion state for enabling "Next Round" button */
  const [isRoundComplete, setIsRoundComplete] = useState(false);

  /**
   * Effect to sync game state and handle animation triggers via subscription.
   */
  useEffect(() => {
    if (!game) {
      return;
    }

    const gameStatus = String(game.status);

    // Sync category introduction state
    const isIntroducing = gameStatus === "introducing_categories";
    setIsIntroducingCategories(isIntroducing);

    if (isIntroducing) {
      // Sync current category from database
      const dbCategory = (game as Game & { current_introduction_category?: number }).current_introduction_category || 1;
      setCurrentIntroductionCategory(dbCategory);
    } else {
      setCurrentIntroductionCategory(0);
    }

    // Sync game intro state
    const isGameIntro = gameStatus === "game_intro";
    if (isGameIntro && !isPlayingGameIntro) {
      // Game intro status detected but animation not started - this is initial load
      setGameIntroComplete(true); // Skip animation on reload
    }
  }, [game, isPlayingGameIntro]);

  /**
   * Effect to set up game subscription for animation triggers.
   */
  useEffect(() => {
    if (!gameId) {
      return () => {};
    }

    const subscription = supabase
      .channel('game-status-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;

        // Trigger game introduction animation
        if (oldStatus === 'lobby' && newStatus === 'game_intro') {
          console.log('🎬 Starting game introduction animation');
          setIsPlayingGameIntro(true);
          setGameIntroComplete(false);

          // Play host dashboard intro animation through AnimationService
          animationService.animateHostDashboardIntro({
            onComplete: () => {
              console.log('🎬 Host game introduction animation complete');
              setIsPlayingGameIntro(false);
              setGameIntroComplete(true);
            }
          });
        }

        // Handle other status transitions
        if (oldStatus === 'game_intro' && newStatus === 'introducing_categories') {
          console.log('🎯 Category introductions started');
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId, animationService]);

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
        // Set loading state
        setLoading(true);

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
        showStatus(
          `Failed to load game: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "error"
        );
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
   * Handles player buzz events from broadcast channel.
   * Automatically focuses fastest player and updates UI immediately.
   * Database writes happen asynchronously in the background.
   */
  const handlePlayerBuzz = useCallback((payload: PlayerBuzzPayload) => {
    console.log(`⚡ Received player buzz: ${payload.playerNickname} (${payload.reactionTimeMs}ms)`);

    // Cancel the 5-second clue timeout when first player buzzes in
    clearClueTimeout();

    // Add buzz to queue manager
    const isNewFastest = buzzerQueueManager.addBuzz(
      payload.playerId,
      payload.playerNickname,
      payload.reactionTimeMs
    );

    // Update buzzer queue display
    const queueEntries = buzzerQueueManager.getQueue();
    const buzzes: Buzz[] = queueEntries.map((entry) => ({
      id: `${payload.gameId}-${entry.playerId}`,
      game_id: payload.gameId,
      clue_id: payload.clueId,
      user_id: entry.playerId,
      reaction_time: entry.reactionTimeMs,
      created_at: new Date(entry.receivedAt).toISOString(),
      playerNickname: entry.playerNickname,
    }));
    setBuzzerQueue(buzzes);

    // If this is the new fastest buzz, auto-focus this player
    if (isNewFastest) {
      const fastestPlayerId = buzzerQueueManager.getFastestPlayer();
      const fastestNickname = buzzerQueueManager.getFastestPlayerNickname();
      const fastestTime = buzzerQueueManager.getFastestReactionTime();

      if (fastestPlayerId && fastestNickname) {
        console.log(`🎯 Auto-focusing fastest player: ${fastestNickname} (${fastestTime}ms)`);

        // Broadcast focus change to all clients (fire and forget)
        BroadcastService.broadcastFocusPlayer(
          payload.gameId,
          fastestPlayerId,
          fastestNickname,
          queueEntries.length > 1 ? 'correction' : 'auto'
        ).catch((error) => {
          console.error("Failed to broadcast focus player:", error);
        });

        // Update database with focused player (fire and forget)
        GameService.setFocusedPlayer(payload.gameId, fastestPlayerId, user!.id)
          .then(() => {
            showStatus(`Auto-selected ${fastestNickname} (${fastestTime}ms)`, "success");
          })
          .catch((error) => {
            console.error("Failed to set focused player in database:", error);
          });

        // Record buzz in database (fire and forget)
        GameService.recordBuzz(
          payload.gameId,
          payload.clueId,
          payload.playerId,
          payload.reactionTimeMs
        ).catch((error) => {
          console.error("Failed to record buzz in database:", error);
        });
      }
    } else {
      // Not the fastest, but still record in database (fire and forget)
      GameService.recordBuzz(
        payload.gameId,
        payload.clueId,
        payload.playerId,
        payload.reactionTimeMs
      ).catch((error) => {
        console.error("Failed to record buzz in database:", error);
      });
    }
  }, [buzzerQueueManager, user, clearClueTimeout]);

  /**
   * Effect to set up broadcast channel for real-time buzzer events.
   */
  useEffect(() => {
    if (!gameId || !user) {
      return () => {};
    }

    console.log(`📡 Setting up broadcast channel for game: ${gameId}`);

    // Subscribe to broadcast channel for buzzer events
    const subscription = BroadcastService.subscribeToGameBuzzer(gameId, {
      onPlayerBuzz: handlePlayerBuzz,
      onBuzzerUnlock: (payload) => {
        console.log(`🔓 Buzzer unlocked at ${payload.timestamp}`);
        setBuzzerUnlockTime(payload.timestamp);
      },
      onBuzzerLock: (payload) => {
        console.log(`🔒 Buzzer locked at ${payload.timestamp}`);
        setBuzzerUnlockTime(null);
      },
      onFocusPlayer: (payload) => {
        console.log(`👁️ Focus player: ${payload.playerNickname} (${payload.source})`);
      },
    });

    setBroadcastSubscription(subscription);

    // Cleanup on unmount
    return () => {
      console.log(`🔌 Cleaning up broadcast channel for game: ${gameId}`);
      subscription.unsubscribe();
      setBroadcastSubscription(null);
    };
  }, [gameId, user, handlePlayerBuzz]);

  /**
   * Effect to set up real-time subscriptions for game state changes.
   */
  useEffect(() => {
    if (!gameId) {
      return () => {};
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
  }, [gameId, user]);

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
      const sortedBuzzes = [...buzzes].sort((a: Buzz, b: Buzz) => {
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
   * Effect to check round completion and enable "Next Round" button.
   *
   * Monitors clue states and updates the isRoundComplete state when
   * all clues in the current round have been completed.
   */
  useEffect(() => {
    if (!game || !clueSetData) {return;}

    const checkRoundCompletion = () => {
      const progress = calculateClueProgress(clueStates, game.current_round, clueSetData);
      setIsRoundComplete(progress.completedCount >= progress.totalClues);
    };

    checkRoundCompletion();
  }, [clueStates, game?.current_round, clueSetData, game]);

  // Note: Round transition animation handling removed
  // Host manually controls category introductions after round transition,
  // just like after game start. The round_transition status shows
  // "Introduce Categories" button in the Board Control panel.

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

    // Check if this is a Daily Double
    const isDailyDouble = dailyDoublePositions.some(
      (position) => {
        // Find the clue's position in the board
        const clueData = clueSetData?.rounds[game?.current_round || 'jeopardy'];
        if (!Array.isArray(clueData)) {
          return false;
        }

        for (let categoryIndex = 0; categoryIndex < clueData.length; categoryIndex++) {
          const categoryData = clueData[categoryIndex];
          const clueInCategory = categoryData.clues.find((c) => c.id === focusedClue.id);
          if (clueInCategory) {
            return position.category === categoryIndex + 1 &&
                   position.row === clueInCategory.position;
          }
        }
        return false;
      }
    );

    if (!isRevealed) {
      if (isDailyDouble) {
        // For Daily Doubles, check if player is selected and wager is set
        if (!game.focused_player_id) {
          return "daily-double"; // Show "Daily Double!" button
        } else if (!dailyDoubleWager) {
          return "daily-double-wager"; // Show wager input state
        } else {
          return "reveal"; // Show "Reveal Prompt" after wager is set
        }
      } else {
        return "reveal"; // Regular clue
      }
    }

    // For Daily Doubles, skip buzzer unlock/lock (they're completed after one answer)
    if (isDailyDouble) {
      return "disabled";
    }

    // Regular clue buzzer logic
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
      case "daily-double":
        await handleDailyDoubleClick();
        break;
      case "daily-double-wager":
        // Do nothing - wager input should be visible
        break;
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
      showStatus("Time expired - completing clue...", "info");

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

      // Show correct answer to host in a modal
      await showNotification(
        `The correct answer was: "${focusedClue.response}"`,
        "Time Expired - Clue Completed",
        "info"
      );
    } catch (error) {
      console.error("Failed to handle clue timeout:", error);
      showStatus(
        `Failed to handle timeout: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  }, [user, game, focusedClue, gameId, showNotification]);

  /**
   * Creates the countdown interval for the active clue.
   * Decrements time remaining once per second and clears itself at 0.
   */
  const createCountdownInterval = useCallback((): NodeJS.Timeout => {
    const intervalId = setInterval(() => {
      setClueTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalId);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return intervalId;
  }, []);

  /**
   * Creates the main timeout that fires when the clue time expires.
   */
  const createClueResolutionTimeout = useCallback(
    (countdownInterval: NodeJS.Timeout): NodeJS.Timeout => setTimeout(async () => {
      clearInterval(countdownInterval);
      setClueTimeRemaining(null);
      await handleClueTimeout();
    }, CLUE_TIMEOUT_SECONDS * 1000),
    [handleClueTimeout, CLUE_TIMEOUT_SECONDS]
  );


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

      // Use helpers to avoid deep nesting
      const intervalId = createCountdownInterval();
      const timeoutId = createClueResolutionTimeout(intervalId);

      setClueTimeoutId(timeoutId);
    }, 100); // 100ms delay to ensure state stability
  }, [clueTimeoutId, CLUE_TIMEOUT_SECONDS, createCountdownInterval, createClueResolutionTimeout]);

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
        showStatus("Unfocusing clue...", "info");

        // Clear focused clue in game state
        const clearedGame = await GameService.setFocusedClue(
          gameId,
          null,
          user.id
        );
        setGame(clearedGame);
        setFocusedClue(null);

        showStatus("Clue unfocused", "success");
        return;
      }

      showStatus("Selecting clue...", "info");

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
        // Check if there's already a wager for this clue and focused player
        const existingWager = await GameService.getDailyDoubleWager(gameId, user.id);

        if (existingWager) {
          // Pre-populate with existing wager and set state
          setWagerInput(existingWager.toString());
          setDailyDoubleWager(existingWager);
          showStatus(
            `🎯 Daily Double selected! Current wager: $${existingWager.toLocaleString()}`,
            "success"
          );
        } else {
          // Pre-populate wager input with current clue value
          setWagerInput(fullClueData.value.toString());
          showStatus(
            `🎯 Daily Double selected! Get player's wager before revealing.`,
            "success"
          );
        }
      } else {
        showStatus(`Clue selected: ${clueData.prompt.substring(0, 50)}...`, "success");
      }
    } catch (error) {
      console.error("Failed to select clue:", error);
      showStatus(
        `Failed to select clue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
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
      showStatus("Revealing clue...", "info");

      // Mark clue as revealed
      await ClueService.revealClue(gameId, focusedClue.id);

      // Lock the buzzer when revealing clue (host must unlock it manually)
      if (!game.is_buzzer_locked) {
        // Broadcast lock first
        await BroadcastService.broadcastBuzzerLock(gameId);

        // Then update database
        const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id);
        setGame(updatedGame);
      }

      // Update clue states
      const updatedClueStates = await ClueService.getGameClueStates(gameId);
      setClueStates(updatedClueStates);

      showStatus("Clue revealed to all players", "success");
    } catch (error) {
      console.error("Failed to reveal clue:", error);
      showStatus(
        `Failed to reveal clue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles selecting a player from the buzzer queue (manual override).
   *
   * Sets the selected player as the focused player for answer adjudication.
   * This is a manual override of the automatic fastest player selection.
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
        showStatus("Selecting player...", "info");

        // Find player name for broadcast
        const player = players.find((p) => p.user_id === playerId);
        const playerName = player?.nickname || "Unknown Player";

        // Broadcast focus change first (manual override)
        await BroadcastService.broadcastFocusPlayer(
          gameId,
          playerId,
          playerName,
          'manual'
        );

        // Then update database
        const updatedGame = await GameService.setFocusedPlayer(
          gameId,
          playerId,
          user.id
        );
        setGame(updatedGame);

        showStatus(`Manually selected player: ${playerName}`, "success");
      } catch (error) {
        console.error("Failed to select player:", error);
        showStatus(
          `Failed to select player: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "error"
        );
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

      showStatus("Marking answer correct...", "info");

      // For now, use a placeholder response - in a real implementation,
      // this would come from the player's actual response
      const playerResponse = "Correct response";

      // Use effective clue value (wager for Daily Doubles, original value for regular clues)
      const scoreValue = await GameService.getEffectiveClueValue(
        gameId,
        focusedClue.id,
        game.focused_player_id
      );

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

      showStatus("Answer marked correct, score updated", "success");
    } catch (error) {
      console.error("Failed to mark answer correct:", error);
      showStatus(
        `Failed to mark answer correct: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
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

      showStatus("Marking answer incorrect...", "info");

      // For now, use a placeholder response - in a real implementation,
      // this would come from the player's actual response
      const playerResponse = "Incorrect response";

      // Use effective clue value (wager for Daily Doubles, original value for regular clues)
      const scoreValue = await GameService.getEffectiveClueValue(
        gameId,
        focusedClue.id,
        game.focused_player_id
      );

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
        // Update clue states and player scores first
        const [updatedClueStates, updatedPlayers] = await Promise.all([
          ClueService.getGameClueStates(gameId),
          GameService.getPlayers(gameId),
        ]);

        setClueStates(updatedClueStates);
        setPlayers(updatedPlayers);

        // Clear focused clue
        const correctAnswer = focusedClue.response;
        setFocusedClue(null);

        // Show correct answer to host in a modal
        await showNotification(
          `All players have attempted. The correct answer was: "${correctAnswer}"`,
          "Clue Completed - All Players Wrong",
          "info"
        );
      } else {
        // Clue still active - broadcast unlock for remaining players
        console.log("🔓 Broadcasting buzzer unlock for remaining players after wrong answer");

        // Clear buzzer queue for new round of buzzing
        buzzerQueueManager.clear();
        setBuzzerQueue([]);

        // Broadcast unlock event to all players
        await BroadcastService.broadcastBuzzerUnlock(gameId, focusedClue.id);

        showStatus(
          "Answer marked incorrect, buzzer unlocked for other players",
          "success"
        );

        // Update clue states and player scores
        const [updatedClueStates, updatedPlayers] = await Promise.all([
          ClueService.getGameClueStates(gameId),
          GameService.getPlayers(gameId),
        ]);

        setClueStates(updatedClueStates);
        setPlayers(updatedPlayers);

        // Restart timeout for remaining players
        startClueTimeout();
      }
    } catch (error) {
      console.error("Failed to mark answer wrong:", error);
      showStatus(
        `Failed to mark answer wrong: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
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
    if (!user || !game || !focusedClue) {
      return;
    }

    try {
      // Determine new state (toggle current state)
      const willUnlock = game.is_buzzer_locked;

      // Provide immediate user feedback
      showStatus("Updating buzzer state...", "info");

      if (willUnlock) {
        // UNLOCK: Broadcast first for immediate UI update, then database
        console.log("🔓 Unlocking buzzer - broadcasting first");

        // Clear buzzer queue for new clue
        buzzerQueueManager.clear();
        setBuzzerQueue([]);

        // Broadcast unlock event
        await BroadcastService.broadcastBuzzerUnlock(gameId, focusedClue.id);

        // Update database
        const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id);
        setGame(updatedGame);

        // Start clue timeout
        startClueTimeout();
        showStatus("Buzzer unlocked - players have 5 seconds to buzz in", "success");
      } else {
        // LOCK: Broadcast first for immediate UI update, then database
        console.log("🔒 Locking buzzer - broadcasting first");

        // Broadcast lock event
        await BroadcastService.broadcastBuzzerLock(gameId);

        // Update database
        const updatedGame = await GameService.toggleBuzzerLock(gameId, user.id);
        setGame(updatedGame);

        // Clear clue timeout
        clearClueTimeout();
        showStatus("Buzzer locked", "success");
      }
    } catch (error) {
      // Log error for debugging
      console.error("Failed to toggle buzzer:", error);

      // Display user-friendly error message
      showStatus(
        `Failed to toggle buzzer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles starting the game by beginning the game introduction animation.
   */
  const handleStartGame = async () => {
    if (!user || !game) {
      console.log('🎬 Cannot start game - missing user or game:', { user: !!user, game: !!game });
      return;
    }

    console.log('🎬 Host starting game introduction for gameId:', gameId);

    try {
      // Initialize current player randomly if not already set
      if (!game.current_player_id) {
        console.log('🎯 Initializing current player randomly...');
        await GameService.initializeCurrentPlayerRandomly(gameId, user.id);
      }

      // Start game introduction animation
      console.log('🎬 Calling GameService.startGameIntroduction...');
      const updatedGame = await GameService.startGameIntroduction(gameId, user.id);
      console.log('🎬 Game introduction started, updated game:', updatedGame);
      setGame(updatedGame);

      // Provide user feedback
      showStatus("Game introduction started!", "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to start game introduction:", error);
      showStatus(
        `Failed to start game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles starting category introductions after game intro animation completes.
   */
  const handleStartCategoryIntroductions = async () => {
    if (!user || !game) {
      return;
    }

    try {
      // Start category introductions
      const updatedGame = await GameService.startCategoryIntroductions(gameId, user.id);
      setGame(updatedGame);
      setIsIntroducingCategories(true);
      setCurrentIntroductionCategory(1);

      // Provide user feedback
      showStatus("Category introductions started!", "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to start category introductions:", error);
      showStatus(
        `Failed to start category introductions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Advances to the next category in the introduction sequence.
   */
  const handleNextCategory = async () => {
    if (!user || !game) {
      return;
    }

    try {
      const updatedGame = await GameService.advanceToNextCategory(gameId, user.id);
      setGame(updatedGame);

      // Check if we completed all introductions
      if (updatedGame.status === 'in_progress') {
        setIsIntroducingCategories(false);
        setCurrentIntroductionCategory(0);
        showStatus("Category introductions complete! Game started!", "success");
      } else {
        // Move to next category
        setCurrentIntroductionCategory((prev) => prev + 1);
      }

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to advance category:", error);
      showStatus(
        `Failed to advance category: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Skips category introductions and starts the game immediately.
   */
  const handleSkipIntroductions = async () => {
    if (!user || !game) {
      return;
    }

    try {
      const updatedGame = await GameService.completeCategoryIntroductions(gameId, user.id);
      setGame(updatedGame);
      setIsIntroducingCategories(false);
      setCurrentIntroductionCategory(0);

      showStatus("Category introductions skipped! Game started!", "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to skip introductions:", error);
      showStatus(
        `Failed to skip introductions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles Daily Double button click - automatically selects current player.
   */
  const handleDailyDoubleClick = async () => {
    if (!user || !game || !focusedClue) {
      return;
    }

    try {
      // Get the current player (who gets to answer Daily Doubles)
      if (!game.current_player_id) {
        showStatus("No current player set. Please initialize current player first.", "error");
        return;
      }

      // Automatically focus the current player for the Daily Double
      const updatedGame = await GameService.updateGame(gameId, {
        focused_player_id: game.current_player_id
      }, user.id);

      setGame(updatedGame);
      showStatus(`Daily Double! Current player automatically selected.`, "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to handle Daily Double:", error);
      showStatus(
        `Failed to handle Daily Double: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles Daily Double wager submission.
   */
  const handleDailyDoubleWager = async () => {
    if (!user || !game || !wagerInput) {
      return;
    }

    const wagerAmount = parseInt(wagerInput, 10);
    if (isNaN(wagerAmount) || wagerAmount <= 0) {
      showStatus("Please enter a valid wager amount", "error");
      return;
    }

    try {
      await GameService.setDailyDoubleWager(gameId, user.id, wagerAmount);
      setDailyDoubleWager(wagerAmount);
      // Keep the wager input showing the current wager amount
      // setWagerInput(""); // Don't clear - let it show the current wager

      showStatus(`Daily Double wager set: $${wagerAmount.toLocaleString()}`, "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to set Daily Double wager:", error);
      showStatus(
        `Failed to set wager: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Clears the Daily Double wager after clue completion.
   */
  const handleClearDailyDoubleWager = async () => {
    if (!user || !game) {
      return;
    }

    try {
      await GameService.clearDailyDoubleWager(gameId, user.id);
      setDailyDoubleWager(null);

      // Reset wager input to clue value
      if (focusedClue) {
        setWagerInput(focusedClue.value.toString());
      }

      showStatus("Daily Double wager cleared", "success");

      // Clear message after delay
      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to clear Daily Double wager:", error);
      showStatus(
        `Failed to clear wager: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
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
    const confirmed = await showConfirmation(
      "Are you sure you want to end this game?",
      "End Game",
      "warning"
    );

    if (!confirmed) {
      return;
    }

    try {
      // Provide immediate user feedback
      showStatus("Ending game...", "info");

      // End game with appropriate status (completed or cancelled)
      await GameService.endGame(gameId, user.id);

      // Show success message
      showStatus("Game ended successfully", "success");

      // Navigate back to creator after delay to show success message
      setTimeout(() => {
        onBackToCreator();
      }, 2000);
    } catch (error) {
      // Log error for debugging
      console.error("Failed to end game:", error);

      // Display user-friendly error message
      showStatus(
        `Failed to end game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles round transition to next round.
   *
   * Checks if the current round is complete and either proceeds with
   * the transition or shows a confirmation dialog for early transitions.
   *
   * **Round Progression:**
   * - jeopardy → double
   * - double → final
   * - final → (disabled, no further progression)
   *
   * **Validation:**
   * - Automatic enablement when all clues completed
   * - Confirmation dialog for early transitions
   * - Disabled at Final Jeopardy
   */
  const handleNextRound = async () => {
    if (!user || !game || !clueSetData) {return;}

    try {
      // Check if round is complete
      if (!isRoundComplete) {
        // Calculate remaining clues
        const progress = calculateClueProgress(clueStates, game.current_round, clueSetData);
        const remainingClues = progress.totalClues - progress.completedCount;

        // Show confirmation dialog
        const confirmed = await showConfirmation(
          `There are ${remainingClues} clues remaining in this round. Are you sure you want to advance to the next round?`,
          "Advance Round?",
          "warning"
        );

        if (!confirmed) {
          return;
        }
      }

      // Proceed with transition
      await performRoundTransition();
    } catch (error) {
      console.error("Failed to transition round:", error);
      showStatus(
        `Failed to advance round: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };

  /**
   * Performs the actual round transition.
   *
   * Called either directly (when round is complete) or after
   * confirmation dialog (for early transitions).
   */
  const performRoundTransition = async () => {
    if (!user || !game) {return;}

    showStatus("Transitioning to next round...", "info");

    try {
      const updatedGame = await GameService.transitionToNextRound(
        game.id,
        user.id,
        !isRoundComplete // force if not complete
      );

      setGame(updatedGame);
      showStatus(`Advanced to ${updatedGame.current_round} round`, "success");
    } catch (error) {
      console.error("Failed to transition round:", error);
      showStatus(
        `Failed to advance round: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };



  /**
   * DEBUG ONLY: Marks all clues in the current round as completed.
   *
   * This is a development utility to test round transitions without
   * manually resolving all 30 clues. Only visible in development mode.
   */
  const handleDebugCompleteAllClues = async () => {
    if (!user || !game || !clueSetData) {return;}

    try {
      showStatus("DEBUG: Completing all clues in current round...", "info");

      // Get all clue IDs for current round
      const currentRoundClueIds = getCurrentRoundClueIds(clueSetData, game.current_round);

      // Mark all as completed in database
      const { error } = await supabase
        .from('clue_states')
        .update({ completed: true })
        .eq('game_id', game.id)
        .in('clue_id', currentRoundClueIds);

      if (error) {
        throw new Error(`Failed to complete clues: ${error.message}`);
      }

      // Refresh clue states
      const updatedClueStates = await ClueService.getGameClueStates(game.id);
      setClueStates(updatedClueStates);

      showStatus(`DEBUG: Completed all ${currentRoundClueIds.length} clues in ${game.current_round} round`, "success");
    } catch (error) {
      console.error("Failed to complete all clues:", error);
      showStatus(
        `DEBUG: Failed to complete clues: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
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
    if (!user || !game) {
      return;
    }

    const adjustmentValue = scoreAdjustments[playerId];
    if (!adjustmentValue || adjustmentValue.trim() === "") {
      return;
    }

    const scoreChange = parseInt(adjustmentValue, 10);
    if (isNaN(scoreChange)) {
      return;
    }

    try {
      showStatus("Adjusting player score...", "info");
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

      showStatus(`Added ${scoreChange} points to player score`, "success");

      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to adjust score:", error);
      showStatus(
        `Failed to adjust score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  /**
   * Handles subtracting points from a player's score.
   */
  const handleSubtractScore = async (playerId: string) => {
    if (!user || !game) {
      return;
    }

    const adjustmentValue = scoreAdjustments[playerId];
    if (!adjustmentValue || adjustmentValue.trim() === "") {
      return;
    }

    const scoreChange = parseInt(adjustmentValue, 10);
    if (isNaN(scoreChange)) {
      return;
    }

    // Use absolute value to ensure we always subtract
    const absoluteScoreChange = Math.abs(scoreChange);

    try {
      showStatus("Adjusting player score...", "info");
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

      showStatus(`Subtracted ${absoluteScoreChange} points from player score`, "success");

      setTimeout(() => {
        showStatus("", "");
      }, 2000);
    } catch (error) {
      console.error("Failed to adjust score:", error);
      showStatus(
        `Failed to adjust score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
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
      {loading && (
        <div className="alert alert-info jeopardy-alert">Loading game data...</div>
      )}

      {/* Centralized Alert Component */}
      <Alert
        type={alertState.type}
        severity={alertState.severity}
        message={alertState.message}
        isVisible={alertState.isVisible}
        onConfirm={alertState.onConfirm}
        onCancel={alertState.onCancel}
        title={alertState.title}
      />

      {/* 4-panel dashboard grid layout */}
      <div className="dashboard-grid" data-introducing-categories={isIntroducingCategories ? "true" : "false"}>
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
            {/* Game Introduction UI */}
            {String(game?.status) === "game_intro" && (
              <div className="game-introduction-panel">
                <div className="introduction-header">
                  <h3>Game Introduction</h3>
                  <p>{isPlayingGameIntro ? "Animation in progress..." : "Ready to introduce categories"}</p>
                </div>

                <div className="introduction-controls">
                  <button
                    className="jeopardy-button"
                    onClick={handleStartCategoryIntroductions}
                    disabled={!gameIntroComplete}
                  >
                    {gameIntroComplete ? "Introduce Categories" : "Animation Playing..."}
                  </button>
                </div>
              </div>
            )}
            {/* Round Transition UI - Same as Game Intro */}
            {String(game?.status) === "round_transition" && (
              <div className="game-introduction-panel">
                <div className="introduction-header">
                  <h3>Round Transition</h3>
                  <p>Ready to introduce {game.current_round === "double" ? "Double Jeopardy" : "Final Jeopardy"} categories</p>
                </div>

                <div className="introduction-controls">
                  <button
                    className="jeopardy-button"
                    onClick={handleStartCategoryIntroductions}
                  >
                    Introduce Categories
                  </button>
                </div>
              </div>
            )}
            {String(game?.status) === "introducing_categories" && clueSetData && (
              <div className="category-introduction-panel">
                <div className="introduction-header">
                  <h3>Introducing Categories</h3>
                  <p>Category {currentIntroductionCategory} of 6</p>
                </div>

                <div className="current-category-display">
                  {(() => {
                    const currentRoundData = clueSetData.rounds[game.current_round];
                    const categoryData = Array.isArray(currentRoundData)
                      ? currentRoundData[currentIntroductionCategory - 1]
                      : null;

                    return categoryData ? (
                      <div className="category-showcase">
                        <div className="category-name">{categoryData.name}</div>
                        <div className="category-description">
                          {/* Optional: Add category description if available */}
                          Category {currentIntroductionCategory}
                        </div>
                      </div>
                    ) : (
                      <div className="category-showcase">
                        <div className="category-name">Loading...</div>
                      </div>
                    );
                  })()}
                </div>

                <div className="introduction-controls">
                  <button
                    className="jeopardy-button"
                    onClick={handleNextCategory}
                    disabled={currentIntroductionCategory > 6}
                  >
                    {currentIntroductionCategory >= 6 ? "Start Game" : "Next Category"}
                  </button>
                  <button
                    className="jeopardy-button-small"
                    onClick={handleSkipIntroductions}
                  >
                    Skip Introductions
                  </button>
                </div>
              </div>
            )}
            {String(game?.status) !== "game_intro" && String(game?.status) !== "round_transition" && String(game?.status) !== "introducing_categories" && (
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
            )}
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
                onClick={handleNextRound}
                disabled={!game || game.status !== 'in_progress' || game.current_round === 'final'}
                title="Advance to next round"
              >
                Next Round
              </button>

              {/* DEBUG BUTTON - Remove before production */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  className="jeopardy-button flex-1"
                  onClick={handleDebugCompleteAllClues}
                  disabled={!game || game.status !== 'in_progress'}
                  title="DEBUG: Mark all clues in current round as completed"
                  style={{ opacity: 0.7, fontSize: '0.85em' }}
                >
                  🐛 Complete Round
                </button>
              )}
            </div>

            {/* Game Status Info - moved from Game Status Panel */}
            {renderGameStatusInfo(game, clueStates, clueSetData)}

            {players.length === 0 ? (
              <p className="text-muted">No players joined yet</p>
            ) : (
              <div className="player-scores-list">
                {players.map((player, index) => {
                  const isCurrentPlayer = game?.current_player_id === player.user_id;
                  const playerItemClass = `player-score-item${isCurrentPlayer ? ' current-player' : ''}`;

                  return (
                    <div key={player.user_id} className={playerItemClass}>
                      <div className="player-details">
                        {/* <SimplePlayerConnectionStatus playerId={player.user_id} /> */}
                        <strong>
                          {isCurrentPlayer && "👑 "}
                          {player.nickname || `Player ${index + 1}`}
                          {isCurrentPlayer && " (Current)"}
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
                        placeholder=""
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
                  );
                })}
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
        <BuzzerQueuePanel
          game={game}
          players={players}
          connectionStatus={connectionStatus}
          buzzerTimeoutMs={buzzerTimeoutMs}
          setBuzzerTimeoutMs={setBuzzerTimeoutMs}
          buzzerQueue={buzzerQueue}
          autoSelectedPlayerId={autoSelectedPlayerId}
          onSelectPlayer={handlePlayerSelection}
          onClearQueue={() => setBuzzerQueue([])}
        />

        {/* Bottom Row - Panel 3: Clue Control */}
        <ClueControlPanel
          game={game}
          focusedClue={focusedClue}
          clueSetData={clueSetData}
          dailyDoublePositions={dailyDoublePositions}
          getRevealBuzzerButtonState={getRevealBuzzerButtonState}
          handleRevealBuzzerButton={handleRevealBuzzerButton}
          clueTimeRemaining={clueTimeRemaining}
          dailyDoubleWager={dailyDoubleWager}
          handleClearDailyDoubleWager={handleClearDailyDoubleWager}
          wagerInput={wagerInput}
          setWagerInput={setWagerInput}
          handleDailyDoubleWager={handleDailyDoubleWager}
          handleMarkCorrect={handleMarkCorrect}
          handleMarkWrong={handleMarkWrong}
        />
      </div>


    </div>
  );
}
