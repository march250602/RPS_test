import styles from '../styles/Home.module.scss';

type Choice = 'paper' | 'scissors' | 'rock';

interface ButtonProps{
    startPlay?: (choice: Choice) => void;
    disable:boolean;
    choice: Choice | null;
    result?:boolean;
}

export function Button({startPlay, disable, choice, result} : ButtonProps){

    return(
       <div className={styles.buttonContainer}>
            <button 
            disabled = {disable}
            type="button" 
            className={
                choice === 'paper'? styles.paper:
                choice === 'rock' ? styles.rock :
                choice === 'scissors' ? styles.scissors :
                styles.blank
            }
            onClick={startPlay && choice ? () => startPlay(choice) : undefined}
            >
                {choice ? (
            <img src={`/icon-${choice}.svg`} alt={choice}/>
            ) : (
            <img src={`/icon-blank.svg`} alt='?'/>
            )}
            </button>
        {result &&  <span/>}
       </div>
    )
}
