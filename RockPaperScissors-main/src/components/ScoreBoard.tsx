import styles from '../styles/Home.module.scss';

interface ScoreBoardProps {
  score: number;
  highScore: number;
  realtimeStatus: 'connecting' | 'online' | 'reconnecting' | 'offline';
}

const statusLabels = {
  connecting: 'CONNECTING',
  online: 'LIVE',
  reconnecting: 'RECONNECTING',
  offline: 'OFFLINE',
} as const;

export function ScoreBoard({
  score,
  highScore,
  realtimeStatus,
}: ScoreBoardProps) {
  const statusClass = {
    connecting: styles.realtimeConnecting,
    online: styles.realtimeOnline,
    reconnecting: styles.realtimeConnecting,
    offline: styles.realtimeOffline,
  }[realtimeStatus];

  return (
    <div className={styles.scoreWrapper}>
      <div
        className={`${styles.realtimeIndicator} ${statusClass}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.realtimeDot} aria-hidden="true" />
        {statusLabels[realtimeStatus]}
      </div>

      <div className={styles.scoreContainer}>
        <p>Your SCORE</p>
        <span>{score}</span>
        <p>turn</p>
      </div>
      
      <div className={styles.scoreContainer}>
        <p>High SCORE</p>
        <span>{highScore}</span>
        <p>turn</p>
      </div>
    </div>
  );
}
