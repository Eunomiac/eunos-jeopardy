import React, { useEffect, useState } from 'react';
import './PlayerDashboard.scss';

/**
 * PlayerDashboard Component
 *
 * Temporary component that displays HTML content from MockPlayerUI.html
 * for styling and layout testing. Once styling is complete, this will
 * be converted to proper React components.
 */
const PlayerDashboard: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMockHTML = async () => {
      try {
        // Fetch the HTML content from the mock file in public directory
        const response = await fetch('/MockPlayerUI.html');

        if (!response.ok) {
          throw new Error(`Failed to load MockPlayerUI.html: ${response.status}`);
        }

        const htmlText = await response.text();
        setHtmlContent(htmlText);
      } catch (err) {
        console.error('Error loading MockPlayerUI.html:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mock HTML');
      } finally {
        setLoading(false);
      }
    };

    loadMockHTML();
  }, []);

  if (loading) {
    return (
      <div className="player-dashboard loading">
        <div className="loading-message">Loading Player Interface...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-dashboard error">
        <div className="error-message">
          <h3>Error Loading Player Interface</h3>
          <p>{error}</p>
          <p>Make sure MockPlayerUI.html exists in the public directory</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="player-dashboard"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default PlayerDashboard;
