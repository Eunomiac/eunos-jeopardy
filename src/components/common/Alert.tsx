/**
 * Centralized Alert Component for GameHostDashboard
 *
 * Provides three types of alerts:
 * 1. Status Updates - Top of interface, non-blocking
 * 2. Notification Pop-Ups - Centered modal with OK button
 * 3. Confirmation Pop-Ups - Centered modal with OK and Cancel buttons
 */

import React from 'react';
import './Alert.scss';

export type AlertType = 'status' | 'notification' | 'confirmation';
export type AlertSeverity = 'success' | 'error' | 'warning' | 'info' | '';

export interface AlertProps {
  /** Type of alert to display */
  type: AlertType;

  /** Severity level for styling */
  severity: AlertSeverity;

  /** Alert message content */
  message: string;

  /** Whether the alert is visible */
  isVisible: boolean;

  /** Callback when OK button is clicked */
  onConfirm?: () => void;

  /** Callback when Cancel button is clicked (confirmation only) */
  onCancel?: () => void;

  /** Optional title for modal alerts */
  title?: string;

  /** Optional additional content for modal alerts */
  children?: React.ReactNode;
}

/**
 * Alert Component
 *
 * Displays alerts in three different formats based on type:
 * - status: Non-blocking banner at top of interface
 * - notification: Blocking modal with OK button
 * - confirmation: Blocking modal with OK and Cancel buttons
 */
export function Alert({
  type,
  severity,
  message,
  isVisible,
  onConfirm,
  onCancel,
  title,
  children
}: Readonly<AlertProps>): React.ReactElement | null {

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Status alert - top banner
  if (type === 'status') {
    return (
      <div className={`alert alert-status alert-${severity} jeopardy-alert`}>
        {message}
      </div>
    );
  }

  // Modal alerts (notification and confirmation)
  const isConfirmation = type === 'confirmation';

  return (
    <div className="alert-overlay">
      <div className={`alert-modal alert-${severity}`}>
        {title && <h3 className="alert-title">{title}</h3>}

        <div className="alert-message">
          {message}
        </div>

        {children && (
          <div className="alert-content">
            {children}
          </div>
        )}

        <div className="alert-buttons">
          {isConfirmation && onCancel && (
            <button
              className="jeopardy-button red"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}

          <button
            className={`jeopardy-button ${isConfirmation ? 'green' : 'blue'}`}
            onClick={onConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing alert state
 *
 * Provides a simple interface for showing different types of alerts
 */
export interface AlertState {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isVisible: boolean;
  title?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface UseAlertReturn {
  alertState: AlertState;
  showStatus: (message: string, severity?: AlertSeverity) => void;
  showNotification: (message: string, title?: string, severity?: AlertSeverity) => Promise<void>;
  showConfirmation: (message: string, title?: string, severity?: AlertSeverity) => Promise<boolean>;
  hideAlert: () => void;
}

export function useAlert(): UseAlertReturn {
  const [alertState, setAlertState] = React.useState<AlertState>({
    type: 'status',
    severity: '',
    message: '',
    isVisible: false
  });

  /**
   * Show a status alert (non-blocking banner)
   */
  const showStatus = React.useCallback((message: string, severity: AlertSeverity = "info") => {
    setAlertState({
      type: "status",
      severity,
      message,
      isVisible: true
    });
  }, []);

  /**
   * Show a notification alert (blocking modal with OK button)
   * Returns a promise that resolves when OK is clicked
   */
  const onConfirm = React.useCallback(() => {
    setAlertState((prev) => ({ ...prev, isVisible: false }));
  }, []);
  const showNotification = React.useCallback((
    message: string,
    title?: string,
    severity: AlertSeverity = "info"
  ): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        type: "notification",
        severity,
        message,
        title,
        isVisible: true,
        onConfirm
      });
      resolve();
    });
  }, []);

  /**
   * Show a confirmation alert (blocking modal with OK and Cancel buttons)
   * Returns a promise that resolves to true if OK clicked, false if Cancel clicked
   */
  function buildOnConfirm(resolve: (value: boolean) => void) {
    return () => {
      setAlertState((prev) => ({ ...prev, isVisible: false }));
      resolve(true);
    };
  }
  function buildOnCancel(resolve: (value: boolean) => void) {
    return () => {
      setAlertState((prev) => ({ ...prev, isVisible: false }));
      resolve(false);
    };
  }
  const showConfirmation = React.useCallback((
    message: string,
    title?: string,
    severity: AlertSeverity = "warning"
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        type: "confirmation",
        severity,
        message,
        title,
        isVisible: true,
        onConfirm: buildOnConfirm(resolve),
        onCancel: buildOnCancel(resolve)
      });
    });
  }, []);

  /**
   * Hide the current alert
   */
  const hideAlert = React.useCallback(() => {
    setAlertState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return {
    alertState,
    showStatus,
    showNotification,
    showConfirmation,
    hideAlert
  };
}
