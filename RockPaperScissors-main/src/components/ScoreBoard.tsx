import styles from '../styles/Home.module.scss';

interface ScoreBoardProps {
  score: number;
  highScore: number;
}

export function ScoreBoard({ score, highScore }: ScoreBoardProps) {
  return (
    <div className={styles.scoreWrapper}>
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
