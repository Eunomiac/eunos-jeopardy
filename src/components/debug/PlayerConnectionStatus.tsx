/**
 * Player Connection Status Component
 *
 * Shows subscription status indicators for each player.
 * Displays colored emoji circles to indicate connection state.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/client';

interface PlayerConnectionStatusProps {
  playerId: string;
  playerName: string;
}

type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

export function PlayerConnectionStatus({ playerId, playerName }: Readonly<PlayerConnectionStatusProps>) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Helper: Check if player is present in presence state
  function isPlayerPresent(presenceState: Record<string, any[]>): boolean {
    return Object.keys(presenceState).some((key) =>
      presenceState[key].some((presence: any) => presence.user_id === playerId)
    );
  }

  // Presence event handlers
  function handlePresenceSync(presenceChannel: any) {
    const presenceState = presenceChannel.presenceState();
    const present = isPlayerPresent(presenceState);
    setConnectionState(present ? "connected" : "disconnected");
    if (present) {setLastSeen(new Date())};
  }

  function handlePresenceJoin(newPresences: any[]) {
    if (newPresences.some((presence: any) => presence.user_id === playerId)) {
      setConnectionState("connected");
      setLastSeen(new Date());
    }
  }

  function handlePresenceLeave(leftPresences: any[]) {
    if (leftPresences.some((presence: any) => presence.user_id === playerId)) {
      setConnectionState("disconnected");
    }
  }

  function handlePresenceSubscribe(status: string) {
    if (status === "SUBSCRIBED") {
      setConnectionState("connecting");
    } else if (status === "CHANNEL_ERROR") {
      setConnectionState("error");
    }
  }

  useEffect(() => {
    const presenceChannel = supabase.channel(`player-presence-${playerId}`);
    const activityChannel = supabase.channel(`player-activity-${playerId}`);

    presenceChannel
      .on("presence", { event: "sync" }, () => handlePresenceSync(presenceChannel))
      .on("presence", { event: "join" }, ({ newPresences }) => handlePresenceJoin(newPresences))
      .on("presence", { event: "leave" }, ({ leftPresences }) => handlePresenceLeave(leftPresences))
      .subscribe(handlePresenceSubscribe);

    activityChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buzzes",
          filter: `user_id=eq.${playerId}`,
        },
        () => {
          setConnectionState("connected");
          setLastSeen(new Date());
        }
      )
      .subscribe();

    return () => {
      presenceChannel.unsubscribe();
      activityChannel.unsubscribe();
    };
  }, [playerId]);

  const getStatusEmoji = (state: ConnectionState): string => {
    switch (state) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "🔴";
      case "error":
        return "🟠";
      default:
        return "⚪";
    }
  };

  const getTooltipText = (state: ConnectionState): string => {
    const baseText = `${playerName} - ${state.toUpperCase()}`;
    if (lastSeen) {
      const timeSince = Math.floor((Date.now() - lastSeen.getTime()) / 1000);
      if (timeSince < 60) {
        return `${baseText} (${timeSince}s ago)`;
      } else {
        return `${baseText} (${Math.floor(timeSince / 60)}m ago)`;
      }
    }
    return baseText;
  };

  return (
    <span
      className="player-connection-status"
      title={getTooltipText(connectionState)}
      style={{
        marginRight: "4px",
        fontSize: "12px",
        cursor: "help",
      }}
    >
      {getStatusEmoji(connectionState)}
    </span>
  );
}

/**
 * Simplified version that just monitors basic subscription status
 */
export function SimplePlayerConnectionStatus({ playerId }: Readonly<{ playerId: string }>) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Simple subscription test
    const testChannel = supabase.channel(`test-${playerId}-${Date.now()}`);

    testChannel
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      testChannel.unsubscribe();
    };
  }, [playerId]);

  return (
    <span
      className="simple-player-connection-status"
      title={`Player ${playerId.slice(0, 8)}... - ${isSubscribed ? 'Connected' : 'Disconnected'}`}
      style={{
        marginRight: '4px',
        fontSize: '12px'
      }}
    >
      {isSubscribed ? '🟢' : '🔴'}
    </span>
  );
}
