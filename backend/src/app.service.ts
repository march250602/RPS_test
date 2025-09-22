import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';




@Injectable()
export class AppService  {
 private  highScore = 0;

 getHighScore(): number {
    return this.highScore;
  }
  constructor(@Inject('HIGH_SCORE_SERVICE') private client: ClientProxy) {}

  updateScore(playerScore: number) {
     if (typeof playerScore !== 'number' || isNaN(playerScore)) {
    return { updated: false };
  }
    if (playerScore > this.highScore) {
      this.highScore = playerScore;
      this.client.emit(process.env.QUEUE_NAME , { highScore: this.highScore });
     return { updated: true, highScore: this.highScore };
    }
   if (playerScore == this.highScore) {
      
     return { updated: true, highScore: this.highScore };
    }
   
    return { updated: false, highScore: this.highScore };
  }

  // ================================
  getHello(): string {
    return 'Hello World!';
  }
// =======================================
}
