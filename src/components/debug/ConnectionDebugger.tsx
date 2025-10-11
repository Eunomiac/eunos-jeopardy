/**
 * Connection Debugger Component
 *
 * Displays real-time connection status for debugging purposes.
 * Shows in bottom-left corner with compact black background.
 */

import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase/client";
import { GameService } from "../../services/games/GameService";
import "./ConnectionDebugger.scss";

type ConnectionState = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

interface ConnectionStatus {
  status: ConnectionState;
  lastUpdate: Date;
  userId: string | null;
  currentGameId: string | null;
}

export function ConnectionDebugger() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "CLOSED",
    lastUpdate: new Date(),
    userId: null,
    currentGameId: null,
  });

  useEffect(() => {
    // Monitor auth state
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setConnectionStatus((prev) => ({
        ...prev,
        userId: session?.user.id ?? null,
        lastUpdate: new Date(),
      }));
    });

    // Detect current game ID from various sources
    const detectGameId = () => {
      let gameId: string | null = null;

      // Method 1: Check if GameHostDashboard is rendered (look for game ID in DOM)
      const dashboardElement = document.querySelector("[data-game-id]");
      if (dashboardElement) {
        gameId = dashboardElement.getAttribute("data-game-id");
      }

      // Method 2: Check URL parameters
      if (!gameId) {
        const urlParams = new URLSearchParams(window.location.search);
        gameId = urlParams.get("gameId");
      }

      // Method 3: Check localStorage
      gameId ??=
        localStorage.getItem("currentGameId") ??
        localStorage.getItem("playerGameId");

      // Method 4: Extract from current path
      if (!gameId) {
        const pathMatch = RegExp(/\/game\/([a-f0-9-]+)/).exec(
          window.location.pathname
        );
        gameId = pathMatch ? pathMatch[1] : null;
      }

      if (gameId && gameId !== connectionStatus.currentGameId) {
        setConnectionStatus((prev) => ({
          ...prev,
          currentGameId: gameId,
          lastUpdate: new Date(),
        }));
      }
    };

    // Initial detection
    detectGameId();

    // Also check for active games via GameService (only once on mount)
    const checkActiveGame = async () => {
      try {
        const activeGame = await GameService.getActiveGame();
        if (activeGame) {
          setConnectionStatus((prev) => ({
            ...prev,
            currentGameId: activeGame.id,
            lastUpdate: new Date(),
          }));
        }
      } catch (error) {
        // Ignore errors - this is just for debugging
        console.debug("Debug: Could not check active game:", error);
      }
    };

    void checkActiveGame();

    // Monitor for URL changes
    const handleLocationChange = () => {
      detectGameId();
    };

    window.addEventListener("popstate", handleLocationChange);

    // Monitor for localStorage changes (if other tabs update it)
    window.addEventListener("storage", handleLocationChange);

    // Monitor realtime connection status
    const channel = supabase.channel("debug-connection-monitor");

    channel
      .on("system", {}, () => {
        setConnectionStatus((prev) => ({
          ...prev,
          lastUpdate: new Date(),
        }));
      })
      .subscribe((status) => {
        setConnectionStatus((prev) => ({
          ...prev,
          status: status as ConnectionStatus["status"],
          lastUpdate: new Date(),
        }));
      });

    // Subscribe to game table changes to detect active games
    const gameMonitor = supabase.channel("debug-game-monitor");
    gameMonitor
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
        },
        (payload) => {
          // If we see a game event and don't have a current game ID, try to detect it
          setConnectionStatus((prev) => {
            if (!prev.currentGameId) {
              const gameData = payload.new as Record<string, unknown>;
              if (
                typeof gameData.id === "string" &&
                [
                  "lobby",
                  "game_intro",
                  "introducing_categories",
                  "in_progress",
                ].includes(gameData.status)
              ) {
                return {
                  ...prev,
                  currentGameId: gameData.id,
                  lastUpdate: new Date(),
                };
              }
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      void channel.unsubscribe();
      void gameMonitor.unsubscribe();
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("storage", handleLocationChange);
    };
  }, [connectionStatus.currentGameId]);

  const getStatusColor = (status: ConnectionState) => {
    switch (status) {
      case "OPEN":
        return "#00ff00";
      case "CONNECTING":
        return "#ffff00";
      case "CLOSING":
        return "#ff8800";
      case "CLOSED":
        return "#ff0000";
      default:
        return "#888888";
    }
  };

  const getStatusEmoji = (status: ConnectionState) => {
    switch (status) {
      case "OPEN":
        return "🟢";
      case "CONNECTING":
        return "🟡";
      case "CLOSING":
        return "🟠";
      case "CLOSED":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getMainChannelName = (gameId: string | null): string => {
    if (!gameId) {
      return "No game active";
    }
    return `game:${gameId}`;
  };

  const copyChannelName = async () => {
    const channelName = getMainChannelName(connectionStatus.currentGameId);
    if (channelName === "No game active") {
      alert("No active game detected");
      return;
    }

    try {
      await navigator.clipboard.writeText(channelName);
      // Brief visual feedback
      const button: HTMLButtonElement | null =
        document.querySelector(".copy-channel-btn");
      if (button) {
        const originalText = button.textContent;
        button.textContent = "✓ Copied!";
        button.style.color = "#00ff00";
        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = "";
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to copy channel name:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = channelName;
      document.body.appendChild(textArea);
      textArea.select();
      // Modern fallback for clipboard copy
      navigator.clipboard
        .writeText(channelName)
        .then(() => {
          alert(`Copied: ${channelName}`);
        })
        .catch(() => {
          alert(`Failed to copy: ${channelName}`);
        });
    }
  };

  return (
    <div className="connection-debugger">
      <div className="debug-header">
        {getStatusEmoji(connectionStatus.status)} Supabase
      </div>
      <div className="debug-line">
        Status:{" "}
        <span style={{ color: getStatusColor(connectionStatus.status) }}>
          {connectionStatus.status}
        </span>
      </div>
      <div className="debug-line">
        User:{" "}
        {connectionStatus.userId
          ? connectionStatus.userId.slice(0, 8) + "..."
          : "None"}
      </div>
      <div className="debug-line">
        Game:{" "}
        {connectionStatus.currentGameId
          ? connectionStatus.currentGameId.slice(0, 8) + "..."
          : "None"}
      </div>
      <div className="debug-line">
        Updated: {connectionStatus.lastUpdate.toLocaleTimeString()}
      </div>
      {connectionStatus.currentGameId && (
        <div className="debug-actions">
          <button
            className="copy-channel-btn"
            onClick={() => { void copyChannelName(); }}
            title={`Copy channel name: ${getMainChannelName(
              connectionStatus.currentGameId
            )}`}
          >
            📋 Copy Channel
          </button>
        </div>
      )}
    </div>
  );
}
