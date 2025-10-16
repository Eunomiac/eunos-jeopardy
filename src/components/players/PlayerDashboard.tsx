import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { GameService, type Game, type Player } from "../../services/games/GameService";
import { FontAssignmentService } from "../../services/fonts/FontAssignmentService";
import { PlayerPodiums, type PlayerInfo } from "./PlayerPodiums";
import { BuzzerState } from "../../types/BuzzerState";
import { supabase } from "../../services/supabase/client";
import { ClueService, type ClueState } from "../../services/clues/ClueService";
import { AnimationService } from "../../services/animations/AnimationService";
import {
  AnimationEvents,
  type AnimationIntent,
} from "../../services/animations/AnimationEvents";
import { AnimationRegistry } from "../../services/animations/AnimationDefinitions";
import { GameStateClassService } from "../../services/animations/GameStateClassService";
import { BroadcastService } from "../../services/realtime/BroadcastService";
import type {
  BroadcastSubscription,
  BuzzerUnlockPayload,
  PlayerBuzzPayload,
  FocusPlayerPayload,
  PlayerFrozenPayload,
} from "../../types/BroadcastEvents";
import { gsap } from "gsap";

import type { ClueData, ClueSetData } from "../../services/clueSets/loader";
import "./PlayerDashboard.scss";

interface PlayerDashboardProps {
  gameId: string;
  game?: GameUpdatePayload | null;
}

/**
 * Game update payload from real-time subscriptions.
 */
interface GameUpdatePayload {
  is_buzzer_locked?: boolean;
  focused_clue_id?: string | null;
  [key: string]: unknown;
}

/**
 * PlayerDashboard Component
 *
 * Main dashboard interface for players during a Jeopardy game.
 *
 * **Features:**
 * - Real-time game board display
 * - Player podiums with handwritten fonts
 * - Integrated buzzer system with client-side timing
 * - Clue reveal modal with buzzer integration
 * - Real-time subscriptions for game state updates
 *
 * **Client-Side Timing:**
 * - Records unlock timestamp when buzzer becomes available
 * - Calculates reaction time locally for fairness
 * - Sends timing data via real-time subscriptions
 *
 * **Font Management:**
 * - Assigns handwritten fonts on game join
 * - Handles font conflicts with temporary overrides
 * - Clears temporary fonts when game ends
 *
 * @param props - Component props
 * @returns PlayerDashboard component
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  gameId,
  game: propGame,
}) => {
  const { user } = useAuth();

  // Use game from props (managed by App.tsx) or fallback to local state for backwards compatibility
  const game = propGame;
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [currentClue, setCurrentClue] = useState<ClueInfo | null>(null);
  const [focusedClue, setFocusedClue] = useState<ClueInfo | null>(null);
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(
    BuzzerState.INACTIVE
  );
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [frozenPlayerIds, setFrozenPlayerIds] = useState<Set<string>>(new Set());

  // Game board data
  const [clueSetData, setClueSetData] = useState<ClueSetData | null>(null);
  const [clueStates, setClueStates] = useState<ClueState[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast subscription for real-time buzzer events

  const [, setBroadcastSubscription] = useState<BroadcastSubscription | null>( // NOSONAR (No pairing needed, value unused)
    null
  );
  // Buzzer timing for client-side reaction time calculation
  const [buzzerUnlockTime, setBuzzerUnlockTime] = useState<number | null>(null);

  // Track fastest buzz received for late correction handling
  const [fastestBuzzTime, setFastestBuzzTime] = useState<number | null>(null);

  const [, setFastestPlayerId] = useState<string | null>(null); // NOSONAR  (No pairing needed, value unused)

  // Animation services and refs
  const animationService = AnimationService.getInstance();
  GameStateClassService.getInstance();
  const displayWindowRef = useRef<HTMLDivElement>(null);
  const clueContentRef = useRef<HTMLDivElement>(null);

  // Track the last category we animated to distinguish initial render from category advance
  const lastAnimatedCategory = useRef<number>(0);

  /**
   * Effect to handle display window animations when content changes.
   */
  useEffect(() => {
    if (clueContentRef.current && currentClue) {
      // Animate clue reveal
      void animationService.animateClueReveal(
        clueContentRef.current,
        currentClue,
        {
          duration: 0.8,
          ease: "power2.out",
        }
      );
    }
  }, [currentClue, animationService]);

  // Subscribe to centralized animation intents (stable - doesn't re-run on game state changes)
  useEffect(() => {
    if (!game) {
      return () => {
        /* empty */
      };
    }

    console.log(
      `🎬 [PlayerDashboard] Setting up animation system for game ${gameId}`
    );

    // Track which animations have been handled by subscription
    const handledBySubscription = new Set<string>();

    const unsubscribe = AnimationEvents.subscribe(async (intent) => {
      console.log(`🎬 [PlayerDashboard] Received animation intent:`, intent);

      // Only handle intents for this game
      if (intent.gameId !== gameId) {
        return;
      }

      // Get the animation definition from registry
      const def = AnimationRegistry.get(intent.type);
      if (!def) {
        console.warn(
          `🎬 [PlayerDashboard] No animation definition found for: ${intent.type}`
        );
      }

      // Convert intent to params
      let params: Record<string, number | string> | null = null;
      if (intent.type === "BoardIntro") {
        params = { round: intent.round, gameId: intent.gameId };
      } else if (intent.type === "CategoryIntro") {
        params = {
          categoryNumber: intent.categoryNumber,
          gameId: intent.gameId,
        };
      } else if (intent.type === "ClueReveal") {
        params = { clueId: intent.clueId, gameId: intent.gameId };
      } else if (intent.type === "DailyDoubleReveal") {
        params = { clueId: intent.clueId, gameId: intent.gameId };
      } else if (intent.type === "DailyDoubleClueReveal") {
        params = { clueId: intent.clueId, gameId: intent.gameId };
      } /* (intent.type === "RoundTransition") */ else {
        params = {
          fromRound: intent.fromRound,
          toRound: intent.toRound,
          gameId: intent.gameId,
        };
      }

      // Mark as handled by subscription
      const key = `${def?.id}:${gameId}:${JSON.stringify(params)}`;
      handledBySubscription.add(key);

      console.log(
        `🎬 [PlayerDashboard] Handling ${intent.type} animation (animated)`,
        params
      );

      // Execute animation (always animated when triggered by subscription)
      await animationService.playOnce(key, async () => {
        await def?.execute(params); // No instant flag = animated

        // Update tracking for category animations
        if (intent.type === "CategoryIntro") {
          lastAnimatedCategory.current = params["categoryNumber"] as number;
        }
      });
    });

    // Wait for subscription to potentially receive intents, then check for instant animations
    // This delay allows the subscription to receive any intents that were published during component mount
    const timeoutId = setTimeout(() => {
      console.log(
        `🎬 [PlayerDashboard] Checking initial game state for instant animations (after subscription delay)`
      );

      // Check all registered animations to see which should run instantly
      const instantAnimations = AnimationRegistry.checkAllForInstantRun(
        game as Game
      );

      for (const { def, params } of instantAnimations) {
        const key = `${def.id}:${gameId}:${JSON.stringify(params)}`;

        // Skip if already handled by subscription
        if (handledBySubscription.has(key)) {
          console.log(
            `🎬 [PlayerDashboard] Skipping instant animation ${def.id} - already handled by subscription`
          );
        } else if (
          AnimationEvents.wasRecentlyPublished(
            def.id as AnimationIntent["type"],
            gameId
          )
        ) {
          // If intent was published recently, run animated version
          console.log(
            `🎬 [PlayerDashboard] Intent ${def.id} was recently published - running ANIMATED version`
          );
          void animationService.playOnce(key, async () => {
            await def.execute(params); // Animated, not instant

            // Update tracking for category animations
            if (def.id === "CategoryIntro") {
              lastAnimatedCategory.current = (
                params as { categoryNumber: number }
              ).categoryNumber;
            }
          });
        } else {
          console.log(
            `🎬 [PlayerDashboard] Running instant animation: ${def.id}`,
            params
          );

          // Use playOnce to ensure we don't re-run if already executed
          void animationService.playOnce(key, async () => {
            await def.execute(params, { instant: true });

            // Update tracking for category animations
            if (def.id === "CategoryIntro") {
              lastAnimatedCategory.current = (
                params as { categoryNumber: number }
              ).categoryNumber;
            }
          });
        }
      }
    }, 500); // Wait 500ms for subscription to receive any pending intents

    return () => {
      console.log(
        `🎬 [PlayerDashboard] Cleaning up animation system for game ${gameId}`
      );
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [game?.["id"], gameId, animationService]); // Only run when game ID changes (mount/game change)

  /**
   * Loads initial game data and player information.
   */
  const loadGameData = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Game data is now managed by App.tsx and passed as props
      // No need to load game data here

      // Load players
      const gamePlayers = await GameService.getPlayers(gameId);

      // Assign fonts and create player info
      const playersWithFonts = await Promise.all(
        gamePlayers.map(async (player) => {
          let font: string;

          if (player.user_id === user.id) {
            // Get or assign font for current user (pass nickname for narrow font preference)
            font = await FontAssignmentService.getPlayerFont(
              user.id,
              gameId,
              player.nickname ?? undefined
            );
          } else {
            // For other players, get their assigned font from profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("handwritten_font, temp_handwritten_font")
              .eq("id", player.user_id)
              .single();

            font =
              profile?.temp_handwritten_font ??
              profile?.handwritten_font ??
              "handwritten-1";
          }

          return {
            id: player.user_id, // Use user_id as the unique identifier
            name: player.nickname ?? "Player",
            score: player.score,
            fontFamily: font,
            isMainPlayer: player.user_id === user.id,
          };
        })
      );

      setPlayers(playersWithFonts);
    } catch (err) {
      console.error("❌ Error loading game data:", err);
      setError("Failed to load game data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  /**
   * Loads game board data for players.
   * Gets actual category names and clue data from the database.
   */
  const loadGameBoardData = useCallback(async () => {
    try {
      // Load clue states to show board progress
      const { data: states, error: statesError } = await supabase
        .from("clue_states")
        .select("*")
        .eq("game_id", gameId);

      if (statesError) {
        throw statesError;
      }
      setClueStates(states);

      // Load boards and categories for the game's clue set
      // First get the game to find the clue set ID
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("clue_set_id")
        .eq("id", gameId)
        .single();

      if (gameError) {
        throw gameError;
      }

      if (!gameData.clue_set_id) {
        throw new Error("Game does not have a clue set assigned");
      }

      // Load boards for this clue set
      const { data: boards, error: boardsError } = await supabase
        .from("boards")
        .select(
          `
          id,
          round,
          categories (
            id,
            name,
            position,
            clues (
              id,
              prompt,
              response,
              value,
              position
            )
          )
        `
        )
        .eq("clue_set_id", gameData.clue_set_id)
        .order("round");

      if (boardsError) {
        throw boardsError;
      }

      // Transform boards into clue set structure
      const jeopardyBoard = boards.find((board) => board.round === "jeopardy");
      const doubleBoard = boards.find((board) => board.round === "double");
      const finalBoard = boards.find((board) => board.round === "final");

      setClueSetData({
        name: "Game Board", // Players don't need the actual clue set name
        filename: "game-board.csv", // Players don't need the actual filename
        rounds: {
          jeopardy:
            jeopardyBoard?.categories
              .toSorted((a, b) => a.position - b.position)
              .map((cat) => ({
                name: cat.name,
                clues: cat.clues.toSorted(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              })) ?? [],
          double:
            doubleBoard?.categories
              .toSorted((a, b) => a.position - b.position)
              .map((cat) => ({
                name: cat.name,
                clues: cat.clues.toSorted(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              })) ?? [],
          final: finalBoard?.categories[0]
            ? {
                name: finalBoard.categories[0].name,
                clues: finalBoard.categories[0].clues.toSorted(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              }
            : { name: "Final Jeopardy", clues: [] },
        },
      });

      // Players don't need Daily Double positions - they discover them when clues are revealed
    } catch (loadError) {
      console.error("Failed to load game board data:", loadError);
      setError("Failed to load game data");
    }
  }, [gameId]);

  /**
   * Loads clue data for display in the modal.
   */
  const loadClueData = useCallback(
    async (clueId: string): Promise<ClueInfo | null> => {
      try {
        const clue = await ClueService.getClueById(clueId);

        // Get category name from category_id
        const { data: category } = await supabase
          .from("categories")
          .select("name")
          .eq("id", clue.category_id)
          .single();

        const clueInfo: ClueInfo = {
          id: clue.id,
          prompt: clue.prompt,
          value: clue.value,
          category: category?.name ?? "Unknown Category",
          isDailyDouble: false, // Players discover Daily Doubles when they encounter them
        };

        setCurrentClue(clueInfo);
        return clueInfo;
      } catch (clueError) {
        console.error("Failed to load clue:", clueError);
        setCurrentClue(null);
        return null;
      }
    },
    []
  );

  // Helper function to update clue states
  const updateClueState = useCallback((clueState: ClueState) => {
    setClueStates((prev) => {
      const updated = prev.filter((s) => s.clue_id !== clueState.clue_id);
      return [...updated, clueState];
    });
  }, []);

  /**
   * Sets up real-time subscriptions for game state updates.
   */
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) {
      return undefined;
    }

    // Game state is now managed by App.tsx subscription - no need for separate game subscription
    // Handle game state changes via useEffect watching the game prop

    // Subscribe to player changes
    const assignPlayerFont = async (player: Player) => {
      let font: string;

      if (player.user_id === user.id) {
        // Pass nickname for narrow font preference
        font = await FontAssignmentService.getPlayerFont(
          user.id,
          gameId,
          player.nickname ?? undefined
        );
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("handwritten_font, temp_handwritten_font")
          .eq("id", player.user_id)
          .single();
        font =
          profile?.temp_handwritten_font ??
          profile?.handwritten_font ??
          "handwritten-1";
      }

      return {
        id: player.user_id,
        name: player.nickname ?? "Player",
        score: player.score,
        fontFamily: font,
        isMainPlayer: player.user_id === user.id,
      };
    };
    const playerSubscriptionCallback = () => {
      console.log("🔔 Players update");
      // Update player data incrementally without full reload
      void (async () => {
        try {
          const gamePlayers = await GameService.getPlayers(gameId);
          const playersWithFonts = await Promise.all(
            gamePlayers.map(assignPlayerFont)
          );
          setPlayers(playersWithFonts);
        } catch (playerError) {
          console.error("Failed to update player data:", playerError);
        }
      })();
    };
    const playersSubscription = supabase
      .channel(`players-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        playerSubscriptionCallback
      )
      .subscribe();

    // Subscribe to clue state changes (for board display updates)
    const clueStatesSubscription = supabase
      .channel(`clue-states-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clue_states",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("🔔 Clue state update:", payload);
          const clueState = payload.new as ClueState;
          const prevClueState = payload.old as ClueState | null;

          // Update clue states for board display
          updateClueState(clueState);

          // Trigger animations when clue is revealed (host clicked "Reveal Prompt")
          if (clueState.revealed && !prevClueState?.revealed) {
            console.log(
              "🎬 [PlayerDashboard] Clue revealed, triggering animation for clue:",
              clueState.clue_id
            );

            // Check if this is a daily double
            void (async () => {
              const isDailyDouble = await ClueService.isDailyDouble(
                clueState.clue_id
              );

              if (isDailyDouble) {
                // Daily double clue reveal (fade out splash, show clue)
                console.log(
                  "🎬 [PlayerDashboard] Publishing DailyDoubleClueReveal intent"
                );
                AnimationEvents.publish({
                  type: "DailyDoubleClueReveal",
                  gameId,
                  clueId: clueState.clue_id,
                });
              } else {
                // Regular clue reveal
                console.log(
                  "🎬 [PlayerDashboard] Publishing ClueReveal intent"
                );
                AnimationEvents.publish({
                  type: "ClueReveal",
                  gameId,
                  clueId: clueState.clue_id,
                });
              }
            })();
          }

          // Show modal when clue is revealed and it's the focused clue (Reveal Prompt action)
          if (
            clueState.revealed &&
            focusedClue &&
            clueState.clue_id === focusedClue.id
          ) {
            setCurrentClue(focusedClue);
            // Preserve FROZEN state when clue is revealed
            setBuzzerState((currentState) => {
              if (currentState === BuzzerState.FROZEN) {
                console.log(`🔄 [Player] Clue revealed but staying frozen`);
                return BuzzerState.FROZEN;
              }
              return BuzzerState.LOCKED;
            });
          }

          // Hide modal, clear display window, and lock buzzer when clue is completed
          if (clueState.completed) {
            setCurrentClue(null);
            // Preserve FROZEN state when clue is completed
            setBuzzerState((currentState) => {
              if (currentState === BuzzerState.FROZEN) {
                console.log(`🔄 [Player] Clue completed but staying frozen`);
                return BuzzerState.FROZEN;
              }
              return BuzzerState.LOCKED;
            });
            setReactionTime(null);

            // Clear the dynamic display window
            if (displayWindowRef.current) {
              gsap.to(displayWindowRef.current, {
                autoAlpha: 0,
                duration: 0.3,
                ease: "power2.out",
                onComplete: () => {
                  if (displayWindowRef.current) {
                    displayWindowRef.current.innerHTML = "";
                    displayWindowRef.current.className =
                      "dynamic-display-window";
                  }
                },
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to clue changes (for locked_out_player_ids updates)
    const cluesSubscription = supabase
      .channel(`clues-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "clues",
        },
        (payload) => {
          console.log("🔔 Clue lockout update:", payload);
          if (user.id) {
            const clueData = payload.new;
            const lockedOutPlayers: string[] =
              (clueData["locked_out_player_ids"] as Maybe<string[]>) ?? [];

            // If current player was just locked out, freeze their buzzer
            if (
              lockedOutPlayers.includes(user.id) &&
              focusedClue &&
              clueData["id"] === focusedClue.id
            ) {
              console.log("🚫 Current player locked out - freezing buzzer");
              setCurrentClue(null);
              setBuzzerState(BuzzerState.FROZEN);
              setReactionTime(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      void playersSubscription.unsubscribe();
      void clueStatesSubscription.unsubscribe();
      void cluesSubscription.unsubscribe();
    };
  }, [gameId, user, focusedClue, updateClueState]);

  /**
   * Handles player buzzer click.
   * Broadcasts buzz event immediately for real-time response.
   */
  const handleBuzzAsync = useCallback(async () => {
    if (buzzerState === BuzzerState.UNLOCKED && user && currentClue) {
      try {
        // Calculate reaction time using client-side timing
        let reactionTimeMs = 0;
        if (buzzerUnlockTime) {
          reactionTimeMs = Date.now() - buzzerUnlockTime;
          setReactionTime(reactionTimeMs);
          console.log(`⏱️ Reaction time: ${reactionTimeMs}ms`);
        }

        // Get player nickname for broadcast
        const currentPlayer = players.find((p) => p.id === user.id);
        const playerNickname =
          currentPlayer?.name ?? user.email ?? "Unknown Player";

        // Broadcast buzz event immediately (no database write)
        // State will be set to BUZZED when we receive our own broadcast
        await BroadcastService.broadcastPlayerBuzz(
          gameId,
          currentClue.id,
          user.id,
          playerNickname,
          reactionTimeMs
        );

        console.log("⚡ Player buzzed in successfully!");
      } catch (buzzError) {
        console.error("Failed to broadcast buzz:", buzzError);
        // Keep buzzer unlocked on error so player can try again
      }
    } else if (buzzerState === BuzzerState.LOCKED) {
      // Player buzzed too early - set frozen state and broadcast
      setBuzzerState(BuzzerState.FROZEN);
      console.log("❄️ Player buzzed too early - frozen!");

      // Broadcast frozen state to all clients and update database
      if (currentClue && user) {
        const playerNickname = players.find((p) => p.id === user.id)?.name ?? 'Unknown';

        // Broadcast immediately for instant UI update
        void BroadcastService.broadcastPlayerFrozen(
          gameId,
          currentClue.id,
          user.id,
          playerNickname
        );

        // Update database in background (database as final arbiter)
        void (async () => {
          try {
            // Get current locked-out players
            const { data: clueData } = await supabase
              .from('clues')
              .select('locked_out_player_ids')
              .eq('id', currentClue.id)
              .single();

            const currentLockedOut = clueData?.locked_out_player_ids ?? [];

            // Add this player if not already in the list
            if (!currentLockedOut.includes(user.id)) {
              const updatedLockedOut = [...currentLockedOut, user.id];

              await supabase
                .from('clues')
                .update({ locked_out_player_ids: updatedLockedOut })
                .eq('id', currentClue.id);

              console.log(`❄️ Added ${user.id} to locked_out_player_ids for clue ${currentClue.id}`);
            }
          } catch (err) {
            console.error('❌ Failed to update locked_out_player_ids:', err);
          }
        })();
      }
    }
  }, [buzzerState, user, currentClue, gameId, buzzerUnlockTime, players]);

  const handleBuzz = useCallback(() => {
    void handleBuzzAsync();
  }, [handleBuzzAsync]);

  // Load initial data
  useEffect(() => {
    void loadGameData();
    void loadGameBoardData();
  }, [loadGameData, loadGameBoardData]);

  // Set up real-time subscriptions
  useEffect(() => setupRealtimeSubscriptions(), [setupRealtimeSubscriptions]);

  // Set up broadcast channel for real-time buzzer events
  useEffect(() => {
    if (!gameId || !user) {
      return () => {
        /* empty */
      };
    }

    console.log(`📡 [Player] Setting up broadcast channel for game: ${gameId}`);

    // Subscribe to broadcast channel for buzzer events
    const subscription = BroadcastService.subscribeToGameBuzzer(gameId, {
      onBuzzerUnlock: (payload: BuzzerUnlockPayload) => {
        console.log(`🔓 [Player] Buzzer unlocked at ${payload.timestamp}`);

        // Fire off async check for locked-out status without blocking
        // This follows the broadcast handler pattern: immediate UI update, async validation in background
        void (async () => {
          try {
            // Check if current player is locked out from this clue
            const { data: clueData } = await supabase
              .from("clues")
              .select("locked_out_player_ids")
              .eq("id", payload.clueId)
              .single();

            const lockedOutPlayers = clueData?.locked_out_player_ids ?? [];

            if (lockedOutPlayers.includes(user.id)) {
              console.log(
                `🚫 [Player] Cannot unlock - player is locked out from this clue`
              );
              // Keep buzzer frozen for locked-out players
              setBuzzerState(BuzzerState.FROZEN);
            } else {
              // Unlock buzzer for eligible players
              setBuzzerUnlockTime(payload.timestamp);
              setBuzzerState(BuzzerState.UNLOCKED);
              setFastestBuzzTime(null);
              setFastestPlayerId(null);
            }
          } catch (err) {
            console.error("🚫 [Player] Error checking locked-out status:", err);
            // On error, default to unlocking (fail open)
            setBuzzerUnlockTime(payload.timestamp);
            setBuzzerState(BuzzerState.UNLOCKED);
            setFastestBuzzTime(null);
            setFastestPlayerId(null);
          }
        })();
      },
      onBuzzerLock: () => {
        console.log(`🔒 [Player] Buzzer locked`);
        setBuzzerUnlockTime(null);
        // Preserve FROZEN state - don't override it
        setBuzzerState((currentState) => {
          if (currentState === BuzzerState.FROZEN) {
            console.log(`🔒 [Player] Staying frozen despite lock`);
            return BuzzerState.FROZEN;
          }
          return BuzzerState.LOCKED;
        });
        // Clear frozen players when clue ends
        setFrozenPlayerIds(new Set());
      },
      onPlayerBuzz: (payload: PlayerBuzzPayload) => {
        console.log(
          `⚡ [Player] Received buzz: ${payload.playerNickname} (${payload.reactionTimeMs}ms)`
        );

        // If this is our own buzz, set state to BUZZED
        // Otherwise, lock the buzzer (unless already frozen)
        if (payload.playerId === user.id) {
          console.log(
            `⚡ [Player] Received own buzz - setting state to BUZZED`
          );
          setBuzzerState(BuzzerState.BUZZED);
        } else {
          // Preserve FROZEN state - don't override it
          setBuzzerState((currentState) => {
            if (currentState === BuzzerState.FROZEN) {
              console.log(
                `⚡ [Player] Another player buzzed - staying frozen`
              );
              return BuzzerState.FROZEN;
            }
            console.log(`⚡ [Player] Another player buzzed - locking buzzer`);
            return BuzzerState.LOCKED;
          });
        }

        // Track fastest buzz for late correction handling
        if (
          fastestBuzzTime === null ||
          payload.reactionTimeMs < fastestBuzzTime
        ) {
          setFastestBuzzTime(payload.reactionTimeMs);
          setFastestPlayerId(payload.playerId);

          // If this is a late correction (faster buzz arrived after slower one)
          if (fastestBuzzTime !== null) {
            console.log(
              `🔄 [Player] Late correction: ${payload.playerNickname} is now fastest`
            );
          }
        }
      },
      onFocusPlayer: (payload: FocusPlayerPayload) => {
        console.log(
          `👁️ [Player] Focus player: ${payload.playerNickname} (${payload.source})`
        );
        setFastestPlayerId(payload.playerId);
      },
      onPlayerFrozen: (payload: PlayerFrozenPayload) => {
        console.log(`❄️ [Player] Player frozen: ${payload.playerNickname}`);

        // Add player to frozen set
        setFrozenPlayerIds((prev) => {
          const next = new Set(prev);
          next.add(payload.playerId);
          return next;
        });
      },
    });

    setBroadcastSubscription(subscription);

    // Cleanup on unmount
    return () => {
      console.log(
        `🔌 [Player] Cleaning up broadcast channel for game: ${gameId}`
      );
      subscription.unsubscribe();
      setBroadcastSubscription(null);
    };
  }, [gameId, user, fastestBuzzTime]);

  // Listen for database buzzer state changes (only when database is updated via subscription)
  // This provides recovery for clients that missed broadcast events
  useEffect(() => {
    const handleDatabaseBuzzerStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        gameId: string;
        isLocked: boolean;
        hasFocusedClue: boolean;
      }>;

      const { gameId: eventGameId, isLocked } = customEvent.detail;

      // Only process if this event is for our game
      if (eventGameId !== gameId) {
        return;
      }

      console.log(
        `🔄 [Player] Database buzzer state override: isLocked=${isLocked}, currentState=${buzzerState}`
      );

      // Database override is ONLY for recovery when client missed broadcast events
      // The database is_buzzer_locked field is for HOST MANUAL CONTROL only
      // Broadcasts handle all real-time buzzer state changes (unlock, buzz-in, etc.)

      // ONLY apply database override to LOCK the buzzer (recovery scenario)
      // NEVER unlock based on database - broadcasts handle that
      // NEVER override FROZEN state - it must persist
      if (isLocked && buzzerState === BuzzerState.UNLOCKED) {
        console.log("🔄 [Player] Database override: locking buzzer (recovery)");
        setBuzzerState(BuzzerState.LOCKED);
        setReactionTime(null);
        setBuzzerUnlockTime(null);
      }
      // Note: We intentionally do NOT override FROZEN state
      // Note: We intentionally do NOT unlock based on database state
      // All unlocking is handled by broadcasts for real-time responsiveness
    };

    window.addEventListener(
      "database-buzzer-state-change",
      handleDatabaseBuzzerStateChange
    );

    return () => {
      window.removeEventListener(
        "database-buzzer-state-change",
        handleDatabaseBuzzerStateChange
      );
    };
  }, [gameId, buzzerState]);

  // Watch for focused clue changes
  useEffect(() => {
    if (!game) {
      return;
    }

    const handleFocusedClueChange = async () => {
      if (game.focused_clue_id) {
        // Only reset buzzer state if this is a NEW clue (different from current focusedClue)
        const isNewClue =
          !focusedClue || focusedClue.id !== game.focused_clue_id;

        // Only load and update if it's actually a new clue
        if (isNewClue) {
          const clueInfo = await loadClueData(game.focused_clue_id);
          setFocusedClue(clueInfo);
          // Preserve FROZEN state when clue changes
          setBuzzerState((currentState) => {
            if (currentState === BuzzerState.FROZEN) {
              console.log(`🔄 [Player] New clue but staying frozen`);
              return BuzzerState.FROZEN;
            }
            return BuzzerState.LOCKED;
          });
          setReactionTime(null);
        }
      } else if (focusedClue) {
        // Clear focused clue if game doesn't have one
        setFocusedClue(null);
        setCurrentClue(null);
        // Preserve FROZEN state when clearing clue
        setBuzzerState((currentState) => {
          if (currentState === BuzzerState.FROZEN) {
            console.log(`🔄 [Player] Clearing clue but staying frozen`);
            return BuzzerState.FROZEN;
          }
          return BuzzerState.LOCKED;
        });
        setReactionTime(null);
      }
    };

    void handleFocusedClueChange();
  }, [game, loadClueData, focusedClue]);

  // Loading state
  if (loading) {
    return (
      <div className="player-dashboard loading">
        <div className="loading-message">Loading game...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="player-dashboard error">
        <div className="error-message">
          <h3>Error Loading Game</h3>
          <p>{error}</p>
          <p>Game ID: {gameId}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`player-dashboard ${String(game?.["status"]) || "loading"}`}
      data-game-id={gameId}
    >
      {/* Background Image */}
      <img
        src="/assets/images/bg-stage.webp"
        alt="Jeopardy Stage"
        className="background-image"
      />
      {/* Round Header */}
      <div className="jeopardy-board-header">
        <h2>
          {(() => {
            if (game?.["current_round"] === "final") {
              return "Final Jeopardy";
            }
            if (game?.["current_round"] === "double") {
              return "Double Jeopardy Round";
            }
            return "The Jeopardy Round";
          })()}
        </h2>
      </div>

      {/* Jeopardy Board */}
      <div className="jeopardy-board-container">
        <div className="jeopardy-board-background">
          <img
            src="/assets/images/bg-board.webp"
            alt="Jeopardy Board Background"
          />
        </div>
        <div
          className="jeopardy-board"
          style={
            {
              "--jeopardy-board-bg-image-small": {
                jeopardy: "url('/assets/images/splash-jeopardy-small.webp')",
                double:
                  "url('/assets/images/splash-double-jeopardy-small.webp')",
                final: "url('/assets/images/splash-final-jeopardy-small.webp')",
              }[(game?.["current_round"] as Maybe<string>) ?? "jeopardy"],
            } as React.CSSProperties
          }
        >
          <div className="jeopardy-clues-background">
            {(() => {
              const splashImages: Record<string, string> = {
                jeopardy: "/assets/images/splash-jeopardy.webp",
                double: "/assets/images/splash-double-jeopardy.webp",
                final: "/assets/images/splash-final-jeopardy.webp",
              };
              const roundKey =
                (game?.["current_round"] as Maybe<string>) ?? "jeopardy";
              return (
                <img
                  src={splashImages[roundKey]}
                  className="splash-jeopardy"
                  alt="Jeopardy Board Background"
                />
              );
            })()}
          </div>
          {clueSetData && game ? (
            <>
              {/* Category headers */}
              {(() => {
                if (game["current_round"] === "final") {
                  return (
                    <div key="final-category" className="category-header">
                      {clueSetData.rounds.final.name}
                    </div>
                  );
                } else {
                  const roundKey = game["current_round"] as "jeopardy" | "double";
                  const currentRoundData = clueSetData.rounds[roundKey];
                  return currentRoundData.map(
                    (
                      category: { name: string; clues: ClueData[] },
                      index: number
                    ) => (
                      <div
                        key={`category-${index}-${category.name}`}
                        className="category-header"
                      >
                        <span className="category-name">{category.name}</span>
                      </div>
                    )
                  );
                }
              })()}

              {/* Clue cells */}
              {(() => {
                if (game["current_round"] === "final") {
                  return (
                    <button
                      type="button"
                      className="clue-cell final-jeopardy"
                      style={{ pointerEvents: "none" }}
                      aria-label="Final Jeopardy"
                    >
                      Final Jeopardy
                    </button>
                  );
                }

                // Regular rounds: create grid of all clues
                const roundKey = game["current_round"] as "jeopardy" | "double";
                const currentRoundData = clueSetData.rounds[roundKey];
                const allClues: {
                  categoryIndex: number;
                  clue: ClueData;
                }[] = [];

                currentRoundData.forEach(
                  (
                    category: { name: string; clues: ClueData[] },
                    categoryIndex: number
                  ) => {
                    category.clues.forEach((clue: ClueData) => {
                      allClues.push({ categoryIndex, clue });
                    });
                  }
                );

                // Sort by position to maintain proper board order
                const sortedClues = allClues.toSorted((a, b) => {
                  if (a.clue.position !== b.clue.position) {
                    return a.clue.position - b.clue.position;
                  }
                  return a.categoryIndex - b.categoryIndex;
                });

                return sortedClues.map((item, index) => {
                  // Find clue state for this clue
                  const clueState = clueStates.find(
                    (state) => state.clue_id === item.clue.id
                  );

                  const isRevealed = clueState?.revealed ?? false;
                  const isCompleted = clueState?.completed ?? false;
                  const isFocused =
                    focusedClue && focusedClue.id === item.clue.id;

                  let cellClass = "clue-cell";
                  if (isCompleted) {
                    cellClass += " completed revealed"; // Completed clues should also be styled as revealed
                  } else if (isRevealed) {
                    cellClass += " revealed";
                  }
                  if (isFocused) {
                    cellClass += " focused";
                  }

                  let ariaLabel = `Clue for $${item.clue.value}`;
                  if (isCompleted) {
                    ariaLabel += " - Completed";
                  } else if (isRevealed) {
                    ariaLabel += " - Revealed";
                  }
                  if (isFocused) {
                    ariaLabel += " - Focused";
                  }

                  return (
                    <button
                      key={`clue-${item.clue.id ?? index}-${item.clue.value}`}
                      type="button"
                      className={cellClass}
                      style={{ pointerEvents: "none" }}
                      aria-label={ariaLabel}
                    >
                      <span className="clue-value">${item.clue.value}</span>
                    </button>
                  );
                });
              })()}
            </>
          ) : (
            /* Loading placeholder */
            <>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={`loading-category-${i}`} className="category-header">
                  Loading...
                </div>
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <button
                  key={`loading-clue-${i}`}
                  type="button"
                  className="clue-cell"
                  style={{ pointerEvents: "none" }}
                  aria-label="Loading clue"
                >
                  ...
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Player Podiums */}
      <PlayerPodiums
        players={players.map((player) => {
          // Determine buzzer state for this player
          let playerBuzzerState: BuzzerState;
          if (player.id === user?.id) {
            playerBuzzerState = buzzerState;
          } else if (frozenPlayerIds.has(player.id)) {
            playerBuzzerState = BuzzerState.FROZEN;
          } else {
            playerBuzzerState = BuzzerState.INACTIVE;
          }

          return {
            ...player,
            buzzerState: playerBuzzerState,
            isFocused: game?.["focused_player_id"] === player.id,
            reactionTime: player.id === user?.id ? reactionTime : null,
            showReactionTime:
              player.id === user?.id && buzzerState === BuzzerState.BUZZED,
          };
        })}
        currentUserId={user?.id ?? ""}
        onBuzz={handleBuzz}
      />

      {/* Dynamic Display Window */}
      <div className="dynamic-display-window" ref={displayWindowRef}>
        {(() => {
          // Check game status for different display modes
          const gameStatus = (game as GameUpdatePayload & { status?: string })
            .status;
          const isGameIntro = gameStatus === "game_intro";
          const isIntroducingCategories =
            gameStatus === "introducing_categories";

          if (isGameIntro) {
            // Show game introduction display
            return <div className="game-intro-display"></div>;
          }

          if (isIntroducingCategories && clueSetData && game) {
            // Show category display strip for introductions
            return (
              <div
                className="jeopardy-category-display-viewport"
                style={{ visibility: "visible" }}
              >
                <div
                  className="jeopardy-category-display-strip"
                  // Transform now handled by GSAP animation
                >
                  {(() => {
                    if (game["current_round"] === "final") {
                      // Final Jeopardy - single category
                      return (
                        <div key="final-category" className="category-header">
                          <span>{clueSetData.rounds.final.name}</span>
                        </div>
                      );
                    } else {
                      // Regular rounds - 6 categories
                      const roundKey = game["current_round"] as
                        | "jeopardy"
                        | "double";
                      const currentRoundData = clueSetData.rounds[roundKey];

                      return currentRoundData.map(
                        (
                          category: { name: string; clues: ClueData[] },
                          index: number
                        ) => (
                          <div
                            key={`category-${index}-${category.name}`}
                            className="category-header"
                          >
                            <img
                              className="splash-jeopardy"
                              src={
                                {
                                  jeopardy:
                                    "assets/images/splash-jeopardy.webp",
                                  double:
                                    "assets/images/splash-double-jeopardy.webp",
                                  final:
                                    "assets/images/splash-final-jeopardy.webp",
                                }[roundKey]
                              }
                              alt="Jeopardy Splash Screen"
                            />
                            <span className="category-name">
                              {category.name}
                            </span>
                          </div>
                        )
                      );
                    }
                  })()}
                </div>
              </div>
            );
          }

          if (currentClue) {
            // Show clue content
            return (
              <div
                className="clue-display-content gsap-animation"
                ref={clueContentRef}
              >
                <div className="clue-header">
                  <div className="clue-category">{currentClue.category}</div>
                  <div className="clue-value">
                    ${currentClue.value.toLocaleString()}
                  </div>
                </div>

                <div className="clue-prompt">{currentClue.prompt}</div>

                {currentClue.isDailyDouble && (
                  <div className="daily-double-indicator">🎯 DAILY DOUBLE!</div>
                )}
              </div>
            );
          }

          // Default placeholder
          return (
            <div className="display-placeholder" ref={clueContentRef}></div>
          );
        })()}
      </div>
    </div>
  );
};

export default PlayerDashboard;
