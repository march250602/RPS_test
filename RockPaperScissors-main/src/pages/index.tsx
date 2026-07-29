import { GetServerSideProps } from 'next';
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button';
import { RulesModal } from '../components/RulesModal';
import { ScoreBoard } from '../components/ScoreBoard';
import styles from '../styles/Home.module.scss';
import Cookies from 'js-cookie';

interface HomeProps{
  scoreCookie: number;
 
}

type RealtimeStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';
type Choice = 'paper' | 'scissors' | 'rock';

export default function Home({scoreCookie}: HomeProps) {
  const [score, setScore] = useState(scoreCookie ?? 0);
  const [highScore, setHighScore] =useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<'YOU WIN' | 'YOU LOSE' | 'DRAW'>();
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [botChoice, setbotChoice] = useState<Choice | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>('connecting');
  const scoreSocketRef = useRef<WebSocket | null>(null);
  

  async function startPlay(choice: Choice) {
    setIsPlaying(true);
    setPlayerChoice(choice);
    
    try {
      // Get Bot move from Server
      const response = await fetch('/api/bot-choice');
      if (!response.ok) {
        throw new Error(`Bot choice request failed: ${response.status}`);
      }
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
      const res = await fetch('/api/get-score');
      if (!res.ok) {
        throw new Error(`High score request failed: ${res.status}`);
      }
      const data = await res.json(); // แปลง response เป็น json
      if (data.score !== undefined && !isNaN(data.score)) {
         console.log('Get-score:', data);
        setHighScore(Number(data.score)); // update state
      }
    } catch (error) {
      console.error('Failed to fetch high score:', error);
    }
  };

  getHighScore(); 
}, []); 

  // Keep every open browser in sync through WebSocket.
  useEffect(() => {
    let cancelled = false;
    let reconnectDelay = 1_000;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let lastPongAt = Date.now();

    const getSocketUrl = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${protocol}://${window.location.host}/api/ws`;
    };

    const connect = () => {
      if (cancelled) {
        return;
      }

      setRealtimeStatus(
        reconnectDelay === 1_000 ? 'connecting' : 'reconnecting',
      );

      const socket = new WebSocket(getSocketUrl());
      scoreSocketRef.current = socket;

      socket.addEventListener('open', () => {
        reconnectDelay = 1_000;
        lastPongAt = Date.now();
        setRealtimeStatus('online');
        socket.send(JSON.stringify({ type: 'score:sync' }));
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'pong') {
            lastPongAt = Date.now();
            return;
          }

          if (
            (message.type === 'score:update' ||
              message.type === 'score:snapshot') &&
            typeof message.highScore === 'number'
          ) {
            setHighScore(message.highScore);
          }
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      socket.addEventListener('close', () => {
        if (scoreSocketRef.current === socket) {
          scoreSocketRef.current = null;
        }

        if (cancelled) {
          return;
        }

        setRealtimeStatus('reconnecting');
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      });

      socket.addEventListener('error', () => {
        socket.close();
      });
    };

    const heartbeatTimer = setInterval(() => {
      const socket = scoreSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (Date.now() - lastPongAt > 60_000) {
        socket.close(4000, 'Heartbeat timeout');
        return;
      }

      socket.send(JSON.stringify({ type: 'ping' }));
    }, 25_000);

    connect();

    return () => {
      cancelled = true;
      setRealtimeStatus('offline');
      clearInterval(heartbeatTimer);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      const socket = scoreSocketRef.current;
      scoreSocketRef.current = null;
      socket?.close(1000, 'Page closed');
    };
  }, []);

  // Update High Score
  const updateHighScore = async (newHighScore: number) => {
    const socket = scoreSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(
          JSON.stringify({ type: 'score:update', score: newHighScore }),
        );
        return;
      } catch (error) {
        console.error('Failed to send score through WebSocket:', error);
      }
    }

    // HTTP is a fallback while the socket is reconnecting.
    try {
      const res = await fetch('/api/update-score', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: newHighScore }),
    });
    if (!res.ok) {
      throw new Error(`High score update failed: ${res.status}`);
    }
    const data = await res.json();
      if (typeof data.highScore === 'number') {
        setHighScore(data.highScore);
      }
      console.log('Update on Server', data.highScore)
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

  const toggleModal = useCallback(() => {
    setShowModal((isOpen) => !isOpen);
  }, []);

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
      setHighScore(newScore);
      updateHighScore(newScore);
    }
    setIsFinished(true)
  }
  

  
return (
  <div className={styles.container}>
    <header>
      <img className={styles.ME_Img} src="/Me_IMG.jpg" alt="Rock Paper Scissors"/>
     <ScoreBoard
       score={score}
       highScore={highScore}
       realtimeStatus={realtimeStatus}
     />
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
  const { scoreCookie} = ctx.req.cookies;
  
  
  const initialScore = isNaN(Number(scoreCookie)) ? 0 : Number(scoreCookie);
  
  
  return {
    props: {
      scoreCookie: initialScore,
      
    }
  };
}
