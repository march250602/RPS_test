import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Gateway } from './app.gateway';
import { ConfigModule } from '@nestjs/config';



@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    ClientsModule.register([
      {
        name: 'HIGH_SCORE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL!],
          queue: process.env.QUEUE_NAME,
          queueOptions: { durable: false },
        },
      },
    ]),],
  controllers: [AppController],
  providers: [AppService, Gateway],
})
export class AppModule {}
