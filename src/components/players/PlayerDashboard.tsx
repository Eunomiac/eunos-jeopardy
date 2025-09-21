import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { GameService } from "../../services/games/GameService";
import { FontAssignmentService } from "../../services/fonts/FontAssignmentService";
import { PlayerPodiums, type PlayerInfo } from "./PlayerPodiums";
import type { ClueInfo } from "./ClueRevealModal";
import { BuzzerState } from "../../types/BuzzerState";
import { supabase } from "../../services/supabase/client";
import type { ClueState } from "../../services/clues/ClueService";
import { AnimationService } from "../../services/animations/AnimationService";
import { AnimationEvents } from "../../services/animations/AnimationEvents";
import { BuzzerStateService } from "../../services/animations/BuzzerStateService";
import { GameStateClassService } from "../../services/animations/GameStateClassService";
import { gsap } from "gsap";
import { FEATURE_ANIMATION_EVENTS } from "../../config/featureFlags";

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
 * Buzz payload from real-time subscriptions.
 */
interface BuzzPayload {
  user_id: string;
  game_id: string;
  clue_id: string;
  created_at: string;
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
const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ gameId, game: propGame }) => {
  const { user } = useAuth();

  // Use game from props (managed by App.tsx) or fallback to local state for backwards compatibility
  const game = propGame;
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [currentClue, setCurrentClue] = useState<ClueInfo | null>(null);
  const [focusedClue, setFocusedClue] = useState<ClueInfo | null>(null);
  const [buzzerState, setBuzzerState] = useState<BuzzerState>(
    BuzzerState.LOCKED
  );
  const [reactionTime, setReactionTime] = useState<number | null>(null);

  // Game board data
  const [clueSetData, setClueSetData] = useState<ClueSetData | null>(null);
  const [clueStates, setClueStates] = useState<ClueState[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClueModal, setShowClueModal] = useState(false);
  // Buzzer timing - removed unused state variables

  // Animation services and refs
  const animationService = AnimationService.getInstance();
  const buzzerStateService = BuzzerStateService.getInstance();
  GameStateClassService.getInstance();
  const displayWindowRef = useRef<HTMLDivElement>(null);
  const clueContentRef = useRef<HTMLDivElement>(null);

  // Game introduction animation state
  const [isPlayingGameIntro, setIsPlayingGameIntro] = useState(false);

  // Track which game status we've already animated to prevent duplicates
  const animatedGameStatus = useRef<string | null>(null);

  // Track the last category we animated to distinguish initial render from category advance
  const lastAnimatedCategory = useRef<number>(0);

  /**
   * Effect to handle display window animations when content changes.
   */
  useEffect(() => {
    if (clueContentRef.current && showClueModal && currentClue) {
      // Animate clue reveal
      animationService.animateClueReveal(clueContentRef.current, currentClue, {
        duration: 0.8,
        ease: "power2.out"
      });
    }
  }, [showClueModal, currentClue, animationService]);

  // Subscribe to centralized animation intents (feature-flagged)
  useEffect(() => {
    if (!FEATURE_ANIMATION_EVENTS) return;

    const unsubscribe = AnimationEvents.subscribe(async (intent) => {
      if (intent.type === "BoardIntro" && intent.gameId === gameId) {
        await animationService.playOnce(`boardIntro:${gameId}:${String(game?.current_round || '')}`,
          async () => {
            await animationService.waitForElement('.jeopardy-board', 1000);
            // Use the registered GSAP effect for board intro
            gsap.effects.animateBoardIn();
          }
        );
      }

      if (intent.type === "CategoryIntro" && intent.gameId === gameId) {
        const category = intent.categoryNumber;
        try {
          const stripElement = await animationService.waitForElement('.jeopardy-category-display-strip', 1000);
          const targetX = -((category - 1) * 100 / 6);
          const isInitialRender = lastAnimatedCategory.current === 0 && category > 1;

          if (isInitialRender) {
            // Set initial state without animation
            gsap.set(stripElement, { x: `${targetX}%` });
            for (let i = 1; i <= category; i++) {
              const splashImage = stripElement.querySelector(`.category-header:nth-child(${i}) img.splash-jeopardy`) as HTMLElement | null;
              if (splashImage) {
                gsap.set(splashImage, { autoAlpha: 0 });
              }
            }
            lastAnimatedCategory.current = category;
          } else {
            const splashImage = stripElement.querySelector(`.category-header:nth-child(${category}) img.splash-jeopardy`) as HTMLElement | null;
            gsap.timeline()
              .to(stripElement, {
                x: `${targetX}%`,
                duration: 0.8,
                ease: 'power2.inOut',
                onComplete: () => {
                  lastAnimatedCategory.current = category;
                }
              })
              .to(splashImage, {
                autoAlpha: 0,
                duration: 0.5,
                ease: 'power2.inOut'
              }, "-=0.3");
          }
        } catch (e) {
          console.warn('CategoryIntro: element not ready in time');
        }
      }
    });

    return unsubscribe;
  }, [gameId, game?.current_round, animationService]);

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
            // Get or assign font for current user
            font = await FontAssignmentService.getPlayerFont(user.id, gameId);
          } else {
            // For other players, get their assigned font from profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("handwritten_font, temp_handwritten_font")
              .eq("id", player.user_id)
              .single();

            font =
              profile?.temp_handwritten_font ||
              profile?.handwritten_font ||
              "handwritten-1";
          }

          return {
            id: player.user_id, // Use user_id as the unique identifier
            name: player.nickname || "Player",
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
      setClueStates(states || []);

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

      if (!gameData?.clue_set_id) {
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
      const jeopardyBoard = boards?.find((board) => board.round === "jeopardy");
      const doubleBoard = boards?.find((board) => board.round === "double");
      const finalBoard = boards?.find((board) => board.round === "final");

      setClueSetData({
        name: "Game Board", // Players don't need the actual clue set name
        filename: "game-board.csv", // Players don't need the actual filename
        rounds: {
          jeopardy:
            jeopardyBoard?.categories
              ?.sort((a, b) => a.position - b.position)
              .map((cat) => ({
                name: cat.name,
                clues: (cat.clues || []).sort(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              })) || [],
          double:
            doubleBoard?.categories
              ?.sort((a, b) => a.position - b.position)
              .map((cat) => ({
                name: cat.name,
                clues: (cat.clues || []).sort(
                  (a, b) => (a.position || 0) - (b.position || 0)
                ),
              })) || [],
          final: finalBoard?.categories?.[0]
            ? {
                name: finalBoard.categories[0].name,
                clues: (finalBoard.categories[0].clues || []).sort(
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
        const { ClueService } = await import(
          "../../services/clues/ClueService"
        );
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
          category: category?.name || "Unknown Category",
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
        async () => {
          console.log("🔔 Players update");
          // Update player data incrementally without full reload
          try {
            const gamePlayers = await GameService.getPlayers(gameId);
            const playersWithFonts = await Promise.all(
              gamePlayers.map(async (player) => {
                let font: string;

                if (player.user_id === user.id) {
                  font = await FontAssignmentService.getPlayerFont(
                    user.id,
                    gameId
                  );
                } else {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("handwritten_font, temp_handwritten_font")
                    .eq("id", player.user_id)
                    .single();
                  font =
                    profile?.temp_handwritten_font ||
                    profile?.handwritten_font ||
                    "handwritten-1";
                }

                return {
                  id: player.user_id,
                  name: player.nickname || "Player",
                  score: player.score,
                  fontFamily: font,
                  isMainPlayer: player.user_id === user.id,
                };
              })
            );
            setPlayers(playersWithFonts);
          } catch (playerError) {
            console.error("Failed to update player data:", playerError);
          }
        }
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
          if (payload.new) {
            const clueState = payload.new as ClueState;
            // Update clue states for board display
            updateClueState(clueState);

            // Show modal when clue is revealed and it's the focused clue (Reveal Prompt action)
            if (
              clueState.revealed &&
              focusedClue &&
              clueState.clue_id === focusedClue.id
            ) {
              setCurrentClue(focusedClue);
              setShowClueModal(true);
              setBuzzerState(BuzzerState.LOCKED); // Lock buzzer when clue is revealed
            }

            // Hide modal and lock buzzer when clue is completed
            if (clueState.completed) {
              setShowClueModal(false);
              setCurrentClue(null);
              setBuzzerState(BuzzerState.LOCKED);
              setReactionTime(null);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to buzzer events
    const buzzesSubscription = supabase
      .channel(`buzzes-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buzzes",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("🔔 Buzz event:", payload);
          // Handle buzzer state changes based on buzz events
          if (
            payload.new &&
            (payload.new as BuzzPayload).user_id === user?.id
          ) {
            // This player's buzz was recorded
            setBuzzerState(BuzzerState.BUZZED);
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
          if (payload.new && user?.id) {
            const clueData = payload.new;
            const lockedOutPlayers = clueData.locked_out_player_ids || [];

            // If current player was just locked out and modal is showing, hide it
            if (
              lockedOutPlayers.includes(user.id) &&
              showClueModal &&
              focusedClue &&
              clueData.id === focusedClue.id
            ) {
              console.log("🚫 Current player locked out - hiding modal");
              setShowClueModal(false);
              setCurrentClue(null);
              setBuzzerState(BuzzerState.LOCKED);
              setReactionTime(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      playersSubscription.unsubscribe();
      clueStatesSubscription.unsubscribe();
      buzzesSubscription.unsubscribe();
      cluesSubscription.unsubscribe();
    };
  }, [
    gameId,
    user,
    focusedClue,
    showClueModal,
    updateClueState,
  ]);

  /**
   * Handles player buzzer click.
   */
  const handleBuzz = useCallback(async () => {
    if (buzzerState === BuzzerState.UNLOCKED && user && currentClue) {
      // Record buzz timestamp for client-side timing (will be implemented later)
      setBuzzerState(BuzzerState.BUZZED);

      try {
        // Calculate reaction time using client-side timing
        let reactionTimeMs: number | undefined;
        // Note: buzzerUnlockTime was removed - reaction time calculation disabled
        // if (buzzerUnlockTime) {
        //   reactionTimeMs = Date.now() - buzzerUnlockTime;
        //   setReactionTime(reactionTimeMs);
        //   console.log(`⏱️ Reaction time: ${reactionTimeMs}ms`);
        // }

        // Send buzz event to server with reaction time
        await GameService.recordBuzz(
          gameId,
          currentClue.id,
          user.id,
          reactionTimeMs
        );

        console.log("⚡ Player buzzed in successfully!");
      } catch (buzzError) {
        console.error("Failed to record buzz:", buzzError);
        // Reset buzzer state on error
        setBuzzerState(BuzzerState.UNLOCKED);
      }
    } else if (buzzerState === BuzzerState.LOCKED) {
      // Player buzzed too early - set frozen state
      setBuzzerState(BuzzerState.FROZEN);
      console.log("❄️ Player buzzed too early - frozen!");
    }
  }, [buzzerState, user, currentClue, gameId]);





  // Load initial data
  useEffect(() => {
    loadGameData();
    loadGameBoardData();
  }, [loadGameData, loadGameBoardData]);

  // Set up real-time subscriptions
  useEffect(() => setupRealtimeSubscriptions(), [setupRealtimeSubscriptions]);

  // Watch for game status changes to trigger animations
  useEffect(() => {
    if (FEATURE_ANIMATION_EVENTS) return; // centralized intents handle this
    // Only trigger animation when status is game_intro and we haven't animated this status yet
    if (game?.status === 'game_intro' &&
        !isPlayingGameIntro &&
        animatedGameStatus.current !== 'game_intro') {

      console.log('🎬 Game status is game_intro, starting animation');
      setIsPlayingGameIntro(true);
      animatedGameStatus.current = 'game_intro'; // Mark this status as animated

      // Wait for DOM to be ready with multiple checks
      const waitForBoard = (attempts = 0) => {
        const boardElement = document.querySelector('.jeopardy-board');
        console.log(`🎬 Board element search attempt ${attempts + 1}:`, boardElement);

        if (boardElement) {
          console.log('🎬 Setting up player intro animation timeline');

          // Create placeholder GSAP timeline for player
          const playerIntroTimeline = gsap.timeline({
            onComplete: () => {
              console.log('🎬 Player game introduction animation complete');
              setIsPlayingGameIntro(false);
            }
          });

          // Use the animateBoardIn effect from utils/animations.ts
          playerIntroTimeline
            .add(() => console.log('🎬 Animation started'))
            .add(gsap.effects.animateBoardIn())
            .add(() => console.log('🎬 Animation completed'));
        } else if (attempts < 10) {
          // Retry up to 10 times with increasing delay
          setTimeout(() => waitForBoard(attempts + 1), 50 * (attempts + 1));
        } else {
          console.error('🎬 Board element not found after 10 attempts - animation skipped');
          setIsPlayingGameIntro(false);
          animatedGameStatus.current = null; // Reset so we can try again later
        }
      };

      // Start waiting for board element
      waitForBoard();
    }

    // Reset animation tracking when game status changes away from game_intro
    if (game?.status && game.status !== 'game_intro') {
      animatedGameStatus.current = null;
    }
  }, [game?.status, isPlayingGameIntro]);

  // Watch for game state changes to handle buzzer state
  useEffect(() => {
    if (!game) {
      return;
    }

    // Update buzzer state based on game state
    if (game.is_buzzer_locked) {
      setBuzzerState(BuzzerState.LOCKED);
      setReactionTime(null);
    } else {
      setBuzzerState(BuzzerState.UNLOCKED);
    }
  }, [game]);

  // Watch for focused clue changes
  useEffect(() => {
    if (!game) {
      return;
    }

    const handleFocusedClueChange = async () => {
      if (game.focused_clue_id) {
        const clueInfo = await loadClueData(game.focused_clue_id);
        setFocusedClue(clueInfo);
      } else {
        setFocusedClue(null);
        setShowClueModal(false);
        setCurrentClue(null);
        setBuzzerState(BuzzerState.LOCKED);
        setReactionTime(null);
      }
    };

    handleFocusedClueChange();
  }, [game, loadClueData]);

  // Watch for category introduction changes and animate with GSAP
  useEffect(() => {
    if (FEATURE_ANIMATION_EVENTS) return; // centralized intents handle this
    if (!game) {
      return;
    }

    const gameStatus = game.status;
    const isIntroducingCategories = gameStatus === 'introducing_categories';
    const gameWithCategory = game as GameUpdatePayload & { current_introduction_category?: number };
    const currentIntroCategory = gameWithCategory.current_introduction_category || 1;

    if (isIntroducingCategories) {
      console.log('🎬 Category introduction animation triggered for category:', currentIntroCategory);

      // Wait for DOM to be ready with multiple checks
      const waitForCategoryStrip = (attempts = 0) => {
        const stripElement = document.querySelector('.jeopardy-category-display-strip');
        console.log(`🎬 Category strip search attempt ${attempts + 1}:`, stripElement);

        if (stripElement) {
        // Calculate the target position (same logic as before)
        const targetX = -((currentIntroCategory - 1) * 100 / 6);

        // Check if this is initial render (component mounting) vs category advance
        const isInitialRender = lastAnimatedCategory.current === 0 && currentIntroCategory > 1;

        console.log(`🎬 Category ${currentIntroCategory}: lastAnimated=${lastAnimatedCategory.current}, isInitialRender=${isInitialRender}`);

        if (isInitialRender) {
          console.log('🎬 Initial render detected - setting up category strip for category', currentIntroCategory);

          // Set strip position immediately without animation
          gsap.set(stripElement, { x: `${targetX}%` });

          // Hide splash images for all categories from 1 to currentIntroCategory
          for (let i = 1; i <= currentIntroCategory; i++) {
            const splashImage = stripElement.querySelector(`.category-header:nth-child(${i}) img.splash-jeopardy`);
            if (splashImage) {
              gsap.set(splashImage, { autoAlpha: 0 });
              console.log(`🎬 Set splash image for category ${i} to hidden`);
            }
          }

          // Update tracking
          lastAnimatedCategory.current = currentIntroCategory;
        } else {
          console.log('🎬 Animating category strip to category', currentIntroCategory);

          // Get the proper splash image element based on category number
          const splashImage = stripElement.querySelector(`.category-header:nth-child(${currentIntroCategory}) img.splash-jeopardy`);

          // Animate with GSAP
          gsap.timeline()
            .to(stripElement, {
              x: `${targetX}%`,
              duration: 0.8,
              ease: 'power2.inOut',
              onStart: () => console.log('🎬 Category animation started'),
              onComplete: () => {
                console.log('🎬 Category animation completed');
                // Update tracking after animation completes
                lastAnimatedCategory.current = currentIntroCategory;
              }
            })
            .to(splashImage, {
              autoAlpha: 0,
              duration: 0.5,
              ease: 'power2.inOut'
            }, "-=0.3");
        }
        } else if (attempts < 10) {
          // Retry up to 10 times with increasing delay
          setTimeout(() => waitForCategoryStrip(attempts + 1), 50 * (attempts + 1));
        } else {
          console.error('🎬 Category strip element not found after 10 attempts - animation skipped');
        }
      };

      // Start waiting for category strip element
      waitForCategoryStrip();
    }
  }, [game]);

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
    <div className={`player-dashboard ${String(game?.status) || 'loading'}`} data-game-id={gameId}>
      {/* Round Header */}
      <div className="jeopardy-board-header">
        <h2>
          {(() => {
            if (game?.current_round === "final") {
              return "Final Jeopardy";
            }
            if (game?.current_round === "double") {
              return "Double Jeopardy Round";
            }
            return "The Jeopardy Round";
          })()}
        </h2>
      </div>

      {/* Jeopardy Board */}
      <div className="jeopardy-board-container">
        <div
          className="jeopardy-board"
          style={{
            "--jeopardy-board-bg-image": {
              jeopardy: "url('/assets/images/splash-jeopardy.webp')",
              double: "url('/assets/images/splash-double-jeopardy.webp')",
              final: "url('/assets/images/splash-final-jeopardy.webp')"
            }[game?.current_round as string ?? 'jeopardy'],
            "--jeopardy-board-bg-image-small": {
              jeopardy: "url('/assets/images/splash-jeopardy-small.webp')",
              double: "url('/assets/images/splash-double-jeopardy-small.webp')",
              final: "url('/assets/images/splash-final-jeopardy.webp')"
            }[game?.current_round as string ?? 'jeopardy']
          } as React.CSSProperties}
        >
          {clueSetData && game ? (
            <>
              {/* Category headers */}
              {(() => {
                if (game.current_round === "final") {
                  return (
                    <div key="final-category" className="category-header">
                      {clueSetData.rounds.final.name}
                    </div>
                  );
                } else {
                  const roundKey = game.current_round as "jeopardy" | "double";
                  const currentRoundData = clueSetData.rounds[roundKey] || [];
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
                if (game.current_round === "final") {
                  const finalClue = clueSetData.rounds.final.clues?.[0];
                  return finalClue ? (
                    <button
                      type="button"
                      className="clue-cell final-jeopardy"
                      style={{ pointerEvents: "none" }}
                      aria-label="Final Jeopardy"
                    >
                      Final Jeopardy
                    </button>
                  ) : null;
                }

                // Regular rounds: create grid of all clues
                const roundKey = game.current_round as "jeopardy" | "double";
                const currentRoundData = clueSetData.rounds[roundKey] || [];
                const allClues: Array<{
                  categoryIndex: number;
                  clue: ClueData;
                }> = [];

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
                allClues.sort((a, b) => {
                  if (a.clue.position !== b.clue.position) {
                    return a.clue.position - b.clue.position;
                  }
                  return a.categoryIndex - b.categoryIndex;
                });

                return allClues.map((item, index) => {
                  // Find clue state for this clue
                  const clueState = clueStates.find(
                    (state) => state.clue_id === item.clue.id
                  );

                  const isRevealed = clueState?.revealed || false;
                  const isCompleted = clueState?.completed || false;
                  const isFocused =
                    focusedClue && focusedClue.id === item.clue.id;

                  // Players don't see Daily Double indicators until they encounter them
                  const isDailyDouble = false;

                  let cellClass = "clue-cell";
                  if (isCompleted) {
                    cellClass += " completed revealed"; // Completed clues should also be styled as revealed
                  } else if (isRevealed) {
                    cellClass += " revealed";
                  }
                  if (isFocused) {
                    cellClass += " focused";
                  }
                  if (isDailyDouble) {
                    cellClass += " daily-double";
                  }

                  let ariaLabel = `Clue for $${item.clue.value}`;
                  if (isDailyDouble) {
                    ariaLabel += " - Daily Double";
                  }
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
                      key={`clue-${item.clue.id || index}-${item.clue.value}`}
                      type="button"
                      className={cellClass}
                      style={{ pointerEvents: "none" }}
                      aria-label={ariaLabel}
                    >
                      <span className="clue-value">
                        ${item.clue.value}
                      </span>
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
        players={players.map((player) => ({
          ...player,
          buzzerState: player.id === user?.id ? buzzerState : BuzzerState.INACTIVE,
          isFocused: game?.focused_player_id === player.id,
          reactionTime: player.id === user?.id ? reactionTime : null,
          showReactionTime: player.id === user?.id && buzzerState === BuzzerState.BUZZED
        }))}
        currentUserId={user?.id || ""}
        onBuzz={handleBuzz}
      />

      {/* Dynamic Display Window */}
      <div className="dynamic-display-window" ref={displayWindowRef}>
        {(() => {
          // Check game status for different display modes
          const gameStatus = (game as GameUpdatePayload & { status?: string })?.status;
          const isGameIntro = gameStatus === 'game_intro';
          const isIntroducingCategories = gameStatus === 'introducing_categories';

          if (isGameIntro) {
            // Show game introduction display
            return (
              <div className="game-intro-display">
                <div className="intro-content">
                  <h2>Get Ready!</h2>
                  <p>{isPlayingGameIntro ? "Game starting..." : "Waiting for host..."}</p>
                </div>
              </div>
            );
          }

          if (isIntroducingCategories && clueSetData && game) {
            // Show category display strip for introductions
            return (
              <div className="jeopardy-category-display-viewport" style={{ visibility: "visible" }}>
                <div
                  className="jeopardy-category-display-strip"
                  // Transform now handled by GSAP animation
                >
                  {/* Always populate with current round's categories */}
                  {(() => {
                    if (game.current_round === "final") {
                      // Final Jeopardy - single category
                      return (
                        <div key="final-category" className="category-header">
                          <span>{clueSetData.rounds.final.name}</span>
                        </div>
                      );
                    } else {
                      // Regular rounds - 6 categories
                      const roundKey = game.current_round as "jeopardy" | "double";
                      const currentRoundData = clueSetData.rounds[roundKey] || [];

                      return currentRoundData.map((category: { name: string; clues: ClueData[] }, index: number) => (
                        <div key={`category-${index}-${category.name}`} className="category-header">
                          <img
                            className="splash-jeopardy"
                            src={{
                              jeopardy: 'assets/images/splash-jeopardy.webp',
                              double: 'assets/images/splash-double-jeopardy.webp',
                              final: 'assets/images/splash-final-jeopardy.webp'
                            }[roundKey]}
                            alt="Jeopardy Splash Screen"
                          />
                          <span className="category-name">{category.name}</span>
                        </div>
                      ));
                    }
                  })()}
                </div>
              </div>
            );
          }

          if (showClueModal && currentClue) {
            // Show clue content
            return (
              <div className="clue-display-content gsap-animation" ref={clueContentRef}>
                <div className="clue-header">
                  <div className="clue-category">{currentClue.category}</div>
                  <div className="clue-value">${currentClue.value.toLocaleString()}</div>
                </div>

                <div className="clue-prompt">
                  {currentClue.prompt}
                </div>

                {currentClue.isDailyDouble && (
                  <div className="daily-double-indicator">
                    🎯 DAILY DOUBLE!
                  </div>
                )}

                {/* Integrated Buzzer Display */}
                <div className="integrated-buzzer-display">
                  <button
                    className={`integrated-buzzer ${buzzerStateService.getStateClassName(buzzerState)}`}
                    onClick={handleBuzz}
                    disabled={!buzzerStateService.isInteractive(buzzerState)}
                  >
                    {buzzerStateService.getStateDisplayText(buzzerState)}
                  </button>

                  {buzzerState === BuzzerState.BUZZED && reactionTime && (
                    <div className="reaction-time">
                      ⚡ {reactionTime} ms
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Default placeholder
          return (
            <div className="display-placeholder" ref={clueContentRef}>
              <div className="placeholder-content">
                <div className="placeholder-icon">🎯</div>
                <div className="placeholder-text">
                  {gameStatus === 'lobby' ? 'Game starting soon...' : 'Waiting for next clue...'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PlayerDashboard;
