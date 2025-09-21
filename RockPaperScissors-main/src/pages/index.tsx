import { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react'
import { Button } from '../components/Button';
import { RulesModal } from '../components/RulesModal';
import { ScoreBoard } from '../components/ScoreBoard';
import styles from '../styles/Home.module.scss';
import Cookies from 'js-cookie';
import { io } from "socket.io-client";

interface HomeProps{
  scoreCookie: number;
  HscoreCookie: number;
}


export default function Home({scoreCookie, HscoreCookie}: HomeProps) {
  const [score, setScore] = useState(scoreCookie ?? 0);
  const [highScore, setHighScore] =useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<'YOU WIN' | 'YOU LOSE' | 'DRAW'>();
  const [playerChoice, setPlayerChoice] = useState<'paper' | 'scissors' | 'rock' >();
  const [botChoice, setbotChoice] = useState<'paper' | 'scissors' | 'rock'  >(null);
  

  async function startPlay(choice: 'paper' | 'scissors' | 'rock') {
    setIsPlaying(true);
    setPlayerChoice(choice);
    
    try {
      // Get Bot move from Server
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot-choice`);;
      const data = await response.json();
      
      if (data.choice) {
        setTimeout(() => {
          setbotChoice(data.choice);
          
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to get bot choice:', error);
      
     
    }
  }
 // Set Score with Cookie
useEffect(() =>{
    Cookies.set(`scoreCookie`, String(score));
  },[score])
  // Get High Score from Server
useEffect(() => {
  const getHighScore = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/get-score`);
      const data = await res.json(); // แปลง response เป็น json
      if (data.score !== undefined || !isNaN(data.score)) {
         console.error('Get-score:', data);
        setHighScore(Number(data.score)); // update state
      }
    } catch (error) {
      console.error('Failed to fetch high score:', error);
    }
  };

  getHighScore(); 
}, []); 

// Connect Socket For geting msg from msg broker
 useEffect(() => {
   const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socket = io(socketUrl); 

    socket.on('connect', () => console.log('Connected:', socket.id));
  socket.on('newMessage', (msg) => {
      try {
    const parsed = JSON.parse(msg);       
    const score = Number(parsed.data.highScore); 
    if (!isNaN(score)) {
      setHighScore(score);                 
    }
  } catch (err) {
    console.error('Invalid JSON:', msg);
  }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update High Score
  const updateHighScore = async (newHighScore: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: newHighScore }),
    });
    const data = await res.json();
      console.log('Update on Server',data.highScore)
    } catch (error) {
      console.error('Failed to update high score on server:', error);
    }
  };

  function reMatch(){
    setIsPlaying(false);
    setbotChoice(null);
    setIsFinished(false);
    setResult("DRAW");
    setPlayerChoice(null)
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isFinished) {
      timeoutId = setTimeout(() => {
        reMatch();
      }, 2000); 
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFinished]);

  function toggleModal(){
    setShowModal(!showModal);
  }

  useEffect(()=>{
    if(botChoice){
      setTimeout(()=>{
        matchResults()
      },1000)
    }
  },[botChoice])
 
  
  
  function matchResults(){
   let newScore = score;
    switch (playerChoice) {
      case "paper":
          if(botChoice === "rock"){
            setResult('YOU WIN')
            setScore(score + 1)
            newScore = score + 1;
          }else if(botChoice === "scissors"){
            setResult('YOU LOSE')
            setScore(0)
          }else{
            setResult('DRAW')
          }
        break;
      case "scissors":
          if(botChoice === "paper"){
            setResult('YOU WIN')
            setScore(score + 1)
            newScore = score + 1;
          }else if(botChoice === "rock"){
            setResult('YOU LOSE')
            setScore(0)
          }else{
            setResult('DRAW')
          }
        break;
      case "rock":
          if(botChoice === "scissors"){
            setResult('YOU WIN')
            setScore(score + 1)
            newScore = score + 1;
          }else if(botChoice === "paper"){
            setResult('YOU LOSE')
            setScore(0)
          }else{
            setResult('DRAW')
          }
        break;
    
      default:
        break;
    }
     
     console.log("Score(Now)",newScore)
    if (newScore > highScore) {
      console.log("newSccore(Need to update)",newScore)
      updateHighScore(newScore);
    }
    setIsFinished(true)
  }
  

  
return (
  <div className={styles.container}>
    <header>
      <img className={styles.ME_Img} src="/Me_IMG.jpg" alt="Rock Paper Scissors"/>
     <ScoreBoard score={score} highScore={highScore} />
    </header>

    <main>
  
    <div className={styles.mainGameContainer}>
     
      <div className={styles.choicesPreview}>
        <div className={styles.previewBox}>
          
          
          <div className={styles.playerChoiceContainer}>
              <div className={styles.choiceBox}>
                <Button 
                  disable={true} 
                  choice={playerChoice}
                  result={result === 'YOU WIN'}
                />
              </div>
              <p className={styles.choiceLabel}>YOU PICKED</p>
            </div>
          
         
          
        </div>
        <div className={styles.previewBox}>
          <div className={styles.botChoiceContainer}>
              <div className={styles.choiceBox}>
                
                  <Button 
                    disable={true} 
                    choice={botChoice}
                    result={result === 'YOU LOSE'}
                  />
                
              </div>
              <p className={styles.choiceLabel}>BOT PICKED</p>
            </div>
          
        </div>
      </div>

      
      <div className={styles.pickContainerBottom}>
          <div className={styles.buttonWrapper}><Button disable={isPlaying} startPlay={startPlay} choice="paper"/></div>
                <div className={styles.buttonWrapper}><Button disable={isPlaying} startPlay={startPlay} choice="scissors"/></div>
                <div className={styles.buttonWrapper}><Button disable={isPlaying} startPlay={startPlay} choice="rock"/></div> 
              </div>
    </div>
  
</main>

    <footer>
      <button type="button" className={styles.rulesButton} onClick={toggleModal}>
        RULES
      </button>
    </footer>

    <RulesModal toggleModal={toggleModal} showModal={showModal}/>
  </div>
);
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { scoreCookie, HscoreCookie } = ctx.req.cookies;
  
  
  const initialScore = isNaN(Number(scoreCookie)) ? 0 : Number(scoreCookie);
  const initialHighScore = isNaN(Number(HscoreCookie)) ? 0 : Number(HscoreCookie);
  
  return {
    props: {
      scoreCookie: initialScore,
      HscoreCookie: initialHighScore,
    }
  };
}
