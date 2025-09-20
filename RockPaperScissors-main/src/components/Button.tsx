import styles from '../styles/Home.module.scss';

interface ButtonProps{
    startPlay?: (choice: 'paper' | 'scissors' | 'rock') => void;
    disable:boolean;
    choice: 'paper' | 'scissors' | 'rock'  ;
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
                styles.scissors    
            }
            onClick={() => startPlay(choice)}
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