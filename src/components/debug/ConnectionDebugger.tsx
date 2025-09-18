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
  currentGameId: string | null;
}

export function ConnectionDebugger() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'CLOSED',
    lastUpdate: new Date(),
    subscriptionCount: 0,
    userId: null,
    currentGameId: null
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

    // Detect current game ID from various sources
    const detectGameId = () => {
      let gameId: string | null = null;

      // Method 1: Check if GameHostDashboard is rendered (look for game ID in DOM)
      const dashboardElement = document.querySelector('[data-game-id]');
      if (dashboardElement) {
        gameId = dashboardElement.getAttribute('data-game-id');
      }

      // Method 2: Check URL parameters
      if (!gameId) {
        const urlParams = new URLSearchParams(window.location.search);
        gameId = urlParams.get('gameId');
      }

      // Method 3: Check localStorage
      if (!gameId) {
        gameId = localStorage.getItem('currentGameId') || localStorage.getItem('playerGameId');
      }

      // Method 4: Extract from current path
      if (!gameId) {
        const pathMatch = window.location.pathname.match(/\/game\/([a-f0-9-]+)/);
        gameId = pathMatch ? pathMatch[1] : null;
      }

      // Method 5: Look for game ID in console logs (last resort)
      if (!gameId) {
        // This is a bit hacky but can work for debugging
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          const match = content.match(/gameId["\s]*[:=]["\s]*([a-f0-9-]{36})/i);
          if (match) {
            gameId = match[1];
            break;
          }
        }
      }

      if (gameId && gameId !== connectionStatus.currentGameId) {
        setConnectionStatus(prev => ({
          ...prev,
          currentGameId: gameId,
          lastUpdate: new Date()
        }));
      }
    };

    // Initial detection
    detectGameId();

    // Monitor for URL changes
    const handleLocationChange = () => {
      detectGameId();
    };

    window.addEventListener('popstate', handleLocationChange);

    // Monitor for localStorage changes (if other tabs update it)
    window.addEventListener('storage', handleLocationChange);

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
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('storage', handleLocationChange);
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

  const getMainChannelName = (gameId: string | null): string => {
    if (!gameId) return 'No game active';
    return `game:${gameId}`;
  };

  const copyChannelName = async () => {
    const channelName = getMainChannelName(connectionStatus.currentGameId);
    if (channelName === 'No game active') {
      alert('No active game detected');
      return;
    }

    try {
      await navigator.clipboard.writeText(channelName);
      // Brief visual feedback
      const button = document.querySelector('.copy-channel-btn') as HTMLElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.color = '#00ff00';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = '';
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to copy channel name:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = channelName;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`Copied: ${channelName}`);
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
        Game: {connectionStatus.currentGameId ? connectionStatus.currentGameId.slice(0, 8) + '...' : 'None'}
      </div>
      <div className="debug-line">
        Updated: {connectionStatus.lastUpdate.toLocaleTimeString()}
      </div>
      {connectionStatus.currentGameId && (
        <div className="debug-actions">
          <button
            className="copy-channel-btn"
            onClick={copyChannelName}
            title={`Copy channel name: ${getMainChannelName(connectionStatus.currentGameId)}`}
          >
            📋 Copy Channel
          </button>
        </div>
      )}
    </div>
  );
}
