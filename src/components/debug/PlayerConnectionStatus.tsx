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

  useEffect(() => {
    // Monitor player's presence/activity
    const presenceChannel = supabase.channel(`player-presence-${playerId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        const isPlayerPresent = Object.keys(presenceState).some((key) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          presenceState[key].some((presence: any) => presence.user_id === playerId)
        );

        setConnectionState(isPlayerPresent ? 'connected' : 'disconnected');
        if (isPlayerPresent) {
          setLastSeen(new Date());
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isThisPlayer = newPresences.some((presence: any) => presence.user_id === playerId);
        if (isThisPlayer) {
          setConnectionState('connected');
          setLastSeen(new Date());
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isThisPlayer = leftPresences.some((presence: any) => presence.user_id === playerId);
        if (isThisPlayer) {
          setConnectionState('disconnected');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connecting');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionState('error');
        }
      });

    // Track player's game activity (buzzes, etc.)
    const activityChannel = supabase.channel(`player-activity-${playerId}`);

    activityChannel
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buzzes',
          filter: `user_id=eq.${playerId}`
        },
        () => {
          setConnectionState('connected');
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
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'disconnected': return '🔴';
      case 'error': return '🟠';
      default: return '⚪';
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
        marginRight: '4px',
        fontSize: '12px',
        cursor: 'help'
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
