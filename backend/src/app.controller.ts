import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';



@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  

  @Get('api/get-score')
  getHighScore() {
    const score = this.appService.getHighScore();
    return { score };
  }

  @Post('api/update-score')
  
  updateScore(@Body('score') score: number) {
    const highScore = this.appService.updateScore(score);
     if (highScore.updated) {
    return { res: "successfully updated" };
  } else {
    return { res: "update failed" };
  }
  }

  @Get('api/bot-choice')
  getBotChoice() {
    try {
      const choices = ['paper', 'scissors', 'rock'] as const;
      const randomIndex = Math.floor(Math.random() * choices.length);
      const botChoice = choices[randomIndex];

      return {
        choice: botChoice,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }




  

}

