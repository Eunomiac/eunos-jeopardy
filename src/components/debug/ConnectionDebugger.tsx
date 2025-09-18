/**
 * Connection Debugger Component
 * 
 * Displays real-time connection status for debugging purposes.
 * Shows in bottom-left corner with compact black background.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase/client';
import './ConnectionDebugger.scss';

interface ConnectionStatus {
  status: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
  lastUpdate: Date;
  subscriptionCount: number;
  userId: string | null;
}

export function ConnectionDebugger() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'CLOSED',
    lastUpdate: new Date(),
    subscriptionCount: 0,
    userId: null
  });

  useEffect(() => {
    let subscriptionCount = 0;

    // Monitor auth state
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setConnectionStatus(prev => ({
        ...prev,
        userId: session?.user?.id || null,
        lastUpdate: new Date()
      }));
    });

    // Monitor realtime connection status
    const channel = supabase.channel('debug-connection-monitor');
    
    channel
      .on('system', {}, (payload) => {
        console.log('Realtime system event:', payload);
        setConnectionStatus(prev => ({
          ...prev,
          lastUpdate: new Date()
        }));
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setConnectionStatus(prev => ({
          ...prev,
          status: status as ConnectionStatus['status'],
          lastUpdate: new Date()
        }));
      });

    // Track subscription count (rough estimate)
    const originalChannel = supabase.channel;
    supabase.channel = function(...args) {
      subscriptionCount++;
      setConnectionStatus(prev => ({
        ...prev,
        subscriptionCount,
        lastUpdate: new Date()
      }));
      return originalChannel.apply(this, args);
    };

    return () => {
      authSubscription.unsubscribe();
      channel.unsubscribe();
      // Restore original channel function
      supabase.channel = originalChannel;
    };
  }, []);

  const getStatusColor = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'OPEN': return '#00ff00';
      case 'CONNECTING': return '#ffff00';
      case 'CLOSING': return '#ff8800';
      case 'CLOSED': return '#ff0000';
      default: return '#888888';
    }
  };

  const getStatusEmoji = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'OPEN': return '🟢';
      case 'CONNECTING': return '🟡';
      case 'CLOSING': return '🟠';
      case 'CLOSED': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="connection-debugger">
      <div className="debug-header">
        {getStatusEmoji(connectionStatus.status)} Supabase
      </div>
      <div className="debug-line">
        Status: <span style={{ color: getStatusColor(connectionStatus.status) }}>
          {connectionStatus.status}
        </span>
      </div>
      <div className="debug-line">
        Subs: {connectionStatus.subscriptionCount}
      </div>
      <div className="debug-line">
        User: {connectionStatus.userId ? connectionStatus.userId.slice(0, 8) + '...' : 'None'}
      </div>
      <div className="debug-line">
        Updated: {connectionStatus.lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
